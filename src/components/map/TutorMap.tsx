/**
 * TutorMap — Platform-adaptive native map for EdumentX.
 *
 * Renders `GoogleMaps.View` on Android and `AppleMaps.View` on iOS
 * via `expo-maps`. Follows the same props-based marker API pattern
 * used by BasoBas's `AppMap.tsx`.
 *
 * Usage:
 * ```tsx
 * <TutorMapView
 *   style={{ flex: 1 }}
 *   cameraPosition={{ latitude: 27.71, longitude: 85.32, zoom: 13 }}
 *   markers={[{ id: '1', latitude: 27.71, longitude: 85.32, title: 'Tutor' }]}
 *   isMyLocationEnabled
 *   onMarkerClick={(marker) => console.log(marker)}
 *   onCameraMove={(cam) => console.log(cam)}
 * />
 * ```
 *
 * Phase 5.2 (Aug 2026): Initial implementation.
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { GoogleMaps, AppleMaps } from 'expo-maps';
import type { ImageRef } from 'expo-image';
import {
  clampCameraToNepal,
  NEPAL_BOUNDS,
  NEPAL_ZOOM_RANGE,
} from "@/lib/location/nepalBounds";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  /**
   * Custom marker image (a native image ref loaded via
   * `Image.loadAsync`). Android Google Maps only — Apple Maps markers
   * are tinted via `color` and ignore this.
   */
  icon?: ImageRef | null;
};

export type MapCircle = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  color?: string;
  lineColor?: string;
  lineWidth?: number;
};

export type TutorMapHandle = {
  setCameraPosition: (config: MapCameraPosition & { duration?: number }) => void;
};

export interface TutorMapProps {
  style?: ViewStyle;
  cameraPosition?: MapCameraPosition;
  markers?: TutorMarker[];
  circles?: MapCircle[];
  isMyLocationEnabled?: boolean;
  onMarkerClick?: (marker: TutorMarker) => void;
  onCameraMove?: (camera: MapCameraPosition) => void;
  /** Fired when the user taps the map surface (not a marker). */
  onMapTap?: (location: { latitude: number; longitude: number }) => void;
}

// ─── Camera helpers ─────────────────────────────────────────────────────────

/**
 * ExpoModulesCore wraps native camera animations in a Promise. When a new
 * camera animation supersedes an in-flight one, the old Promise rejects with
 * `CancellationException: Animation cancelled`. The rejection is harmless
 * (the new animation took over), but unhandled it surfaces as
 * "Call to function 'ExpoGoogleMaps.setCameraPosition' has been rejected"
 * redbox spam. Swallow it at the call site.
 */
function setCameraPositionSafe(
  nativeRef: { current: any } | null,
  config: unknown,
) {
  try {
    const result = nativeRef?.current?.setCameraPosition?.(config);
    (result as unknown as Promise<unknown> | undefined)?.catch?.(() => {
      // Animation was superseded — ignore.
    });
  } catch {
    // Ref not mounted yet.
  }
}

// ─── iOS (Apple Maps) ────────────────────────────────────────────────────────

const IosMap = forwardRef<TutorMapHandle, TutorMapProps>((props, ref) => {
  const {
    style, cameraPosition, markers = [], isMyLocationEnabled,
    onMarkerClick, onCameraMove, onMapTap,
  } = props;
  const nativeRef = useRef<any>(null);
  /**
   * Nepal snap-back cooldown. `onCameraMove` fires once per animation
   * frame, so without a guard a single out-of-bounds gesture → snap →
   * re-render → snap... loop. Each superseded snap rejects the native
   * animation Promise with `CancellationException: Animation cancelled`.
   * we re-snap at most once per 800 ms, which kills the loop while
   * keeping the country-lock behaviour.
   */
  const clampCooldownUntil = useRef(0);

  useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      setCameraPositionSafe(nativeRef, {
        coordinates: {
          latitude: config.latitude,
          longitude: config.longitude,
        },
        zoom: config.zoom,
      });
    },
  }), []);

  const cameraPos = cameraPosition ? {
    coordinates: { latitude: cameraPosition.latitude, longitude: cameraPosition.longitude },
    zoom: cameraPosition.zoom,
  } : undefined;

  return (
    <AppleMaps.View
      ref={nativeRef}
      style={style as any}
      cameraPosition={cameraPos}
      markers={markers.map((m) => ({
        id: m.id,
        coordinates: { latitude: m.latitude, longitude: m.longitude },
        title: m.title,
        tintColor: m.color,
      }))}
      properties={{ isMyLocationEnabled }}
      onMarkerClick={(e: any) => {
        const m = markers.find((x) => x.id === e.id);
        if (m) onMarkerClick?.(m);
      }}
      onMapClick={(e: any) => {
        const c = e.coordinates;
        if (c) onMapTap?.({ latitude: c.latitude, longitude: c.longitude });
      }}
      onCameraMove={(e: any) => {
        // Same Nepal clamp as the Android map — see below.
        const raw = {
          latitude: e.coordinates?.latitude ?? 0,
          longitude: e.coordinates?.longitude ?? 0,
          zoom: e.zoom ?? 10,
        };
        const clamped = clampCameraToNepal(raw);
        if (clamped) {
          const now = Date.now();
          if (now >= clampCooldownUntil.current) {
            clampCooldownUntil.current = now + 800;
            setCameraPositionSafe(nativeRef, {
              coordinates: {
                latitude: clamped.latitude,
                longitude: clamped.longitude,
              },
              zoom: clamped.zoom,
            });
          }
        }
        onCameraMove?.(clamped ?? raw);
      }}
    />
  );
});
IosMap.displayName = 'IosMap';

