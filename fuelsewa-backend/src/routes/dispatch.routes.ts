import { Router } from "express";
import {
  findDriversForOrder,
  getDispatchRoute,
  assignDriverToOrder,
  getDriversWithLocations,
  updateDriverLocation,
} from "../controllers/dispatch.controller";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

// ── Customer / Driver accessible routes ──────────────────────────

// Get real road route (used by customer live tracking + admin preview)
router.post("/route", authenticate, getDispatchRoute);

// Update a driver's location (called by driver app)
router.patch("/driver-location/:id", authenticate, updateDriverLocation);

// ── Admin-only routes ────────────────────────────────────────────

// A* algorithm — find and rank drivers for an order
router.post("/find-drivers", authenticate, authorizeRoles("admin"), findDriversForOrder);

// Assign driver to order
router.post("/assign", authenticate, authorizeRoles("admin"), assignDriverToOrder);

// Get all driver locations for map display
router.get("/drivers-locations", authenticate, authorizeRoles("admin"), getDriversWithLocations);

export default router;
