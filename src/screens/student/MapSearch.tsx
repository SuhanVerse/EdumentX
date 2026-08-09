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
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

import {
  AnimatedPressable,
  usePressScale,
  motion,
} from "@/components/motion";
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
import { clampCameraToNepal } from "@/lib/location/nepalBounds";
import { withPinCoordinates } from "@/lib/location/nepalGeo";
import { loadMarkerIcons, type MarkerIconSet } from "@/lib/map/markerIcons";
import { useAvatarPins, avatarPinKey } from "@/lib/map/avatarPins";
import { colors } from "@/constants/colors";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Kathmandu Valley default camera — Ratna Park at street/neighbourhood
 *  zoom (Kathmandu · Lalitpur · Bhaktapur ring). Used as the initial
 *  camera before GPS resolves. Nepal-only bounds live in
 *  `lib/location/nepalBounds.ts` and are enforced by `TutorMap`. */
const DEFAULT_CAMERA: MapCameraPosition = {
  latitude: 27.7103,
  longitude: 85.3222,
  zoom: 15,
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
  const [markerIcons, setMarkerIcons] = useState<MarkerIconSet | null>(null);

  // ── Load custom pin icons once (Android Google Maps markers) ──
  useEffect(() => {
    loadMarkerIcons().then(setMarkerIcons);
  }, []);

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

  // Coordinates for clustering. Legacy tutors (pre-GPS signup) have no
  // `coordinates` on their doc — `withPinCoordinates` fills them from a
  // Nepal centroid table (explicit GPS pin → city centroid → Valley
  // centre) so every approved tutor gets a real pin.
  const geo = useMemo(() => withPinCoordinates(tutors), [tutors]);

  // ── Custom drop pins (teardrop + tutor photo) ──
  // Rasterized offscreen from `TutorAvatarPin`; `pins` maps
  // (photoUrl × verified) → image ref. Markers fall back to the PNG
  // teardrop set while a pin is still rasterizing (and permanently if
  // a capture fails).
  const {
    pins: avatarPins,
    pendingCount: avatarPinsPending,
    host: avatarPinHost,
  } = useAvatarPins(tutors);

  // ── Pins-ready gate ──
  // expo-maps replaces a marker only when its props truly change, and
  // an icon hot-swap (undefined → ImageRef) is not reliable on every
  // device — so tutor markers are mounted only after every unique pin
  // has resolved (photo rasterized, gradient throttled, or failed).
  // The 4 s cap (CAPTURE_TIMEOUT in avatarPins) plus this extra
  // timeout guarantee the map is never left without pins: after
  // 4.5 s the markers mount with the PNG teardrop fallback set.
  const [pinsWaitTimedOut, setPinsWaitTimedOut] = useState(false);
  useEffect(() => {
    if (!(avatarPinsPending > 0) || pinsWaitTimedOut) return;
    const t = setTimeout(() => setPinsWaitTimedOut(true), 4500);
    return () => clearTimeout(t);
  }, [avatarPinsPending, pinsWaitTimedOut]);
  const pinsPending = avatarPinsPending > 0 && !pinsWaitTimedOut;

  // ── Center map on user location once GPS resolves ──
  useEffect(() => {
    if (!locationLoading && userLocation) {
      const next = clampCameraToNepal({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: 14,
      }) ?? {
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
  const clusters = useTutorClustering(geo, camera.zoom, bounds);

  // ── Convert clusters → map markers ──
  // While avatar pins are still rasterizing, tutor markers are held
  // back (clusters stay) so the teardrop icons mount from the very
  // first frame. See the "Pins-ready gate" above.
  const visibleClusters = pinsPending
    ? clusters.filter((c) => c.type !== "tutor")
    : clusters;

  const markers: TutorMarker[] = visibleClusters.map((c) => {
    if (c.type === "cluster") {
      return {
        id: `cluster-${c.id}`,
        latitude: c.latitude,
        longitude: c.longitude,
        title: `${c.count} tutors`,
        color: colors.brand.primary,
        icon: markerIcons?.cluster,
      };
    }
    const key = avatarPinKey(
      c.tutor.photoUrl,
      c.tutor.isVerifiedProfessional,
    );
    const imageRef = avatarPins[key];
    // Icon ladder: avatar teardrop → static teardrop PNG (branded
    // fallback while rasterizing or after a failed capture) → native
    // tinted pin (last resort).
    const icon =
      imageRef !== undefined
        ? imageRef
        : c.tutor.isVerifiedProfessional
          ? markerIcons?.verified
          : markerIcons?.tutor;
    return {
      id: c.id as string,
      latitude: c.latitude,
      longitude: c.longitude,
      title: c.tutor.fullName,
      color: c.tutor.isVerifiedProfessional
        ? colors.brand.verification
        : colors.brand.primary,
      ...(icon ? { icon } : {}),
    };
  });

  // ── Nearby tutors (bottom list preview) ──
  const nearbyTutors = rankTutorsByDistance(
    geo,
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
      const base = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: 14,
      };
      const newCam = clampCameraToNepal(base) ?? base;
      setCamera(newCam);
      setCameraTarget(newCam);
      mapRef.current?.setCameraPosition({ ...newCam, duration: 400 });
    }
  }, [userLocation]);

  // ── Count tutors with map pins ──
  const pinnedTutors = geo.length;

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
          <MapHeroBack onPress={() => router.replace("/student-home")} />
        </View>

        {/* Search bar + filter trigger */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-surface rounded-card h-12 flex-row items-center px-3 gap-2.5">
            <Ionicons name="search-outline" size={18} color="#6B7280" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tutors, subjects…"
              placeholderTextColor="#6B7280"
              className="flex-1 text-body text-text-primary"
            />
            {search.length > 0 && (
              <MapClearSearch onPress={() => setSearch("")} />
            )}
          </View>
          <MapFiltersButton onPress={() => setFiltersOpen(true)} />
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
            cameraPosition={cameraTarget}
            markers={markers}
            isMyLocationEnabled
            onMarkerClick={handleMarkerClick}
            onCameraMove={handleCameraMove}
          />
        )}

        {/* Offscreen rasterizer host for avatar drop pins */}
      {avatarPinHost}

      {/* ── Floating controls ── */}

        {/* Recenter button */}
        <MapRecenterButton onPress={handleRecenter} />

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
            {pinnedTutors} tutor{pinnedTutors !== 1 ? "s" : ""} on map
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
                <NearbyTutorRow
                  key={t.uid}
                  name={t.fullName}
                  distanceKm={t.distanceKm}
                  onPress={() => {
                    setSelectedTutor(t);
                    setPreviewVisible(true);
                  }}
                />
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

// ─── Map-surface controls (Phase 2 tactile micro-interactions) ──────────────

function MapHeroBack({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: 0.92,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="w-10 h-10 rounded-pill bg-white/10 items-center justify-center"
    >
      <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
    </AnimatedPressable>
  );
}

function MapClearSearch({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityLabel="Clear search"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      hitSlop={10}
    >
      <Ionicons name="close-circle" size={18} color="#6B7280" />
    </AnimatedPressable>
  );
}

function MapFiltersButton({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Open filters"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="w-12 h-12 rounded-xl bg-accent items-center justify-center"
    >
      <Ionicons name="options-outline" size={20} color="#FFFFFF" />
    </AnimatedPressable>
  );
}

function MapRecenterButton({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Recenter map"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        animatedStyle,
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
        },
      ]}
      className="absolute right-4 bottom-36 w-11 h-11 rounded-pill bg-surface items-center justify-center"
    >
      <Ionicons name="locate" size={20} color={colors.brand.primary} />
    </AnimatedPressable>
  );
}

function NearbyTutorRow({
  name,
  distanceKm,
  onPress,
}: {
  name: string;
  distanceKm: number;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: 0.985,
  });
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="flex-row items-center py-1.5"
    >
      <View className="w-2 h-2 rounded-pill bg-verification mr-2.5" />
      <Text
        className="flex-1 text-caption text-text-primary"
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text className="text-micro text-text-muted ml-2">
        {distanceKm.toFixed(1)} km
      </Text>
    </AnimatedPressable>
  );
}