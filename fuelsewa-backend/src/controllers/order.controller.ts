import { Response } from "express";
import Order from "../models/order.model";
import Pricing from "../models/pricing.model";
import User from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendMulticastNotification, NotificationTemplates } from "../services/notification.service";

// Roadside and emergency logic
const isEmergencyRequest = (requestSource: string): boolean => {
  return requestSource === "roadside";
};

const getPriority = (isEmergency: boolean): "high" | "normal" => {
  return isEmergency ? "high" : "normal";
};

// Haversine formula — distance between two coords in km
const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Office/Depot coordinates
const DEPOT_LAT = 27.67477767844391;
const DEPOT_LON = 85.26052936741475;

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fuelType, quantity, deliveryLocation, requestSource, note } = req.body;

    if (!fuelType || !quantity || !deliveryLocation || !requestSource) {
      res.status(400).json({ success: false, message: "fuelType, quantity, deliveryLocation and requestSource are required" });
      return;
    }

    if (!["petrol", "diesel"].includes(fuelType)) {
      res.status(400).json({ success: false, message: "fuelType must be 'petrol' or 'diesel'" });
      return;
    }

    if (!deliveryLocation.latitude || !deliveryLocation.longitude || !deliveryLocation.address) {
      res.status(400).json({ success: false, message: "deliveryLocation must include latitude, longitude and address" });
      return;
    }

    // Get latest pricing config — seed default if none exists
    let pricing = await Pricing.findOne().sort({ updatedAt: -1 });
    if (!pricing) {
      pricing = await Pricing.create({});
    }

    const pricePerLiter =
      fuelType === "petrol"
        ? pricing.petrolPricePerLiter
        : pricing.dieselPricePerLiter;

    const fuelCost = pricePerLiter * quantity;

    // Calculate delivery fee based on distance from depot
    const distanceKm = getDistanceKm(
      DEPOT_LAT,
      DEPOT_LON,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );
    const calculatedDeliveryFee = Math.round(distanceKm * pricing.baseFeePerKm);
    const deliveryFee = Math.max(calculatedDeliveryFee, pricing.minimumDeliveryFee);

    const emergency = isEmergencyRequest(requestSource);
    const emergencyFee = emergency ? pricing.emergencyFee : 0;

    const totalPrice = fuelCost + deliveryFee + emergencyFee;

    const order = await Order.create({
      userId: req.user!.id,
      fuelType,
      quantity,
      deliveryLocation,
      requestSource,
      note: note || "",
      pricing: {
        pricePerLiter,
        fuelCost,
        deliveryFee,
        emergencyFee,
        totalPrice,
      },
      status: "pending",
      priority: getPriority(emergency),
      isEmergency: emergency,
      assignedDriverId: null,
      estimatedDeliveryMinutes: null,
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });

    // Notify all admins about new order (fire-and-forget)
    try {
      const admins = await User.find({ role: "admin", fcmToken: { $ne: null } }).select("fcmToken");
      const tokens = admins.map((a: any) => a.fcmToken).filter(Boolean) as string[];
      if (tokens.length) {
        await sendMulticastNotification(tokens, NotificationTemplates.orderPlaced(order._id.toString()));
      }
    } catch {}
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate("assignedDriverId", "firstName lastName contactNumber location vehicleInfo");
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "firstName lastName email phone")
      .populate("assignedDriverId", "firstName lastName contactNumber location vehicleInfo");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email phone")
      .populate("assignedDriverId", "firstName lastName contactNumber");

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cancelReason } = req.body;
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (!["pending"].includes(order.status)) {
      res.status(400).json({ success: false, message: "Only pending orders can be cancelled" });
      return;
    }

    order.status = "cancelled";
    order.cancelReason = cancelReason?.trim() || "";
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled successfully", data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
