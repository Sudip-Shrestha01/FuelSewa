import { Router } from "express";
import { registerFcmToken, sendManualNotification } from "../controllers/notification.controller";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register-token", authenticate, registerFcmToken);          // POST /api/notifications/register-token
router.post("/send", authenticate, authorizeRoles("admin"), sendManualNotification); // POST /api/notifications/send

export default router;
