import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "@react-native-firebase/firestore";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuthStore, type UserRole } from "@/store/authStore";
import { motion } from "@/lib/motion";

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
        "Please sign in (email or Google) before picking a role.",
      );
      router.replace("/email-signup");
      return;
    }
    setIsSaving(true);
    try {
      // Modular RNFirebase v22+ API: getFirestore + doc + getDoc +
      // serverTimestamp, not firestore().collection().doc().set().
      // The namespaced form logs a deprecation warning on every call.
      const db = getFirestore(getApp());
      const userRef = doc(db, "users", user.uid);
      const now = serverTimestamp();

      // **Role is no longer written here.** Previously this screen
      // stamped `role: "tutor"` (or `"student"`) on the user doc the
      // moment the user tapped Continue. That left a half-state on
      // the doc: `users/{uid}.role === "tutor"` but no
      // `users/{uid}/tutorProfile/default` and no
      // `tutorVerifications/{uid}`. If the user closed the app
      // between "I picked tutor" and "I hit Finish Setup" on
      // `/profile-tutor`, the layout guard saw a tutor role and
      // routed them straight to `/tutor-home` — a screen that
      // rendered with the `FALLBACK.fullName = "Tutor"` literal and
      // zero metrics. The user was never a valid tutor (no profile
      // was ever submitted), but the system treated them as one.
      //
      // The fix moves the role write to the *only* place the user
      // becomes a valid tutor: inside
      // `screens/auth/TutorProfileScreen.tsx`'s `handleSubmit`
      // `writeBatch`, atomically with the profile + verification
      // docs. So a tutor enters the system exactly when their
      // profile lands.
      //
      // What we *do* write here:
      //   - `uid`, `email`, `displayName`, `username`: auth metadata
      //     that downstream screens (the student profile, the
      //     student home, the marketplace) read.
      //   - `createdAt`: only on first write, never on re-pick.
      //   - `updatedAt`: bumped every time.
      // We deliberately omit `role` so the user doc's `role` field
      // is exclusively written by the profile-submission flow.
      //
      // Read the doc once to detect re-picks (preserve
      // `createdAt`) and so the post-write branch can decide
      // whether to send the user to the profile-completion flow
      // (role not yet committed anywhere) or to the matching
      // dashboard (role already on the doc — submitted
      // previously, just landed here on re-login).
      const existing = await getDoc(userRef);
      const existingData = existing.data() as
        | { createdAt?: unknown; role?: string | null }
        | undefined;
      const batch = writeBatch(db);
      batch.set(
        userRef,
        {
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          // `displayName` and `username` from Firebase Auth are both
          // null on email/password accounts, but we copy them through
          // so the user doc reflects what Auth knows about the user.
          username: (user as { username?: string | null }).username ?? null,
          // Preserve the original `createdAt` if the doc already has
          // one. Without this guard, a re-pick of the role would
          // reset `createdAt` to the new timestamp — wrong, because
          // `createdAt` is meant to track when the *account* was
          // created, not when the role was last edited.
          ...(existingData?.createdAt
            ? {}
            : { createdAt: now }),
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();
      // Commit to local store so the root layout guard sees the role
      // immediately on the next render and stops redirecting back here.
      // The role lives in the in-memory store *only* until the user
      // successfully submits the matching profile screen — at which
      // point the role lands on the user doc and the layout guard
      // picks it up from there on the next sign-in.
      //
      // `hasExistingRole` tracks whether this role came from Firestore
      // (returning user) or was set locally (first-time user). The
      // profile screen Back button reads this flag to decide whether
      // to clear the local role and go back to /role-selection
      // (first-time) or route to the dashboard (returning).
      setRole(role);
      useAuthStore.getState().setHasExistingRole(
        !!existingData?.role,
      );
      // If the user is *changing* their role (re-pick), log it so we
      // can spot abnormal flows.
      const isRoleChange =
        existingData?.role && existingData.role !== role;
      if (isRoleChange) {
        console.log(
          "RoleSelection: role changed",
          existingData.role,
          "->",
          role,
        );
      }
      // Where to send the user next depends on whether the role is
      // brand-new (send to the matching profile-completion flow) or
      // already in place (send to the matching dashboard, since the
      // layout's redirect would land them there anyway — saving the
      // user from an extra hop through /profile-*).
      //
      // This is the "Re-login routing flash" fix: on re-login, the
      // layout briefly routes through /role-selection while the
      // doc-fetch is in flight. If the user happened to tap a role
      // during that flash (or the doc was already populated), we
      // must not bounce them to a profile-completion screen they
      // already filled in.
      if (isRoleChange || !existingData?.role) {
        router.replace(role === "tutor" ? "/profile-tutor" : "/profile-student");
      } else {
        router.replace(role === "tutor" ? "/tutor-home" : "/student-home");
      }
    } catch (error: any) {
      console.error("RoleSelection: failed to write role to Firestore", error);
      // Surface the actual Firebase error code so the user (and any
      // support agent) can tell at a glance whether this is a rules
      // mismatch (`permission-denied`), a network problem, or a bug.
      // Without this we silently route forward and the user thinks
      // their role was saved.
      const code = error?.code ? `\n\nError code: ${error.code}` : "";
      Alert.alert(
        "Could not save role",
        `${error?.message ?? "Please check your connection and try again."}${code}`,
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
          <RoleSelectionBack
            onPress={() => {
              // If the user already has a role in the store (they
              // completed role-selection previously and this is a
              // re-visit), route to the matching dashboard instead
              // of back to email-signup. Routing to /email-signup
              // would trigger the layout guard to immediately
              // redirect back to the dashboard, creating a navigation
              // race that React Navigation reports as "configured
              // linking in multiple places".
              const existingRole = useAuthStore.getState().role;
              if (existingRole === "tutor") {
                router.replace("/tutor-home");
              } else if (existingRole === "student") {
                router.replace("/student-home");
              } else if (existingRole === "admin") {
                router.replace("/admin-home");
              } else {
                // First-time user with no role yet. The Firebase Auth
                // account has already been created (by
                // `createUserWithEmailAndPassword` inside
                // `signUpWithEmail`), so going back to /email-signup
                // would not lose data. However, the layout guard
                // would immediately redirect back to /role-selection
                // (because `!role`), creating an infinite loop.
                // Instead of navigating, show a confirmation dialog
                // explaining what happens if they leave.
                Alert.alert(
                  "Leave role selection?",
                  "Your account has already been created. You can " +
                    "sign back in later and pick a role then. " +
                    "No data will be lost.",
                  [
                    {
                      text: "Stay here",
                      style: "cancel",
                    },
                    {
                      text: "Sign out",
                      style: "destructive",
                      onPress: async () => {
                        const { logout } = await import(
                          "@/services/firebase/authService"
                        );
                        await logout();
                        useAuthStore.getState().reset();
                        router.replace("/email-signup");
                      },
                    },
                  ],
                );
              }
            }}
          />

          <View className="gap-2 mb-6">
            <Text className="text-label text-ink-muted">
              Step 1 of 2
            </Text>
            <View className="self-start border-b-2 border-accent pb-0.5 mb-1">
              <Text className="text-hero text-text-primary">
                How will you use EdumentX?
              </Text>
            </View>
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
          <PrimaryButton
            label={isSaving ? "Saving..." : "Continue"}
            onPress={handleContinue}
            loading={isSaving}
            disabled={!canContinue}
            size="lg"
            className="w-full"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleSelectionBack({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={12}
      className="min-h-touch self-start flex-row items-center gap-1 mb-3"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
    >
      <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
      <Text className="text-body text-text-primary">Back</Text>
    </AnimatedPressable>
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
  // Spring scale 0.99 — cards are large surfaces, so a subtler
  // scale-down than a button feels right.
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: 0.99,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`min-h-role-card flex-row items-center gap-4 p-4 rounded-lg bg-surface ${
        active ? "border border-primary" : "border border-border"
      }`}
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
        <RoleCardCheckmark color={iconColor} />
      ) : (
        <Ionicons color={colors.border.strong} name="chevron-forward" size={20} />
      )}
    </AnimatedPressable>
  );
}

/**
 * The right-side checkmark pill that appears when a `RoleCard`
 * becomes active. Pops in with a `withSequence(pop, settle)` — the
 * first spring uses `motion.spring.pop` for the snappy "tick" feel,
 * the second uses `motion.spring.gentle` so the pill settles
 * without an overshoot wobble. Mounts at 0 opacity + 0.6 scale and
 * animates to 1 + 1 over ~280ms.
 */
function RoleCardCheckmark({ color }: { color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSequence(
      withSpring(1, motion.spring.pop),
      withSpring(1, motion.spring.gentle),
    );
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: progress.value,
      transform: [{ scale: 0.6 + progress.value * 0.4 }],
    };
  });
  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Ionicons color="white" name="checkmark" size={14} />
    </Animated.View>
  );
}
