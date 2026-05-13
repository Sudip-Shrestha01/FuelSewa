import { Request, Response } from "express";
import User from "../models/user.model";
import Driver from "../models/driver.model";
import Order from "../models/order.model";

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: "customer" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getAllDrivers = async (req: Request, res: Response): Promise<void> => {
  try {
    const drivers = await Driver.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const toggleDriverStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await Driver.findById(req.params.id).select("-password");
    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }

    driver.isActive = !driver.isActive;
    await driver.save();

    res.status(200).json({
      success: true,
      message: `Driver ${driver.isActive ? "activated" : "deactivated"} successfully`,
      data: driver,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getDriverById = async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await Driver.findById(req.params.id).select("-password");
    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }
    res.status(200).json({ success: true, data: driver });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, fuelType } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (fuelType) filter.fuelType = fuelType;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email phone")
      .populate("assignedDriverId", "firstName lastName contactNumber");

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "firstName lastName email phone")
      .populate("assignedDriverId", "firstName lastName contactNumber vehicleInfo");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, assignedDriverId, estimatedDeliveryMinutes } = req.body;

    const validStatuses = ["pending", "accepted", "in_progress", "delivered", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status value" });
      return;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(assignedDriverId && { assignedDriverId }), ...(estimatedDeliveryMinutes && { estimatedDeliveryMinutes }) },
      { new: true, runValidators: true }
    )
      .populate("userId", "firstName lastName email phone")
      .populate("assignedDriverId", "firstName lastName contactNumber");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Order updated successfully", data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getCompletedOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ status: "delivered" })
      .sort({ updatedAt: -1 })
      .populate("userId", "firstName lastName email phone")
      .populate("assignedDriverId", "firstName lastName contactNumber");

    const data = orders.map((order: any) => ({
      orderId: order._id,
      status: order.status,
      customer: {
        id: order.userId?._id,
        name: `${order.userId?.firstName} ${order.userId?.lastName}`,
        email: order.userId?.email,
        phone: order.userId?.phone,
      },
      driver: order.assignedDriverId
        ? {
            id: order.assignedDriverId._id,
            name: `${order.assignedDriverId.firstName} ${order.assignedDriverId.lastName}`,
            contactNumber: order.assignedDriverId.contactNumber,
          }
        : null,
      fuelType: order.fuelType,
      quantity: order.quantity,
      deliveryLocation: {
        address: order.deliveryLocation.address,
        landmark: order.deliveryLocation.landmark,
      },
      pricing: order.pricing,
      isEmergency: order.isEmergency,
      note: order.note,
      createdAt: order.createdAt,
      completedAt: order.updatedAt,
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
