import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
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
import { typography } from "@/constants/typography";

type AuthMode = "signup" | "login";

export function PhoneEntryScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isPhoneValid = phone.length === 10;
  const isPasswordValid = mode === "signup" || password.length >= 6;
  const canSubmit = isPhoneValid && isPasswordValid;

  function updatePhone(value: string) {
    setPhone(value.replace(/\D/g, "").slice(0, 10));
  }

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    if (mode === "signup") {
      router.push({ pathname: "/otpverify", params: { phone } });
      return;
    }

    Alert.alert(
      "Next phase",
      "Firebase login and role routing will be added in the authentication sprint.",
    );
  }

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
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/onboarding")}
            style={styles.backButton}
          >
            <Ionicons
              color={colors.brand.primary}
              name="chevron-back"
              size={18}
            />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </Text>
            {/* <Text style={styles.subtitle}>
              {mode === 'signup'
                ? 'Enter your phone number. OTP verification will be connected in the auth phase.'
                : 'Log in with your phone number and password once Firebase auth is connected.'}
            </Text> */}
          </View>

          <View style={styles.segmentedControl}>
            {(["signup", "login"] as AuthMode[]).map((item) => {
              const active = item === mode;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setMode(item)}
                  style={[
                    styles.segmentButton,
                    active ? styles.segmentButtonActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active ? styles.segmentTextActive : null,
                    ]}
                  >
                    {item === "signup" ? "Sign up" : "Log in"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryBox}>
                  <Text style={styles.countryCode}>NP</Text>
                  <Text style={styles.countryCode}>+977</Text>
                  <Ionicons
                    color={colors.text.muted}
                    name="chevron-down"
                    size={14}
                  />
                </View>

                <TextInput
                  keyboardType="phone-pad"
                  maxLength={10}
                  onChangeText={updatePhone}
                  placeholder="97XXXXXXXX"
                  placeholderTextColor={colors.text.muted}
                  style={styles.phoneInput}
                  value={phone}
                />
              </View>
              <Text style={styles.helperText}>
                {isPhoneValid || phone.length === 0
                  ? ""
                  : "Enter a 10 digit mobile number."}
              </Text>
            </View>

            {mode === "login" ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.text.muted}
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                    value={password}
                  />
                  <Pressable
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setShowPassword((current) => !current)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      color={colors.text.muted}
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                    />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
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
                {mode === "signup" ? "Send OTP" : "Log in"}
              </Text>
            </Pressable>

            <Text style={styles.termsText}>
              By continuing, you agree to EdumentX&apos;s Terms and Privacy
              Policy.
            </Text>
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
    minHeight: 44,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.brand.primary,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heroTitle,
    color: colors.text.onboardingTitle,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.background.page,
    marginBottom: spacing.xl,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.background.surface,
  },
  segmentText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  segmentTextActive: {
    color: colors.text.onboardingTitle,
  },
  form: {
    flex: 1,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.overline,
    color: colors.text.secondary,
  },
  phoneRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  countryBox: {
    minWidth: 92,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 0.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    backgroundColor: colors.background.surface,
  },
  countryCode: {
    ...typography.button,
    color: colors.text.primary,
  },
  phoneInput: {
    flex: 1,
    minHeight: 52,
    borderWidth: 0.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.text.primary,
    fontSize: 16,
  },
  helperText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  passwordRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    backgroundColor: colors.background.surface,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    color: colors.text.primary,
    fontSize: 15,
  },
  passwordToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    minHeight: 36,
    justifyContent: "center",
  },
  forgotText: {
    ...typography.caption,
    color: colors.brand.primary,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
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
  termsText: {
    ...typography.caption,
    textAlign: "center",
    color: colors.text.muted,
  },
});
