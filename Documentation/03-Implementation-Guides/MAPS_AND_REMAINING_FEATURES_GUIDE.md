# EdumentX — Maps Integration & Remaining Features Implementation Guide

> **Document Version:** 1.0  
> **Date:** August 6, 2026  
> **Reference Architecture:** BasoBas Mobile App (`Documentation/98-Reference-BasoBas/basobas-app`)  
> **Target Platform:** EdumentX (Expo SDK 54, React Native 0.81, NativeWind 4.2, Firebase Auth + Firestore)

---

## Executive Summary

This guide provides a comprehensive audit of **EdumentX**, compares its architecture to the **BasoBas** reference app, details the current health of the codebase (including recent fixes), and delivers a step-by-step technical blueprint for integrating **Maps, Location Geocoding, Clustering, and Remaining Features (RAG AI, eSewa Payments, Real-time Messaging)** into EdumentX.

---

## 1. Project Audit & Current Health Status

### 1.1 Verified Inventory
- **Routes & Screens:** 23 Expo Router routes across 5 domain groups (`auth`, `onboarding`, `student`, `tutor`, `admin`).
- **Styling:** NativeWind 4.2 + Tailwind CSS 3.4 (Strictly zero Tamagui).
- **Backend Services:**
  - `@react-native-firebase/auth`: Phone OTP (+977) + Google Sign-In.
  - `@react-native-firebase/firestore`: Multi-collection Firestore rules (`users`, `tutors`, `tutorVerifications`, `tutorProfileUpdates`, `notifications`).
  - `@supabase/supabase-js`: Storage bucket for document verification (Citizenship, Certificates, Demo Video).
- **TypeScript Status:** **0 Errors** (Clean `tsc --noEmit`).

### 1.2 Recent Code Health Fixes Applied
1. **`lib/verification/notifications.ts`**: Replaced non-existent `ref.set()` method with modular `setDoc(ref, ...)` from `@react-native-firebase/firestore`.
2. **`screens/student/AIChat.tsx`**: Fixed Expo Router typed path parameter casting for `/tutor/${tutor.id}`.

---

## 2. BasoBas Reference vs. EdumentX Comparison

| Feature | BasoBas Reference (`basobas-app`) | EdumentX Blueprint |
|---|---|---|
| **Backend & Spatial** | Supabase (PostgreSQL + PostGIS `st_dwithin` RPCs) | Firebase Firestore (Spark Plan) + Client-side Haversine/KNN |
| **Map Rendering** | `expo-maps` (`GoogleMaps.View` & `AppleMaps.View`) | `expo-maps` OR `react-native-maps` (OpenStreetMap / Google Maps) |
| **Pin Clustering** | `supercluster` (Spatial index algorithm) | `supercluster` integration for tutor density pins |
| **Geocoding** | Supabase Edge Functions (`geocode`, `reverse-geocode` via Google Places API) | Free OpenStreetMap Nominatim API / Expo Location for Kathmandu Valley |
| **UI Components** | `@gorhom/bottom-sheet` (PropertyPreviewSheet) | NativeWind custom animated bottom modal / `FiltersSheet` |
| **Media Storage** | Supabase Storage (`property-photos`) | Supabase Storage (`verification-docs`) — Complete |

---

## 3. Step-by-Step Blueprint: Implementing Maps in EdumentX (Phase 5.2 - 5.4)

### 3.1 Data Model Enhancement
To plot tutors on the map, we must add spatial coordinates to the tutor profile documents in Firestore:

```typescript
// Add to lib/tutor/types.ts & tutors/{uid} document
export interface TutorCoordinates {
  latitude: number;   // e.g. 27.7172 (Kathmandu)
  longitude: number;  // e.g. 85.3240
}

export interface TutorLocation {
  neighborhood: string; // e.g. "Baluwatar"
  city: string;         // e.g. "Kathmandu"
  coordinates?: TutorCoordinates;
}
```

### 3.2 Map Component Setup (`components/map/TutorMap.tsx`)
Borrowing BasoBas's cross-platform wrapper approach (`AppMap.tsx`), we build a dual iOS/Android map using `expo-maps` or `react-native-maps`:

