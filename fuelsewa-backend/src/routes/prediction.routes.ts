import { Router } from "express";
import {
  handleTrain,
  handleMetrics,
  handlePredict,
  handlePredictFromFeatures,
  handleHealth,
  handleTrainingStats,
  handleHighRiskOrders,
  handleTrainingHistory,
} from "../controllers/prediction.controller";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/train", handleTrain);
router.get("/metrics", handleMetrics);
router.post("/predict", handlePredict);
router.post("/predict-from-features", handlePredictFromFeatures);
router.get("/health", handleHealth);
router.get("/training-stats", handleTrainingStats);
router.get("/high-risk-orders", handleHighRiskOrders);
router.get("/training-history", handleTrainingHistory);

export default router;
