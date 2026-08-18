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
  FlatList,
  useWindowDimensions,
} from "react-native";

import {
  AnimatedPressable,
  usePressScale,
  motion,
} from "@/components/motion";
import { BottomNav } from "@/components/shared/BottomNav";
import {
  ScreenLayout,
  ScreenHeader,
} from "@/components/shared/ScreenLayout";
import {
  TutorMapView,
  type MapCameraPosition,
  type TutorMarker,
  type TutorMapHandle,
} from "@/components/map/TutorMap";
import { TutorPreviewSheet } from "@/components/map/TutorPreviewSheet";
import {
  FiltersSheet,
  DEFAULT_MAP_FILTERS,
  type MapFilters,
} from "@/screens/student/FiltersSheet";
import { TutorCard } from "@/components/domain/TutorCard";
import {
  subscribeTutors,
  type TutorListing,
} from "@/lib/tutor/firestoreTutorService";
import { createDefaultTutorProfile } from "@/lib/tutor/types";
import { useTutorClustering, type TutorClusterFeature } from "@/hooks/useTutorClustering";
import { useCameraBounds } from "@/hooks/useCameraBounds";
import { useUserLocation } from "@/hooks/useUserLocation";
import { rankTutorsByDistance } from "@/lib/location/distance";
import { clampCameraToNepal } from "@/lib/location/nepalBounds";
import { withPinCoordinates } from "@/lib/location/nepalGeo";
import { loadMarkerIcons, type MarkerIconSet } from "@/lib/map/markerIcons";
import {
  useAvatarPins,
  useSelectedAvatarPin,
  avatarPinKey,
} from "@/lib/map/avatarPins";
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

/** Service radius drawn under the selected pin (metres). The tutor
 *  profile has no radius field yet — 2.5 km is the sensible default
 *  for metro Nepal. */

