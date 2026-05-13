import { Router } from "express";
import {
  getAssignedOrders,
  getAssignedOrderById,
  updateOrderStatus,
  getCompletedOrders,
} from "../controllers/driverOrder.controller";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

// All routes require driver JWT
router.use(authenticate, authorizeRoles("driver"));

router.get("/completed", getCompletedOrders);              // GET   /api/driver/orders/completed
router.get("/", getAssignedOrders);                        // GET   /api/driver/orders?lat=27.71&lon=85.32
router.get("/:id", getAssignedOrderById);                  // GET   /api/driver/orders/:id
router.patch("/:id/status", updateOrderStatus);            // PATCH /api/driver/orders/:id/status

export default router;
