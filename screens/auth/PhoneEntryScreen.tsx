import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Text, XStack, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { registration } from "@/lib/registration";

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
      registration.update({ phone });
      router.push({ pathname: "/otpverify", params: { phone } });
      return;
    }

    Alert.alert(
      "Next phase",
      "Firebase login and role routing will be added in the authentication sprint.",
    );
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
            onPress={() => router.replace("/onboarding")}
            minHeight={44}
            alignSelf="flex-start"
            alignItems="center"
            gap={spacing.xs}
            marginBottom={spacing.md}
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text {...typography.body} color={colors.brand.primary}>
              Back
            </Text>
          </XStack>

          <YStack gap={spacing.sm} marginBottom={spacing.xl}>
            <Text {...typography.heroTitle} color={colors.text.onboardingTitle}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </Text>
          </YStack>

          <XStack
            gap={spacing.xs}
            padding={spacing.xs}
            borderRadius={10}
            backgroundColor={colors.background.page}
            marginBottom={spacing.xl}
          >
            {(["signup", "login"] as AuthMode[]).map((item) => {
              const active = item === mode;
              return (
                <Button
                  key={item}
                  accessibilityRole="button"
                  flex={1}
                  height={38}
                  borderRadius={8}
                  backgroundColor={active ? colors.background.surface : "transparent"}
                  onPress={() => setMode(item)}
                  pressStyle={{ backgroundColor: active ? colors.background.surface : "transparent" }}
                >
                  <Text
                    {...typography.button}
                    color={active ? colors.text.onboardingTitle : colors.text.secondary}
                  >
                    {item === "signup" ? "Sign up" : "Log in"}
                  </Text>
                </Button>
              );
            })}
          </XStack>

          <YStack flex={1} gap={spacing.lg}>
            <YStack gap={spacing.xs}>
              <Text {...typography.overline} color={colors.text.secondary}>
                Phone number
              </Text>
              <XStack flexDirection="row" gap={spacing.sm}>
                <XStack
                  minWidth={92}
                  height={52}
                  alignItems="center"
                  justifyContent="center"
                  gap={spacing.xs}
                  borderWidth={0.5}
                  borderColor={colors.border.default}
                  borderRadius={10}
                  style={{ backgroundColor: colors.background.surface }}
                >
                  <Text {...typography.button} color={colors.text.primary}>
                    NP
                  </Text>
                  <Text {...typography.button} color={colors.text.primary}>
                    +977
                  </Text>
                  <Ionicons color={colors.text.muted} name="chevron-down" size={14} />
                </XStack>

                <Input
                  flex={1}
                  height={52}
                  borderWidth={0.5}
                  borderColor={colors.border.default}
                  borderRadius={10}
                  paddingHorizontal={spacing.md}
                  color={colors.text.primary}
                  fontSize={16}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onChangeText={updatePhone}
                  placeholder="97XXXXXXXX"
                  placeholderTextColor="$textMuted"
                  value={phone}
                />
              </XStack>
              <Text {...typography.caption} color={colors.text.muted}>
                {isPhoneValid || phone.length === 0
                  ? ""
                  : "Enter a 10 digit mobile number."}
              </Text>
            </YStack>

            {mode === "login" ? (
              <YStack gap={spacing.xs}>
                <Text {...typography.overline} color={colors.text.secondary}>
                  Password
                </Text>
                <XStack
                  height={52}
                  alignItems="center"
                  borderWidth={0.5}
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
                    onChangeText={setPassword}
                    placeholder="Enter your password"
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
                    onPress={() => setShowPassword((current) => !current)}
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
                <Button
                  accessibilityRole="button"
                  alignSelf="flex-end"
                  minHeight={36}
                  backgroundColor="transparent"
                  pressStyle={{ backgroundColor: "transparent" }}
                >
                  <Text {...typography.caption} color={colors.brand.primary}>
                    Forgot password?
                  </Text>
                </Button>
              </YStack>
            ) : null}
          </YStack>

          <YStack gap={spacing.md} paddingTop={spacing.xl}>
            <Button
              accessibilityRole="button"
              disabled={!canSubmit}
              height={52}
              borderRadius="$card"
              backgroundColor={canSubmit ? "$brandPrimary" : "$borderStrong"}
              alignItems="center"
              justifyContent="center"
              onPress={handleSubmit}
              pressStyle={{
                backgroundColor: canSubmit ? "$brandPrimary" : "$borderStrong",
              }}
            >
              <Text
                {...typography.button}
                color={canSubmit ? "$textInverse" : "$textMuted"}
              >
                {mode === "signup" ? "Send OTP" : "Log in"}
              </Text>
            </Button>

            <Text
              {...typography.caption}
              textAlign="center"
              color="$textMuted"
            >
              By continuing, you agree to EdumentX&apos;s Terms and Privacy Policy.
            </Text>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
