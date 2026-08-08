/**
 * Utility functions for distance calculation and ranking.
 */

/**
 * Calculate the great-circle distance between two points on the Earth's surface.
 * Uses the Haversine formula.
 * 
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Filter and rank a list of tutors by distance from a user's location.
 * 
 * @param tutors Array of tutors containing optional coordinates
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @param maxRadiusKm Maximum distance to include in the results (default 15km)
 * @returns Sorted array of tutors with their calculated distance in km
 */
export function rankTutorsByDistance<T extends { coordinates?: { latitude: number; longitude: number } }>(
  tutors: T[],
  userLat: number,
  userLng: number,
  maxRadiusKm: number = 15
): (T & { distanceKm: number })[] {
  return tutors
    .filter((tutor) => tutor.coordinates != null)
    .map((tutor) => {
      const distanceKm = haversineKm(
        userLat,
        userLng,
        tutor.coordinates!.latitude,
        tutor.coordinates!.longitude
      );
      return { ...tutor, distanceKm };
    })
    .filter((tutor) => tutor.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
