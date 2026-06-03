import { Response } from "express";
import Order from "../models/order.model";
import User from "../models/user.model";
import Driver from "../models/driver.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendNotification, sendMulticastNotification, NotificationTemplates } from "../services/notification.service";

// Haversine formula — distance in KM between two coordinates
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
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

// Returns what status the driver can transition to from current status
const getAllowedTransitions = (currentStatus: string): string[] => {
  const transitions: Record<string, string[]> = {
    accepted: ["in_progress"],
    in_progress: ["delivered"],
    delivered: [],
    cancelled: [],
    pending: [],
  };
  return transitions[currentStatus] ?? [];
};

// GET /api/driver/orders — all orders assigned to the logged-in driver
export const getAssignedOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user!.id;

    // Get driver's current location from query params (optional)
    const driverLat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const driverLon = req.query.lon ? parseFloat(req.query.lon as string) : null;

    const orders = await Order.find({ assignedDriverId: driverId })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName profilePhoto phone");

    const data = orders.map((order) => {
      const customer = order.userId as any;

      // Calculate distance from driver to delivery location if coords provided
      let distanceKm: number | null = null;
      if (driverLat !== null && driverLon !== null) {
        distanceKm = getDistanceKm(
          driverLat,
          driverLon,
          order.deliveryLocation.latitude,
          order.deliveryLocation.longitude
        );
      }

      return {
        orderId: order._id,
        status: order.status,
        priority: order.priority,
        isEmergency: order.isEmergency,
        estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
        customer: {
          id: customer?._id,
          name: `${customer?.firstName} ${customer?.lastName}`,
          profilePhoto: customer?.profilePhoto || null,
          phone: customer?.phone,
        },
        fuelType: order.fuelType,
        quantity: order.quantity,
        deliveryLocation: {
          address: order.deliveryLocation.address,
          landmark: order.deliveryLocation.landmark,
          latitude: order.deliveryLocation.latitude,
          longitude: order.deliveryLocation.longitude,
        },
        distanceKm,
        pricing: order.pricing,
        note: order.note,
        createdAt: order.createdAt,
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// GET /api/driver/orders/:id — single order detail with map data
export const getAssignedOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user!.id;

    // Driver's current location from query params
    const driverLat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const driverLon = req.query.lon ? parseFloat(req.query.lon as string) : null;

    const order = await Order.findOne({
      _id: req.params.id,
      assignedDriverId: driverId,
    }).populate("userId", "firstName lastName profilePhoto phone email");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
      return;
    }

    const customer = order.userId as any;

    // Calculate distance if driver location provided
    let distanceKm: number | null = null;
    if (driverLat !== null && driverLon !== null) {
      distanceKm = getDistanceKm(
        driverLat,
        driverLon,
        order.deliveryLocation.latitude,
        order.deliveryLocation.longitude
      );
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        status: order.status,
        priority: order.priority,
        isEmergency: order.isEmergency,
        estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,

        // Map data — A: driver, B: customer
        mapData: {
          driverLocation: driverLat && driverLon
            ? { latitude: driverLat, longitude: driverLon, label: "A" }
            : null,
          customerLocation: {
            latitude: order.deliveryLocation.latitude,
            longitude: order.deliveryLocation.longitude,
            label: "B",
          },
          distanceKm,
        },

        customer: {
          id: customer?._id,
          name: `${customer?.firstName} ${customer?.lastName}`,
          profilePhoto: customer?.profilePhoto || null,
          phone: customer?.phone,
          email: customer?.email,
        },

        fuelType: order.fuelType,
        quantity: order.quantity,
        requestSource: order.requestSource,
        note: order.note,

        deliveryLocation: {
          address: order.deliveryLocation.address,
          landmark: order.deliveryLocation.landmark,
          latitude: order.deliveryLocation.latitude,
          longitude: order.deliveryLocation.longitude,
        },

        pricing: order.pricing,
        createdAt: order.createdAt,

        // Available next statuses driver can set
        allowedStatusTransitions: getAllowedTransitions(order.status),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// PATCH /api/driver/orders/:id/status — driver updates order status
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user!.id;
    const { status } = req.body;

    const allowedStatuses = ["in_progress", "delivered"];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Driver can only set status to 'in_progress' or 'delivered'",
      });
      return;
    }

    const order = await Order.findOne({
      _id: req.params.id,
      assignedDriverId: driverId,
    }).populate("userId", "firstName lastName fcmToken");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
      return;
    }

    order.status = status;
    await order.save();

    // Notify customer about status change
    const customer = order.userId as any;
    const driver = await Driver.findById(driverId).select("firstName lastName");

    if (customer?.fcmToken && driver) {
      if (status === "in_progress") {
        await sendNotification(
          customer.fcmToken,
          NotificationTemplates.orderInProgress(`${driver.firstName} ${driver.lastName}`)
        );
      } else if (status === "delivered") {
        await sendNotification(customer.fcmToken, NotificationTemplates.orderDelivered());
      }
    }

    // Notify all admins about driver status change
    const admins = await User.find({ role: "admin", fcmToken: { $ne: null } }).select("fcmToken");
    const adminTokens = admins.map((a: any) => a.fcmToken).filter(Boolean) as string[];
    const orderId = order._id.toString();
    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : "Driver";

    if (adminTokens.length) {
      const adminPayload = status === "in_progress"
        ? NotificationTemplates.tripStarted(driverName, orderId)
        : NotificationTemplates.tripCompleted(driverName, orderId);
      await sendMulticastNotification(adminTokens, adminPayload);
    }

    res.status(200).json({
      success: true,
      message: `Order marked as ${status}`,
      data: { orderId: order._id, status: order.status },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// GET /api/driver/orders/completed — all delivered orders for the logged-in driver
export const getCompletedOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user!.id;

    const orders = await Order.find({
      assignedDriverId: driverId,
      status: "delivered",
    })
      .sort({ updatedAt: -1 })
      .populate("userId", "firstName lastName profilePhoto phone");

    const data = orders.map((order) => {
      const customer = order.userId as any;
      return {
        orderId: order._id,
        status: order.status,
        customer: {
          id: customer?._id,
          name: `${customer?.firstName} ${customer?.lastName}`,
          profilePhoto: customer?.profilePhoto || null,
          phone: customer?.phone,
        },
        fuelType: order.fuelType,
        quantity: order.quantity,
        deliveryLocation: {
          address: order.deliveryLocation.address,
          landmark: order.deliveryLocation.landmark,
        },
        pricing: order.pricing,
        note: order.note,
        isEmergency: order.isEmergency,
        createdAt: order.createdAt,
        completedAt: order.updatedAt,
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
