/**
 * Nepal camera bounds — EdumentX is a Nepal-only marketplace.
 *
 * `clampCameraToNepal` keeps every native map surface inside the
 * country's bounding box so a gesture can never drift the user into
 * India, Tibet or the world map. Combined with `minZoomPreference`
 * on the native map, the "whole world pan" demo feel is gone: the
 * default camera is zoomed into the Kathmandu Valley at street/neighbourhood
 * level (Kathmandu · Lalitpur · Bhaktapur) and panning is hard-limited.
 *
 * Zero-budget note: expo-maps has no built-in "restrict bounds"
 * prop (the Google Android SDK does have `setLatLngBoundsForCameraTarget`,
 * but it is not exposed through ExpoMaps). The industry-standard
 * fallback — snap the camera back in `onCameraMove` via
 * `setCameraPosition` — is implemented here and wired in `TutorMap`.
 */

export type CameraPoint = {
  latitude: number;
  longitude: number;
  zoom: number;
};

/** Whole-country bounding box (with a small margin so borders never clip). */
export const NEPAL_BOUNDS = {
  southWest: { latitude: 26.35, longitude: 80.06 },
  northEast: { latitude: 30.45, longitude: 88.2 },
};

/** The Kathmandu Valley — Kathmandu, Lalitpur, Bhaktapur ± commuter ring. */
export const KATHMANDU_VALLEY_BOUNDS = {
  southWest: { latitude: 27.55, longitude: 85.15 },
  northEast: { latitude: 27.85, longitude: 85.5 },
};

/** Valley centre — Ratna Park, Kathmandu (matches the legacy default). */
export const KATHMANDU_VALLEY_CENTER: CameraPoint = {
  latitude: 27.7103,
  longitude: 85.3222,
  zoom: 15,
};

/**
 * Camera zoom floors/ceilings. `minZoom` ≈ 10 shows a comfortable
 * country-level slice of Nepal but never the whole world; `maxZoom`
 * = 18 is street-level.
 */
export const NEPAL_ZOOM_RANGE = { min: 10, max: 18 } as const;

/**
 * Clamp a camera position to Nepal's bounds + zoom range.
 *
 * @returns `null` when the camera already respects the bounds (fast
 *   path so callers don't emit unnecessary setCameraPosition calls),
 *   otherwise a copy with latitude/longitude/zoom pulled inside,
 *   with the zoom preserved unless it exceeds the range.
 */
export function clampCameraToNepal(camera: CameraPoint): CameraPoint | null {
  const lat = Math.min(
    NEPAL_BOUNDS.northEast.latitude,
    Math.max(NEPAL_BOUNDS.southWest.latitude, camera.latitude),
  );
  const lon = Math.min(
    NEPAL_BOUNDS.northEast.longitude,
    Math.max(NEPAL_BOUNDS.southWest.longitude, camera.longitude),
  );
  const zoom = Math.min(
    NEPAL_ZOOM_RANGE.max,
    Math.max(NEPAL_ZOOM_RANGE.min, camera.zoom),
  );

  const latOut = lat !== camera.latitude;
  const lonOut = lon !== camera.longitude;
  const zoomOut = zoom !== camera.zoom;
  if (!latOut && !lonOut && !zoomOut) return null;

  return { latitude: lat, longitude: lon, zoom };
}

/** True when a point lies inside the country bounding box. */
export function isWithinNepal(lat: number, lon: number): boolean {
  return (
    lat >= NEPAL_BOUNDS.southWest.latitude &&
    lat <= NEPAL_BOUNDS.northEast.latitude &&
    lon >= NEPAL_BOUNDS.southWest.longitude &&
    lon <= NEPAL_BOUNDS.northEast.longitude
  );
}