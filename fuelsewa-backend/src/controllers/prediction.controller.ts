import { Request, Response } from "express";
import {
  predictCancellation,
  getMetrics,
  trainModel,
  healthCheck,
  buildOrderFeatures,
  getTrainingStats,
} from "../services/cancellationPrediction";
import Order from "../models/order.model";

export const handleTrain = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await trainModel();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Training failed", error: error.message });
  }
};

export const handleMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getMetrics();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(503).json({ success: false, message: "ML service unavailable", error: error.message });
  }
};

export const handlePredict = async (req: Request, res: Response): Promise<void> => {
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

    const features = buildOrderFeatures(order);
    const prediction = await predictCancellation(features);
    res.status(200).json({ success: true, data: prediction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Prediction failed", error: error.message });
  }
};

export const handlePredictFromFeatures = async (req: Request, res: Response): Promise<void> => {
  try {
    const prediction = await predictCancellation(req.body);
    res.status(200).json({ success: true, data: prediction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Prediction failed", error: error.message });
  }
};

export const handleHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const trained = await healthCheck();
    res.status(200).json({ success: true, data: { modelTrained: trained } });
  } catch {
    res.status(200).json({ success: true, data: { modelTrained: false } });
  }
};

export const handleTrainingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getTrainingStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(503).json({ success: false, message: "ML service unavailable", error: error.message });
  }
};
