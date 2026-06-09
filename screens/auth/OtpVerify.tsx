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
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type OtpDigit = string;

export function OtpVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const [otp, setOtp] = useState<OtpDigit[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_SECONDS);

  const phone = useMemo(() => {
    const rawPhone = Array.isArray(params.phone) ? params.phone[0] : params.phone;
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
              Verify your number
            </Text>
            <Text
              className="text-body text-text-secondary text-center"
              style={{ maxWidth: 288 }}
            >
              Enter the 6 digit code sent to{" "}
              <Text className="text-button text-text-primary">{displayPhone}</Text>.
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
              disabled={timer > 0}
              hitSlop={8}
              onPress={handleResend}
              className="active:opacity-70"
            >
              <Text
                className={`text-button ${
                  timer > 0 ? "text-text-muted" : "text-night"
                }`}
              >
                Resend
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 justify-end pt-7">
            <Pressable
              accessibilityRole="button"
              disabled={!canVerify}
              onPress={handleVerify}
              className="min-h-btn items-center justify-center rounded-card bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
            >
              <Text className="text-button text-white disabled:text-text-muted">
                Verify OTP
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
