import { Request, Response } from "express";
import User from "../models/user.model";
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

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required" });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} logged in successfully`,
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
