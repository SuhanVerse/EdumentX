import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
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
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";

import { colors } from "@/constants/colors";
import { logout } from "@/services/firebase/authService";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Admin Profile (`/admin-profile`)
 *
 * Single screen that doubles as:
 *   - First-time setup — when an admin signs in for the first time
 *     and their `users/{uid}/adminProfile/default` doc doesn't exist,
 *     `_layout.tsx` routes them here instead of `/admin-home`. They
 *     fill in their display name, role title, and phone, save, and
 *     the layout guard advances them to `/admin-home`.
 *   - Profile view + edit — the same screen, mounted via the admin
 *     "Profile" menu row on `/admin-home`. Pre-fills with the saved
 *     values so the admin can update their name/title/phone later.
 *
 * Visual language mirrors `screens/auth/StudentProfileScreen.tsx`:
 * `bg-night` hero with white text, `bg-background` body, `bg-surface`
 * form cards with `border-border-subtle`. The dark hero + amber-style
 * accent is the same shape the student setup uses, so admins
 * recognize the flow as "complete your profile" rather than a
 * separate admin-only surface.
 *
 * No `AdminNav` here: the bottom nav lists `/admin-home`,
 * `/verification-queue`, `/platform-statistics`, and
 * `/user-management` — none of which are reachable from a profile
 * form. Mounting it here would also tempt admins to "skip" profile
 * setup by tapping a tab, which is exactly the UX we are trying to
 * prevent. The Sign out button below the form is the only escape
 * hatch.
 *
 * Doc shape (`users/{uid}/adminProfile/default`):
 *   {
 *     fullName: string,
 *     roleTitle: string,        // e.g. "Lead Moderator", "Head of Trust & Safety"
 *     phone: string,
 *     email: string,            // copied from auth, read-only
 *     photoUrl?: string,        // future: Supabase-hosted avatar
 *     createdAt: Timestamp,
 *     updatedAt: Timestamp,
 *   }
 *
 * Note on rules: `firestore.rules` already allows
 * `users/{userId}/{subcollection}/{document=**}` for the owner. The
 * `adminProfile` subcollection rides on that rule — no per-collection
 * rule needed. The `email` field is locked at the form level
 * (read-only input); admins can't spoof someone else's profile email.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{7,15}$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]{2,80}$/;
const ROLE_TITLE_MAX = 60;

type AdminProfile = {
  fullName: string;
  roleTitle: string;
  phone: string;
  email: string;
};

const EMPTY_PROFILE: AdminProfile = {
  fullName: "",
  roleTitle: "",
  phone: "",
  email: "",
};

