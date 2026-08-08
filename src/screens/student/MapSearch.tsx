/**
 * EdumentX — Student Map Search (Phase 5.2)
 *
 * Full-featured map-based tutor discovery screen. Replaces the
 * placeholder "coming soon" view with a live native map powered
 * by expo-maps, supercluster pin clustering, and device GPS.
 *
 * Architecture:
 *   - `TutorMapView`         renders native map tiles (Google/Apple)
 *   - `useTutorClustering`   groups nearby pins at low zoom
 *   - `useCameraBounds`      calculates visible lat/lng bounds
 *   - `useUserLocation`      gets device GPS (falls back to Kathmandu)
 *   - `TutorPreviewSheet`    bottom sheet on marker tap
 *   - `FiltersSheet`         filter overlay (inline Modal)
 *   - `subscribeTutors`      real-time Firestore subscription
 *
 * Follows the BasoBas `(tenant)/(tabs)/search.tsx` → `AppMap.tsx`
 * pattern, adapted for EdumentX's Firestore + NativeWind stack.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

import { BottomNav } from "@/components/shared/BottomNav";
import {
  TutorMapView,
  type MapCameraPosition,
  type TutorMarker,
  type TutorMapHandle,
} from "@/components/map/TutorMap";
import { TutorPreviewSheet } from "@/components/map/TutorPreviewSheet";
import { FiltersSheet } from "@/screens/student/FiltersSheet";
import {
  subscribeTutors,
  type TutorListing,
} from "@/lib/tutor/firestoreTutorService";
import { useTutorClustering, type TutorClusterFeature } from "@/hooks/useTutorClustering";
import { useCameraBounds } from "@/hooks/useCameraBounds";
import { useUserLocation } from "@/hooks/useUserLocation";
import { rankTutorsByDistance } from "@/lib/location/distance";
import { colors } from "@/constants/colors";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Kathmandu Valley default camera — Ratna Park at a zoom that shows
 *  most of the valley. Used as initial camera before GPS resolves. */
