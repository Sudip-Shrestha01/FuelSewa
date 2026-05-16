/**
 * Driver Selection Service
 *
 * Uses the A* algorithm to evaluate and rank available drivers
 * for a given order. This service fetches active drivers from the
 * database, prepares candidate data, and delegates to the A* engine
 * for intelligent ranking.
 */

import Driver from "../models/driver.model";
import {
  DriverCandidate,
  DispatchResult,
  rankDriversForDispatch,
} from "../algorithm/aStarAlgorithm";

/**
 * Find and rank the best drivers for a given order location.
 *
 * @param orderLat - Delivery latitude
 * @param orderLng - Delivery longitude
 * @param isEmergency - Whether this is an emergency/SOS request
 * @param maxDrivers - Maximum number of ranked drivers to return
 * @returns DispatchResult with ranked drivers
 */
export async function findOptimalDrivers(
  orderLat: number,
  orderLng: number,
  isEmergency: boolean = false,
  maxDrivers: number = 10
): Promise<DispatchResult> {
  // Fetch all active drivers with location data
  const activeDrivers = await Driver.find({
    isActive: true,
    "location.latitude": { $exists: true, $ne: null },
    "location.longitude": { $exists: true, $ne: null },
  }).select(
    "firstName lastName contactNumber vehicleInfo location"
  );

  // Transform to A* candidates
  const candidates: DriverCandidate[] = activeDrivers.map((driver: any) => ({
    driverId: driver._id.toString(),
    driverName: `${driver.firstName} ${driver.lastName}`,
    latitude: driver.location.latitude,
    longitude: driver.location.longitude,
    vehicleNumber: driver.vehicleInfo?.vehicleNumber || "",
    vehicleType: driver.vehicleInfo?.vehicleType || "",
    contactNumber: driver.contactNumber || "",
  }));

  if (candidates.length === 0) {
    return {
      orderId: "",
      orderLocation: { latitude: orderLat, longitude: orderLng },
      rankedDrivers: [],
      bestDriver: null,
      timestamp: new Date(),
    };
  }

  // Run A* dispatch ranking
  const result = rankDriversForDispatch(
    candidates,
    orderLat,
    orderLng,
    isEmergency
  );

  // Limit to maxDrivers
  result.rankedDrivers = result.rankedDrivers.slice(0, maxDrivers);

  return result;
}
