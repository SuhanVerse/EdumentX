import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

function getStrength(password: string): {
  label: string;
  color: string;
  width: DimensionValue;
} {
  if (password.length === 0)
    return { label: "", color: "transparent", width: "0%" };
  if (password.length < 6)
    return { label: "Weak", color: colors.semantic.danger, width: "33%" };
  if (password.length < 10)
    return { label: "Fair", color: colors.semantic.warning, width: "66%" };
  return { label: "Strong", color: colors.semantic.success, width: "100%" };
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              color={colors.brand.primary}
              name="chevron-back"
              size={18}
            />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                color={colors.brand.primary}
                name="lock-closed-outline"
                size={28}
              />
            </View>
            <Text style={styles.title}>Create a password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password to secure your account.
            </Text>
          </View>

          {/* Password */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry={!showPassword}
                style={styles.textInput}
                value={password}
              />
              <Pressable
                hitSlop={8}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  color={colors.text.secondary}
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                />
              </Pressable>
            </View>

            {/* Strength hint */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: strength.width,
                        backgroundColor: strength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Confirm Password</Text>
            <View
              style={[styles.inputRow, passwordsMatch && styles.inputRowError]}
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry={!showConfirm}
                style={styles.textInput}
                value={confirmPassword}
              />
              <Pressable
                hitSlop={8}
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
              >
                <Ionicons
                  color={colors.text.secondary}
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                />
              </Pressable>
            </View>
            {passwordsMatch && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>

          {/* Info card
          <View style={styles.infoCard}>
            <Ionicons
              color={colors.semantic.info}
              name="information-circle-outline"
              size={18}
            />
            <Text style={styles.infoText}>
              This screen is ready for UI testing. Password will be saved to
              Firebase when the auth sprint starts.
            </Text>
          </View> */}

          {/* Continue Button */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => router.replace("/role-selection")}
              style={[
                styles.primaryButton,
                canSubmit ? null : styles.primaryButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  canSubmit ? null : styles.primaryButtonTextDisabled,
                ]}
              >
                Continue
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  backButton: {
    minHeight: theme.sizes.touchTarget,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.body,
    color: colors.brand.primary,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.circle,
    backgroundColor: colors.brand.primaryLight,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heroTitle,
    textAlign: "center",
    color: colors.text.onboardingTitle,
  },
  subtitle: {
    ...typography.body,
    maxWidth: 288,
    textAlign: "center",
    color: colors.text.secondary,
  },
  fieldWrapper: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.button,
    color: colors.text.primary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: theme.radii.md,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.md,
    height: theme.sizes.primaryButtonHeight,
  },
  inputRowError: {
    borderColor: colors.semantic.danger,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    ...typography.caption,
    width: 44,
    fontWeight: "600",
  },
  errorText: {
    ...typography.caption,
    color: colors.semantic.danger,
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: theme.borders.cardWidth,
    borderColor: colors.brand.primaryLight,
    borderRadius: theme.radii.card,
    backgroundColor: colors.brand.primaryLight,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
    color: colors.text.secondary,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingTop: spacing.xxl,
  },
  primaryButton: {
    minHeight: theme.sizes.primaryButtonHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.card,
    backgroundColor: colors.brand.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border.strong,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  primaryButtonTextDisabled: {
    color: colors.text.muted,
  },
});
