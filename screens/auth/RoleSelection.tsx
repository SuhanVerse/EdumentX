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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";

import { colors } from "@/constants/colors";
import { useAuthStore, type UserRole } from "@/store/authStore";

// Roles are persisted to Firestore in lowercase ("student" / "tutor") — the
// values that live in the `role` field on `users/{uid}`. The Zustand store
// uses the same lowercase values (see `UserRole` in store/authStore.ts) so
// they stay in lock-step.
type Role = Exclude<UserRole, "admin" | null>;

export function RoleSelectionScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setRole = useAuthStore((state) => state.setRole);
  const [role, setLocalRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canContinue = role !== null && !isSaving;

  function handleRolePress(selectedRole: Role) {
    setLocalRole(selectedRole);
  }

  async function handleContinue() {
    if (!canContinue) {
      return;
    }
    if (!user) {
      Alert.alert(
        "Not signed in",
        "Please sign in (phone OTP or Google) before picking a role.",
      );
      router.replace("/phone-entry");
      return;
    }
    setIsSaving(true);
    try {
      // Modular RNFirebase v22+ API: getFirestore + doc + setDoc, not
      // firestore().collection().doc().set(). The namespaced form logs a
      // deprecation warning on every call.
      const db = getFirestore(getApp());
      const userRef = doc(db, "users", user.uid);
      const now = serverTimestamp();
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          phone: user.phoneNumber ?? null,
          role,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      // Commit to local store so the root layout guard sees the role
      // immediately on the next render and stops redirecting back here.
      setRole(role);
      // After picking a role, send the user to the dashboard for that role.
      // The first-time profile-completion flows (`/profile-student` and
      // `/profile-tutor`) are no longer the destination — those screens are
      // accessed via a "Edit profile" affordance on the dashboard itself.
      router.replace(role === "tutor" ? "/tutor-home" : "/student-home");
    } catch (error: any) {
      console.error("RoleSelection: failed to write role to Firestore", error);
      Alert.alert(
        "Could not save role",
        error?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
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
              {isSaving ? "Saving..." : "Continue"}
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
