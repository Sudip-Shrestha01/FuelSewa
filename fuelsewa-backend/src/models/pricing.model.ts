import mongoose, { Document, Schema } from "mongoose";

export interface IPricing extends Document {
  petrolPricePerLiter: number;
  dieselPricePerLiter: number;
  baseFeePerKm: number;
  emergencyFee: number;
  minimumDeliveryFee: number;
  updatedBy?: string;
}

const pricingSchema = new Schema<IPricing>(
  {
    petrolPricePerLiter: { type: Number, required: true, default: 178 },
    dieselPricePerLiter: { type: Number, required: true, default: 163 },
    baseFeePerKm: { type: Number, required: true, default: 20 },
    emergencyFee: { type: Number, required: true, default: 10 },
    minimumDeliveryFee: { type: Number, required: true, default: 80 },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

const Pricing = mongoose.model<IPricing>("Pricing", pricingSchema);

export default Pricing;
