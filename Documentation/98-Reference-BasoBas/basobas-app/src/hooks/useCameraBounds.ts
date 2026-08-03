import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import type { CameraPosition, MapBounds } from '@/src/types/map.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getBoundsFromCamera(camera: CameraPosition): MapBounds {
  const zoom = Math.max(1, camera.zoom);
  const latPerPixel = 360 / (256 * Math.pow(2, zoom));
  const lngPerPixel = 360 / (256 * Math.pow(2, zoom));

  const halfWidthDeg = (SCREEN_WIDTH / 2) * lngPerPixel;
  const halfHeightDeg = (SCREEN_HEIGHT / 2) * latPerPixel;

  return {
    swLat: Math.max(-90, camera.latitude - halfHeightDeg),
    swLng: Math.max(-180, camera.longitude - halfWidthDeg),
    neLat: Math.min(90, camera.latitude + halfHeightDeg),
    neLng: Math.min(180, camera.longitude + halfWidthDeg),
  };
}

export function useCameraBounds(camera: CameraPosition | null): MapBounds | null {
  const lat = camera?.latitude;
  const lng = camera?.longitude;
  const zoom = camera?.zoom;
  return useMemo(() => {
    if (lat == null || lng == null || zoom == null) return null;
    return getBoundsFromCamera({ latitude: lat, longitude: lng, zoom });
  }, [lat, lng, zoom]);
}
