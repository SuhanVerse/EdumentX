import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/colors";
import type { LocationValue } from "@/lib/registration";

type LocationFieldProps = {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
};

/**
 * "Share my location" form card. Two states:
 *  - unset: a primary copper "Use my current location" button +
 *    two manual text fields below (neighborhood + city)
 *  - set: a check disc, neighborhood + city text, "Change" link
 */
export function LocationField({ value, onChange }: LocationFieldProps) {
  // Local draft — what the user is currently typing. Initialized from
  // `value` if we already have a committed location; otherwise empty.
  // Keeping keystrokes in local state means a single character does NOT
  // flip the parent into the "Set" state; the draft is only committed
  // (via `onChange`) once it looks like a real location.
  const [draft, setDraft] = useState<LocationValue>(
    value ?? { neighborhood: "", city: "" },
  );

  // Minimum city length before the draft is considered a real location.
  // See the long comment on `commit()` below for why 3 (not 2). Without
  // this gate the parent flips to the "Set" view on the very first
  // keystroke and the TextInputs unmount, making it look like the field
  // only accepts one character. That bug existed because the constant
  // was declared here as documentation but the actual `< 0` comparison
  // was always false — a typo carried over from the original draft.
  const MIN_CITY_LENGTH = 3;

  const hasValue = value !== null;
  const [showFallback, setShowFallback] = useState(!hasValue);

  /**
   * Push the local draft up to the parent as soon as the user has typed
   * at least `MIN_CITY_LENGTH` non-whitespace chars. We require a minimum
   * length so that a single keystroke (e.g. "K" while the user is still
   * typing "Kathmandu") doesn't flip the form into the "Set" state and
   * hide the input behind a "Change" link — the user would otherwise
   * think the field is stuck.
   *
   * The TextInput itself has NO `maxLength` prop — the user can type
   * any number of characters into `draft.city`. The 3-char threshold
   * here only gates the "Set" badge / form-submit eligibility (i.e.
   * "Kathmandu" works, "Ka" still shows the input but does not flip
   * the form into the "Set" state).
   *
   * Why 3 and not 2? "Ka" or "La" are valid city prefixes while the
   * user is typing; with a 2-char threshold a city like "Pokhara"
   * would briefly land in the "Set" state mid-typing and the form
   * would flip, hiding the input behind the "Change" link. 3 chars
   * is the minimum that gives every common Nepali city at least one
   * step of grace before the badge appears.
   */
  function commit(next: LocationValue) {
    const neighborhood = next.neighborhood.trim();
    const city = next.city.trim();
    if (city.length < MIN_CITY_LENGTH) {
      // Below the threshold — keep the draft local so the inputs stay
      // mounted. We do NOT call onChange(null); the parent will keep
      // treating the location as "unset" because the previous value
      // (if any) is unchanged. If the field was already committed we
      // must NOT clear it just because the user is editing it.
      return;
    }
    onChange({ neighborhood, city });
  }

  function handleGpsTap() {
    Alert.alert(
      "Location will be enabled soon",
      "For now, enter your neighborhood and city manually. The map phase will add real GPS detection.",
    );
  }

  function handleManualEntry() {
    setShowFallback(true);
  }

  if (hasValue && value) {
    return (
      <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-overline text-text-muted uppercase">
            Your location
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons color={colors.semantic.success} name="checkmark-circle" size={14} />
            <Text className="text-caption text-success font-semibold">
              Set
            </Text>
          </View>
        </View>
        <Text className="text-caption text-text-secondary">
          Used to show you to nearby tutors. You can update this anytime.
        </Text>
        <View className="gap-2">
          <View className="flex-row items-center gap-2 p-3 border-emphasis border-border rounded-xl bg-sand">
            <View className="w-9 h-9 items-center justify-center rounded-full bg-onb-verify">
              <Ionicons color={colors.brand.primary} name="location-outline" size={18} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-button-sm text-text-primary">
                {value.neighborhood ? `${value.neighborhood}, ` : ""}
                {value.city}
              </Text>
              <Text className="text-caption text-text-muted">
                Entered manually
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change location"
              onPress={() => onChange(null)}
              className="min-h-pill-sm px-3 active:opacity-70"
            >
              <Text className="text-button-sm text-text-primary">Change</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-overline text-text-muted uppercase">
          Your location
        </Text>
      </View>
      <Text className="text-caption text-text-secondary">
        Used to show you to nearby learners. You can update this anytime.
      </Text>

      {!showFallback ? (
        <View className="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
            onPress={handleGpsTap}
            className="min-h-input rounded-card bg-amber flex-row items-center justify-center gap-2 active:opacity-90"
          >
            <Ionicons color="white" name="navigate-outline" size={18} />
            <Text className="text-button text-white font-semibold">
              Use my current location
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleManualEntry}
            className="min-h-pill-sm items-center justify-center active:opacity-70"
          >
            <Text className="text-caption text-text-muted">or enter manually</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-2">
          <TextInput
            value={draft.neighborhood}
            onChangeText={(neighborhood) => {
              const next = { neighborhood, city: draft.city };
              setDraft(next);
              commit(next);
            }}
            placeholder="Neighborhood (e.g., Patan)"
            placeholderTextColor={colors.text.muted}
            className="min-h-input px-3 border-emphasis border-border rounded-md bg-surface text-body-lg text-text-primary"
          />
          <TextInput
            value={draft.city}
            onChangeText={(city) => {
              const next = { neighborhood: draft.neighborhood, city };
              setDraft(next);
              commit(next);
            }}
            placeholder="City (e.g., Lalitpur)"
            placeholderTextColor={colors.text.muted}
            className="min-h-input px-3 border-emphasis border-border rounded-md bg-surface text-body-lg text-text-primary"
          />
        </View>
      )}
    </View>
  );
}
