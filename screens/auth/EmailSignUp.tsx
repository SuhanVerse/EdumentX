import { Ionicons } from "@expo/vector-icons";
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
  signInWithGoogle,
  signUpWithEmail,
} from "@/services/firebase/authService";
import { authErrorSuggestsModeFlip, formatFirebaseError } from "@/services/firebase/errors";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Auth Entry Screen
 *
 * The single auth surface for the Email + Password + Google flow. Has
 * three states:
 *
 *   1. "form" (signup or login) — collect email + password. The mode
 *      toggle at the top flips between "Create account" and "Log in".
 *      Google Sign-In sits below the email/password form as a
 *      secondary option.
 *
 *   2. "pending" — account exists but `emailVerified` is still false.
 *      We show a "check your inbox" panel and a primary button that
 *      calls `auth.currentUser.reload()` to re-pull the server-side
 *      claim, then routes to `/role-selection` once verified.
 *
 *   3. (handled by `_layout.tsx`) — once verified and a user doc
 *      exists in Firestore, the layout guard routes to the dashboard.
 *
 * **Why no phone OTP?** Firebase's SMS provider requires a paid Blaze
 * plan. We're on the free Spark plan; Email + Password + Google is
 * the free path. The old `PhoneEntryScreen` / `OtpVerify` were
 * removed in the June 21, 2026 pivot.
 */
type Mode = "signup" | "login";

export function EmailSignUp() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
        // Do NOT call setUser() here. The Firebase auth listener in
        // app/_layout.tsx is the single source of truth for "who is
        // signed in" and is already racing to set it. If we set the
        // user optimistically from this screen, there is a single
        // render between our setUser() and the listener's
        // setLoading(true) where the routing guard sees
        //   user: <User>, role: null, isLoading: false
        // and bounces the user to /role-selection — exactly the bug
        // they reported on June 27. Letting the listener handle it
        // alone keeps the routing guard blocked on isLoading the
        // entire time the Firestore role-fetch is in flight.
        setPendingEmail(credential.user.email ?? email.trim());
      } else {
        const credential = await loginWithEmail(email.trim(), password);
        // Same rationale as the signup branch above: do not call
        // setUser() here. The listener in _layout.tsx owns it.
        if (!credential.user.emailVerified) {
          // The account exists but the email link was never clicked.
          // Send them to the same "check your inbox" panel.
          setPendingEmail(credential.user.email ?? email.trim());
        }
        // If verified, the _layout.tsx guard routes on based on the
        // existence of `users/{uid}` in Firestore.
      }
    } catch (error: any) {
      const message = formatFirebaseError(
        error,
        mode === "signup"
          ? "Please check your email and password and try again."
          : "Please check your email and password and try again.",
      );
      // Branch: if the error tells us the user is on the wrong
      // mode (e.g. they're in Sign up but the email is already
      // registered), flip the mode for them and let the form
      // re-render. This is the fix for the "I can't log in" bug
      // where users would hit a generic alert and give up.
      const flip = authErrorSuggestsModeFlip(error);
      if (flip && flip !== mode) {
        Alert.alert(
          mode === "signup"
            ? "Account already exists"
            : "We couldn't find that account",
          `${message}\n\nWe've switched you to ${
            flip === "login" ? "Log in" : "Sign up"
          } — try again with the same email.`,
          [{ text: "OK" }],
        );
        setMode(flip);
        return;
      }
      Alert.alert(
        mode === "signup" ? "Could not create account" : "Could not log in",
        message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      // Same rationale as handleSubmit: do NOT call setUser() here.
      // The auth listener in app/_layout.tsx is the single source of
      // truth and will set the user, fetch the role, and only then
      // release the routing guard.
      // Google users are auto-verified — _layout.tsx routes them on
      // based on whether their users/{uid} doc already exists.
    } catch (error: any) {
      Alert.alert(
        "Google sign-in failed",
        formatFirebaseError(error, "Please try again."),
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleResend() {
    if (isResending) return;
    setIsResending(true);
    try {
      await sendVerificationAgain();
      Alert.alert(
        "Verification email sent",
        "Please check your inbox and spam folder.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not resend",
        formatFirebaseError(error, "Please try again in a minute."),
      );
    } finally {
      setIsResending(false);
    }
  }

  /**
   * Re-read the current user from Firebase and re-check
   * `emailVerified`. `auth.currentUser.reload()` pulls a fresh token
   * claim from the server, so if the user just clicked the link in
   * their email we will see the verified flag flip to true on this
   * call. Without `reload()`, the local cached user object stays
   * stale and the layout guard refuses to advance.
   */
  async function handleCheckVerified() {
    if (isCheckingVerified) return;
    setIsCheckingVerified(true);
    try {
      const { getApp } = await import("@react-native-firebase/app");
      const { getAuth } = await import("@react-native-firebase/auth");
      const currentUser = getAuth(getApp()).currentUser;
      if (!currentUser) {
        Alert.alert("Session expired", "Please sign in again.");
        setPendingEmail(null);
        return;
      }
      await currentUser.reload();
      if (currentUser.emailVerified) {
        // Sync the local store with the (now-verified) user, then let
        // the _layout.tsx guard take over the routing.
        useAuthStore.getState().setUser(currentUser);
      } else {
        Alert.alert(
          "Not verified yet",
          "We haven't seen the verification click yet. Please tap the link in your email and try again.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Could not check verification",
        formatFirebaseError(error, "Please try again."),
      );
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
              onPress={() => setPendingEmail(null)}
              className="min-h-touch self-start flex-row items-center gap-1 mb-4 active:opacity-70"
            >
              <Ionicons
                color={colors.brand.primary}
                name="chevron-back"
                size={18}
              />
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
                <Text className="text-button text-text-primary">
                  {pendingEmail}
                </Text>
                . Tap the link, then come back and tap the button below.
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

  // ---- "form" state — collect email + password (and offer Google as
  // an alternative for users who'd rather not type a password)
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
          <View className="gap-2 mb-6">
            <Text className="text-hero text-text-primary">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </Text>
            <Text
              className="text-body text-text-secondary"
              style={{ maxWidth: 320 }}
            >
              {mode === "signup"
                ? "Sign up with email or Google."
                : "Enter the email and password you signed up with."}
            </Text>
          </View>

          {/* Mode toggle — Sign up / Log in pill at the top. */}
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

          {/* Email + password form */}
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

          {/* Primary CTA — email + password */}
          <View className="pt-6">
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

          {/* Divider with "or" — same visual language as the old
              auth entry screen, kept for visual continuity now that
              Google Sign-In lives on the same surface as email/password. */}
          <View className="flex-row items-center gap-3 my-5">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-caption text-text-muted">or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* Google Sign-In secondary CTA. */}
          <Pressable
            accessibilityRole="button"
            disabled={isGoogleLoading}
            onPress={handleGoogle}
            className="min-h-btn flex-row items-center justify-center gap-2 rounded-card bg-surface border border-border active:opacity-80"
          >
            <Ionicons color={colors.brand.primary} name="logo-google" size={18} />
            <Text className="text-button text-text-primary">
              {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}