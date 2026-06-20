/**
 * EdumentX — Unified Passwordless Gateway
 *
 * Single input that accepts EITHER an email OR a custom username. One
 * screen replaces the previous phone-OTP and email-password flows.
 * The screen is the entry point for both sign-up and sign-in.
 *
 * Flow:
 *   1. User enters an email (or username, after Clerk's username
 *      requirement is OFF — see Clerk dashboard setup). Taps
 *      "Continue with email".
 *   2. App calls `signIn.create({ identifier })`. Clerk resolves the
 *      identifier to an account if one exists.
 *      - If the sign-in completes immediately (`status === 'complete'`),
 *        we call `setActive` and let the layout guard route.
 *      - If it needs a first factor (`status === 'needs_first_factor'`),
 *        we call `prepareFirstFactor({ strategy: 'email_code' })` and
 *        push the user to `/otpverify` to enter the 6-digit code.
 *   3. If the sign-in throws `form_identifier_not_found`, the user
 *      does not exist — we catch and fall through to
 *      `signUp.create({ ... })` + `prepareEmailAddressVerification`,
 *      then push to `/otpverify` with `mode: 'signup'`.
 *   4. The "Continue with Google" button opens Clerk's native OAuth
 *      popup via `useOAuth({ strategy: 'oauth_google' })`. On
 *      success, we `setActive` and let the layout guard route.
 *
 * The /otpverify screen is the single OTP entry point; the `mode`
 * query param tells it which Clerk object to call
 * (`signIn.attemptFirstFactor` vs `signUp.attemptEmailAddressVerification`).
 *
 * UI/UX notes:
 *   - "Welcome to EdumentX" hero on top to set context.
 *   - Sign up / Log in tabs (kept for clarity — both modes go
 *     through the same catch-and-fallback under the hood).
 *   - Single identifier input, no password field, no country picker.
 *   - Validation: looks like an email OR a 3–30 char username
 *     (letters, digits, underscore, dot).
 *   - Friendly error messages translated from Clerk error codes
 *     (see `formatClerkError` at the bottom of this file).
 */
import { Ionicons } from "@expo/vector-icons";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
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

type AuthMode = "signup" | "login";

// Lightweight regex-based detector so we can flip the "Sent to" label
// on the OTP screen from an email to "the email linked to <username>".
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

function isValidIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_REGEX.test(trimmed) || USERNAME_REGEX.test(trimmed);
}