// ─── Android (Google Maps) ───────────────────────────────────────────────────

const AndroidMap = forwardRef<TutorMapHandle, TutorMapProps>((props, ref) => {
  const {
    style, cameraPosition, markers = [], circles = [],
    isMyLocationEnabled, onMarkerClick, onCameraMove, onMapTap,
  } = props;
  const nativeRef = useRef<any>(null);
  const clampCooldownUntil = useRef(0);

  useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      setCameraPositionSafe(nativeRef, {
        coordinates: { latitude: config.latitude, longitude: config.longitude },
        zoom: config.zoom,
        duration: config.duration,
      });
    },
  }), []);

  const cameraPos = cameraPosition ? {
    coordinates: { latitude: cameraPosition.latitude, longitude: cameraPosition.longitude },
    zoom: cameraPosition.zoom,
  } : undefined;

  return (
    <GoogleMaps.View
      ref={nativeRef}
      style={style as any}
      cameraPosition={cameraPos}
      markers={markers.map((m) => ({
        id: m.id,
        coordinates: { latitude: m.latitude, longitude: m.longitude },
        title: m.title,
        icon: m.icon ?? undefined,
      }))}
      circles={circles.map((c) => ({
        id: c.id,
        center: { latitude: c.latitude, longitude: c.longitude },
        radius: c.radius,
        color: c.color,
        lineColor: c.lineColor,
        lineWidth: c.lineWidth,
      }))}
      properties={{
        isMyLocationEnabled,
        // Hard zoom floor/ceiling (Nepal-only app: no world zoom-out).
        minZoomPreference: NEPAL_ZOOM_RANGE.min,
        maxZoomPreference: NEPAL_ZOOM_RANGE.max,
      }}
      onMarkerClick={(e: any) => {
        const m = markers.find((x) => x.id === e.id);
        if (m) onMarkerClick?.(m);
      }}
      onMapClick={(e: any) => {
        const c = e.coordinates;
        if (c) onMapTap?.({ latitude: c.latitude, longitude: c.longitude });
      }}
      onCameraMove={(e: any) => {
        // Nepal-only camera: expo-maps does not expose a "restrict
        // panning to bounds" prop, so when a gesture carries the
        // camera past the country box we snap it straight back via
        // the imperative API. The consumer still receives the clamped
        // position so its clustering math can't run on phantom
        // coordinates. (See `lib/location/nepalBounds.ts`.)
        //
        // Throttled: a camera animation emits one move event per frame,
        // and each imperative snap supersedes the previous animation —
        // the superseded Promise rejects with `CancellationException:
        // Animation cancelled` (harmless but spammy). One snap per
        // 800 ms removes the loop entirely. Zoom is NOT re-snapped
        // here on Android: `minZoomPreference`/`maxZoomPreference`
        // already clamp it natively without an animation cycle.
        const raw = {
          latitude: e.coordinates?.latitude ?? 0,
          longitude: e.coordinates?.longitude ?? 0,
          zoom: e.zoom ?? 10,
        };
        if (
          raw.latitude <= NEPAL_BOUNDS.northEast.latitude &&
          raw.latitude >= NEPAL_BOUNDS.southWest.latitude &&
          raw.longitude <= NEPAL_BOUNDS.northEast.longitude &&
          raw.longitude >= NEPAL_BOUNDS.southWest.longitude
        ) {
          // Inside Nepal — no snap. Still surface the (zoom-adjusted)
          // raw position to the consumer.
          onCameraMove?.(raw);
          return;
        }
        const clamped = clampCameraToNepal(raw);
        if (clamped) {
          const now = Date.now();
          if (now >= clampCooldownUntil.current) {
            clampCooldownUntil.current = now + 800;
            setCameraPositionSafe(nativeRef, {
              coordinates: {
                latitude: clamped.latitude,
                longitude: clamped.longitude,
              },
              zoom: clamped.zoom,
            });
          }
        }
        onCameraMove?.(clamped ?? raw);
      }}
    />
  );
});
AndroidMap.displayName = 'AndroidMap';

// ─── Export ──────────────────────────────────────────────────────────────────

export const TutorMapView = Platform.OS === 'ios' ? IosMap : AndroidMap;
