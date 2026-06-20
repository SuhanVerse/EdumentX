/**
 * EdumentX — OTP Verify Screen
 *
 * Single OTP entry point for both sign-in and sign-up flows. The
 * route params determine which Clerk object to call when the user
 * submits the 6-digit code:
 *
 *   - `mode === 'signin'` → `signIn.attemptFirstFactor({
 *       strategy: 'email_code', code })` — this is the path the
 *     catch-and-fallback handler in PhoneEntryScreen takes when the
 *     identifier already exists.
 *
 *   - `mode === 'signup'` → `signUp.attemptEmailAddressVerification({
 *       code })` — this is the path after `signUp.create(...)` +
 *     `prepareEmailAddressVerification({ strategy: 'email_code' })`
 *     was called in PhoneEntryScreen.
 *
 * On success, both paths call `setActive({ session: createdSessionId })`
 * and the layout guard in `app/_layout.tsx` reads `users/{uid}.role`
 * to route to `/student-home` or `/tutor-home` (or `/role-selection`
 * for first-time sign-ups).
 *
 * UI/UX notes:
 *   - Hero shows the email (or "your username" hint) the code was
 *     sent to.
 *   - 6 digit boxes that auto-advance and auto-submit on the 6th key.
 *   - Paste-friendly: tapping-and-holding the first box (or any box)
 *     accepts a pasted OTP string and splits it across the boxes.
 *   - "Resend" is gated by a 60s cooldown and re-calls
 *     `prepareFirstFactor` / `prepareEmailAddressVerification`.
 *   - Friendly error messages translated from Clerk error codes
 *     (see `formatClerkError` at the bottom of this file).
 */
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type OtpDigit = string;
type VerifyMode = "signin" | "signup";

