/**
 * @file useUserLocation.ts
 * @description Hook to fetch and track user's device location using expo-location.
 */
import { useState, useEffect, useMemo } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface UseUserLocationResult {
  location: LocationData;
  loading: boolean;
  error: string | null;
}

const DEFAULT_LOCATION: LocationData = {
  latitude: 27.7103,
  longitude: 85.3222, // Kathmandu center
};

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (cancelled) return;
        
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch location');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const memoizedLocation = useMemo(() => location, [location.latitude, location.longitude]);

  return {
    location: memoizedLocation,
    loading,
    error,
  };
}