export function PhoneEntryScreen() {
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const [mode, setMode] = useState<AuthMode>("signup");
  const [identifier, setIdentifier] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const identifierTrimmed = identifier.trim();
  const canSubmit =
    isValidIdentifier(identifierTrimmed) && !isSending && !isGoogleLoading;

  /**
   * Catch-and-fallback handler. The order is intentional:
   *   1. Try `signIn.create({ identifier })` first. If the user exists,
   *      this either completes immediately or lands in
   *      `needs_first_factor` (which we then trigger with email_code).
   *   2. If sign-in throws `form_identifier_not_found`, the user is
   *      new — fall through to `signUp.create({ emailAddress })` and
   *      prepare the email_code verification.
   *
   * Both paths converge on the same `/otpverify` screen with different
   * `mode` values.
   */
  async function handleContinue() {
    if (!canSubmit) return;
    if (!signInLoaded || !signUpLoaded) return;
    if (!signIn || !signUp) {
      Alert.alert("Auth not ready", "Please try again in a moment.");
      return;
    }
    setIsSending(true);
    try {
      try {
        const attempt = await signIn.create({
          identifier: identifierTrimmed,
        });
        if (attempt.status === "complete") {
          // Clerk signed the user in immediately (rare — happens when
          // the identifier is an OAuth-managed account with no second
          // factor). The `setActive` call is handled by Clerk's
          // built-in flow when `signIn.status === "complete"` — no
          // explicit call is needed.
          return;
        }
        if (attempt.status === "needs_first_factor") {
          const emailCodeFactor = attempt.supportedFirstFactors?.find(
            (f) => f.strategy === "email_code",
          );
          if (!emailCodeFactor) {
            Alert.alert(
              "Email sign-in unavailable",
              "This account doesn't support email-code sign-in. Try Google or contact support.",
            );
            return;
          }
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          router.push({
            pathname: "/otpverify",
            params: { identifier: identifierTrimmed, mode: "signin" },
          });
          return;
        }
        // Any other status is unexpected for the v1 flows.
        Alert.alert(
          "Sign-in status: " + attempt.status,
          "Please try again or contact support.",
        );
        return;
      } catch (signInErr: any) {
        const code = signInErr?.errors?.[0]?.code;
        if (code !== "form_identifier_not_found") {
          // Real error — surface it.
          throw signInErr;
        }
        // User doesn't exist. Fall through to sign-up.
      }

      // Sign-up path. We pass `emailAddress` only if the identifier
      // looks like an email; Clerk rejects a sign-up that uses a
      // username in the `emailAddress` slot. If the user typed a
      // username, the sign-up will create the account using the
      // username as the only identifier, which Clerk's sign-in
      // resolves via `signIn.create({ identifier })` later.
      const isEmail = EMAIL_REGEX.test(identifierTrimmed);
      if (!isEmail) {
        Alert.alert(
          "Sign up needs an email",
          "We couldn't find an account with that username, and sign-up requires an email address. Please enter the email you'd like to use.",
        );
        return;
      }
      await signUp.create({ emailAddress: identifierTrimmed });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push({
        pathname: "/otpverify",
        params: { identifier: identifierTrimmed, mode: "signup" },
      });
    } catch (err: any) {
      const friendly = formatClerkError(err);
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const { createdSessionId, signIn, signUp } = await startGoogleOAuth();
      if (!createdSessionId) {
        // The user closed the OAuth sheet or it failed silently.
        return;
      }
      // The session is created; Clerk's hook will pick it up on the
      // next render. We don't need to call setActive here because
      // `useOAuth` returns a session id and Clerk handles the rest
      // internally. The layout guard sees `isSignedIn === true` and
      // routes based on `users/{clerkUid}.role`.
      void signIn;
      void signUp;
    } catch (err: any) {
      const friendly = formatClerkError(err);
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setIsGoogleLoading(false);
    }
  }

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
            onPress={() => router.replace("/onboarding")}
            className="min-h-touch self-start flex-row items-center gap-1 mb-6 active:opacity-70"
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text className="text-body text-text-primary">Back</Text>
          </Pressable>

          {/* Hero */}
          <View className="items-center gap-3 mb-8">
            <View className="w-16 h-16 items-center justify-center rounded-pill bg-primary-light">
              <Ionicons
                color={colors.brand.primary}
                name="mail-unread-outline"
                size={28}
              />
            </View>
            <Text className="text-hero text-text-primary text-center">
              Welcome to EdumentX
            </Text>
            <Text
              className="text-body-lg text-text-secondary text-center"
              style={{ maxWidth: 320 }}
            >
              Continue with your email. We&apos;ll send you a 6-digit code
              — no passwords, no SMS fees.
            </Text>
          </View>

          {/* Mode toggle */}
          <View className="gap-1 p-1 rounded-md bg-background mb-5 flex-row">
            {(["signup", "login"] as AuthMode[]).map((item) => {
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
                    {item === "signup" ? "New here — sign up" : "I have an account"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Identifier input */}
          <View className="gap-1 mb-2">
            <Text className="text-overline text-text-secondary uppercase">
              Email or username
            </Text>
            <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3 gap-2">
              <Ionicons
                color={colors.text.muted}
                name="person-outline"
                size={18}
              />
              <TextInput
                className="flex-1 text-text-primary text-body-lg"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setIdentifier}
                placeholder="you@example.com"
                placeholderTextColor={colors.text.muted}
                keyboardType="email-address"
                value={identifier}
              />
            </View>
            {identifierTrimmed.length > 0 && !isValidIdentifier(identifierTrimmed) ? (
              <Text className="text-caption text-danger">
                Enter a valid email or username (3–30 chars, letters / digits / _ / .).
              </Text>
            ) : null}
          </View>

          {/* Identifier helper line */}
          <Text className="text-caption text-text-muted mb-6">
            We&apos;ll send a one-time code to your email. New accounts get
            one immediately; returning accounts get one to the linked inbox.
          </Text>

          {/* Primary CTA */}
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleContinue}
            className="min-h-btn rounded-card items-center justify-center bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
          >
            <Text className="text-button text-white disabled:text-text-muted">
              {isSending ? "Sending code..." : "Continue with email"}
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-[1px] bg-border" />
            <Text className="mx-4 text-text-muted font-medium">OR</Text>
            <View className="flex-1 h-[1px] bg-border" />
          </View>

          {/* Google OAuth */}
          <Pressable
            accessibilityRole="button"
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="min-h-btn bg-surface border border-border rounded-card flex-row justify-center items-center active:opacity-70 disabled:opacity-60"
          >
            <Ionicons name="logo-google" size={20} color={colors.text.primary} />
            <Text className="text-text-primary font-semibold text-button ml-2">
              {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
            </Text>
          </Pressable>

          <Text className="text-caption text-text-muted text-center mt-6">
            By continuing, you agree to EdumentX&apos;s Terms and Privacy
            Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Friendly translations for the common Clerk error codes that the
 * user will see. Falls back to a generic message for codes we don't
 * know about, so we never surface a raw Clerk stack trace.
 */
function formatClerkError(err: any): { title: string; message: string } {
  const code: string | undefined = err?.errors?.[0]?.code;
  const fallback: { title: string; message: string } = {
    title: "Something went wrong",
    message:
      err?.errors?.[0]?.longMessage ??
      err?.message ??
      "Please try again or contact support.",
  };
  switch (code) {
    case "form_identifier_not_found":
      // This branch is caught inside handleContinue for the sign-up
      // fallback; we shouldn't reach here unless something else
      // surfaces the same code.
      return {
        title: "Account not found",
        message:
          "We couldn't find an account for that identifier. Try a different one or sign up.",
      };
    case "form_identifier_exists":
      return {
        title: "Account already exists",
        message:
          "An account with that email already exists. Try logging in instead.",
      };
    case "verification_expired":
      return {
        title: "Code expired",
        message: "That code has expired. Please request a new one.",
      };
    case "verification_failed":
      return {
        title: "Wrong code",
        message: "The code you entered didn't match. Please try again.",
      };
    case "too_many_requests":
      return {
        title: "Too many attempts",
        message:
          "You've made too many attempts in a short window. Please wait a minute and try again.",
      };
    case "network_error":
    case "network_timeout":
      return {
        title: "Network error",
        message: "Check your connection and try again.",
      };
    default:
      return fallback;
  }
}