export function OtpVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    identifier?: string;
    mode?: string;
  }>();
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const [otp, setOtp] = useState<OtpDigit[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { signIn, isLoaded: signInLoaded, setActive: setActiveSignIn } =
    useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: setActiveSignUp } =
    useSignUp();

  const identifier = useMemo(() => {
    const raw = Array.isArray(params.identifier)
      ? params.identifier[0]
      : params.identifier;
    return (raw ?? "").trim();
  }, [params.identifier]);

  const mode: VerifyMode =
    params.mode === "signin" ? "signin" : "signup";

  const code = otp.join("");
  const canVerify = otp.every(Boolean) && code.length === OTP_LENGTH;
  const formattedTimer = `00:${String(timer).padStart(2, "0")}`;

  // The identifier may be either an email (we sent the code to it
  // directly) or a username (we sent the code to the email linked to
  // that username). Show a clear label either way — never leak the
  // linked email back to the screen.
  const identifierLooksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    identifier,
  );
  const displayIdentifier = identifierLooksLikeEmail
    ? identifier
    : identifier
      ? `the email linked to ${identifier}`
      : "your email";

  useEffect(() => {
    if (timer <= 0) {
      return;
    }
    const intervalId = setInterval(() => {
      setTimer((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timer]);

  function focusInput(index: number) {
    inputRefs.current[index]?.focus();
  }

  function clearOtp() {
    setOtp(Array(OTP_LENGTH).fill(""));
    requestAnimationFrame(() => focusInput(0));
  }

  function handleDigitChange(index: number, value: string) {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setOtp((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    setOtp((current) => {
      const next = [...current];
      digits
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      return next;
    });

    const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
    if (index + digits.length >= OTP_LENGTH) {
      Keyboard.dismiss();
    } else {
      requestAnimationFrame(() => focusInput(nextIndex));
    }
  }

  function handleBackspace(index: number) {
    if (otp[index] || index === 0) {
      return;
    }
    setOtp((current) => {
      const next = [...current];
      next[index - 1] = "";
      return next;
    });
    requestAnimationFrame(() => focusInput(index - 1));
  }

  /**
   * Re-send the code. We have to re-call the prepare step on the
   * right Clerk object based on the mode — Clerk doesn't expose a
   * generic "resend" helper, so we mirror the PhoneEntryScreen call
   * here.
   */
  async function handleResend() {
    if (timer > 0 || isResending) return;
    if (!signInLoaded || !signUpLoaded) return;
    setIsResending(true);
    try {
      if (mode === "signin") {
        if (!signIn) throw new Error("Sign-in session expired.");
        const emailCodeFactor = signIn.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code",
        );
        if (!emailCodeFactor) {
          Alert.alert(
            "Email sign-in unavailable",
            "This account doesn't support email-code sign-in. Try a different method.",
          );
          return;
        }
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId,
        });
      } else {
        if (!signUp) throw new Error("Sign-up session expired.");
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      }
      clearOtp();
      setTimer(RESEND_SECONDS);
    } catch (err: any) {
      const friendly = formatClerkError(err);
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setIsResending(false);
    }
  }

  /**
   * Submit the 6-digit code. On success, Clerk returns a created
   * session id; we `setActive` and the layout guard takes over.
   */
  async function handleVerify() {
    if (!canVerify || isVerifying) return;
    if (!signInLoaded || !signUpLoaded) return;
    setIsVerifying(true);
    try {
      if (mode === "signin") {
        if (!signIn) {
          Alert.alert(
            "Session expired",
            "Please go back and request a new code.",
          );
          return;
        }
        const attempt = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActiveSignIn({ session: attempt.createdSessionId });
          return;
        }
        Alert.alert(
          "Verification status: " + attempt.status,
          "Please try again or contact support.",
        );
      } else {
        if (!signUp) {
          Alert.alert(
            "Session expired",
            "Please go back and request a new code.",
          );
          return;
        }
        const attempt = await signUp.attemptEmailAddressVerification({ code });
        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActiveSignUp({ session: attempt.createdSessionId });
          return;
        }
        Alert.alert(
          "Verification status: " + attempt.status,
          "Please try again or contact support.",
        );
      }
    } catch (err: any) {
      const friendly = formatClerkError(err);
      Alert.alert(friendly.title, friendly.message);
      clearOtp();
    } finally {
      setIsVerifying(false);
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
            onPress={() => router.replace("/phone-entry")}
            className="min-h-touch self-start flex-row items-center gap-1 mb-4 active:opacity-70"
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text className="text-body text-text-primary">Back</Text>
          </Pressable>

          <View className="items-center gap-2 pt-4 mb-7">
            <View className="w-16 h-16 items-center justify-center rounded-pill bg-primary-light mb-2">
              <Ionicons
                color={colors.brand.primary}
                name="shield-checkmark-outline"
                size={28}
              />
            </View>
            <Text className="text-hero text-text-primary text-center">
              Enter your code
            </Text>
            <Text
              className="text-body text-text-secondary text-center"
              style={{ maxWidth: 288 }}
            >
              We sent a 6-digit code to{" "}
              <Text className="text-button text-text-primary">
                {displayIdentifier}
              </Text>
              . The code expires in 10 minutes.
            </Text>
          </View>

          <View className="flex-row justify-center gap-2 mb-3">
            {otp.map((digit, index) => {
              const isFilled = digit.length > 0;
              return (
                <View
                  key={index}
                  className={`w-11 h-otp-box-h border rounded-md items-center justify-center ${
                    isFilled
                      ? "border-night bg-primary-light"
                      : "border-border bg-surface"
                  }`}
                >
                  <RNTextInput
                    accessibilityLabel={`OTP digit ${index + 1}`}
                    autoComplete={index === 0 ? "sms-otp" : "off"}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH - index}
                    onChangeText={(value) => handleDigitChange(index, value)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace") {
                        handleBackspace(index);
                      }
                    }}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    selectTextOnFocus
                    style={{
                      width: "100%",
                      height: "100%",
                      textAlign: "center",
                      fontSize: 20,
                      fontWeight: "500",
                      color: colors.text.primary,
                      padding: 0,
                    }}
                    textContentType="oneTimeCode"
                    value={digit}
                  />
                </View>
              );
            })}
          </View>

          <View className="min-h-touch flex-row items-center justify-center gap-2 mb-4">
            <Text
              className="text-caption text-text-secondary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {timer > 0
                ? `Resend in ${formattedTimer}`
                : "Did not receive the code?"}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={timer > 0 || isResending}
              hitSlop={8}
              onPress={handleResend}
              className="active:opacity-70"
            >
              <Text
                className={`text-button ${
                  timer > 0 ? "text-text-muted" : "text-night"
                }`}
              >
                {isResending ? "..." : "Resend"}
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 justify-end pt-7">
            <Pressable
              accessibilityRole="button"
              disabled={!canVerify || isVerifying}
              onPress={handleVerify}
              className="min-h-btn items-center justify-center rounded-card bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
            >
              <Text className="text-button text-white disabled:text-text-muted">
                {isVerifying ? "Verifying..." : "Verify code"}
              </Text>
            </Pressable>
          </View>
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