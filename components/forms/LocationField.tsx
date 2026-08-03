import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
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

  const canSave = draft.city.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onChange({
      neighborhood: draft.neighborhood.trim(),
      city: draft.city.trim(),
    });
    setMode("set");
  }

  function handleEdit() {
    setMode("unset");
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

      <View className="gap-2">
        <View className="min-h-input px-3 justify-center border-2 border-border rounded-card bg-surface">
          <TextInput
            value={draft.neighborhood}
            onChangeText={(neighborhood) =>
              setDraft({ neighborhood, city: draft.city })
            }
            placeholder="Neighborhood (e.g., Patan)"
            placeholderTextColor={colors.text.muted}
            className="text-body-lg text-text-primary"
          />
        </View>
        <View className="min-h-input px-3 justify-center border-2 border-border rounded-card bg-surface">
          <TextInput
            value={draft.city}
            onChangeText={(city) =>
              setDraft({ neighborhood: draft.neighborhood, city })
            }
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