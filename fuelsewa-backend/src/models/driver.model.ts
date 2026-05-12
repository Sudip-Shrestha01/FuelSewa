import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { UserRole } from "../config/jwt";

export interface IDriver extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber: string;
  email: string;
  password: string;
  role: UserRole;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  profilePhoto?: string;
  userAddress: {
    district: string;
    localLevel: string;
    state: string;
    streetAddress?: string;
  };
  citizenshipNumber: string;
  citizenshipPhoto?: {
    front?: string;
    back?: string;
  };
  licenseNumber: string;
  licenseExpiryDate: Date;
  licensePhoto?: string;
  vehicleInfo: {
    vehicleNumber: string;
    vehicleType: string;
    vehicleModel: string;
    vehiclePhoto?: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const driverSchema = new Schema<IDriver>(
  {
    firstName: { type: String, required: [true, "First name is required"], trim: true },
    middleName: { type: String, trim: true, default: "" },
    lastName: { type: String, required: [true, "Last name is required"], trim: true },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: { type: String, default: "driver" },
    dateOfBirth: { type: Date, required: [true, "Date of birth is required"] },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    profilePhoto: { type: String, default: "" },
    userAddress: {
      district: { type: String, required: [true, "District is required"], trim: true },
      localLevel: { type: String, required: [true, "Local level is required"], trim: true },
      state: { type: String, required: [true, "State is required"], trim: true },
      streetAddress: { type: String, trim: true, default: "" },
    },
    citizenshipNumber: {
      type: String,
      required: [true, "Citizenship number is required"],
      unique: true,
      trim: true,
    },
    citizenshipPhoto: {
      front: { type: String, default: "" },
      back: { type: String, default: "" },
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      trim: true,
    },
    licenseExpiryDate: { type: Date, required: [true, "License expiry date is required"] },
    licensePhoto: { type: String, default: "" },
    vehicleInfo: {
      vehicleNumber: { type: String, required: [true, "Vehicle number is required"], trim: true },
      vehicleType: { type: String, required: [true, "Vehicle type is required"], trim: true },
      vehicleModel: { type: String, required: [true, "Vehicle model is required"], trim: true },
      vehiclePhoto: { type: String, default: "" },
    },
    emergencyContact: {
      name: { type: String, required: [true, "Emergency contact name is required"], trim: true },
      phone: { type: String, required: [true, "Emergency contact phone is required"], trim: true },
      relation: { type: String, required: [true, "Emergency contact relation is required"], trim: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
driverSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
driverSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const Driver = mongoose.model<IDriver>("Driver", driverSchema);

export default Driver;
