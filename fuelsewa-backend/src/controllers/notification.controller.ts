import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import User from "../models/user.model";
import Driver from "../models/driver.model";
import { sendNotification, NotificationPayload } from "../services/notification.service";

/**
 * POST /api/notifications/register-token
 * Save FCM token for the logged-in user or driver
 */
export const registerFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fcmToken } = req.body;
    const { id, role } = req.user!;

    if (!fcmToken) {
      res.status(400).json({ success: false, message: "fcmToken is required" });
      return;
    }

    if (role === "driver") {
      await Driver.findByIdAndUpdate(id, { fcmToken });
    } else {
      await User.findByIdAndUpdate(id, { fcmToken });
    }

    res.status(200).json({ success: true, message: "FCM token registered" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * POST /api/notifications/send — admin sends manual notification
 */
export const sendManualNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fcmToken, title, body, data } = req.body;

    if (!fcmToken || !title || !body) {
      res.status(400).json({ success: false, message: "fcmToken, title and body are required" });
      return;
    }

    const payload: NotificationPayload = { title, body, data };
    const sent = await sendNotification(fcmToken, payload);

    res.status(200).json({ success: sent, message: sent ? "Notification sent" : "Failed to send notification" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
