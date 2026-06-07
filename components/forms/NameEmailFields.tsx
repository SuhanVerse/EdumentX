import { Input, Text, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

type NameEmailFieldsProps = {
  fullName: string;
  email: string;
  errors?: {
    fullName?: string;
    email?: string;
  };
  onChangeFullName: (value: string) => void;
  onChangeEmail: (value: string) => void;
};

/**
 * Two side-by-side fields used by both the student and tutor profile forms.
 * Owns its own label + error layout. No submit / no button.
 */
export function NameEmailFields({
  fullName,
  email,
  errors,
  onChangeFullName,
  onChangeEmail,
}: NameEmailFieldsProps) {
  return (
    <YStack
      gap={spacing.lg}
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
      <YStack gap={spacing.xs}>
        <Text {...typography.overline} color={colors.text.muted}>
          Full name
        </Text>
        <Input
          value={fullName}
          onChangeText={onChangeFullName}
          placeholder="e.g., Aarav Tamang"
          placeholderTextColor="$textMuted"
          autoCapitalize="words"
          minHeight={52}
          paddingHorizontal={spacing.lg}
          borderWidth={1.5}
          borderColor={errors?.fullName ? colors.semantic.danger : colors.border.default}
          borderRadius={12}
          backgroundColor={colors.background.surface}
          color={colors.text.primary}
          fontSize={15}
        />
        {errors?.fullName ? (
          <Text {...typography.caption} color={colors.semantic.danger}>
            {errors.fullName}
          </Text>
        ) : null}
      </YStack>

      <YStack gap={spacing.xs}>
        <Text {...typography.overline} color={colors.text.muted}>
          Email
        </Text>
        <Input
          value={email}
          onChangeText={onChangeEmail}
          placeholder="e.g., aarav@gmail.com"
          placeholderTextColor="$textMuted"
          autoCapitalize="none"
          keyboardType="email-address"
          minHeight={52}
          paddingHorizontal={spacing.lg}
          borderWidth={1.5}
          borderColor={errors?.email ? colors.semantic.danger : colors.border.default}
          borderRadius={12}
          backgroundColor={colors.background.surface}
          color={colors.text.primary}
          fontSize={15}
        />
        {errors?.email ? (
          <Text {...typography.caption} color={colors.semantic.danger}>
            {errors.email}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}