const DEFAULT_CAMERA: MapCameraPosition = {
  latitude: 27.7103,
  longitude: 85.3222,
  zoom: 13,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function MapSearch() {
  const router = useRouter();
  const mapRef = useRef<TutorMapHandle>(null);

  // ── Location ──
  const { location: userLocation, loading: locationLoading } = useUserLocation();

  // ── Map state ──
  // `camera` is the live camera (updated from `onMoveCamera`) and drives the
  // clustering bounds/zoom math. `cameraTarget` is the anchor position we hand
  // to the native camera prop and is ONLY changed on intentional jumps (GPS
  // resolve, recenter). Feeding `onCameraMove` straight back into the prop
  // creates a feedback loop: every programmatic animation re-triggers a prop
  // update, cancelling the previous animation → "Animation cancelled"
  // unhandled promise rejections from ExpoGoogleMaps.
  const [camera, setCamera] = useState<MapCameraPosition>({
    ...DEFAULT_CAMERA,
  });
  const [cameraTarget, setCameraTarget] = useState<MapCameraPosition>({
    ...DEFAULT_CAMERA,
  });

  // ── Tutors from Firestore ──
  const [tutors, setTutors] = useState<TutorListing[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);

  // ── UI state ──
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<TutorListing | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // ── Subscribe to approved tutors ──
  useEffect(() => {
    setTutorsLoading(true);
    const unsub = subscribeTutors(
      (data) => {
        setTutors(data);
        setTutorsLoading(false);
      },
      () => setTutorsLoading(false),
    );
    return unsub;
  }, []);

  // ── Center map on user location once GPS resolves ──
  useEffect(() => {
    if (!locationLoading && userLocation) {
      const next = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: 14,
      };
      setCamera((prev) => ({ ...prev, ...next }));
      setCameraTarget((prev) => ({ ...prev, ...next }));
    }
  }, [locationLoading, userLocation]);

  // ── Clustering ──
  const bounds = useCameraBounds(camera);
  const clusters = useTutorClustering(tutors, camera.zoom, bounds);

  // ── Convert clusters → map markers ──
  const markers: TutorMarker[] = clusters.map((c) => {
    if (c.type === "cluster") {
      return {
        id: `cluster-${c.id}`,
        latitude: c.latitude,
        longitude: c.longitude,
        title: `${c.count} tutors`,
        color: colors.brand.primary,
      };
    }
    return {
      id: c.id as string,
      latitude: c.latitude,
      longitude: c.longitude,
      title: c.tutor.fullName,
      color: c.tutor.isVerifiedProfessional
        ? colors.brand.verification
        : colors.brand.primary,
    };
  });

  // ── Nearby tutors (bottom list preview) ──
  const nearbyTutors = rankTutorsByDistance(
    tutors,
    userLocation.latitude,
    userLocation.longitude,
    15,
  ).slice(0, 5);

  // ── Handlers ──
  const handleMarkerClick = useCallback(
    (marker: TutorMarker) => {
      // If it's a cluster marker, zoom in
      if (marker.id.startsWith("cluster-")) {
        mapRef.current?.setCameraPosition({
          latitude: marker.latitude,
          longitude: marker.longitude,
          zoom: Math.min(camera.zoom + 2, 18),
          duration: 300,
        });
        return;
      }

      // Single tutor — find and show preview
      const cluster = clusters.find(
        (c): c is Extract<TutorClusterFeature, { type: "tutor" }> =>
          c.type === "tutor" && c.id === marker.id,
      );
      if (cluster) {
        setSelectedTutor(cluster.tutor);
        setPreviewVisible(true);
      }
    },
    [clusters, camera.zoom],
  );

  const handleCameraMove = useCallback((cam: MapCameraPosition) => {
    // Live camera only — do NOT push it back into the camera prop, or the
    // prop-vs-gesture loop re-cancels in-flight animations (see above).
    setCamera(cam);
  }, []);

  const handleRecenter = useCallback(() => {
    if (userLocation) {
      const newCam: MapCameraPosition = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: 14,
      };
      setCamera(newCam);
      setCameraTarget(newCam);
      mapRef.current?.setCameraPosition({ ...newCam, duration: 400 });
    }
  }, [userLocation]);

  // ── Count tutors with map pins ──
  const tutorsWithCoords = tutors.filter((t) => t.coordinates != null).length;

  return (
    <View className="flex-1 bg-background">

      {/* ── Hero header — matches StudentHome's slate header ── */}
      <View className="bg-night px-5 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-body text-white/70 mb-0.5">Find a tutor</Text>
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: "#E5A03B",
                paddingBottom: 2,
                alignSelf: "flex-start",
              }}
            >
              <Text className="text-screen-title font-medium text-white">
                Near you
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.replace("/student-home")}
            className="w-10 h-10 rounded-pill bg-white/10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Search bar + filter trigger */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-surface rounded-card h-12 flex-row items-center px-3 gap-2.5">
            <Ionicons name="search-outline" size={18} color="#6B7268" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tutors, subjects…"
              placeholderTextColor="#6B7268"
              className="flex-1 text-body text-text-primary"
            />
            {search.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => setSearch("")}
                className="active:opacity-70"
              >
                <Ionicons name="close-circle" size={18} color="#6B7268" />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            onPress={() => setFiltersOpen(true)}
            className="w-12 h-12 rounded-xl bg-accent items-center justify-center active:opacity-80"
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* ── Map area ── */}
      <View className="flex-1 relative">
        {tutorsLoading ? (
          <View className="flex-1 items-center justify-center bg-surface-muted">
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text className="text-caption text-text-muted mt-3">
              Loading tutors…
            </Text>
          </View>
        ) : (
          <TutorMapView
            ref={mapRef}
            style={{ flex: 1 } as any}
            cameraPosition={{
              latitude: cameraTarget.latitude,
              longitude: cameraTarget.longitude,
              zoom: cameraTarget.zoom,
            }}
            markers={markers}
            isMyLocationEnabled
            onMarkerClick={handleMarkerClick}
            onCameraMove={handleCameraMove}
          />
        )}

        {/* ── Floating controls ── */}

        {/* Recenter button */}
        <Pressable
          onPress={handleRecenter}
          className="absolute right-4 bottom-36 w-11 h-11 rounded-pill bg-surface items-center justify-center active:opacity-80"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Ionicons name="locate" size={20} color={colors.brand.primary} />
        </Pressable>

        {/* Tutor count badge */}
        <View
          className="absolute left-4 top-3 bg-night/80 rounded-pill px-3 py-1.5 flex-row items-center gap-1.5"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Ionicons name="people" size={14} color="#FFFFFF" />
          <Text className="text-caption font-medium text-white">
            {tutorsWithCoords} tutor{tutorsWithCoords !== 1 ? "s" : ""} on map
          </Text>
        </View>

        {/* Nearby tutors strip at bottom */}
        {nearbyTutors.length > 0 && !previewVisible && (
          <View
            className="absolute left-0 right-0 bottom-2 px-3"
          >
            <View
              className="bg-surface rounded-card p-3 border border-border"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text className="text-caption font-medium text-text-muted mb-2">
                {nearbyTutors.length} tutor{nearbyTutors.length !== 1 ? "s" : ""} within 15 km
              </Text>
              {nearbyTutors.slice(0, 3).map((t) => (
                <Pressable
                  key={t.uid}
                  className="flex-row items-center py-1.5 active:opacity-70"
                  onPress={() => {
                    setSelectedTutor(t);
                    setPreviewVisible(true);
                  }}
                >
                  <View className="w-2 h-2 rounded-pill bg-verification mr-2.5" />
                  <Text
                    className="flex-1 text-caption text-text-primary"
                    numberOfLines={1}
                  >
                    {t.fullName}
                  </Text>
                  <Text className="text-micro text-text-muted ml-2">
                    {t.distanceKm.toFixed(1)} km
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom navigation ── */}
      <BottomNav role="student" current="/map-search" />

      {/* ── Tutor preview sheet (slides up on marker tap) ── */}
      <TutorPreviewSheet
        tutor={selectedTutor}
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setSelectedTutor(null);
        }}
      />

      {/* ── Filters sheet overlay ── */}
      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
    </View>
  );
}