export function AdminProfile() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<AdminProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AdminProfile, string>>>({});

  // Load existing profile (if any). On first sign-in the doc is
  // missing, the snapshot returns `undefined`, and we leave the
  // form empty so the admin can fill it in.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const db = getFirestore(getApp());
        const profileRef = doc(db, "users", user!.uid, "adminProfile", "default");
        const snap = await getDoc(profileRef);
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data() as Partial<AdminProfile> | undefined;
          setProfile({
            fullName: typeof d?.fullName === "string" ? d.fullName : "",
            roleTitle: typeof d?.roleTitle === "string" ? d.roleTitle : "",
            phone: typeof d?.phone === "string" ? d.phone : "",
            email:
              typeof d?.email === "string" && d.email.length > 0
                ? d.email
                : (user?.email ?? ""),
          });
          // The auth listener in _layout.tsx has already read this
          // doc and set `hasAdminProfile` accordingly, but it may
          // have read it before the most recent save (race window).
          // Mirror the value here so the routing guard never bounces
          // a returning admin back to setup just because of a stale
          // local flag.
          if ((d?.fullName ?? "").toString().trim().length > 0) {
            useAuthStore.getState().setHasAdminProfile(true);
          }
        } else {
          // No profile yet — pre-fill the email from auth so the
          // admin doesn't have to retype it. Other fields stay empty.
          setProfile((p) => ({ ...p, email: user?.email ?? "" }));
        }
      } catch (err) {
        console.warn("AdminProfile: failed to load adminProfile doc", err);
        // Non-fatal — fall back to the email-from-auth prefill.
        setProfile((p) => ({ ...p, email: user?.email ?? "" }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Detect "first-time setup" — when the profile doc is missing
  // AND the form is still empty, the user lands here for the first
  // time and the screen renders the "welcome" header. Once any
  // field has a value (or after a save), it switches to the
  // standard "edit profile" header.
  const isFirstTime = !loading && profile.fullName.trim().length === 0;

  function validate(p: AdminProfile): Partial<Record<keyof AdminProfile, string>> {
    const e: Partial<Record<keyof AdminProfile, string>> = {};
    if (!NAME_REGEX.test(p.fullName.trim())) {
      e.fullName =
        p.fullName.trim().length === 0
          ? "Enter your full name."
          : "Use 2–80 letters, spaces, dots, apostrophes, or hyphens only.";
    }
    if (p.roleTitle.trim().length === 0) {
      e.roleTitle = "Enter your role title (e.g. 'Lead Moderator').";
    } else if (p.roleTitle.trim().length > ROLE_TITLE_MAX) {
      e.roleTitle = `Keep it under ${ROLE_TITLE_MAX} characters.`;
    }
    if (p.phone.length > 0 && !PHONE_REGEX.test(p.phone.trim())) {
      e.phone = "Use 7–15 digits, no spaces or symbols.";
    }
    if (!EMAIL_REGEX.test(p.email.trim())) {
      e.email = "Email looks invalid.";
    }
    return e;
  }

  async function handleSave() {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in before saving your profile.");
      router.replace("/email-signup");
      return;
    }
    const v = validate(profile);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setIsSaving(true);
    try {
      const db = getFirestore(getApp());
      const profileRef = doc(db, "users", user.uid, "adminProfile", "default");
      const now = serverTimestamp();
      await setDoc(
        profileRef,
        {
          fullName: profile.fullName.trim(),
          roleTitle: profile.roleTitle.trim(),
          phone: profile.phone.trim(),
          email: profile.email.trim(),
          updatedAt: now,
          // Stamp createdAt only on first save. The merge keeps any
          // existing createdAt from a previous write so the field
          // tracks the admin's *account* creation, not their last
          // profile edit.
          ...(isFirstTime ? { createdAt: now } : {}),
        },
        { merge: true },
      );
      // Flip the flag BEFORE navigating. The routing guard in
      // `_layout.tsx` reads `hasAdminProfile` from the auth store on
      // every render; if we left it at `false` for the brief moment
      // between `router.replace(...)` and the next render, the guard
      // would re-route us back to /admin-profile — an infinite loop
      // we hit on the first iteration of this screen.
      useAuthStore.getState().setHasAdminProfile(true);
      // First-time flow → advance to /admin-home. Returning flow →
      // pop back to wherever the admin came from.
      if (isFirstTime) {
        router.replace("/admin-home");
      } else {
        router.replace("/admin-home");
      }
    } catch (err: any) {
      console.error("AdminProfile: failed to save adminProfile", err);
      const code = err?.code ? `\n\nError code: ${err.code}` : "";
      Alert.alert(
        "Could not save profile",
        `${err?.message ?? "Please check your connection and try again."}${code}`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Sign-out confirmation wrapper.
   *
   * `Alert.alert` is a native confirm dialog on both iOS and
   * Android — pressing the destructive button is the only path
   * to the real `handleSignOut`. This matches the pattern used
   * in `StudentHome.tsx` and `tutor/edit_profile.tsx` so admins
   * get the same "Are you sure?" affordance students and tutors
   * see. A misplaced tap should never end a session.
   */
  function handleSignOutConfirm() {
    if (isSigningOut) return;
    Alert.alert(
      "Sign out?",
      "You'll need to sign in again next time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            void handleSignOut();
          },
        },
      ],
    );
  }

  /**
   * Sign out and route back to the auth entry screen.
   *
   * Why this exists here (and not just in a sidebar): an admin who
   * landed here via the routing guard has no back history. The
   * "back" affordance from earlier iterations called
   * `router.back()`, which silently no-op'd when the stack was
   * empty — leaving the admin trapped on this screen. The only
   * safe ways out are: (a) finish the form and save, or (b) sign
   * out. We expose (b) prominently in the hero so the admin is
   * never stuck.
   */
  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
      useAuthStore.getState().reset();
      router.replace("/email-signup");
    } catch (err: any) {
      console.error("AdminProfile: sign-out failed", err);
      Alert.alert(
        "Could not sign out",
        err?.message ?? "Please try again in a moment.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  const canSave =
    !isSaving &&
    !loading &&
    profile.fullName.trim().length > 0 &&
    profile.roleTitle.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-night">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Hero — mirrors StudentProfileScreen's "Set up your profile"
            header. Dark navy bg, large white title, lighter caption.
            The Sign out pill lives in the top-right so a stranded
            admin can always reach it, even before scrolling. */}
        <View className="gap-2 px-5 pt-4 pb-10 bg-night">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 min-w-0">
              <Text className="text-overline text-white/70 uppercase">
                {isFirstTime ? "Welcome" : "Admin profile"}
              </Text>
              <Text className="text-header-title text-white mt-0.5">
                {isFirstTime ? "Set up your admin profile" : "Your details"}
              </Text>
              <Text className="text-body text-white opacity-70 mt-1">
                {isFirstTime
                  ? "Tell the team who's behind this account."
                  : "Update your display name, role title, or phone."}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={handleSignOutConfirm}
              disabled={isSigningOut}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-pill bg-white/10 active:opacity-70 disabled:opacity-50"
            >
              <Ionicons
                color="#FFFFFF"
                name="log-out-outline"
                size={16}
              />
              <Text className="text-button-sm font-medium text-white">
                {isSigningOut ? "Signing out..." : "Sign out"}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-5 pt-8 pb-10 bg-background"
          keyboardShouldPersistTaps="handled"
        >
          {/* Identity card — name + role title. The role title is what
              appears next to the admin's name on the moderation team
              page (future), so we treat it as required. */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <Text className="text-overline text-text-muted uppercase">
              Your identity
            </Text>

            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Full name
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3 gap-2">
                <Ionicons
                  color={colors.text.muted}
                  name="person-outline"
                  size={18}
                />
                <TextInput
                  className="flex-1 text-text-primary text-body"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  onChangeText={(v) => setProfile((p) => ({ ...p, fullName: v }))}
                  placeholder="e.g. Asim Poudel"
                  placeholderTextColor={colors.text.muted}
                  value={profile.fullName}
                />
              </View>
              {errors.fullName ? (
                <Text className="text-caption text-danger">{errors.fullName}</Text>
              ) : null}
            </View>

            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Role title
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3 gap-2">
                <Ionicons
                  color={colors.text.muted}
                  name="briefcase-outline"
                  size={18}
                />
                <TextInput
                  className="flex-1 text-text-primary text-body"
                  autoCapitalize="words"
                  onChangeText={(v) => setProfile((p) => ({ ...p, roleTitle: v }))}
                  placeholder="e.g. Lead Moderator, Trust & Safety"
                  placeholderTextColor={colors.text.muted}
                  value={profile.roleTitle}
                  maxLength={ROLE_TITLE_MAX}
                />
              </View>
              {errors.roleTitle ? (
                <Text className="text-caption text-danger">{errors.roleTitle}</Text>
              ) : (
                <Text className="text-caption text-text-muted">
                  How you'd be described on the moderation team page.
                </Text>
              )}
            </View>
          </View>

          {/* Contact card — phone (optional) + email (read-only). */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <Text className="text-overline text-text-muted uppercase">
              Contact
            </Text>

            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Phone (optional)
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3 gap-2">
                <Ionicons
                  color={colors.text.muted}
                  name="call-outline"
                  size={18}
                />
                <TextInput
                  className="flex-1 text-text-primary text-body"
                  keyboardType="phone-pad"
                  onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
                  placeholder="Digits only, e.g. 9841234567"
                  placeholderTextColor={colors.text.muted}
                  value={profile.phone}
                />
              </View>
              {errors.phone ? (
                <Text className="text-caption text-danger">{errors.phone}</Text>
              ) : (
                <Text className="text-caption text-text-muted">
                  Used for urgent platform contact only. Never shown publicly.
                </Text>
              )}
            </View>

            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Email
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-sand px-3 gap-2">
                <Ionicons
                  color={colors.text.muted}
                  name="mail-outline"
                  size={18}
                />
                <TextInput
                  className="flex-1 text-text-secondary text-body"
                  editable={false}
                  value={profile.email}
                  placeholderTextColor={colors.text.muted}
                />
              </View>
              <Text className="text-caption text-text-muted">
                Locked to your Firebase Auth identity. Contact the dev team to change it.
              </Text>
            </View>
          </View>

          {/* Save button — bg-night matches the hero palette (the
              admin app's accent color is dark navy, not amber like
              the student app). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFirstTime ? "Save and continue" : "Save changes"}
            disabled={!canSave}
            onPress={handleSave}
            className="min-h-btn-lg rounded-card items-center justify-center shadow-md bg-night active:opacity-90 active:scale-[0.98] disabled:bg-border-strong disabled:opacity-60 self-center w-full max-w-sm"
          >
            <Text className="text-button text-base font-semibold text-white disabled:text-text-muted">
              {isSaving
                ? "Saving..."
                : isFirstTime
                  ? "Save and continue"
                  : "Save changes"}
            </Text>
          </Pressable>

          {!isFirstTime ? (
            <Text className="text-caption text-text-muted text-center">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          ) : null}

          {/* Sign-out escape hatch, also rendered below the form so
              an admin who has scrolled the hero out of view still
              has a way out. `router.back()` is unreliable here
              because the auth guard routes brand-new admins straight
              to this screen with an empty back stack. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={handleSignOutConfirm}
            disabled={isSigningOut}
            className="min-h-pill-sm items-center justify-center mt-2 active:opacity-70 disabled:opacity-50"
          >
            <Text className="text-button-sm text-text-muted">
              {isSigningOut ? "Signing out..." : "Sign out instead"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
