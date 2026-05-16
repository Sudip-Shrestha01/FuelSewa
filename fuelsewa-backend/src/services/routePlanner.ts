/**
 * Route Planner Service
 *
 * Uses real-world road routing for navigation data:
 *
 * Priority order:
 *  1. OpenRouteService (ORS) — if API key is configured
 *  2. OSRM (Open Source Routing Machine) — free, no key needed
 *  3. Haversine straight-line — last resort fallback
 *
 * This complements the A* algorithm which handles internal
 * dispatch optimization — this service provides actual navigation data.
 */

import axios from "axios";

// ORS API configuration
const ORS_BASE_URL = "https://api.openrouteservice.org";
const ORS_API_KEY = process.env.ORS_API_KEY || "";

// OSRM public demo server (free, no API key required)
const OSRM_BASE_URL = "https://router.project-osrm.org";

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][]; // [lng, lat] pairs for map rendering
  bbox: [number, number, number, number]; // bounding box
  steps: RouteStep[];
  source: "ors" | "osrm" | "fallback"; // which engine resolved the route
}

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  type: number;
}

/**
 * Fetch driving route between two coordinate pairs.
 *
 * Tries ORS first (if key is set), then OSRM, then straight-line fallback.
 */
export async function getRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult> {
  // 1. Try ORS if API key is available
  if (ORS_API_KEY) {
    try {
      const result = await getRouteFromORS(startLat, startLng, endLat, endLng);
      if (result) return result;
    } catch (err: any) {
      console.warn("ORS failed, falling through to OSRM:", err.message);
    }
  }

  // 2. Try OSRM (free, no API key)
  try {
    const result = await getRouteFromOSRM(startLat, startLng, endLat, endLng);
    if (result) return result;
  } catch (err: any) {
    console.warn("OSRM failed, falling through to fallback:", err.message);
  }

  // 3. Last resort: straight-line fallback
  return generateFallbackRoute(startLat, startLng, endLat, endLng);
}

// ─── ORS Route Engine ───────────────────────────────────────────────

async function getRouteFromORS(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  const response = await axios.post(
    `${ORS_BASE_URL}/v2/directions/driving-car/geojson`,
    {
      coordinates: [
        [startLng, startLat],
        [endLng, endLat],
      ],
    },
    {
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );

  const feature = response.data.features?.[0];
  if (!feature) return null;

  const properties = feature.properties;
  const geometry = feature.geometry;

  const polyline: [number, number][] = geometry.coordinates.map(
    (coord: number[]) => [coord[0], coord[1]] as [number, number]
  );

  const steps: RouteStep[] =
    properties.segments?.[0]?.steps?.map((step: any) => ({
      instruction: step.instruction || "",
      distance: step.distance || 0,
      duration: step.duration || 0,
      type: step.type || 0,
    })) || [];

  return {
    distanceKm: Math.round((properties.summary?.distance || 0) / 10) / 100,
    durationMinutes:
      Math.round(((properties.summary?.duration || 0) / 60) * 10) / 10,
    polyline,
    bbox: properties.bbox || [0, 0, 0, 0],
    steps,
    source: "ors",
  };
}

// ─── OSRM Route Engine (Free, No API Key) ───────────────────────────

async function getRouteFromOSRM(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  // OSRM format: /route/v1/driving/{lng},{lat};{lng},{lat}
  const url = `${OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

  const response = await axios.get(url, { timeout: 10000 });

  if (response.data.code !== "Ok" || !response.data.routes?.length) {
    return null;
  }

  const route = response.data.routes[0];
  const geometry = route.geometry;

  // OSRM GeoJSON coordinates are [lng, lat]
  const polyline: [number, number][] = geometry.coordinates.map(
    (coord: number[]) => [coord[0], coord[1]] as [number, number]
  );

  // Extract steps from legs
  const steps: RouteStep[] = [];
  for (const leg of route.legs || []) {
    for (const step of leg.steps || []) {
      if (step.maneuver) {
        steps.push({
          instruction:
            step.name
              ? `${formatManeuverType(step.maneuver.type)} on ${step.name}`
              : formatManeuverType(step.maneuver.type),
          distance: step.distance || 0,
          duration: step.duration || 0,
          type: 0,
        });
      }
    }
  }

  // Compute bounding box from polyline
  const lngs = polyline.map((p) => p[0]);
  const lats = polyline.map((p) => p[1]);
  const bbox: [number, number, number, number] = [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];

  return {
    distanceKm: Math.round((route.distance || 0) / 10) / 100,
    durationMinutes: Math.round(((route.duration || 0) / 60) * 10) / 10,
    polyline,
    bbox,
    steps,
    source: "osrm",
  };
}

/**
 * Convert OSRM maneuver type to human-readable instruction.
 */
function formatManeuverType(type: string): string {
  const map: Record<string, string> = {
    depart: "Depart",
    arrive: "Arrive at destination",
    turn: "Turn",
    "new name": "Continue",
    merge: "Merge",
    "on ramp": "Take ramp",
    "off ramp": "Exit ramp",
    fork: "Take fork",
    "end of road": "End of road",
    continue: "Continue",
    roundabout: "Enter roundabout",
    rotary: "Enter rotary",
    "roundabout turn": "Roundabout turn",
    notification: "Notice",
  };
  return map[type] || `Continue (${type})`;
}

// ─── Haversine Straight-Line Fallback ───────────────────────────────

function generateFallbackRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): RouteResult {
  const R = 6371;
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLon = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((endLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Estimate ~30 km/h average speed in urban Nepal
  const durationMin = Math.round((distKm / 30) * 60 * 10) / 10;

  // Straight-line intermediate points
  const numPoints = 20;
  const polyline: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    polyline.push([
      startLng + (endLng - startLng) * t,
      startLat + (endLat - startLat) * t,
    ]);
  }

  return {
    distanceKm: Math.round(distKm * 100) / 100,
    durationMinutes: durationMin,
    polyline,
    bbox: [
      Math.min(startLng, endLng),
      Math.min(startLat, endLat),
      Math.max(startLng, endLng),
      Math.max(startLat, endLat),
    ],
    steps: [
      {
        instruction: `Head towards destination (${Math.round(distKm * 10) / 10} km)`,
        distance: distKm * 1000,
        duration: durationMin * 60,
        type: 0,
      },
    ],
    source: "fallback",
  };
}
