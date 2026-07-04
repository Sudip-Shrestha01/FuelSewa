import axios from "axios";
import Order from "../models/order.model";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

interface PredictionResult {
  probability: number;
  riskTag: "Low" | "Medium" | "High" | "Very High";
}

interface MetricsResult {
  f1_score: number;
  confusion_matrix: number[][];
  classification_report: Record<string, any>;
  heatmap: string;
  feature_importance: string;
  feature_importance_data: [string, number][];
  n_samples: number;
  n_cancelled: number;
  new_samples: number;
}

interface RecordOutcomeResult {
  recorded: boolean;
  auto_retrained: boolean;
  new_count: number;
}

interface TrainingStatsResult {
  new_samples: number;
  auto_retrain_threshold: number;
  model_trained: boolean;
  last_metrics: MetricsResult | null;
}

const client = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000,
});

export async function predictCancellation(
  orderFeatures: Record<string, any>
): Promise<PredictionResult> {
  const now = new Date();
  const payload = {
    fuelType: orderFeatures.fuelType || "petrol",
    quantity: orderFeatures.quantity || 0,
    requestSource: orderFeatures.requestSource || "home",
    priority: orderFeatures.priority || "normal",
    isEmergency: !!orderFeatures.isEmergency,
    isFarZone: !!orderFeatures.isFarZone,
    pricing_totalPrice: orderFeatures.pricing_totalPrice || 0,
    pricing_deliveryFee: orderFeatures.pricing_deliveryFee || 0,
    pricing_emergencyFee: orderFeatures.pricing_emergencyFee || 0,
    estimatedDeliveryMinutes: orderFeatures.estimatedDeliveryMinutes || 10,
    distance_km: orderFeatures.distance_km || 0,
    hour_of_day: orderFeatures.hour_of_day ?? now.getHours(),
    day_of_week: orderFeatures.day_of_week ?? now.getDay(),
    is_weekend: orderFeatures.is_weekend ?? [0, 6].includes(now.getDay()),
    userId: orderFeatures.userId || "",
    pastOrders: orderFeatures.pastOrders || 0,
    pastCancellations: orderFeatures.pastCancellations || 0,
  };

  const { data } = await client.post("/predict", payload);
  return data;
}

export async function getMetrics(): Promise<MetricsResult> {
  const { data } = await client.get("/metrics");
  return data.data;
}

export async function trainModel(): Promise<MetricsResult> {
  const { data } = await client.post("/train");
  return data.data;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const { data } = await client.get("/health");
    return data.model_trained;
  } catch {
    return false;
  }
}

export async function recordOrderOutcome(
  outcomeData: Record<string, any>
): Promise<RecordOutcomeResult> {
  try {
    const { data } = await client.post("/record-outcome", outcomeData);
    return data.data;
  } catch {
    return { recorded: false, auto_retrained: false, new_count: 0 };
  }
}

export async function getTrainingStats(): Promise<TrainingStatsResult> {
  try {
    const { data } = await client.get("/training-stats");
    return data.data;
  } catch {
    return { new_samples: 0, auto_retrain_threshold: 20, model_trained: false, last_metrics: null };
  }
}

export async function buildOrderFeatures(order: any): Promise<Record<string, any>> {
  const now = new Date();

  const userId = order.userId?._id?.toString() || order.userId?.toString() || "";
  let pastOrders = 0;
  let pastCancellations = 0;
  if (userId) {
    const past = await Order.find({
      userId: order.userId,
      _id: { $ne: order._id },
    }).lean();
    pastOrders = past.length;
    pastCancellations = past.filter((o: any) => o.status === "cancelled").length;
  }

  return {
    fuelType: order.fuelType,
    quantity: order.quantity,
    requestSource: order.requestSource,
    priority: order.priority,
    isEmergency: order.isEmergency,
    isFarZone: order.isFarZone ?? false,
    pricing_totalPrice: order.pricing?.totalPrice,
    pricing_deliveryFee: order.pricing?.deliveryFee,
    pricing_emergencyFee: order.pricing?.emergencyFee,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes || 10,
    distance_km: order.distance_km || 0,
    hour_of_day: now.getHours(),
    day_of_week: now.getDay(),
    is_weekend: [0, 6].includes(now.getDay()),
    userId,
    pastOrders,
    pastCancellations,
  };
}

export function buildOrderOutcomeData(order: any, status: string): Record<string, any> {
  const now = new Date();
  return {
    orderId: order._id?.toString() || "",
    userId: order.userId?._id?.toString() || order.userId?.toString() || "",
    fuelType: order.fuelType,
    quantity: order.quantity,
    requestSource: order.requestSource,
    priority: order.priority,
    isEmergency: order.isEmergency,
    isFarZone: order.isFarZone ?? false,
    totalPrice: order.pricing?.totalPrice || 0,
    pricePerLiter: order.pricing?.pricePerLiter || 0,
    fuelCost: order.pricing?.fuelCost || 0,
    deliveryFee: order.pricing?.deliveryFee || 0,
    emergencyFee: order.pricing?.emergencyFee || 0,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes || 0,
    distance_km: order.distance_km || 0,
    lat: order.deliveryLocation?.latitude || 0,
    lng: order.deliveryLocation?.longitude || 0,
    address: order.deliveryLocation?.address || "",
    cancelReason: order.cancelReason || "",
    target: status === "cancelled" ? 1 : 0,
    hour_of_day: now.getHours(),
    day_of_week: now.getDay(),
    is_weekend: [0, 6].includes(now.getDay()) ? 1 : 0,
  };
}
