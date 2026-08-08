/**
 * EdumentX AI — Location Service Interface
 *
 * Abstraction layer between the AI module and the map/geocoding system.
 *
 * This is the KEY file for parallel development between AI and Map teammates.
 * - AI teammate implements MockLocationService (Phase 1)
 * - Map teammate implements RealLocationService (Phase 2) using their geocoding module
 * - Both satisfy this interface — swap via dependency injection
 *
 * Phase 1: MockLocationService — knows 5 Kathmandu locations, no real geocoding
 * Phase 2: RealLocationService — uses Nominatim + map teammate's geocoding module
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  displayName: string;
  /** Bounding box for area searches (min_lat, min_lon, max_lat, max_lon) */
  boundingBox?: [number, number, number, number];
}

export interface StudentLocation {
  coordinates: Coordinates;
  label: string;
}

export interface LocationFilterParams {
  center: Coordinates;
  radiusKm: number;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface LocationService {
  /**
   * Geocode a text location into coordinates.
   * Phase 1: Returns mock data for known locations.
   * Phase 2: Calls Nominatim or teammate's geocoding module.
   */
  geocode(text: string): Promise<GeocodeResult | null>;

  /**
   * Get the student's saved location from their profile.
   * Reads from Firestore or the map module's state.
   */
  getStudentLocation(studentId: string): Promise<StudentLocation | null>;

  /**
   * Calculate the great-circle distance between two points (km).
   * Uses the Haversine formula.
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number;

  /**
   * Filter tutors by radius from a center point.
   * Returns tutors that fall within the radius, with distance_km set.
   */
  filterByRadius<T extends { latitude?: number; longitude?: number }>(
    tutors: T[],
    center: Coordinates,
    radiusKm: number,
  ): (T & { distance_km: number })[];

  /**
   * Format a location for display.
   */
  formatLocation(location: GeocodeResult | StudentLocation): string;
}

// ─── Haversine Utility ───────────────────────────────────────────────────────

/**
 * Calculate the great-circle distance between two points on Earth (km).
 * Using the Haversine formula.
 */
export function haversineDistance(
  coord1: Coordinates,
  coord2: Coordinates,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if a point is within a given radius of a center point.
 */
export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusKm: number,
): boolean {
  return haversineDistance(point, center) <= radiusKm;
}
