import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

interface UseLocationResult {
  permissionDenied: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<{ latitude: number; longitude: number } | null>;
}

export function useLocation(): UseLocationResult {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setPermissionDenied(status !== 'granted');
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setPermissionDenied(!granted);
    return granted;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);
      return coords;
    } catch {
      return null;
    }
  }, [requestPermission]);

  return {
    permissionDenied,
    currentLocation,
    requestPermission,
    getCurrentLocation,
  };
}
