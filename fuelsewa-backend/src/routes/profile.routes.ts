import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, getProfile);      // GET  /api/profile
router.put("/", authenticate, updateProfile);   // PUT  /api/profile

export default router;
