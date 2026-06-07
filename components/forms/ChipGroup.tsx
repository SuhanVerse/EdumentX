import { Button, Text, XStack, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

type ChipGroupProps = {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  error?: string;
};

/**
 * Multi-select chip row. Renders the existing chip style (border 1.5,
 * `$night` filled when selected) and is used for both subjects and grades
 * in the profile forms. Single-select is the multi-select case of 0/1.
 */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  error,
}: ChipGroupProps) {
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
      <Text {...typography.overline} color={colors.text.muted}>
        {label}
      </Text>
      <XStack flexWrap="wrap" gap={spacing.sm}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Button
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              minHeight={40}
              paddingHorizontal={spacing.lg}
              paddingVertical={spacing.sm}
              borderWidth={1.5}
              borderColor={active ? colors.brand.primary : colors.border.default}
              borderRadius={10}
              backgroundColor={active ? colors.brand.primary : colors.background.surface}
              onPress={() => onToggle(option)}
              pressStyle={{
                backgroundColor: active ? colors.brand.primary : colors.background.surface,
                opacity: 0.85,
              }}
            >
              <Text
                {...typography.buttonSmall}
                color={active ? colors.text.inverse : colors.text.secondary}
              >
                {option}
              </Text>
            </Button>
          );
        })}
      </XStack>
      {error ? (
        <Text {...typography.caption} color={colors.semantic.danger}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
