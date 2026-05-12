import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  cancelOrder,
} from "../controllers/order.controller";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

// Customer routes
router.post("/", authenticate, authorizeRoles("customer"), createOrder);
router.get("/my-orders", authenticate, authorizeRoles("customer"), getMyOrders);
router.patch("/:id/cancel", authenticate, authorizeRoles("customer"), cancelOrder);

// Shared — customer or driver can view a single order
router.get("/:id", authenticate, getOrderById);

// Admin route — all orders
router.get("/", authenticate, getAllOrders);

export default router;
