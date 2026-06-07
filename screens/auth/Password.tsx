import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Text, XStack, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

type StrengthColor = "transparent" | "$semDanger" | "$semWarning" | "$semSuccess";

function getStrength(password: string): {
  label: string;
  color: StrengthColor;
  width: "0%" | "33%" | "66%" | "100%";
} {
  if (password.length === 0)
    return { label: "", color: "transparent", width: "0%" };
  if (password.length < 6)
    return { label: "Weak", color: "$semDanger", width: "33%" };
  if (password.length < 10)
    return { label: "Fair", color: "$semWarning", width: "66%" };
  return { label: "Strong", color: "$semSuccess", width: "100%" };
}

export function CreatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getStrength(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = password.length >= 6 && password === confirmPassword;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.surface }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <XStack
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            minHeight={44}
            alignSelf="flex-start"
            alignItems="center"
            gap={spacing.xs}
            marginBottom={spacing.lg}
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text {...typography.body} color={colors.brand.primary}>
              Back
            </Text>
          </XStack>

          {/* Header */}
          <YStack alignItems="center" gap={spacing.sm} paddingTop={spacing.lg} marginBottom={spacing.xxl}>
            <YStack
              width={64}
              height={64}
              alignItems="center"
              justifyContent="center"
              borderRadius={9999}
              backgroundColor={colors.brand.primaryLight}
              marginBottom={spacing.sm}
            >
              <Ionicons
                color={colors.brand.primary}
                name="lock-closed-outline"
                size={28}
              />
            </YStack>
            <Text {...typography.heroTitle} textAlign="center" color={colors.text.onboardingTitle}>
              Create a password
            </Text>
            <Text
              {...typography.body}
              maxWidth={288}
              textAlign="center"
              color={colors.text.secondary}
            >
              Choose a strong password to secure your account.
            </Text>
          </YStack>

          {/* Password */}
          <YStack gap={spacing.xs} marginBottom={spacing.lg}>
            <Text {...typography.button} color={colors.text.primary}>
              Password
            </Text>
            <XStack
              height={52}
              alignItems="center"
              borderWidth={1}
              borderColor={colors.border.default}
              borderRadius={10}
              backgroundColor={colors.background.surface}
              paddingHorizontal={spacing.md}
            >
              <Input
                flex={1}
                color={colors.text.primary}
                fontSize={15}
                borderWidth={0}
                backgroundColor="transparent"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="$textMuted"
                secureTextEntry={!showPassword}
                value={password}
              />
              <Button
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                accessibilityRole="button"
                width={44}
                height={44}
                backgroundColor="transparent"
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                pressStyle={{ backgroundColor: "transparent" }}
              >
                <Ionicons
                  color={colors.text.muted}
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                />
              </Button>
            </XStack>

            {/* Strength hint */}
            {password.length > 0 && (
              <XStack alignItems="center" gap={spacing.sm} marginTop={spacing.xs}>
                <YStack
                  flex={1}
                  height={4}
                  backgroundColor={colors.border.default}
                  borderRadius={2}
                  overflow="hidden"
                >
                  <YStack
                    height="100%"
                    width={strength.width}
                    backgroundColor={strength.color}
                    borderRadius={2}
                  />
                </YStack>
                <Text {...typography.caption} width={44} fontWeight="600" color={strength.color}>
                  {strength.label}
                </Text>
              </XStack>
            )}
          </YStack>

          {/* Confirm Password */}
          <YStack gap={spacing.xs} marginBottom={spacing.lg}>
            <Text {...typography.button} color={colors.text.primary}>
              Confirm Password
            </Text>
            <XStack
              height={52}
              alignItems="center"
              borderWidth={1}
              borderColor={passwordsMatch ? colors.semantic.danger : colors.border.default}
              borderRadius={10}
              backgroundColor={colors.background.surface}
              paddingHorizontal={spacing.md}
            >
              <Input
                flex={1}
                color={colors.text.primary}
                fontSize={15}
                borderWidth={0}
                backgroundColor="transparent"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor="$textMuted"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
              />
              <Button
                accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
                accessibilityRole="button"
                width={44}
                height={44}
                backgroundColor="transparent"
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={8}
                pressStyle={{ backgroundColor: "transparent" }}
              >
                <Ionicons
                  color={colors.text.muted}
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                />
              </Button>
            </XStack>
            {passwordsMatch && (
              <Text {...typography.caption} color={colors.semantic.danger} marginTop={spacing.xs}>
                Passwords do not match
              </Text>
            )}
          </YStack>

          {/* Continue Button */}
          <YStack flex={1} justifyContent="flex-end" paddingTop={spacing.xxl}>
            <Button
              accessibilityRole="button"
              disabled={!canSubmit}
              height={52}
              borderRadius={12}
              alignItems="center"
              justifyContent="center"
              style={{
                backgroundColor: canSubmit
                  ? colors.brand.primary
                  : colors.border.strong,
              }}
              onPress={() => router.replace("/role-selection")}
              pressStyle={{
                backgroundColor: canSubmit
                  ? colors.brand.primary
                  : colors.border.strong,
              }}
            >
              <Text
                {...typography.button}
                color={canSubmit ? colors.text.inverse : colors.text.muted}
              >
                Continue
              </Text>
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
