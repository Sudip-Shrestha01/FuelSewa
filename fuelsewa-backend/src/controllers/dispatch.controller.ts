/**
 * Dispatch Controller
 *
 * Handles the admin dispatch workflow:
 * 1. Find optimal drivers for an order using A* algorithm
 * 2. Get ORS route between selected driver and order
 * 3. Assign driver to order with ETA
 * 4. Get all drivers with their current locations
 */

import { Request, Response } from "express";
import Order from "../models/order.model";
import Driver from "../models/driver.model";
import User from "../models/user.model";
import { findOptimalDrivers } from "../services/driverSelectionService";
import { getRoute } from "../services/routePlanner";
import { sendNotification, NotificationTemplates } from "../services/notification.service";

/**
 * POST /api/admin/dispatch/find-drivers
 *
 * Runs A* algorithm to find and rank the best drivers for a given order.
 *
 * Body: { orderId: string }
 */
export const findDriversForOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ success: false, message: "orderId is required" });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const result = await findOptimalDrivers(
      order.deliveryLocation.latitude,
      order.deliveryLocation.longitude,
      order.isEmergency
    );

    result.orderId = orderId;

    res.status(200).json({
      success: true,
      message: `Found ${result.rankedDrivers.length} available drivers`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/dispatch/route
 *
 * Fetches ORS route between a driver and an order location.
 *
 * Body: { driverId: string, orderId: string }
 */
export const getDispatchRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId, orderId } = req.body;

    if (!driverId || !orderId) {
      res.status(400).json({
        success: false,
        message: "driverId and orderId are required",
      });
      return;
    }

    const [driver, order] = await Promise.all([
      Driver.findById(driverId).select("firstName lastName location vehicleInfo contactNumber"),
      Order.findById(orderId),
    ]);

    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const driverLocation = (driver as any).location;
    if (!driverLocation?.latitude || !driverLocation?.longitude) {
      res.status(400).json({
        success: false,
        message: "Driver location is not available for routing",
      });
      return;
    }

    if (!order.deliveryLocation?.latitude || !order.deliveryLocation?.longitude) {
      res.status(400).json({
        success: false,
        message: "Order delivery location coordinates are missing",
      });
      return;
    }

    const route = await getRoute(
      driverLocation.latitude,
      driverLocation.longitude,
      order.deliveryLocation.latitude,
      order.deliveryLocation.longitude
    );

    res.status(200).json({
      success: true,
      data: {
        driver: {
          id: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          location: driverLocation,
          vehicleInfo: driver.vehicleInfo,
          contactNumber: driver.contactNumber,
        },
        order: {
          id: order._id,
          location: order.deliveryLocation,
        },
        route,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/dispatch/assign
 *
 * Assigns the optimal driver to an order and sets ETA.
 *
 * Body: { orderId: string, driverId: string, estimatedDeliveryMinutes?: number }
 */
export const assignDriverToOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, driverId, estimatedDeliveryMinutes } = req.body;

    if (!orderId || !driverId) {
      res.status(400).json({
        success: false,
        message: "orderId and driverId are required",
      });
      return;
    }

    const [driver, order] = await Promise.all([
      Driver.findById(driverId),
      Order.findById(orderId),
    ]);

    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Can only assign drivers to pending orders",
      });
      return;
    }

    // Update order
    order.assignedDriverId = driver._id as any;
    order.status = "accepted";
    if (estimatedDeliveryMinutes) {
      order.estimatedDeliveryMinutes = estimatedDeliveryMinutes;
    }
    await order.save();

    // Re-fetch with populated fields
    const updated = await Order.findById(orderId)
      .populate("userId", "firstName lastName email phone fcmToken")
      .populate("assignedDriverId", "firstName lastName contactNumber vehicleInfo fcmToken");

    // ── Send notifications ────────────────────────────────────────────────────
    const driverName = `${driver.firstName} ${driver.lastName}`;

    // 1. Notify the driver
    const driverWithToken = await Driver.findById(driverId).select("fcmToken");
    if (driverWithToken?.fcmToken) {
      await sendNotification(
        driverWithToken.fcmToken,
        NotificationTemplates.newOrderAssigned(
          orderId,
          order.fuelType,
          order.deliveryLocation?.address ?? "Unknown location"
        )
      );
    }

    // 2. Notify the customer
    const customerDoc = await User.findById(order.userId).select("fcmToken");
    if (customerDoc?.fcmToken) {
      await sendNotification(
        customerDoc.fcmToken,
        NotificationTemplates.driverAssigned(driverName, estimatedDeliveryMinutes ?? null)
      );
    }

    res.status(200).json({
      success: true,
      message: "Driver assigned successfully",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/dispatch/drivers-locations
 *
 * Returns all active drivers with their current locations.
 * Used by the admin map to display driver markers.
 */
export const getDriversWithLocations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const drivers = await Driver.find({
      isActive: true,
      // We want to see all active drivers on the map if possible.
      // If they have no location, they won't be shown as markers but will be in the data.
    }).select("firstName lastName contactNumber vehicleInfo location");

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/dispatch/driver-location/:id
 *
 * Update a driver's current location.
 * Body: { latitude: number, longitude: number }
 */
export const updateDriverLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
      return;
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { location: { latitude, longitude } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }

    // Emit live location to order room if there's an active order
    const activeOrder = await Order.findOne({
      assignedDriverId: driver._id,
      status: { $in: ["accepted", "in_progress"] },
    });

    if (activeOrder) {
      const { io } = require("../app");
      io.to(`order_${activeOrder._id}`).emit("locationUpdate", {
        driverId: driver._id,
        latitude,
        longitude,
        timestamp: new Date(),
      });
      console.log(`Live location emitted for order: ${activeOrder._id}`);
    }

    res.status(200).json({
      success: true,
      message: "Driver location updated",
      data: driver,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
