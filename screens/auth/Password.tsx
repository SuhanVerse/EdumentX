import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
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

type Strength = "transparent" | "danger" | "warning" | "success";

function getStrength(password: string): {
  label: string;
  color: Strength;
  width: "0%" | "33%" | "66%" | "100%";
} {
  if (password.length === 0)
    return { label: "", color: "transparent", width: "0%" };
  if (password.length < 6) return { label: "Weak", color: "danger", width: "33%" };
  if (password.length < 10)
    return { label: "Fair", color: "warning", width: "66%" };
  return { label: "Strong", color: "success", width: "100%" };
}

const strengthBarColor: Record<Strength, string> = {
  transparent: "bg-border",
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
};

const strengthTextColor: Record<Strength, string> = {
  transparent: "text-border",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
};

export function CreatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = password.length >= 6 && password === confirmPassword;

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
            onPress={() => router.back()}
            className="min-h-touch self-start flex-row items-center gap-1 mb-4 active:opacity-70"
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text className="text-body text-text-primary">Back</Text>
          </Pressable>

          <View className="items-center gap-2 pt-4 mb-7">
            <View className="w-16 h-16 items-center justify-center rounded-pill bg-primary-light mb-2">
              <Ionicons color={colors.brand.primary} name="lock-closed-outline" size={28} />
            </View>
            <Text className="text-hero text-text-primary text-center">
              Create a password
            </Text>
            <Text
              className="text-body text-text-secondary text-center"
              style={{ maxWidth: 288 }}
            >
              Choose a strong password to secure your account.
            </Text>
          </View>

          {/* Password */}
          <View className="gap-1 mb-4">
            <Text className="text-button text-text-primary">Password</Text>
            <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3">
              <TextInput
                className="flex-1 text-text-primary text-body-lg"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry={!showPassword}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                accessibilityRole="button"
                onPress={() => setShowPassword(!showPassword)}
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

            {password.length > 0 && (
              <View className="flex-row items-center gap-2 mt-1">
                <View className="flex-1 h-1 bg-border rounded-sm overflow-hidden">
                  <View
                    className={`h-full rounded-sm ${strengthBarColor[strength.color]}`}
                    style={{ width: strength.width as `${number}%` }}
                  />
                </View>
                <Text
                  className={`text-caption w-11 font-semibold ${strengthTextColor[strength.color]}`}
                >
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View className="gap-1 mb-4">
            <Text className="text-button text-text-primary">Confirm Password</Text>
            <View
              className={`h-btn flex-row items-center border-emphasis rounded-md bg-surface px-3 ${
                passwordsMatch ? "border-danger" : "border-border"
              }`}
            >
              <TextInput
                className="flex-1 text-text-primary text-body-lg"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
              />
              <Pressable
                accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
                accessibilityRole="button"
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={8}
                className="w-11 h-11 items-center justify-center active:opacity-70"
              >
                <Ionicons
                  color={colors.text.muted}
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                />
              </Pressable>
            </View>
            {passwordsMatch && (
              <Text className="text-caption text-danger mt-1">
                Passwords do not match
              </Text>
            )}
          </View>

          <View className="flex-1 justify-end pt-7">
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => router.replace("/role-selection")}
              className="min-h-btn items-center justify-center rounded-card bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
            >
              <Text className="text-button text-white disabled:text-text-muted">
                Continue
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
