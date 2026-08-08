# EdumentX — Map Integration Guide (Phase 5.2–5.4)

> **Reference Implementation:** BasoBas App (`Documentation/98-Reference-BasoBas/basobas-app`)
> **Priority:** P0 — Core value proposition (map-first tutor discovery)
> **Estimated Effort:** 3–5 development sessions
> **Prerequisites:** EAS development build (maps require native code)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Step 1: Install Dependencies](#2-step-1-install-dependencies)
3. [Step 2: Configure expo-maps](#3-step-2-configure-expo-maps)
4. [Step 3: Update Data Model](#4-step-3-update-data-model)
5. [Step 4: Build the Map Component](#5-step-4-build-the-map-component)
6. [Step 5: Add Pin Clustering](#6-step-5-add-pin-clustering)
7. [Step 6: Build Camera Bounds Hook](#7-step-6-build-camera-bounds-hook)
8. [Step 7: Get User Location](#8-step-7-get-user-location)
9. [Step 8: Build Tutor Preview Sheet](#9-step-8-build-tutor-preview-sheet)
10. [Step 9: Add Free Geocoding](#10-step-9-add-free-geocoding)
11. [Step 10: Wire It All Into MapSearch.tsx](#11-step-10-wire-it-all-into-mapsearchtsx)
12. [Step 11: Client-Side KNN Ranking](#12-step-11-client-side-knn-ranking)
13. [Step 12: EAS Build & Testing](#13-step-12-eas-build--testing)

---

## 1. Architecture Overview

### How BasoBas Does It (Reference)

BasoBas implements maps using a **5-layer architecture**:

```
┌─────────────────────────────────────────────┐
│  Screen Layer     (tenant)/(tabs)/search.tsx │
├─────────────────────────────────────────────┤
│  Map Component    AppMap.tsx (expo-maps)     │
│                   PropertyPreviewSheet.tsx   │
│                   PropertyMapPin.tsx         │
├─────────────────────────────────────────────┤
│  Hooks Layer      useMapClustering.ts        │
│                   useCameraBounds.ts         │
│                   useLocation.ts             │
├─────────────────────────────────────────────┤
│  Service Layer    map.service.ts             │
│                   (Supabase RPCs + Edge Fns) │
├─────────────────────────────────────────────┤
│  Data Layer       propertyStore.ts           │
│                   map.types.ts               │
└─────────────────────────────────────────────┘
```

### How EdumentX Will Adapt It

```
┌─────────────────────────────────────────────┐
│  Screen Layer     screens/student/MapSearch  │
├─────────────────────────────────────────────┤
│  Map Component    components/map/TutorMap    │
│                   TutorPreviewSheet.tsx       │
│                   TutorMapPin.tsx             │
├─────────────────────────────────────────────┤
│  Hooks Layer      hooks/useTutorClustering   │
│                   hooks/useCameraBounds      │
│                   hooks/useUserLocation      │
├─────────────────────────────────────────────┤
│  Service Layer    lib/tutor/firestoreTutor   │
│                   lib/location/geocoding     │
│                   lib/location/distance      │
├─────────────────────────────────────────────┤
│  Data Layer       lib/tutor/types.ts         │
│                   types/map.types.ts         │
└─────────────────────────────────────────────┘
```

**Key Difference:** BasoBas uses Supabase PostGIS RPCs for spatial queries (`get_properties_in_bounds`, `get_properties_near`). EdumentX uses Firestore (Spark plan) which has **no spatial query support**. We solve this by:
1. Loading ALL approved tutors via `subscribeTutors()` (already implemented)
2. Filtering client-side using Haversine distance calculation
3. Clustering client-side using `supercluster`

This works because the Kathmandu Valley tutor dataset will be small (hundreds, not millions).

---

## 2. Step 1: Install Dependencies

```bash
# Native map rendering
npx expo install expo-maps

# User device location
npx expo install expo-location

# Pin clustering (same library BasoBas uses)
npm install supercluster
npm install -D @types/supercluster

# Optional: Better bottom sheets for preview cards
npx expo install @gorhom/bottom-sheet
```

---

## 3. Step 2: Configure expo-maps

### Update `app.json`

Add the `expo-maps` plugin alongside the existing plugins:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-dev-client",
      ["expo-maps", {
        "requestLocationPermission": true,
        "locationPermission": "Allow EdumentX to access your location to find nearby tutors"
      }],
      ...existing plugins...
    ],
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

> **Zero-Budget Option:** If you don't want to pay for Google Maps, you can use `react-native-maps` with OpenStreetMap tiles instead. But `expo-maps` gives a much better native experience and Google Maps has a generous free tier (28,000 map loads/month free).

### Trigger a New EAS Build

Maps require native code that Expo Go cannot run:

```bash
eas build --profile development --platform android --clear-cache
```

---

## 4. Step 3: Update Data Model

### Add Coordinates to `lib/tutor/types.ts`

The current `TutorLocation` only has `neighborhood` and `city` strings. We need lat/lng:

```typescript
// Add to lib/tutor/types.ts

export type TutorCoordinates = {
  latitude: number;   // e.g., 27.7172
  longitude: number;  // e.g., 85.3240
};

export type TutorLocation = {
  neighborhood: string;  // e.g., "Baluwatar"
  city: string;          // e.g., "Kathmandu"
  coordinates?: TutorCoordinates;  // ← NEW
};
```

### Add Coordinates to `TutorListing` (in `firestoreTutorService.ts`)

```typescript
export type TutorListing = {
  ...existing fields...
  coordinates?: { latitude: number; longitude: number };  // ← NEW
};
```

### Update the `subscribeTutors()` mapper to read coordinates from Firestore docs

In the `onSnapshot` callback, add:

```typescript
const rawCoords = data.coordinates as
  | { latitude?: number; longitude?: number }
  | null | undefined;

return {
  ...existing fields...,
  coordinates: (
    typeof rawCoords?.latitude === 'number' &&
    typeof rawCoords?.longitude === 'number'
  ) ? { latitude: rawCoords.latitude, longitude: rawCoords.longitude }
    : undefined,
};
```

---

## 5. Step 4: Build the Map Component

### Create `components/map/TutorMap.tsx`

This follows the **exact same pattern** as BasoBas's `AppMap.tsx` — a `forwardRef` wrapper that renders `GoogleMaps.View` on Android and `AppleMaps.View` on iOS:

```typescript
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { GoogleMaps, AppleMaps } from 'expo-maps';

// ── Types ──

export type MapCameraPosition = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type TutorMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  snippet?: string;
  color?: string;
};

export type TutorMapHandle = {
  setCameraPosition: (pos: MapCameraPosition & { duration?: number }) => void;
};

export interface TutorMapProps {
  style?: ViewStyle;
  cameraPosition?: MapCameraPosition;
  markers?: TutorMarker[];
  isMyLocationEnabled?: boolean;
  onMarkerClick?: (marker: TutorMarker) => void;
  onCameraMove?: (event: MapCameraPosition) => void;
}

// ── Android (Google Maps) ──

const AndroidMap = forwardRef<TutorMapHandle, TutorMapProps>((props, ref) => {
  const { style, cameraPosition, markers = [], isMyLocationEnabled, onMarkerClick, onCameraMove } = props;
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      nativeRef.current?.setCameraPosition({
        coordinates: { latitude: config.latitude, longitude: config.longitude },
        zoom: config.zoom,
        duration: config.duration,
      });
    },
  }), []);

  return (
    <GoogleMaps.View
      ref={nativeRef}
      style={style as any}
      cameraPosition={cameraPosition ? {
        coordinates: { latitude: cameraPosition.latitude, longitude: cameraPosition.longitude },
        zoom: cameraPosition.zoom,
      } : undefined}
      markers={markers.map((m) => ({
        id: m.id,
        coordinates: { latitude: m.latitude, longitude: m.longitude },
        title: m.title,
      }))}
      properties={{ isMyLocationEnabled }}
      onMarkerClick={(e) => {
        const m = markers.find((x) => x.id === e.id);
        if (m) onMarkerClick?.(m);
      }}
      onCameraMove={(e) => onCameraMove?.({
        latitude: e.coordinates.latitude ?? 0,
        longitude: e.coordinates.longitude ?? 0,
        zoom: e.zoom ?? 10,
      })}
    />
  );
});
AndroidMap.displayName = 'AndroidMap';

// ── iOS (Apple Maps) ──

const IosMap = forwardRef<TutorMapHandle, TutorMapProps>((props, ref) => {
  const { style, cameraPosition, markers = [], isMyLocationEnabled, onMarkerClick, onCameraMove } = props;
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      nativeRef.current?.setCameraPosition({
        coordinates: { latitude: config.latitude, longitude: config.longitude },
        zoom: config.zoom,
      });
    },
  }), []);

  return (
    <AppleMaps.View
      ref={nativeRef}
      style={style as any}
      cameraPosition={cameraPosition ? {
        coordinates: { latitude: cameraPosition.latitude, longitude: cameraPosition.longitude },
        zoom: cameraPosition.zoom,
      } : undefined}
      markers={markers.map((m) => ({
        id: m.id,
        coordinates: { latitude: m.latitude, longitude: m.longitude },
        title: m.title,
        tintColor: m.color,
      }))}
      properties={{ isMyLocationEnabled }}
      onMarkerClick={(e) => {
        const m = markers.find((x) => x.id === e.id);
        if (m) onMarkerClick?.(m);
      }}
      onCameraMove={(e) => onCameraMove?.({
        latitude: e.coordinates.latitude ?? 0,
        longitude: e.coordinates.longitude ?? 0,
        zoom: e.zoom ?? 10,
      })}
    />
  );
});
IosMap.displayName = 'IosMap';

// ── Export ──

export const TutorMapView = Platform.OS === 'ios' ? IosMap : AndroidMap;
```

---

## 6. Step 5: Add Pin Clustering

### Create `hooks/useTutorClustering.ts`

Direct adaptation of BasoBas's `useMapClustering.ts`, replacing `PropertyPin` with `TutorListing`:

```typescript
import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { TutorListing } from '@/lib/tutor/firestoreTutorService';

export type TutorClusterFeature = {
  id: string;
  type: 'cluster' | 'tutor';
  latitude: number;
  longitude: number;
  count?: number;
  tutors: TutorListing[];
};

export function useTutorClustering(
  tutors: TutorListing[],
  zoom: number,
  bounds?: { swLat: number; swLng: number; neLat: number; neLng: number } | null,
): TutorClusterFeature[] {
  // Only tutors with coordinates can be plotted
  const geoTutors = useMemo(
    () => tutors.filter((t) => t.coordinates != null),
    [tutors],
  );

  const index = useMemo(() => {
    const cluster = new Supercluster<TutorListing, Record<string, never>>({
      radius: 60,
      maxZoom: 16,
      minZoom: 1,
    });

    const features = geoTutors.map((t) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [t.coordinates!.longitude, t.coordinates!.latitude] as [number, number],
      },
      properties: t,
    }));

    cluster.load(features as any);
    return cluster;
  }, [geoTutors]);

  return useMemo(() => {
    if (!bounds) return [];

    const bbox: [number, number, number, number] = [
      bounds.swLng, bounds.swLat, bounds.neLng, bounds.neLat,
    ];

    return index.getClusters(bbox, Math.floor(zoom)).map((feature: any) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      if (props.cluster) {
        const leaves = index.getLeaves(props.cluster_id, Infinity);
        return {
          id: `cluster-${props.cluster_id}`,
          type: 'cluster' as const,
          latitude: lat,
          longitude: lng,
          count: props.point_count,
          tutors: leaves.map((l: any) => l.properties),
        };
      }

      return {
        id: props.uid,
        type: 'tutor' as const,
        latitude: lat,
        longitude: lng,
        tutors: [props],
      };
    });
  }, [index, bounds, zoom]);
}
```

---

## 7. Step 6: Build Camera Bounds Hook

### Create `hooks/useCameraBounds.ts`

Exact adaptation of BasoBas's implementation:

```typescript
import { useMemo } from 'react';
import { Dimensions } from 'react-native';

export type MapBounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getBoundsFromCamera(lat: number, lng: number, zoom: number): MapBounds {
  const z = Math.max(1, zoom);
  const latPerPx = 360 / (256 * Math.pow(2, z));
  const lngPerPx = 360 / (256 * Math.pow(2, z));

  return {
    swLat: Math.max(-90, lat - (SCREEN_HEIGHT / 2) * latPerPx),
    swLng: Math.max(-180, lng - (SCREEN_WIDTH / 2) * lngPerPx),
    neLat: Math.min(90, lat + (SCREEN_HEIGHT / 2) * latPerPx),
    neLng: Math.min(180, lng + (SCREEN_WIDTH / 2) * lngPerPx),
  };
}

export function useCameraBounds(
  camera: { latitude: number; longitude: number; zoom: number } | null,
): MapBounds | null {
  return useMemo(() => {
    if (!camera) return null;
    return getBoundsFromCamera(camera.latitude, camera.longitude, camera.zoom);
  }, [camera?.latitude, camera?.longitude, camera?.zoom]);
}
```

---

## 8. Step 7: Get User Location

### Create `hooks/useUserLocation.ts`

```typescript
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// Kathmandu default (Ratna Park)
const KATHMANDU_DEFAULT = { latitude: 27.7103, longitude: 85.3222 };

export function useUserLocation() {
  const [location, setLocation] = useState(KATHMANDU_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      } catch (err) {
        if (!cancelled) setError('Could not get location');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { location, loading, error };
}
```

---

## 9. Step 8: Build Tutor Preview Sheet

When a user taps a tutor pin on the map, a bottom sheet slides up showing the tutor's info and a "View Profile" button. This follows BasoBas's `PropertyPreviewSheet.tsx` pattern.

### Create `components/map/TutorPreviewSheet.tsx`

Use a `Modal` with spring animation (matching your existing `FiltersSheet` pattern), or install `@gorhom/bottom-sheet` for a more polished experience.

The sheet should display:
- Tutor avatar + name
- Verification badge (if verified)
- Subjects, rate, location
- "View Profile" button → navigates to `/tutor/${uid}`

---

## 10. Step 9: Add Free Geocoding

### Create `lib/location/geocoding.ts`

Using free OpenStreetMap Nominatim API (no API key needed):

```typescript
export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  area: string;
};

/**
 * Forward geocode a place name to coordinates using Nominatim.
 * Rate limit: 1 request/second (add debounce in UI).
 */
export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?` +
    `format=json&q=${encodeURIComponent(query + ', Kathmandu, Nepal')}` +
    `&limit=5&addressdetails=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'EdumentX-App/1.0' },
  });

  const data = await response.json();

  return data.map((item: any) => ({
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    displayName: item.display_name,
    area: item.address?.suburb || item.address?.neighbourhood || item.display_name.split(',')[0],
  }));
}

/**
 * Reverse geocode coordinates to a place name.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?` +
    `format=json&lat=${lat}&lon=${lng}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'EdumentX-App/1.0' },
  });

  const data = await response.json();
  return data.address?.suburb || data.address?.neighbourhood || data.display_name?.split(',')[0] || 'Unknown';
}
```

---

## 11. Step 10: Wire It All Into MapSearch.tsx

Replace the placeholder in `screens/student/MapSearch.tsx` with the real map:

```typescript
import { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { TutorMapView, type MapCameraPosition } from '@/components/map/TutorMap';
import { useTutorClustering } from '@/hooks/useTutorClustering';
import { useCameraBounds } from '@/hooks/useCameraBounds';
import { useUserLocation } from '@/hooks/useUserLocation';
import { subscribeTutors, type TutorListing } from '@/lib/tutor/firestoreTutorService';

export function MapSearch() {
  const { location } = useUserLocation();
  const [tutors, setTutors] = useState<TutorListing[]>([]);
  const [camera, setCamera] = useState<MapCameraPosition>({
    ...location, zoom: 13,
  });

  // Subscribe to approved tutors
  useEffect(() => {
    const unsub = subscribeTutors(setTutors);
    return unsub;
  }, []);

  // Calculate visible bounds from camera
  const bounds = useCameraBounds(camera);

  // Cluster tutors within visible bounds
  const clusters = useTutorClustering(tutors, camera.zoom, bounds);

  // Convert clusters to map markers
  const markers = clusters.map((c) => ({
    id: c.id,
    latitude: c.latitude,
    longitude: c.longitude,
    title: c.type === 'cluster'
      ? `${c.count} tutors`
      : c.tutors[0]?.fullName ?? '',
  }));

  return (
    <View style={{ flex: 1 }}>
      <TutorMapView
        style={{ flex: 1 }}
        cameraPosition={camera}
        markers={markers}
        isMyLocationEnabled
        onCameraMove={setCamera}
        onMarkerClick={(marker) => {
          const cluster = clusters.find((c) => c.id === marker.id);
          // Show preview sheet or zoom into cluster
        }}
      />
    </View>
  );
}
```

---

## 12. Step 11: Client-Side KNN Ranking

### Create `lib/location/distance.ts`

Since Firestore doesn't support spatial queries, we rank tutors by distance on the client:

```typescript
/**
 * Haversine distance between two lat/lng points in kilometers.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Sort tutors by distance from the user's location (nearest first).
 * Filters out tutors beyond maxRadiusKm.
 */
export function rankTutorsByDistance<T extends { coordinates?: { latitude: number; longitude: number } }>(
  tutors: T[],
  userLat: number,
  userLng: number,
  maxRadiusKm: number = 15,
): (T & { distanceKm: number })[] {
  return tutors
    .filter((t) => t.coordinates != null)
    .map((t) => ({
      ...t,
      distanceKm: haversineKm(userLat, userLng, t.coordinates!.latitude, t.coordinates!.longitude),
    }))
    .filter((t) => t.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
```

---

## 13. Step 12: EAS Build & Testing

After all code changes:

```bash
# 1. Install all new dependencies
npx expo install expo-maps expo-location
npm install supercluster @types/supercluster

# 2. Trigger EAS build with native code
eas build --profile development --platform android --clear-cache

# 3. Install new APK on emulator and test
```

### Testing Checklist

- [ ] Map renders with Google Maps tiles on Android
- [ ] User location dot appears after permission grant
- [ ] Tutor markers appear for approved tutors with coordinates
- [ ] Markers cluster when zoomed out, expand when zoomed in
- [ ] Tapping a marker shows tutor preview sheet
- [ ] "View Profile" navigates to `/tutor/${id}`
- [ ] Search bar geocodes place names and moves camera
- [ ] Filter sheet filters update visible markers
