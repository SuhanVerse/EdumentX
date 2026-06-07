import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { Button, Input, Text, XStack, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
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
 *
 * The GPS tap is currently a no-op Alert — the real `expo-location`
 * integration lands in Phase 5 (maps). The manual path works today and
 * is what students/tutors will use until the map phase.
 */
export function LocationField({ value, onChange }: LocationFieldProps) {
  const currentLocation: LocationValue = value ?? { neighborhood: "", city: "" };
  const hasValue = value !== null;

  function handleGpsTap() {
    Alert.alert(
      "Location will be enabled soon",
      "For now, enter your neighborhood and city manually. The map phase will add real GPS detection.",
    );
  }

  return (
    <YStack
      gap={spacing.md}
      padding={spacing.xl}
      borderWidth={1}
      borderColor={colors.border.subtle}
      borderRadius={16}
      backgroundColor={colors.background.surface}
      shadowColor={colors.brand.primary}
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.05}
      shadowRadius={12}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <Text {...typography.overline} color={colors.text.muted}>
          Your location
        </Text>
        {hasValue ? (
          <XStack alignItems="center" gap={4}>
            <Ionicons
              color={colors.semantic.success}
              name="checkmark-circle"
              size={14}
            />
            <Text {...typography.caption} color={colors.semantic.success} fontWeight="600">
              Set
            </Text>
          </XStack>
        ) : null}
      </XStack>

      <Text {...typography.caption} color={colors.text.secondary}>
        Used to show you to nearby {hasValue ? "tutors" : "learners"}. You can update this anytime.
      </Text>

      {hasValue && value ? (
        <YStack gap={spacing.sm}>
          <XStack
            alignItems="center"
            gap={spacing.sm}
            padding={spacing.md}
            borderWidth={1.5}
            borderColor={colors.border.default}
            borderRadius={12}
            backgroundColor={colors.background.page}
          >
            <YStack
              width={36}
              height={36}
              alignItems="center"
              justifyContent="center"
              borderRadius={9999}
              backgroundColor={colors.onboarding.verifyBackground}
            >
              <Ionicons color={colors.brand.primary} name="location-outline" size={18} />
            </YStack>
            <YStack flex={1} gap={2}>
              <Text {...typography.buttonSmall} color={colors.text.primary}>
                {value.neighborhood ? `${value.neighborhood}, ` : ""}
                {value.city}
              </Text>
              <Text {...typography.caption} color={colors.text.muted}>
                Entered manually
              </Text>
            </YStack>
            <Button
              accessibilityRole="button"
              accessibilityLabel="Change location"
              minHeight={36}
              paddingHorizontal={spacing.md}
              backgroundColor="transparent"
              onPress={() => onChange(null)}
              pressStyle={{ backgroundColor: "transparent", opacity: 0.7 }}
            >
              <Text {...typography.buttonSmall} color={colors.brand.primary}>
                Change
              </Text>
            </Button>
          </XStack>
        </YStack>
      ) : (
        <YStack gap={spacing.sm}>
          <Button
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
            minHeight={48}
            borderRadius={12}
            backgroundColor={colors.brand.accent}
            onPress={handleGpsTap}
            icon={
              <Ionicons color={colors.text.inverse} name="navigate-outline" size={18} />
            }
            pressStyle={{ backgroundColor: colors.brand.accent, opacity: 0.9 }}
          >
            <Text {...typography.button} color={colors.text.inverse} fontWeight="600">
              Use my current location
            </Text>
          </Button>

          <YStack gap={spacing.sm} marginTop={spacing.xs}>
            <Text {...typography.caption} color={colors.text.muted} textAlign="center">
              or enter manually
            </Text>

            <Input
              value={currentLocation.neighborhood}
              onChangeText={(neighborhood) =>
                onChange({ neighborhood, city: currentLocation.city })
              }
              placeholder="Neighborhood (e.g., Patan)"
              placeholderTextColor="$textMuted"
              minHeight={48}
              paddingHorizontal={spacing.md}
              borderWidth={1.5}
              borderColor={colors.border.default}
              borderRadius={10}
              backgroundColor={colors.background.surface}
              color={colors.text.primary}
              fontSize={15}
            />
            <Input
              value={currentLocation.city}
              onChangeText={(city) =>
                onChange({ city, neighborhood: currentLocation.neighborhood })
              }
              placeholder="City (e.g., Lalitpur)"
              placeholderTextColor="$textMuted"
              minHeight={48}
              paddingHorizontal={spacing.md}
              borderWidth={1.5}
              borderColor={colors.border.default}
              borderRadius={10}
              backgroundColor={colors.background.surface}
              color={colors.text.primary}
              fontSize={15}
            />
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
