import { Request, Response } from "express";
import Pricing from "../models/pricing.model";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    let pricing = await Pricing.findOne().sort({ updatedAt: -1 });
    if (!pricing) {
      pricing = await Pricing.create({});
    }
    res.status(200).json({ success: true, data: pricing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updatePricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      petrolPricePerLiter,
      dieselPricePerLiter,
      baseFeePerKm,
      emergencyFee,
      minimumDeliveryFee,
    } = req.body;

    let pricing = await Pricing.findOne().sort({ updatedAt: -1 });

    if (!pricing) {
      pricing = await Pricing.create({
        petrolPricePerLiter,
        dieselPricePerLiter,
        baseFeePerKm,
        emergencyFee,
        minimumDeliveryFee,
        updatedBy: req.user?.id,
      });
    } else {
      if (petrolPricePerLiter !== undefined) pricing.petrolPricePerLiter = petrolPricePerLiter;
      if (dieselPricePerLiter !== undefined) pricing.dieselPricePerLiter = dieselPricePerLiter;
      if (baseFeePerKm !== undefined) pricing.baseFeePerKm = baseFeePerKm;
      if (emergencyFee !== undefined) pricing.emergencyFee = emergencyFee;
      if (minimumDeliveryFee !== undefined) pricing.minimumDeliveryFee = minimumDeliveryFee;
      pricing.updatedBy = req.user?.id;
      await pricing.save();
    }

    res.status(200).json({ success: true, message: "Pricing updated successfully", data: pricing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
