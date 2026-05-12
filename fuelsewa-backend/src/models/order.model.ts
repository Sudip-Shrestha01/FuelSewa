import mongoose, { Document, Schema } from "mongoose";

export type FuelType = "petrol" | "diesel";
export type OrderStatus = "pending" | "accepted" | "in_progress" | "delivered" | "cancelled";
export type RequestSource = "roadside" | "home" | "office" | "other";
export type Priority = "normal" | "high";

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  fuelType: FuelType;
  quantity: number;
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
    landmark?: string;
  };
  requestSource: RequestSource;
  note?: string;
  pricing: {
    pricePerLiter: number;
    fuelCost: number;
    deliveryFee: number;
    emergencyFee: number;
    totalPrice: number;
  };
  status: OrderStatus;
  priority: Priority;
  isEmergency: boolean;
  assignedDriverId: mongoose.Types.ObjectId | null;
  estimatedDeliveryMinutes: number | null;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: [true, "Fuel type is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.5, "Minimum quantity is 0.5 liters"],
    },
    deliveryLocation: {
      latitude: { type: Number, required: [true, "Latitude is required"] },
      longitude: { type: Number, required: [true, "Longitude is required"] },
      address: { type: String, required: [true, "Address is required"], trim: true },
      landmark: { type: String, trim: true, default: "" },
    },
    requestSource: {
      type: String,
      enum: ["roadside", "home", "office", "other"],
      required: [true, "Request source is required"],
    },
    note: { type: String, trim: true, default: "" },
    pricing: {
      pricePerLiter: { type: Number, required: true },
      fuelCost: { type: Number, required: true },
      deliveryFee: { type: Number, required: true },
      emergencyFee: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "delivered", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["normal", "high"],
      default: "normal",
    },
    isEmergency: { type: Boolean, default: false },
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    estimatedDeliveryMinutes: { type: Number, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
