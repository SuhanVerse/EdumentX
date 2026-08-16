/**
 * LocationPickerModal — visual manual map picker for profile setup.
 *
 * A full-screen OSM-powered map (via `TutorMapView` / expo-maps):
 * the user taps anywhere to drop the EdumentX amber pin, and a
 * debounced Nominatim reverse-geocode fills the preview address.
 * "Confirm Location" hands the structured address back to the caller
 * (LocationField), which auto-fills its neighborhood/city inputs.
 *
 * Zero-budget stack adhered to: expo-location for the GPS "locate me"
 * shortcut, Nominatim (keyless) for reverse geocoding, no Google Maps
 * Geocoding API anywhere.
 *
 * Motion: every interactive surface uses `AnimatedPressable` +
 * `usePressScale` (100ms tactile target). No bare Pressable taps.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { TutorMapView } from "@/components/map/TutorMap";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { reverseGeocode, type ReverseGeocodeResult } from "@/lib/location/geocoder";
import { loadMarkerIcons, type MarkerIconSet } from "@/lib/map/markerIcons";
import { motion } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PickedCoordinates = {
  latitude: number;
  longitude: number;
};

type LocationPickerModalProps = {
  visible: boolean;
  /** Pre-seed camera + pin (e.g. the user's last GPS fix). */
  initial?: PickedCoordinates | null;
  onClose: () => void;
  /** Address resolved for the pin the user confirmed. */
  onConfirm: (location: ReverseGeocodeResult) => void;
};

/** Fallback camera before any pin/GPS lands — Ratna Park, Kathmandu,
 *  zoomed to neighbourhood level. Nepal-only bounds are enforced by
 *  `TutorMap` (see `lib/location/nepalBounds.ts`). */
const DEFAULT_CAMERA = { latitude: 27.7103, longitude: 85.3222, zoom: 15 };

type GeocodeState = "idle" | "loading" | "done" | "error";

// ─── Component ───────────────────────────────────────────────────────────────

