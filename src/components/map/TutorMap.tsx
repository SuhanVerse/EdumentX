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
    onMarkerClick, onCameraMove,
  } = props;
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      setCameraPositionSafe(nativeRef, {
        coordinates: { latitude: config.latitude, longitude: config.longitude },
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
      onCameraMove={(e: any) => onCameraMove?.({
        latitude: e.coordinates?.latitude ?? 0,
        longitude: e.coordinates?.longitude ?? 0,
        zoom: e.zoom ?? 10,
      })}
    />
  );
});
IosMap.displayName = 'IosMap';

// ─── Android (Google Maps) ───────────────────────────────────────────────────

const AndroidMap = forwardRef<TutorMapHandle, TutorMapProps>((props, ref) => {
  const {
    style, cameraPosition, markers = [], circles = [],
    isMyLocationEnabled, onMarkerClick, onCameraMove,
  } = props;
  const nativeRef = useRef<any>(null);

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
      }))}
      circles={circles.map((c) => ({
        id: c.id,
        center: { latitude: c.latitude, longitude: c.longitude },
        radius: c.radius,
        color: c.color,
        lineColor: c.lineColor,
        lineWidth: c.lineWidth,
      }))}
      properties={{ isMyLocationEnabled }}
      onMarkerClick={(e: any) => {
        const m = markers.find((x) => x.id === e.id);
        if (m) onMarkerClick?.(m);
      }}
      onCameraMove={(e: any) => onCameraMove?.({
        latitude: e.coordinates?.latitude ?? 0,
        longitude: e.coordinates?.longitude ?? 0,
        zoom: e.zoom ?? 10,
      })}
    />
  );
});
AndroidMap.displayName = 'AndroidMap';

// ─── Export ──────────────────────────────────────────────────────────────────

export const TutorMapView = Platform.OS === 'ios' ? IosMap : AndroidMap;
