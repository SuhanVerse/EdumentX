import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import {
  LocationPickerModal,
  type PickedCoordinates,
} from "@/components/map/LocationPickerModal";
import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { reverseGeocode, type ReverseGeocodeResult } from "@/lib/location/geocoder";
import { motion } from "@/lib/motion";
import type { LocationValue } from "@/lib/registration";

type LocationFieldProps = {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
};

/**
 * "Share my location" form card. Two modes (internal state; the parent
 * `value` prop is only read on mount):
 *
 *   unset — neighborhood + city TextInputs are mounted; the user types
 *           freely without any keystroke committing. A "Save Location"
 *           button below the inputs is the *only* way to push the draft
 *           up to the parent via `onChange(...)`.
 *
 *   set   — single summary row (neighborhood, city) with an "Edit" pill
 *           that flips back to unset with the draft re-populated.
 *
 * Why the explicit Save button: the previous implementation called
 * `onChange(...)` on every keystroke once a minimum-length threshold
 * was crossed. The parent then flipped its state from `null` to a
 * populated `LocationValue`, this component re-rendered in the "set"
 * view, and the TextInputs unmounted. The user perceived this as
 * "I can only type 3 characters." Removing the threshold was not
 * enough on its own — even `if (city.length < 0)` would still cause
 * the parent to flip on the first character. The fix is to decouple
 * "user is typing" from "parent has a value": the parent only learns
 * the value when the user explicitly saves.
 *
 * Why we initialize from `value` on mount but ignore later updates:
 * the parent only owns the canonical "last saved" value. While the
 * user is editing, the draft is the source of truth — yanking it
 * out from under them when the parent's setLocation callback fires
 * (e.g. on a re-render) would be jarring.
 */
export function LocationField({ value, onChange }: LocationFieldProps) {
  const [mode, setMode] = useState<"unset" | "set">(value ? "set" : "unset");
  const [draft, setDraft] = useState<LocationValue>(
    value ?? { neighborhood: "", city: "" },
  );

  // ── GPS / map-picker state ──
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  /** Last GPS fix this session — seeds the map picker camera. */
  const [lastFix, setLastFix] = useState<PickedCoordinates | null>(null);

  const canSave = draft.city.trim().length > 0;

function handleSave() {
    if (!canSave) return;
    onChange({
      neighborhood: draft.neighborhood.trim(),
      city: draft.city.trim(),
      // The GPS pin rides along on save. The parent screens write the
      // `LocationValue` object straight into Firestore, so the
      // coordinates land under `location.coordinates` where
      // `firestoreTutorService.subscribeTutors` reads them for map
      // plotting.
      ...(draft.coordinates ? { coordinates: draft.coordinates } : {}),
    });
    setMode("set");
  }

  function handleEdit() {
    setMode("unset");
  }

  // ── One-tap GPS auto-location ──

  async function handleLocateMe() {
    if (locating) return;
    setLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Location permission is off — enable it in Settings and try again.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const fix: PickedCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLastFix(fix);
      const result = await reverseGeocode(fix.latitude, fix.longitude);
      // Auto-fill draft with the GPS spot — missing parts stay empty;
      // the user can type them or use the map picker. The fix is kept
      // as the draft's pin so it persists on save.
      setDraft({
        neighborhood: result.neighborhood || "",
        city: result.city || "",
        coordinates: fix,
      });
    } catch {
      setLocationError(
        "Couldn't fetch your location — check your connection and try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  // ── Manual map picker ──

  function handleMapConfirm(location: ReverseGeocodeResult) {
    setMapOpen(false);
    // The picker returns the exact dropped-pin position on
    // `location.latitude / longitude` — snap it as the draft's
    // coordinates so the saved profile carries a real pin.
    setDraft((d) => ({
      neighborhood: location.neighborhood || d.neighborhood,
      city: location.city || d.city,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    }));
  }

  // ---- "set" view — single summary row + Edit pill
  if (mode === "set") {
    const summary = `${value?.neighborhood ? `${value.neighborhood}, ` : ""}${value?.city ?? ""}`;
    return (
      <View className="gap-2">
        <Text className="text-label text-ink-muted">
          Your location
        </Text>
        <LocationSummary summary={summary} onEdit={handleEdit} />
      </View>
    );
  }

  // ---- "unset" view — two TextInputs + Save button
  return (
    <View className="gap-3">
      <Text className="text-label text-ink-muted">
        Your location
      </Text>

      {/* Quick actions: one-tap GPS + manual map picker */}
      <View className="flex-row gap-2">
        <LocationQuickAction
          icon="navigate"
          label="Locate Me"
          loading={locating}
          onPress={handleLocateMe}
        />
        <LocationQuickAction
          icon="map-outline"
          label="Pick on Map"
          onPress={() => {
            setLocationError(null);
            setMapOpen(true);
          }}
        />
      </View>

      {locationError ? (
        <Text className="text-caption text-danger">{locationError}</Text>
      ) : null}

      <View className="gap-2">
        <View className="min-h-input px-3 justify-center border-2 border-border rounded-card bg-surface">
          <TextInput
            value={draft.neighborhood}
            onChangeText={(neighborhood) =>
              setDraft((d) => ({ ...d, neighborhood }))
            }
            placeholder="Neighborhood (e.g., Patan)"
            placeholderTextColor={colors.text.muted}
            className="text-body-lg text-text-primary"
          />
        </View>
        <View className="min-h-input px-3 justify-center border-2 border-border rounded-card bg-surface">
          <TextInput
            value={draft.city}
            onChangeText={(city) => setDraft((d) => ({ ...d, city }))}
            placeholder="City (e.g., Lalitpur)"
            placeholderTextColor={colors.text.muted}
            className="text-body-lg text-text-primary"
          />
        </View>
      </View>

      <LocationSaveButton
        canSave={canSave}
        onPress={handleSave}
      />

      <LocationPickerModal
        visible={mapOpen}
        initial={lastFix}
        onClose={() => setMapOpen(false)}
        onConfirm={handleMapConfirm}
      />
    </View>
  );
}

function LocationSummary({
  summary,
  onEdit,
}: {
  summary: string;
  onEdit: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Edit location"
      onPress={onEdit}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="flex-row items-center justify-between bg-surface border border-border rounded-card min-h-input px-4"
    >
      <View className="flex-row items-center gap-2 flex-1">
        <Ionicons
          color={colors.brand.primary}
          name="location-outline"
          size={18}
        />
        <Text
          className="text-body-lg text-text-primary flex-1"
          numberOfLines={1}
        >
          {summary}
        </Text>
      </View>
      <View className="flex-row items-center gap-1 bg-sand rounded-pill px-2 py-1">
        <Ionicons
          color={colors.text.secondary}
          name="pencil"
          size={11}
        />
        <Text className="text-micro text-text-secondary font-medium">
          Edit
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function LocationSaveButton({
  canSave,
  onPress,
}: {
  canSave: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Save location"
      accessibilityState={{ disabled: !canSave }}
      disabled={!canSave}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="min-h-btn rounded-card items-center justify-center bg-primary w-full mt-1 disabled:opacity-50"
    >
      <Text className="text-button-sm text-white font-semibold">
        Save Location
      </Text>
    </AnimatedPressable>
  );
}

function LocationQuickAction({
  icon,
  label,
  loading = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="flex-1 min-h-input flex-row items-center justify-center gap-2 rounded-card border-2 border-border bg-surface"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <Ionicons name={icon} size={15} color={colors.brand.primary} />
      )}
      <Text className="text-body font-medium text-text-primary">
        {label}
      </Text>
    </AnimatedPressable>
  );
}