export function LocationPickerModal({
  visible,
  initial,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [icons, setIcons] = useState<MarkerIconSet | null>(null);
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const [picked, setPicked] = useState<PickedCoordinates | null>(null);
  const [address, setAddress] = useState<ReverseGeocodeResult | null>(null);
  const [geocodeState, setGeocodeState] = useState<GeocodeState>("idle");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeRequestId = useRef(0);

  // Load the amber pin icon once for the Android marker.
  useEffect(() => {
    loadMarkerIcons().then(setIcons);
  }, []);

  // Reset the picker each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    setLocationError(null);
    if (initial) {
      setPicked(initial);
      setCamera({ ...initial, zoom: 15.5 });
    } else {
      setPicked(null);
      setCamera(DEFAULT_CAMERA);
    }
  }, [visible, initial]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const markers = useMemo(
    () =>
      picked
        ? [
            {
              id: "picked",
              latitude: picked.latitude,
              longitude: picked.longitude,
              color: colors.brand.accent,
              // Solid amber locator — the picker's drop pin (brand
              // amber, distinct from the slate/green tutor pins).
              icon: icons?.picker,
            },
          ]
        : [],
    [picked, icons],
  );

  // ── Reverse geocode (debounced — Nominatim allows 1 req/sec) ──

  function scheduleGeocode(lat: number, lon: number) {
    const requestId = ++geocodeRequestId.current;
    setAddress(null);
    setGeocodeState("loading");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await reverseGeocode(lat, lon);
        if (requestId === geocodeRequestId.current) {
          setAddress(result);
          setGeocodeState("done");
        }
      } catch {
        if (requestId === geocodeRequestId.current) {
          setGeocodeState("error");
        }
      }
    }, 400);
  }

  function handleMapTap(coords: { latitude: number; longitude: number }) {
    setLocationError(null);
    setPicked(coords);
    setCamera((prev) => ({
      ...coords,
      zoom: Math.max(prev.zoom, 15.5),
    }));
    scheduleGeocode(coords.latitude, coords.longitude);
  }

  // ── GPS shortcut ──

  async function handleLocateMe() {
    setLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission is needed to find you.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      setPicked({ latitude, longitude });
      setCamera((prev) => ({ ...{ latitude, longitude }, zoom: Math.max(prev.zoom, 15.5) }));
      scheduleGeocode(latitude, longitude);
    } catch {
      setLocationError("Couldn't fetch your GPS position. Try again.");
    } finally {
      setLocating(false);
    }
  }

  // ── Confirm ──

  async function handleConfirm() {
    if (!picked) return;
    if (geocodeState === "done" && address) {
      onConfirm(address);
      return;
    }
    // Reverse-lookup still pending/failed — one final attempt before
    // confirming the coordinates anyway (the caller can fall back).
    try {
      const result = await reverseGeocode(picked.latitude, picked.longitude);
      onConfirm(result);
    } catch {
      onConfirm({
        latitude: picked.latitude,
        longitude: picked.longitude,
        neighborhood: "",
        city: "",
        label: "",
      });
    }
  }

  // ── Render ──

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-night">
        <TutorMapView
          style={{ flex: 1 }}
          cameraPosition={camera}
          markers={markers}
          onMapTap={handleMapTap}
        />

        {/* ── Overlay UI (inset-safe) ── */}
        <View
          className="absolute inset-0"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          {/* Header: close + locate me */}
          <View className="flex-row items-center justify-between px-4 pt-2">
            <ModalCloseButton onPress={onClose} />
            <ModalLocateMeButton
              loading={locating}
              onPress={handleLocateMe}
            />
          </View>

          {/* Instruction pill overlay (non-interactive) */}
          <View className="flex-1" pointerEvents="none">
            <View className="flex-row justify-center pt-6">
              <View className="bg-night/70 rounded-pill px-4 py-2 flex-row items-center gap-2">
                <Ionicons
                  name="finger-print-outline"
                  size={15}
                  color={colors.brand.accent}
                />
                <Text className="text-caption text-white">
                  {picked
                    ? "Pin placed — tap anywhere to move it"
                    : "Tap anywhere on the map to drop your pin"}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom bar: address preview + Confirm */}
          <View className="bg-surface border-t border-border px-5 pt-4 pb-3">
            {locationError ? (
              <Text className="text-caption text-danger mb-2">{locationError}</Text>
            ) : null}

            <Text className="text-label text-ink-muted mb-1">
              Selected location
            </Text>
            <View className="min-h-input flex-row items-center gap-2">
              <Ionicons
                name="location"
                size={16}
                color={address ? colors.brand.accent : colors.text.muted}
              />
              {geocodeState === "loading" ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                  <Text className="text-body text-text-secondary">
                    Finding address…
                  </Text>
                </View>
              ) : geocodeState === "error" ? (
                <Text className="text-body text-text-secondary flex-1">
                  Couldn&apos;t find an address here — check your connection.
                </Text>
              ) : address ? (
                <Text className="text-body text-text-primary flex-1" numberOfLines={2}>
                  {address.neighborhood && address.city
                    ? `${address.neighborhood}, ${address.city}`
                    : address.label}
                </Text>
              ) : (
                <Text className="text-body text-text-muted flex-1">
                  No pin yet — tap the map first.
                </Text>
              )}
            </View>

            <PrimaryButton
              label="Confirm Location"
              size="lg"
              className="mt-3"
              disabled={!picked}
              onPress={handleConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Small surface pieces ────────────────────────────────────────────────────

function ModalCloseButton({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Close location picker"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="h-10 w-10 items-center justify-center rounded-pill bg-night/80"
    >
      <Ionicons name="close" size={22} color={colors.text.inverse} />
    </AnimatedPressable>
  );
}

function ModalLocateMeButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Use my current location"
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="h-10 flex-row items-center gap-2 rounded-pill bg-night/80 px-3"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.brand.accent} />
      ) : (
        <Ionicons name="navigate" size={15} color={colors.brand.accent} />
      )}
      <Text className="text-caption font-medium text-white">Locate Me</Text>
    </AnimatedPressable>
  );
}