/** Translucent accent fill for the selected-tutor radius circle
 *  (AARRGGBB — alpha-first, Google Maps Android convention). */

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
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);
  const [selectedTutor, setSelectedTutor] = useState<TutorListing | null>(null);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
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

  // Swim between the Search text + the actual filter query. The three
  // "pill" filters (subjects / verified / budget) prune the listing;
  // distance is applied against the user's GPS with
  // `rankTutorsByDistance` below.
  const filteredTutors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tutors.filter((t) => {
      if (filters.verifiedOnly && !t.isVerifiedProfessional) return false;
      if (
        filters.subjects.length > 0 &&
        !filters.subjects.some((s) => t.subjects.includes(s))
      ) {
        return false;
      }
      if (filters.budget > 0 && t.monthlyRateNpr > filters.budget) return false;
      if (
        q.length > 0 &&
        !`${t.fullName} ${t.headline} ${t.subjects.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tutors, search, filters]);

  // Coordinates for clustering. Legacy tutors (pre-GPS signup) have no
  // `coordinates` on their doc — `withPinCoordinates` fills them from a
  // Nepal centroid table (explicit GPS pin → city centroid → Valley
  // centre) so every approved tutor gets a real pin.
  const geo = useMemo(() => withPinCoordinates(filteredTutors), [filteredTutors]);

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

  // ── Selected pin variant (amber ring + halo) ──
  // Rasterized on demand when a tutor is tapped (non-gating — the
  // PNG selected teardrop stands in until the capture lands).
  const selectedTutorForPin = useMemo(() => {
    const t = tutors.find((t) => t.uid === selectedTutorId);
    return t
      ? {
          photoUrl: t.photoUrl,
          isVerifiedProfessional: t.isVerifiedProfessional,
        }
      : null;
  }, [tutors, selectedTutorId]);
  const {
    ref: selectedAvatarRef,
    host: selectedAvatarHost,
  } = useSelectedAvatarPin(selectedTutorForPin);

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
    const isSelected = c.id === selectedTutorId;
    const baseKey = avatarPinKey(
      c.tutor.photoUrl,
      c.tutor.isVerifiedProfessional,
      false,
    );
    const selectedKey = avatarPinKey(
      c.tutor.photoUrl,
      c.tutor.isVerifiedProfessional,
      true,
    );
    // Icon ladder (selected first — the amber-ring halo variant takes
    // priority over the base photo pin):
    //   selected avatar → selected PNG → base avatar → base PNG → tint.
    // Non-selected pins skip the selected tiers entirely, so the
    // unselected set is identical to before.
    const selectedRef = avatarPins[selectedKey];
    const selectedReady =
      selectedRef !== undefined ? selectedRef : isSelected ? selectedAvatarRef : undefined;
    const baseRef = avatarPins[baseKey];
    const icon =
      selectedReady && selectedReady !== "pending" && selectedReady !== undefined
        ? selectedReady
        : isSelected
          ? c.tutor.isVerifiedProfessional
            ? markerIcons?.verifiedSelected
            : markerIcons?.tutorSelected
          : baseRef !== undefined
            ? baseRef
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

  // ── Selected tutor service-radius circle ──
  // Translucent amber fill under the selected pin (2.5 km default —
  // the tutor profile has no radius field yet). AARRGGBB alpha-first
  // (Google Maps Android convention). Only while a pin is selected.
  const selectedCircle = useMemo(() => {
    const t = geo.find((t) => t.uid === selectedTutorId);
    if (!t?.coordinates) return [];
    return [
      {
        id: `radius-${selectedTutorId}`,
        latitude: t.coordinates.latitude,
        longitude: t.coordinates.longitude,
        radius: 2500,
        color: "#26E5A03B", // 15% amber fill
        lineColor: colors.brand.accent,
        lineWidth: 2,
      },
    ];
  }, [geo, selectedTutorId]);

  // ── Nearby tutors (bottom list preview) ──
  // Pro subscription priority (Phase 2): Pro tutors are promoted to
  // the top of the list (stable — distance order is preserved WITHIN
  // each tier), so subscribers get the visibility they paid for
  // without silently destroying the distance ranking.
  const nearbyTutors = rankTutorsByDistance(
    geo,
    userLocation.latitude,
    userLocation.longitude,
    filters.distance,
  )
    .sort((a, b) => {
      if (a.subscriptionTier === b.subscriptionTier) return 0;
      return a.subscriptionTier === "pro" ? -1 : 1;
    })
    .slice(0, 5);

  // ── Handlers ──
  const handleMarkerClick = useCallback(
    (marker: TutorMarker) => {
      // If it's a cluster marker, zoom in. The native animation
      // promise can reject with CancellationException when a newer
      // camera move supersedes it mid-flight — that's harmless, so
      // swallow it here (belt-and-braces on top of the safe wrapper
      // inside TutorMap).
      if (marker.id.startsWith("cluster-")) {
        try {
          mapRef.current?.setCameraPosition({
            latitude: marker.latitude,
            longitude: marker.longitude,
            zoom: Math.min(camera.zoom + 2, 18),
            duration: 300,
          });
        } catch {
          // Superseded animation — ignore.
        }
        return;
      }

      // Single tutor — find and show preview
      const cluster = clusters.find(
        (c): c is Extract<TutorClusterFeature, { type: "tutor" }> =>
          c.type === "tutor" && c.id === marker.id,
      );
      if (cluster) {
        setSelectedTutor(cluster.tutor);
        setSelectedTutorId(cluster.tutor.uid);
        setPreviewVisible(true);
      }
    },
    [clusters, camera.zoom],
  );

  // Clearing selection (preview close / map tap) resets the pin to
  // its base variant and hides the radius circle.
  const clearSelection = useCallback(() => {
    setSelectedTutor(null);
    setSelectedTutorId(null);
    setPreviewVisible(false);
  }, []);

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
      // Single-animation jump: update the controlled `cameraTarget`
      // prop and let the map animate from it. Calling
      // `setCameraPosition` HERE TOO would start a SECOND animation
      // that cancels the prop-driven one, which is exactly the
      // "Animation cancelled" rejection storm in the logs.
      setCameraTarget(newCam);
    }
  }, [userLocation]);

  // ── Count tutors with map pins ──
  const pinnedTutors = geo.length;

  // Carousel geometry — cards are ~85% of the screen width with a
  // 16px gap, so the next card peeks in from the right edge.
  const { width: windowWidth } = useWindowDimensions();
  const carouselCardWidth = Math.round(windowWidth * 0.85);
  const CAROUSEL_GAP = 16;

  return (
    <ScreenLayout variant="background">

      {/* ── Hero header — canonical ScreenHeader slot, matching
          StudentHome (px-6 gutters, safe-area handled by
          ScreenLayout — no hand-rolled pt-14). ── */}
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-body text-text-secondary mb-0.5">Find a tutor</Text>
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: colors.brand.accent,
                paddingBottom: 2,
                alignSelf: "flex-start",
              }}
            >
              <Text className="text-screen-title font-medium text-text-primary">
                Near you
              </Text>
            </View>
          </View>
          <MapHeroBack onPress={() => router.replace("/student-home")} />
        </View>

        {/* Search bar + filter trigger */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-surface rounded-card h-12 flex-row items-center px-3 gap-2.5 border border-border">
            <Ionicons name="search-outline" size={18} color={colors.text.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tutors, subjects…"
              placeholderTextColor={colors.text.muted}
              className="flex-1 text-body text-text-primary"
            />
            {search.length > 0 && (
              <MapClearSearch onPress={() => setSearch("")} />
            )}
          </View>
          <MapFiltersButton onPress={() => setFiltersOpen(true)} />
        </View>
      </ScreenHeader>

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
            circles={selectedCircle}
            isMyLocationEnabled
            onMarkerClick={handleMarkerClick}
            onCameraMove={handleCameraMove}
            onMapTap={previewVisible ? clearSelection : undefined}
          />
        )}

        {/* Offscreen rasterizer host for avatar drop pins */}
      {avatarPinHost}
      {selectedAvatarHost}

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
          <Ionicons name="people" size={14} color={colors.text.inverse} />
          <Text className="text-caption font-medium text-white">
            {pinnedTutors} tutor{pinnedTutors !== 1 ? "s" : ""} on map
          </Text>
        </View>

        {/* Nearby tutors carousel — horizontal swipe over the map.
            Cards are 200px wide with a 16px gap; `snapToInterval`
            aligns one card per swipe. */}
        {nearbyTutors.length > 0 && !previewVisible && (
          <View className="absolute left-0 right-0 bottom-2">
            <View className="px-3 mb-2">
              <View
                className="self-start bg-surface/90 rounded-pill px-3 py-1 border border-border"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text className="text-caption font-medium text-text-muted">
                  {nearbyTutors.length} tutor{nearbyTutors.length !== 1 ? "s" : ""} within {filters.distance} km
                </Text>
              </View>
            </View>
            <FlatList
              horizontal
              data={nearbyTutors}
              keyExtractor={(t) => t.uid}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="center"
              snapToInterval={carouselCardWidth + CAROUSEL_GAP}
              contentContainerStyle={{
                paddingHorizontal: 12,
                gap: CAROUSEL_GAP,
                paddingBottom: 4,
              }}
              renderItem={({ item: t }) => (
                <TutorCard
                  tutor={createDefaultTutorProfile({
                    id: t.uid,
                    fullName: t.fullName,
                    username: t.username,
                    headline: t.headline,
                    gender: t.gender,
                    subjects: t.subjects,
                    yearsExperience: t.yearsExperience,
                    monthlyRateNpr: t.monthlyRateNpr,
                    location: t.location,
                    distanceKm: t.distanceKm,
                    photoUrl: t.photoUrl,
                    verificationStatus:
                      (t.verificationStatus as
                        | "pending"
                        | "approved"
                        | "rejected"
                        | "more_info") ?? "approved",
                    isVerifiedProfessional: t.isVerifiedProfessional,
                    rating: t.rating,
                    reviewCount: t.reviewCount,
                  })}
                  variant="compact-h"
                  tone="light"
                  width={carouselCardWidth}
                  onPress={() => {
                    setSelectedTutor(t);
                    setSelectedTutorId(t.uid);
                    setPreviewVisible(true);
                  }}
                />
              )}
            />
          </View>
        )}
      </View>

      {/* ── Bottom navigation ── */}
      <BottomNav role="student" current="/map-search" />

      {/* ── Tutor preview sheet (slides up on marker tap) ── */}
      <TutorPreviewSheet
        tutor={selectedTutor}
        visible={previewVisible}
        onClose={clearSelection}
      />
      {/* ── Filters sheet overlay ── */}
      <FiltersSheet
        visible={filtersOpen}
        value={filters}
        onApply={setFilters}
        onClose={() => setFiltersOpen(false)}
        resultCount={filteredTutors.length}
      />
    </ScreenLayout>
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
      className="w-10 h-10 rounded-pill bg-surface border border-border items-center justify-center"
    >
      <Ionicons name="chevron-back" size={20} color={colors.brand.primary} />
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
      <Ionicons name="close-circle" size={18} color={colors.text.muted} />
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
      className="w-12 h-12 rounded-card bg-accent items-center justify-center"
    >
      <Ionicons name="options-outline" size={20} color={colors.text.inverse} />
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

// Note: the bespoke `NearbyTutorRow` used to live here. It was replaced
// by `<TutorCard variant="compact-h" tone="light" />` (see the import
// above) — the card already implements the press-scale, avatar, rating
// row, and price chip in a 200-px-wide rail layout.