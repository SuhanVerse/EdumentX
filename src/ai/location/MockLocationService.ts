/**
 * EdumentX AI — Mock Location Service (Phase 1)
 *
 * Placeholder implementation that knows 5 common Kathmandu Valley locations.
 * Used until the map teammate's geocoding module is ready.
 *
 * This is the file that gets swapped out in Phase 2 when RealLocationService
 * is implemented. The swap is a single line change in ai/config.ts.
 */

import type { LocationService, Coordinates, GeocodeResult, StudentLocation } from "./LocationService";
import { haversineDistance } from "./LocationService";

// ─── Known Locations ─────────────────────────────────────────────────────────

const KNOWN_LOCATIONS: Record<string, GeocodeResult> = {
  "baneshwor": {
    coordinates: { latitude: 27.6817, longitude: 85.3449 },
    displayName: "Baneshwor, Kathmandu",
    boundingBox: [27.67, 85.33, 27.69, 85.36],
  },
  "new baneshwor": {
    coordinates: { latitude: 27.6882, longitude: 85.3508 },
    displayName: "New Baneshwor, Kathmandu",
    boundingBox: [27.68, 85.34, 27.70, 85.36],
  },
  "kathmandu": {
    coordinates: { latitude: 27.7172, longitude: 85.3240 },
    displayName: "Kathmandu",
    boundingBox: [27.65, 85.25, 27.78, 85.40],
  },
  "lalitpur": {
    coordinates: { latitude: 27.6762, longitude: 85.3235 },
    displayName: "Lalitpur",
    boundingBox: [27.65, 85.30, 27.70, 85.35],
  },
  "patan": {
    coordinates: { latitude: 27.6722, longitude: 85.3233 },
    displayName: "Patan, Lalitpur",
    boundingBox: [27.66, 85.31, 27.68, 85.34],
  },
  "patan dhoka": {
    coordinates: { latitude: 27.6695, longitude: 85.3250 },
    displayName: "Patan Dhoka, Lalitpur",
  },
  "bhaktapur": {
    coordinates: { latitude: 27.6720, longitude: 85.4278 },
    displayName: "Bhaktapur",
    boundingBox: [27.65, 85.40, 27.69, 85.45],
  },
  "baluwatar": {
    coordinates: { latitude: 27.7263, longitude: 85.3276 },
    displayName: "Baluwatar, Kathmandu",
  },
  "kalanki": {
    coordinates: { latitude: 27.6995, longitude: 85.2870 },
    displayName: "Kalanki, Kathmandu",
  },
  "balkhu": {
    coordinates: { latitude: 27.6895, longitude: 85.3010 },
    displayName: "Balkhu, Kathmandu",
  },
  "swayambhu": {
    coordinates: { latitude: 27.7150, longitude: 85.2910 },
    displayName: "Swayambhunath, Kathmandu",
  },
  "gongabu": {
    coordinates: { latitude: 27.7470, longitude: 85.3350 },
    displayName: "Gongabu, Kathmandu",
  },
  "bhaisepati": {
    coordinates: { latitude: 27.6530, longitude: 85.3180 },
    displayName: "Bhaisepati, Lalitpur",
  },
  "mahalaxmisthan": {
    coordinates: { latitude: 27.6680, longitude: 85.3300 },
    displayName: "Mahalaxmisthan, Lalitpur",
  },
  "taumadhi": {
    coordinates: { latitude: 27.6750, longitude: 85.4320 },
    displayName: "Taumadhi, Bhaktapur",
  },
  "suryabinayak": {
    coordinates: { latitude: 27.6550, longitude: 85.4400 },
    displayName: "Suryabinayak, Bhaktapur",
  },
};

// ─── Mock Location Service ───────────────────────────────────────────────────

export class MockLocationService implements LocationService {
  async geocode(text: string): Promise<GeocodeResult | null> {
    if (!text || text.trim().length === 0) return null;

    const normalized = text.toLowerCase().trim();

    // Direct match
    if (KNOWN_LOCATIONS[normalized]) {
      return KNOWN_LOCATIONS[normalized];
    }

    // Partial match (e.g., "near baneshwor" → Baneshwor)
    for (const [key, value] of Object.entries(KNOWN_LOCATIONS)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    // No match found
    return null;
  }

  async getStudentLocation(studentId: string): Promise<StudentLocation | null> {
    // Phase 1: No student location available yet
    // In Phase 2, this would read from Firestore or the map module's state
    return null;
  }

  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return haversineDistance(coord1, coord2);
  }

  filterByRadius<T extends { latitude?: number; longitude?: number }>(
    tutors: T[],
    center: Coordinates,
    radiusKm: number,
  ): (T & { distance_km: number })[] {
    return tutors
      .filter((tutor) => {
        if (tutor.latitude == null || tutor.longitude == null) return false;
        const dist = haversineDistance(
          { latitude: tutor.latitude, longitude: tutor.longitude },
          center,
        );
        return dist <= radiusKm;
      })
      .map((tutor) => {
        const dist = haversineDistance(
          {
            latitude: tutor.latitude ?? center.latitude,
            longitude: tutor.longitude ?? center.longitude,
          },
          center,
        );
        return { ...tutor, distance_km: dist };
      });
  }

  formatLocation(location: GeocodeResult | StudentLocation): string {
    if ("displayName" in location) {
      return location.displayName;
    }
    return location.label;
  }
}

// Singleton instance
export const mockLocationService = new MockLocationService();
