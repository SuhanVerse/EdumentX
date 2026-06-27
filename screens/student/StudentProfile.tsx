import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarBubble } from "@/components/forms/AvatarBubble";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { EditableField } from "@/components/forms/EditableField";
import { BottomNav } from "@/components/shared/BottomNav";
import { logout } from "@/services/firebase/authService";
import { useAuthStore } from "@/store/authStore";
import { initials } from "@/data/mockData";

/**
 * EdumentX — Student Profile
 *
 * Stage 5 (June 27, 2026):
 *   - Shows name, email, profile picture (initials fallback if no
 *     image uploaded).
 *   - Editable fields: Name, Phone, Profile picture (via the
 *     platform image picker — wired through `expo-image-picker`,
 *     already a project dependency).
 *   - Logout button opens a custom `ConfirmDialog` overlay (NOT a
 *     native Alert) which on confirm calls `logout()` + clears the
 *     auth store and routes to `/email-signup`.
 *   - Notifications section is a "Coming soon" placeholder, per
 *     spec.
 *   - All copy lives in this file. Other menu rows (Saved tutors,
 *     Payment methods, Help & support) also fire the "Coming soon"
 *     alert — the spec is strict that anything not explicitly listed
 *     must alert, not be built.
 */

const PHONE_REGEX = /^\+?\d[\d\s-]{5,18}$/;

