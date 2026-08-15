/**
 * @file useCameraBounds.ts
 * @description Hook to calculate map bounds based on camera position and screen dimensions.
 */
import { useMemo } from 'react';
import { Dimensions } from 'react-native';

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export function useCameraBounds(
  camera: { latitude: number; longitude: number; zoom: number } | null
): MapBounds | null {
  const { width, height } = Dimensions.get('window');
  const latitude = camera?.latitude;
  const longitude = camera?.longitude;
  const zoom = camera?.zoom;

  return useMemo(() => {
    if (latitude == null || longitude == null || zoom == null) return null;

    // Approximate calculation of bounds based on zoom level and screen size at equator.
    // Earth circumference in meters roughly 40,075,016
    const metersPerPixel = (40075016 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom + 8);
    
    // Degrees per meter is approximately 1 / 111320 for latitude
    const latDegreesPerMeter = 1 / 111320;
    const lngDegreesPerMeter = 1 / (111320 * Math.cos((latitude * Math.PI) / 180));

    const latDelta = (height / 2) * metersPerPixel * latDegreesPerMeter;
    const lngDelta = (width / 2) * metersPerPixel * lngDegreesPerMeter;

    return {
      swLat: latitude - latDelta,
      swLng: longitude - lngDelta,
      neLat: latitude + latDelta,
      neLng: longitude + lngDelta,
    };
  }, [latitude, longitude, zoom, width, height]);
}
