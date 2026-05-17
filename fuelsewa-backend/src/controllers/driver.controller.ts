import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Driver from "../models/driver.model";
import { generateToken } from "../config/jwt";

export const addDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      contactNumber,
      email,
      password,
      dateOfBirth,
      gender,
      profilePhoto,
      userAddress,
      citizenshipNumber,
      citizenshipPhoto,
      licenseNumber,
      licenseExpiryDate,
      licensePhoto,
      vehicleInfo,
      emergencyContact,
      location,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !contactNumber ||
      !email ||
      !password ||
      !dateOfBirth ||
      !gender ||
      !userAddress?.district ||
      !userAddress?.localLevel ||
      !userAddress?.state ||
      !citizenshipNumber ||
      !licenseNumber ||
      !licenseExpiryDate ||
      !vehicleInfo?.vehicleNumber ||
      !vehicleInfo?.vehicleType ||
      !vehicleInfo?.vehicleModel ||
      !emergencyContact?.name ||
      !emergencyContact?.phone ||
      !emergencyContact?.relation
    ) {
      res.status(400).json({ success: false, message: "All required fields must be filled" });
      return;
    }

    // Validate driver must be at least 18 years old
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (isNaN(dob.getTime()) || dob >= today) {
      res.status(400).json({ success: false, message: "Date of birth must be a valid past date" });
      return;
    }
    if (age < 18) {
      res.status(400).json({ success: false, message: "Driver must be at least 18 years old" });
      return;
    }

    // Check duplicates
    const existingEmail = await Driver.findOne({ email });
    if (existingEmail) {
      res.status(409).json({ success: false, message: "Email is already registered" });
      return;
    }

    const existingContact = await Driver.findOne({ contactNumber });
    if (existingContact) {
      res.status(409).json({ success: false, message: "Contact number is already registered" });
      return;
    }

    const existingCitizenship = await Driver.findOne({ citizenshipNumber });
    if (existingCitizenship) {
      res.status(409).json({ success: false, message: "Citizenship number is already registered" });
      return;
    }

    const existingLicense = await Driver.findOne({ licenseNumber });
    if (existingLicense) {
      res.status(409).json({ success: false, message: "License number is already registered" });
      return;
    }

    const driver = await Driver.create({
      firstName,
      middleName,
      lastName,
      contactNumber,
      email,
      password,
      dateOfBirth,
      gender,
      profilePhoto,
      userAddress,
      citizenshipNumber,
      citizenshipPhoto,
      licenseNumber,
      licenseExpiryDate,
      licensePhoto,
      vehicleInfo,
      emergencyContact,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Driver added successfully",
      data: {
        id: driver._id,
        firstName: driver.firstName,
        middleName: driver.middleName,
        lastName: driver.lastName,
        contactNumber: driver.contactNumber,
        email: driver.email,
        role: driver.role,
        gender: driver.gender,
        dateOfBirth: driver.dateOfBirth,
        userAddress: driver.userAddress,
        citizenshipNumber: driver.citizenshipNumber,
        licenseNumber: driver.licenseNumber,
        licenseExpiryDate: driver.licenseExpiryDate,
        vehicleInfo: driver.vehicleInfo,
        emergencyContact: driver.emergencyContact,
        isActive: driver.isActive,
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

export const getAllDrivers = async (req: Request, res: Response): Promise<void> => {
  try {
    const drivers = await Driver.find().select("-password");
    res.status(200).json({ success: true, count: drivers.length, data: drivers });
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

export const updateDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = { ...req.body };

    // If password is being updated, hash it manually before saving
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    } else {
      // Never accidentally clear the password
      delete updates.password;
    }

    const driver = await Driver.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Driver updated successfully", data: driver });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      res.status(404).json({ success: false, message: "Driver not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Driver deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
