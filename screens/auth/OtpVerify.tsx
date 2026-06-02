import { Ionicons } from "@expo/vector-icons";
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

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type OtpDigit = string;

export function OtpVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [otp, setOtp] = useState<OtpDigit[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_SECONDS);

  const phone = useMemo(() => {
    const rawPhone = Array.isArray(params.phone)
      ? params.phone[0]
      : params.phone;
    return rawPhone?.replace(/\D/g, "").slice(0, 10) ?? "";
  }, [params.phone]);

  const code = otp.join("");
  const canVerify = otp.every(Boolean) && code.length === OTP_LENGTH;
  const formattedTimer = `00:${String(timer).padStart(2, "0")}`;
  const displayPhone = phone ? `+977 ${phone}` : "+977 98XXXXXXXX";

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

  function handleResend() {
    if (timer > 0) {
      return;
    }

    clearOtp();
    setTimer(RESEND_SECONDS);
    Alert.alert(
      "OTP resent",
      "Firebase phone verification will send the real SMS when auth is connected.",
    );
  }

  function handleVerify() {
    if (!canVerify) {
      return;
    }

    router.push("/create_password");
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
            onPress={() => router.replace("/phone-entry")}
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
            <View style={styles.iconCircle}>
              <Ionicons
                color={colors.brand.primary}
                name="shield-checkmark-outline"
                size={28}
              />
            </View>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>
              Enter the 6 digit code sent to{" "}
              <Text style={styles.phoneText}>{displayPhone}</Text>.
            </Text>
          </View>

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                accessibilityLabel={`OTP digit ${index + 1}`}
                autoComplete={index === 0 ? "sms-otp" : "off"}
                inputMode="numeric"
                key={index}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
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
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                textContentType="oneTimeCode"
                value={digit}
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            <Text style={styles.timerText}>
              {timer > 0
                ? `Resend in ${formattedTimer}`
                : "Did not receive the code?"}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={timer > 0}
              hitSlop={8}
              onPress={handleResend}
            >
              <Text
                style={[
                  styles.resendText,
                  timer > 0 ? styles.resendTextDisabled : null,
                ]}
              >
                Resend
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              color={colors.semantic.info}
              name="information-circle-outline"
              size={18}
            />
            <Text style={styles.infoText}>
              This screen is ready for UI testing. Real SMS sending will be
              connected from Firebase Phone Auth later.
            </Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={!canVerify}
              onPress={handleVerify}
              style={[
                styles.primaryButton,
                canVerify ? null : styles.primaryButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  canVerify ? null : styles.primaryButtonTextDisabled,
                ]}
              >
                Verify OTP
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
  phoneText: {
    ...typography.button,
    color: colors.text.primary,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  otpInput: {
    width: theme.sizes.otpBoxWidth,
    height: theme.sizes.otpBoxHeight,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: theme.radii.md,
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primaryLight,
  },
  resendRow: {
    minHeight: theme.sizes.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timerText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontVariant: ["tabular-nums"],
  },
  resendText: {
    ...typography.button,
    color: colors.brand.primary,
  },
  resendTextDisabled: {
    color: colors.text.muted,
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
