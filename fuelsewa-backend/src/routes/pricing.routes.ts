import { Router } from "express";
import { getPricing, updatePricing } from "../controllers/pricing.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getPricing);                      // GET  /api/pricing  — public
router.put("/", authenticate, updatePricing);     // PUT  /api/pricing  — admin only

export default router;
