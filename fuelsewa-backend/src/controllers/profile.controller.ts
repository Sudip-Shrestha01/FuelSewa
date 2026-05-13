import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import User from "../models/user.model";
import Driver from "../models/driver.model";

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, role } = req.user!;

    if (role === "driver") {
      const driver = await Driver.findById(id).select("-password");
      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }
      res.status(200).json({ success: true, data: driver });
      return;
    }

    // customer or admin
    const user = await User.findById(id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, role } = req.user!;

    // Drivers cannot edit their own profile
    if (role === "driver") {
      res.status(403).json({
        success: false,
        message: "Drivers are not allowed to edit their profile. Please contact admin.",
      });
      return;
    }

    // Fields customers are not allowed to change
    const restricted = ["role", "password", "email"];
    restricted.forEach((field) => delete req.body[field]);

    const user = await User.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Profile updated successfully", data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
