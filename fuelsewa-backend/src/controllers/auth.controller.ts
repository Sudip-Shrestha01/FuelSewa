import { Request, Response } from "express";
import User from "../models/user.model";
import Driver from "../models/driver.model";
import { generateToken } from "../config/jwt";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      phone,
      email,
      password,
      confirmPassword,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      res.status(400).json({ success: false, message: "All required fields must be filled" });
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      res.status(400).json({ success: false, message: "Passwords do not match" });
      return;
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      res.status(409).json({ success: false, message: "Email is already registered" });
      return;
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      res.status(409).json({ success: false, message: "Phone number is already registered" });
      return;
    }

    // Create user — role defaults to "customer"
    const user = await User.create({
      firstName,
      middleName,
      lastName,
      phone,
      email,
      password,
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      data: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required" });
      return;
    }

    // Check User collection first, then Driver collection
    let account: any = await User.findOne({ email });
    let source: "user" | "driver" = "user";

    if (!account) {
      account = await Driver.findOne({ email });
      source = "driver";
    }

    if (!account) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Block inactive drivers from logging in
    if (source === "driver" && account.isActive === false) {
      res.status(403).json({ success: false, message: "Your account has been deactivated. Please contact admin." });
      return;
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const role = source === "driver" ? "driver" : account.role;

    const token = generateToken({
      id: account._id.toString(),
      email: account.email,
      role,
    });

    // Clear FCM token from the opposite collection to prevent cross-role notifications
    if (source === "driver") {
      await User.updateMany({ fcmToken: account.fcmToken }, { $set: { fcmToken: null } }).catch(() => {});
    } else {
      const Driver = (await import("../models/driver.model")).default;
      await Driver.updateMany({ fcmToken: account.fcmToken }, { $set: { fcmToken: null } }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in successfully`,
      token,
      data: {
        id: account._id,
        firstName: account.firstName,
        middleName: account.middleName,
        lastName: account.lastName,
        phone: account.phone || account.contactNumber,
        email: account.email,
        role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
