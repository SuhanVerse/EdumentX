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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";

type Role = "student" | "tutor";

export function RoleSelectionScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  const canContinue = role !== null;

  function handleRolePress(selectedRole: Role) {
    setRole(selectedRole);
  }

  function handleContinue() {
    if (!canContinue) {
      return;
    }
    router.push(role === "tutor" ? "/profile-tutor" : "/profile-student");
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
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
            className="min-h-touch self-start flex-row items-center gap-1 mb-3 active:opacity-70"
            onPress={() => router.replace("/create_password")}
          >
            <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
            <Text className="text-body text-text-primary">Back</Text>
          </Pressable>

          <View className="gap-2 mb-6">
            <Text className="text-overline text-text-primary uppercase">
              Step 3 of 4
            </Text>
            <Text className="text-hero text-text-primary">
              How will you use EdumentX?
            </Text>
            <Text className="text-body text-text-secondary">
              Select your role once during signup. Admin approval is required to
              change it later.
            </Text>
          </View>

          <View className="gap-4">
            <RoleCard
              active={role === "student"}
              iconColor={colors.brand.primary}
              iconName="school-outline"
              iconBg={colors.onboarding.mapBackground}
              activeBorder={colors.brand.primary}
              onPress={() => handleRolePress("student")}
              subtitle="Find verified home tutors and manage enrollments."
              title="Student / Parent"
            />

            <RoleCard
              active={role === "tutor"}
              iconColor={colors.brand.verification}
              iconName="book-outline"
              iconBg={colors.onboarding.verifyBackground}
              activeBorder={colors.brand.verification}
              onPress={() => handleRolePress("tutor")}
              subtitle="List your teaching services and receive enrollment requests."
              title="Tutor"
            />
          </View>
        </ScrollView>

        <View className="px-5 pt-3 pb-8 bg-background">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            disabled={!canContinue}
            onPress={handleContinue}
            className="min-h-btn items-center justify-center rounded-card bg-night active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
          >
            <Text className="text-button text-white disabled:text-text-muted">
              Continue
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface RoleCardProps {
  active: boolean;
  iconColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  activeBorder: string;
  onPress: () => void;
  subtitle: string;
  title: string;
}

function RoleCard({
  active,
  iconColor,
  iconName,
  iconBg,
  activeBorder,
  onPress,
  subtitle,
  title,
}: RoleCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-role-card flex-row items-center gap-4 p-4 rounded-lg bg-surface active:opacity-85 ${
        active ? "border border-night" : "border border-border"
      }`}
      style={active ? { borderColor: activeBorder } : undefined}
    >
      <View
        className="w-role-icon h-role-icon shrink-0 items-center justify-center rounded-card"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons color={iconColor} name={iconName} size={26} />
      </View>

      <View className="flex-1 gap-1">
        <Text className="text-card-title text-text-primary font-medium">
          {title}
        </Text>
        <Text className="text-body text-text-secondary">{subtitle}</Text>
      </View>

      {active ? (
        <View
          className="w-role-check h-role-check items-center justify-center rounded-pill"
          style={{ backgroundColor: iconColor }}
        >
          <Ionicons color="white" name="checkmark" size={14} />
        </View>
      ) : (
        <Ionicons color={colors.border.strong} name="chevron-forward" size={20} />
      )}
    </Pressable>
  );
}