```tsx
import React from 'react';
import { Platform } from 'react-native';
import { GoogleMaps, AppleMaps } from 'expo-maps';
import type { TutorListing } from '@/lib/tutor/firestoreTutorService';

interface TutorMapProps {
  tutors: TutorListing[];
  userLocation: { latitude: number; longitude: number };
  onSelectTutor: (tutor: TutorListing) => void;
}

export function TutorMap({ tutors, userLocation, onSelectTutor }: TutorMapProps) {
  const cameraPos = {
    coordinates: { latitude: userLocation.latitude, longitude: userLocation.longitude },
    zoom: 13,
  };

  const markers = tutors
    .filter((t) => (t as any).location?.coordinates)
    .map((t) => ({
      id: t.uid,
      coordinates: {
        latitude: (t as any).location.coordinates!.latitude,
        longitude: (t as any).location.coordinates!.longitude,
      },
      title: t.fullName,
      snippet: `${t.subjects.join(', ')} • NPR ${t.monthlyRateNpr}/mo`,
    }));

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={{ flex: 1 }}
        cameraPosition={cameraPos}
        markers={markers}
        onMarkerClick={(e) => {
          const selected = tutors.find((t) => t.uid === e.id);
          if (selected) onSelectTutor(selected);
        }}
      />
    );
  }

  return (
    <GoogleMaps.View
      style={{ flex: 1 }}
      cameraPosition={cameraPos}
      markers={markers}
      onMarkerClick={(e) => {
        const selected = tutors.find((t) => t.uid === e.id);
        if (selected) onSelectTutor(selected);
      }}
    />
  );
}
```

### 3.3 Pin Clustering with `supercluster`
In high-density areas like Patan, Baneshwor, or Thamel, multiple tutors overlap. Using `supercluster` (as in BasoBas's `useMapClustering.ts`):

1. Convert `tutors` into GeoJSON `Point` features.
2. Initialize `Supercluster({ radius: 60, maxZoom: 16 })`.
3. Pass camera bounding box `[swLng, swLat, neLng, neLat]` and `zoom` to return visible clusters and individual pins.

### 3.4 Geocoding & Radius Filtering (Nominatim API)
For zero-budget geocoding in Kathmandu Valley without requiring a paid Google Places API key:

```typescript
// lib/location/geocoding.ts
export async function geocodeKathmanduAddress(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Kathmandu, Nepal')}`,
    { headers: { 'User-Agent': 'EdumentX-App' } }
  );
  const data = await response.json();
  if (data && data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  }
  return null;
}
```

---

## 4. Remaining Features Roadmap

### 4.1 Phase 7.1 — Groq / HuggingFace Free RAG AI Matching
- **Goal:** Natural language search e.g., *"Find me an affordable SEE Math tutor near Koteshwor available in the evening"*.
- **Implementation:**
  1. Fetch active approved tutors via `subscribeTutors()`.
  2. Format tutors into lightweight JSON context.
  3. Send request to free Groq API (`llama-3.3-70b-versatile` endpoint) with structured JSON response instructions.
  4. Display recommended tutor cards directly inside `screens/student/AIChat.tsx`.

### 4.2 Phase 7.2 — Payment Integration (eSewa / Khalti)
- **Goal:** Escrow / deposit payment for booking tutor sessions.
- **Implementation:**
  1. Integrate `esewa_flutter_sdk` or Webview-based eSewa payment gateway.
  2. Record transaction status in Firestore `enrollments/{enrollmentId}`.

### 4.3 Phase 7.3 — Real-time Student-Tutor Messaging
- **Goal:** Direct chat between students and verified tutors once enrollment request is initiated.
- **Implementation:**
  1. Add Firestore collection `chats/{chatId}/messages/{messageId}`.
  2. Implement `onSnapshot` real-time listener in `screens/student/ChatRoom.tsx`.

---

## 5. Developer Checklist & Next Tasks

- [x] Run `npm run typecheck` and ensure 0 errors.
- [ ] Install `supercluster` and `@types/supercluster` (`npm install supercluster @types/supercluster`).
- [ ] Add `coordinates` fields to tutor profile registration (`screens/auth/TutorProfileScreen.tsx`).
- [ ] Update `screens/student/MapSearch.tsx` to replace placeholder with `TutorMap` component.
- [ ] Connect `FiltersSheet.tsx` state to `subscribeTutors()` filter predicate.
