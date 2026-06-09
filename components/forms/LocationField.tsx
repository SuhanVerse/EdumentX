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
  const currentLocation: LocationValue = value ?? { neighborhood: "", city: "" };
  const hasValue = value !== null;
  const [showFallback, setShowFallback] = useState(!hasValue);

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
            value={currentLocation.neighborhood}
            onChangeText={(neighborhood) =>
              onChange({ neighborhood, city: currentLocation.city })
            }
            placeholder="Neighborhood (e.g., Patan)"
            placeholderTextColor={colors.text.muted}
            className="min-h-input px-3 border-emphasis border-border rounded-md bg-surface text-body-lg text-text-primary"
          />
          <TextInput
            value={currentLocation.city}
            onChangeText={(city) =>
              onChange({ city, neighborhood: currentLocation.neighborhood })
            }
            placeholder="City (e.g., Lalitpur)"
            placeholderTextColor={colors.text.muted}
            className="min-h-input px-3 border-emphasis border-border rounded-md bg-surface text-body-lg text-text-primary"
          />
        </View>
      )}
    </View>
  );
}
