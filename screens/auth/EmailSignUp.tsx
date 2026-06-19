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
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import {
  loginWithEmail,
  sendVerificationAgain,
  signUpWithEmail,
} from "@/services/firebase/authService";
import { useAuthStore } from "@/store/authStore";

/**
 * Two-state screen:
 *   - "form": the user enters an email + password. The submit button
 *     says "Create account" (signup mode) or "Log in" (login mode).
 *   - "pending": the account exists but the email hasn't been verified
 *     yet. The user is told to check their inbox; the "Resend" link
 *     re-fires `sendVerificationAgain()`. A "I've verified — continue"
 *     button re-reads `auth.currentUser?.reload()` and re-checks
 *     `emailVerified`, then routes on to `/role-selection` if true.
 *
 * The free Firebase Email Verification flow is documented in
 * `Documentation/04-Firebase/phase-3-notes.md` §6 and the layout guard
 * in `app/_layout.tsx` blocks unverified email/password users from
 * reaching the dashboards.
 */
type Mode = "signup" | "login";

export function EmailSignUp() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingVerified, setIsCheckingVerified] = useState(false);

  // `pendingEmail` flips the screen from "form" to "check your inbox".
  // We keep the email visible so the user can confirm which inbox to
  // look at.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const canSubmit = isEmailValid && isPasswordValid && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const credential = await signUpWithEmail(email.trim(), password);
        useAuthStore.getState().setUser(credential.user);
        setPendingEmail(credential.user.email ?? email.trim());
      } else {
        const credential = await loginWithEmail(email.trim(), password);
        useAuthStore.getState().setUser(credential.user);
        if (!credential.user.emailVerified) {
          setPendingEmail(credential.user.email ?? email.trim());
        } else {
          // Verified — go to role selection. The _layout.tsx guard will
          // also catch this and route correctly, but doing it here gives
          // a snappier UX.
          router.replace("/role-selection");
        }
      }
    } catch (error: any) {
      Alert.alert(
        mode === "signup" ? "Could not create account" : "Could not log in",
        error?.message ?? "Please check your email and password and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (isResending) return;
    setIsResending(true);
    try {
      await sendVerificationAgain();
      Alert.alert("Verification email sent", "Please check your inbox and spam folder.");
    } catch (error: any) {
      Alert.alert("Could not resend", error?.message ?? "Please try again in a minute.");
    } finally {
      setIsResending(false);
    }
  }

  /**
   * Re-read the current user from Firebase and re-check `emailVerified`.
   * `auth.currentUser.reload()` pulls a fresh token claim from the
   * server, so if the user just clicked the link in their email we will
   * see the verified flag flip to true on this call.
   */
  async function handleCheckVerified() {
    if (isCheckingVerified) return;
    setIsCheckingVerified(true);
    try {
      // Use the modular API. `getAuth(getApp()).currentUser` reads from
      // the local cache; `.reload()` re-fetches from the server.
      const { getApp } = await import("@react-native-firebase/app");
      const { getAuth } = await import("@react-native-firebase/auth");
      const currentUser = getAuth(getApp()).currentUser;
      if (!currentUser) {
        Alert.alert("Session expired", "Please sign in again.");
        router.replace("/phone-entry");
        return;
      }
      await currentUser.reload();
      // After reload(), the same `currentUser` object reflects the new
      // server-side claims.
      if (currentUser.emailVerified) {
        // Sync the local store with the (now-verified) user, then let
        // the _layout.tsx guard take over.
        useAuthStore.getState().setUser(currentUser);
        router.replace("/role-selection");
      } else {
        Alert.alert(
          "Not verified yet",
          "We haven't seen the verification click yet. Please tap the link in your email and try again.",
        );
      }
    } catch (error: any) {
      Alert.alert("Could not check verification", error?.message ?? "Please try again.");
    } finally {
      setIsCheckingVerified(false);
    }
  }

  // ---- "pending" state — email sent, waiting for the user to click the link
  if (pendingEmail !== null) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-5 pt-5 pb-5"
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => {
                // Going back here effectively abandons the email signup
                // (the user is still signed in, but they can sign out
                // from the dashboard later). The layout guard will not
                // let them reach the dashboard because `emailVerified`
                // is false.
                setPendingEmail(null);
              }}
              className="min-h-touch self-start flex-row items-center gap-1 mb-4 active:opacity-70"
            >
              <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
              <Text className="text-body text-text-primary">Back</Text>
            </Pressable>

            <View className="items-center gap-2 pt-4 mb-7">
              <View className="w-16 h-16 items-center justify-center rounded-pill bg-primary-light mb-2">
                <Ionicons
                  color={colors.brand.primary}
                  name="mail-open-outline"
                  size={28}
                />
              </View>
              <Text className="text-hero text-text-primary text-center">
                Check your inbox
              </Text>
              <Text
                className="text-body text-text-secondary text-center"
                style={{ maxWidth: 320 }}
              >
                We sent a verification link to{" "}
                <Text className="text-button text-text-primary">{pendingEmail}</Text>.
                Tap the link, then come back and tap the button below.
              </Text>
            </View>

            <View className="gap-3 pt-4">
              <Pressable
                accessibilityRole="button"
                disabled={isCheckingVerified}
                onPress={handleCheckVerified}
                className="min-h-btn rounded-card items-center justify-center bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
              >
                <Text className="text-button text-white disabled:text-text-muted">
                  {isCheckingVerified ? "Checking..." : "I've verified — continue"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isResending}
                onPress={handleResend}
                className="min-h-pill-sm items-center justify-center active:opacity-70"
              >
                <Text className="text-button text-night">
                  {isResending ? "Sending..." : "Resend verification email"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---- "form" state — collect email + password
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-5 pt-5 pb-5"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/phone-entry")}
            className="min-h-touch self-start flex-row items-center gap-1 mb-3 active:opacity-70"
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text className="text-body text-text-primary">Back</Text>
          </Pressable>

          <View className="gap-2 mb-6">
            <Text className="text-hero text-text-primary">
              {mode === "signup" ? "Sign up with email" : "Log in with email"}
            </Text>
            <Text
              className="text-body text-text-secondary"
              style={{ maxWidth: 320 }}
            >
              {mode === "signup"
                ? "Free, no SMS required. We'll send you a one-tap verification link."
                : "Enter the email and password you signed up with."}
            </Text>
          </View>

          {/* Mode toggle — same shape as PhoneEntryScreen's signup/login
              pill. Keeping the pattern consistent makes the two screens
              feel like one flow. */}
          <View className="gap-1 p-1 rounded-md bg-background mb-6 flex-row">
            {(["signup", "login"] as Mode[]).map((item) => {
              const active = item === mode;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setMode(item)}
                  className={`flex-1 h-chip-sm rounded-sm items-center justify-center active:opacity-80 ${
                    active ? "bg-surface" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-button ${
                      active ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {item === "signup" ? "Sign up" : "Log in"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="text-overline text-text-secondary uppercase">
                Email
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3">
                <Ionicons color={colors.text.muted} name="mail-outline" size={18} />
                <TextInput
                  className="flex-1 ml-2 text-text-primary text-body-lg"
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.muted}
                  value={email}
                />
              </View>
              {!isEmailValid && email.length > 0 ? (
                <Text className="text-caption text-danger">
                  Enter a valid email address.
                </Text>
              ) : null}
            </View>

            <View className="gap-1">
              <Text className="text-overline text-text-secondary uppercase">
                Password
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3">
                <TextInput
                  className="flex-1 text-text-primary text-body-lg"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry={!showPassword}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={8}
                  className="w-11 h-11 items-center justify-center active:opacity-70"
                >
                  <Ionicons
                    color={colors.text.muted}
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                  />
                </Pressable>
              </View>
              {!isPasswordValid && password.length > 0 ? (
                <Text className="text-caption text-danger">
                  Use at least 6 characters.
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-1 justify-end pt-7">
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              className="min-h-btn items-center justify-center rounded-card bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
            >
              <Text className="text-button text-white disabled:text-text-muted">
                {isSubmitting
                  ? "Sending..."
                  : mode === "signup"
                    ? "Create account"
                    : "Log in"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