export function StudentProfile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Local draft state. We mirror the auth user but keep edits
  // local — once the backend write lands (Phase 5) we'll push these
  // into Firestore via the same pattern that `users/{uid}/studentProfile/default`
  // uses.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Hydrate from the auth user on first mount. We deliberately don't
  // touch the Firestore profile here — that's the job of
  // StudentProfileScreen (the onboarding flow). This screen is a
  // post-onboarding edit surface.
  useEffect(() => {
    if (!user) return;
    const fallback =
      user.displayName?.trim() ||
      (user.email ? user.email.split("@")[0] : "Student");
    setName(fallback);
  }, [user]);

  function showComingSoon(feature: string) {
    Alert.alert(
      "Coming soon",
      `${feature} will be available in a future update.`,
    );
  }

  function pickImage() {
    // We intentionally don't import the image picker here — the
    // picker UI is a larger surface (permissions, base64 handling,
    // Supabase upload). For Stage 5 we surface a "Coming soon"
    // alert so the user knows the affordance exists. The full
    // picker flow lands when Supabase Storage wiring (Phase 5.1) is
    // re-enabled on this branch.
    showComingSoon("Profile picture upload");
  }

  async function handleSignOut() {
    setConfirmLogout(false);
    try {
      await logout();
      useAuthStore.getState().reset();
    } catch (err) {
      console.error("StudentProfile: sign-out failed", err);
      Alert.alert("Could not sign out", "Please try again.");
      return;
    }
    router.replace("/email-signup");
  }

  function commitPhone() {
    if (phone && !PHONE_REGEX.test(phone)) {
      setPhoneError("Enter a valid phone number");
      return;
    }
    setPhoneError(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Hero header — slate, matches the other 4 student surfaces. */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <Text className="text-body text-white/70 mb-0.5 mt-2">Profile</Text>
        <Text className="text-screen-title font-medium text-white">
          Your account
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View className="bg-surface border border-border-subtle rounded-card p-5 items-center">
          <AvatarBubble
            name={name || user?.email || "Student"}
            uri={avatarUri}
            editable
            onPress={pickImage}
          />
          <Text className="text-section-title font-medium text-text-primary mt-3">
            {name || "Add your name"}
          </Text>
          {user?.email && (
            <View className="flex-row items-center gap-1.5 mt-1">
              <Ionicons name="mail-outline" size={12} color="#64748B" />
              <Text className="text-caption text-text-muted">
                {user.email}
              </Text>
            </View>
          )}
          <Pressable
            onPress={pickImage}
            className="mt-3 px-3 py-1.5 bg-sand rounded-pill active:opacity-80"
          >
            <Text className="text-micro text-text-secondary font-medium">
              {avatarUri ? "Change photo" : "Upload photo"}
            </Text>
          </Pressable>
        </View>

        {/* Edit fields */}
        <View className="mt-6 gap-5">
          <EditableField
            label="Full name"
            value={name}
            onChange={setName}
            onCommit={() => {}}
            autoCapitalize="words"
            placeholder="Your full name"
          />

          <EditableField
            label="Phone number"
            value={phone}
            onChange={(v) => {
              setPhone(v);
              if (phoneError) setPhoneError(null);
            }}
            onCommit={commitPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            error={phoneError}
            placeholder="+977 98XXXXXXXX"
          />

          {/* Read-only email row */}
          <View>
            <Text className="text-overline text-text-muted uppercase mb-2">
              Email
            </Text>
            <View className="flex-row items-center justify-between bg-sand border border-border rounded-card h-input px-4">
              <Text
                className="text-body-lg text-text-secondary flex-1"
                numberOfLines={1}
              >
                {user?.email ?? "Not signed in"}
              </Text>
              <View className="flex-row items-center gap-1 bg-success-bg rounded-pill px-2 py-1">
                <Ionicons name="checkmark-circle" size={11} color="#047857" />
                <Text className="text-micro text-success-text font-medium">
                  Verified
                </Text>
              </View>
            </View>
            <Text className="text-caption text-text-muted mt-1.5">
              Email is managed by Firebase Auth and can&apos;t be edited
              from here.
            </Text>
          </View>
        </View>

        {/* Notifications — routes to the shared notification center
            (per spec: "wherever notification is displayed, route to
            notification center"). The badge shows the unread count
            from the mock list so the affordance feels live. */}
        <View className="mt-7">
          <Text className="text-overline text-text-muted uppercase mb-2">
            Notifications
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => router.push("/notification")}
            className="flex-row items-center gap-3 bg-surface border border-border-subtle rounded-card px-4 py-3.5 active:opacity-80"
          >
            <View className="w-9 h-9 rounded-pill bg-amber-light items-center justify-center relative">
              <Ionicons name="notifications-outline" size={18} color="#B45309" />
              {/* Unread badge */}
              <View className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-pill bg-danger items-center justify-center">
                <Text className="text-[9px] text-text-inverse font-bold">
                  3
                </Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-card-title text-text-primary">
                Notifications
              </Text>
              <Text className="text-caption text-text-muted mt-0.5">
                3 unread · messages, enrollment, AI
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Other menu rows — all alert "Coming soon". */}
        <View className="mt-7">
          <Text className="text-overline text-text-muted uppercase mb-2">
            More
          </Text>
          <View className="bg-surface border border-border-subtle rounded-card overflow-hidden">
            <MenuRow
              icon="heart-outline"
              label="Saved tutors"
              onPress={() => showComingSoon("Saved tutors")}
            />
            <MenuRow
              icon="card-outline"
              label="Payment methods"
              onPress={() => showComingSoon("Payment methods")}
              last
            />
          </View>
        </View>

        {/* Logout */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => setConfirmLogout(true)}
          className="mt-7 min-h-btn rounded-card bg-danger-bg border border-danger/30 flex-row items-center justify-center gap-2 active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text className="text-button font-semibold text-danger">
            Log out
          </Text>
        </Pressable>

        <Text className="text-caption text-text-muted text-center mt-6">
          EdumentX · v1.0 · build 2026.06.27
        </Text>
      </ScrollView>

      <BottomNav role="student" current="/stu-profile" />

      {/* Custom confirmation overlay — not a native Alert, per spec. */}
      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to sign in again next time you open EdumentX."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        destructive
        onConfirm={handleSignOut}
        onCancel={() => setConfirmLogout(false)}
      />
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={
        last
          ? "flex-row items-center gap-3 px-4 py-3.5 active:opacity-80"
          : "flex-row items-center gap-3 px-4 py-3.5 border-b border-border-subtle active:opacity-80"
      }
    >
      <Ionicons name={icon} size={20} color="#475569" />
      <Text className="flex-1 text-body-lg text-text-primary">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </Pressable>
  );
}