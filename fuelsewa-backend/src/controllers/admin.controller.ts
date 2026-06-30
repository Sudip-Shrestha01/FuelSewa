import { Request, Response } from "express";
import User from "../models/user.model";
import Driver from "../models/driver.model";
import Order from "../models/order.model";
import { sendNotification, sendMulticastNotification, NotificationTemplates } from "../services/notification.service";
import { recordOrderOutcome, buildOrderOutcomeData } from "../services/cancellationPrediction";

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
    if (status) {
      const statusArray = (status as string).split(",");
      if (statusArray.length > 1) {
        filter.status = { $in: statusArray };
      } else {
        filter.status = status;
      }
    }
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
      .populate("userId", "firstName lastName email phone fcmToken")
      .populate("assignedDriverId", "firstName lastName contactNumber fcmToken");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const customer = order.userId as any;

    // ── Notify customer based on STATUS change only ──────────────────────────
    // (driver assign notifications are handled separately below to avoid duplicates)
    if (customer?.fcmToken && status && !assignedDriverId) {
      if (status === "in_progress") {
        const drv = order.assignedDriverId as any;
        if (drv) await sendNotification(customer.fcmToken,
          NotificationTemplates.orderInProgress(`${drv.firstName} ${drv.lastName}`));
      } else if (status === "delivered") {
        await sendNotification(customer.fcmToken, NotificationTemplates.orderDelivered());
      } else if (status === "cancelled") {
        await sendNotification(customer.fcmToken, NotificationTemplates.orderCancelled());
      }
    }

    // ── When admin assigns a driver ──────────────────────────────────────────
    if (assignedDriverId) {
      const driverDoc = await Driver.findById(assignedDriverId).select("firstName lastName fcmToken");
      const driverName = driverDoc ? `${driverDoc.firstName} ${driverDoc.lastName}` : "A driver";
      console.log(`[Assign] Driver: ${driverName}, fcmToken: ${driverDoc?.fcmToken ? "EXISTS" : "NULL"}`);

      // 1. Notify the driver about the new assignment
      if (driverDoc?.fcmToken) {
        const deliveryAddr = order.deliveryLocation?.address ?? "Unknown location";
        const sent = await sendNotification(driverDoc.fcmToken,
          NotificationTemplates.newOrderAssigned(
            order._id.toString(),
            order.fuelType,
            deliveryAddr
          )
        );
        console.log(`[Assign] Driver notification sent: ${sent}`);
      } else {
        console.warn(`[Assign] Driver has no fcmToken — notification skipped`);
      }

      // 2. Notify the customer that a driver has been assigned
      const userId = (order.userId as any)?._id ?? order.userId;
      console.log(`[Assign] Looking up customer fcmToken for userId: ${userId}`);
      const customerDoc = await User.findById(userId).select("fcmToken firstName");
      console.log(`[Assign] Customer found: ${customerDoc?.firstName}, fcmToken: ${customerDoc?.fcmToken ? "EXISTS" : "NULL"}`);
      if (customerDoc?.fcmToken) {
        const sent = await sendNotification(customerDoc.fcmToken,
          NotificationTemplates.driverAssigned(driverName, estimatedDeliveryMinutes ?? null)
        );
        console.log(`[Assign] Customer notification sent: ${sent}`);
      } else {
        console.warn(`[Assign] Customer has no fcmToken — notification skipped`);
      }
    }

    // ── Record final outcome for AI model retraining ─────────────────────
    if (status === "cancelled" || status === "delivered") {
      const outcomeData = buildOrderOutcomeData(order, status);
      recordOrderOutcome(outcomeData).then((res) => {
        if (res.auto_retrained) {
          console.log(`[AI] Model auto-retrained after ${res.new_count} new samples`);
        }
      }).catch((err) => {
        console.warn("[AI] Failed to record outcome:", err.message);
      });
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
