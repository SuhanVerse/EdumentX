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
            className="min-h-touch self-start flex-row items-center gap-1 mb-3 active:opacity-70"
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text className="text-body text-text-primary">Back</Text>
          </Pressable>

          <View className="gap-2 mb-6">
            <Text className="text-hero text-text-primary">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </Text>
          </View>

          <View className="gap-1 p-1 rounded-md bg-background mb-6 flex-row">
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
                    {item === "signup" ? "Sign up" : "Log in"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-1 gap-4">
            <View className="gap-1">
              <Text className="text-overline text-text-secondary uppercase">
                Phone number
              </Text>
              <View className="flex-row gap-2">
                <View
                  className="min-w-country-code h-btn flex-row items-center justify-center gap-1 border border-border rounded-md bg-surface"
                >
                  <Text className="text-button text-text-primary">NP</Text>
                  <Text className="text-button text-text-primary">+977</Text>
                  <Ionicons color={colors.text.muted} name="chevron-down" size={14} />
                </View>

                <TextInput
                  className="flex-1 h-btn border border-border rounded-md px-3 text-text-primary text-base"
                  keyboardType="phone-pad"
                  maxLength={10}
                  onChangeText={updatePhone}
                  placeholder="97XXXXXXXX"
                  placeholderTextColor={colors.text.muted}
                  value={phone}
                />
              </View>
              <Text className="text-caption text-text-muted">
                {isPhoneValid || phone.length === 0
                  ? ""
                  : "Enter a 10 digit mobile number."}
              </Text>
            </View>

            {mode === "login" ? (
              <View className="gap-1">
                <Text className="text-overline text-text-secondary uppercase">
                  Password
                </Text>
                <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3">
                  <TextInput
                    className="flex-1 text-text-primary text-body-lg"
                    onChangeText={setPassword}
                    placeholder="Enter your password"
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
                <Pressable
                  accessibilityRole="button"
                  className="self-end min-h-pill-sm items-center justify-center active:opacity-70"
                >
                  <Text className="text-caption text-text-primary">Forgot password?</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View className="gap-3 pt-6">
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              className="min-h-btn rounded-card items-center justify-center bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
            >
              <Text className="text-button text-white disabled:text-text-muted">
                {mode === "signup" ? "Send OTP" : "Log in"}
              </Text>
            </Pressable>

            <Text className="text-caption text-text-muted text-center">
              By continuing, you agree to EdumentX&apos;s Terms and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
