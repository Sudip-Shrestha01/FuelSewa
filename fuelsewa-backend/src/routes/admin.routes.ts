import { Router } from "express";
import {
  getAllUsers,
  getAllDrivers,
  getUserById,
  getDriverById,
  toggleDriverStatus,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/admin.controller";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

// All admin routes require a valid JWT with role "admin"
router.use(authenticate, authorizeRoles("admin"));

// Users
router.get("/users", getAllUsers);                                    // GET   /api/admin/users
router.get("/users/:id", getUserById);                               // GET   /api/admin/users/:id

// Drivers
router.get("/drivers", getAllDrivers);                               // GET   /api/admin/drivers
router.get("/drivers/:id", getDriverById);                          // GET   /api/admin/drivers/:id
router.patch("/drivers/:id/toggle-status", toggleDriverStatus);     // PATCH /api/admin/drivers/:id/toggle-status

// Orders
router.get("/orders", getAllOrders);                                 // GET   /api/admin/orders?status=pending&fuelType=petrol
router.get("/orders/:id", getOrderById);                            // GET   /api/admin/orders/:id
router.patch("/orders/:id", updateOrderStatus);                     // PATCH /api/admin/orders/:id

export default router;
