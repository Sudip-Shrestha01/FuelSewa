/**
 * Seed Driver Locations
 *
 * Assigns random GPS coordinates within the Kathmandu Valley area
 * to all existing drivers that don't yet have a location set.
 *
 * Usage: npx ts-node src/scripts/seedDriverLocations.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Driver from "../models/driver.model";

dotenv.config();

// Kathmandu Valley bounding area
const KTM_CENTER = { lat: 27.7172, lng: 85.3240 };
const SPREAD = 0.04; // ~4 km radius

function randomOffset(): number {
  return (Math.random() - 0.5) * 2 * SPREAD;
}

async function seed() {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log("Connected to MongoDB");

    const drivers = await Driver.find({
      $or: [
        { location: { $exists: false } },
        { "location.latitude": null },
        { "location.longitude": null },
      ],
    });

    console.log(`Found ${drivers.length} drivers without location`);

    for (const driver of drivers) {
      const lat = KTM_CENTER.lat + randomOffset();
      const lng = KTM_CENTER.lng + randomOffset();

      await Driver.findByIdAndUpdate(driver._id, {
        location: {
          latitude: Math.round(lat * 1000000) / 1000000,
          longitude: Math.round(lng * 1000000) / 1000000,
        },
      });

      console.log(
        `  ✓ ${driver.firstName} ${driver.lastName} → [${lat.toFixed(6)}, ${lng.toFixed(6)}]`
      );
    }

    console.log("\nDone! All drivers now have locations.");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
