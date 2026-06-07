import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as RNTextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

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
          <XStack
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/phone-entry")}
            minHeight={44}
            alignSelf="flex-start"
            alignItems="center"
            gap={spacing.xs}
            marginBottom={spacing.lg}
          >
            <Ionicons
              color={colors.brand.primary}
              name="chevron-back"
              size={18}
            />
            <Text {...typography.body} color={colors.brand.primary}>
              Back
            </Text>
          </XStack>

          <YStack
            alignItems="center"
            gap={spacing.sm}
            paddingTop={spacing.lg}
            marginBottom={spacing.xxl}
          >
            <YStack
              width={64}
              height={64}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor={colors.brand.primaryLight}
              marginBottom={spacing.sm}
            >
              <Ionicons
                color={colors.brand.primary}
                name="shield-checkmark-outline"
                size={28}
              />
            </YStack>
            <Text {...typography.heroTitle} textAlign="center" color={colors.text.primary}>
              Verify your number
            </Text>
            <Text
              {...typography.body}
              maxWidth={288}
              textAlign="center"
              color={colors.text.secondary}
            >
              Enter the 6 digit code sent to{" "}
              <Text {...typography.button} color={colors.text.primary}>
                {displayPhone}
              </Text>
              .
            </Text>
          </YStack>

          <XStack justifyContent="center" gap={spacing.sm} marginBottom={spacing.md}>
            {otp.map((digit, index) => {
              const isFilled = digit.length > 0;
              return (
                <YStack
                  key={index}
                  width={44}
                  height={52}
                  borderWidth={1}
                  borderColor={isFilled ? colors.brand.primary : colors.border.default}
                  borderRadius={10}
                  backgroundColor={isFilled ? colors.brand.primaryLight : colors.background.surface}
                  alignItems="center"
                  justifyContent="center"
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
                </YStack>
              );
            })}
          </XStack>

          <XStack
            minHeight={44}
            alignItems="center"
            justifyContent="center"
            gap={spacing.sm}
            marginBottom={spacing.lg}
          >
            <Text
              {...typography.caption}
              color={colors.text.secondary}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {timer > 0
                ? `Resend in ${formattedTimer}`
                : "Did not receive the code?"}
            </Text>
            <Button
              accessibilityRole="button"
              disabled={timer > 0}
              hitSlop={8}
              onPress={handleResend}
              backgroundColor="transparent"
              pressStyle={{ backgroundColor: "transparent" }}
              disabledStyle={{ opacity: 1 }}
            >
              <Text
                {...typography.button}
                color={timer > 0 ? colors.text.muted : colors.brand.primary}
              >
                Resend
              </Text>
            </Button>
          </XStack>

          <YStack flex={1} justifyContent="flex-end" paddingTop={spacing.xxl}>
            <Button
              accessibilityRole="button"
              disabled={!canVerify}
              minHeight={52}
              alignItems="center"
              justifyContent="center"
              borderRadius={12}
              style={{
                backgroundColor: canVerify
                  ? colors.brand.primary
                  : colors.border.strong,
              }}
              onPress={handleVerify}
              pressStyle={{
                backgroundColor: canVerify
                  ? colors.brand.primary
                  : colors.border.strong,
              }}
            >
              <Text
                {...typography.button}
                color={canVerify ? colors.text.inverse : colors.text.muted}
              >
                Verify OTP
              </Text>
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
