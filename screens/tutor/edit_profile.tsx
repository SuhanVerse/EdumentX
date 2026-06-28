import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";

import { TutorBottomBar } from "@/components/TutorBottomBar";
import { AvatarBubble } from "@/components/forms/AvatarBubble";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { EditableField } from "@/components/forms/EditableField";
import { MenuRow } from "@/components/forms/MenuRow";
import { logout } from "@/services/firebase/authService";
import { uploadAvatar } from "@/services/supabase/storage";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Tutor Profile Edit screen (`/tutor_edit_profile`)
 *
 * Stage A.5 (June 28, 2026): rewritten as a *profile-parity* screen that
 * mirrors `StudentProfile.tsx`. Previously this was a flat form with
 * `fullName` / `monthlyRate` / `subjects` / `yearsExperience`
 * TextInputs and a Save button — that pattern didn't match the
 * student's profile surface and gave tutors no way to log out of the
 * app.
 *
 * What this surface now does:
 *   - Hero header + identity card (avatar bubble + name + email +
 *     Upload/Change pill). Tap the camera icon or the pill to pick a
 *     new photo from the device library — the picker hands a local
 *     `file://` URI to `uploadAvatar()` (Supabase `public-avatars`
 *     bucket) and the resulting public URL is persisted to
 *     `users/{uid}/tutorProfile/default.photoUrl` so it survives a
 *     reload.
 *   - Two inline `EditableField` rows (Headline + About me) — the
 *     only post-onboarding fields a tutor reasonably tweaks without
 *     redoing the whole setup form. They're local-only for now
 *     (Phase 5 will wire a real save).
 *   - Locked email row (verified pill) sourced from the auth identity.
 *   - Four menu rows — Availability / My batches / Payouts / Help &
 *     support — each firing `showComingSoon` except `My batches`
 *     which routes to `/batches` (route already registered).
 *   - Destructive Log out button + `ConfirmDialog` overlay. Once we
 *     confirm, the `logout()` call clears the Firebase Auth session,
 *     we reset the Zustand store, and the layout guard routes to
 *     `/email-signup`.
 *
 * Out of scope for this stage:
 *   - Persisting Headline + About me edits to Firestore from this
 *     screen. Same shape as `StudentProfile.tsx` today — local-only
 *     state. When Phase 5 wires a real "Save profile" backend we
 *     extend the same `useEffect` auto-persist pattern used for
 *     `photoUrl` below.
 *   - Editing monthlyRate / subjects / yearsExperience / location
 *     inline. Those live in the original setup screen
 *     (`TutorProfileScreen.tsx` at `/profile-tutor`). A TODO MenuRow
 *     is wired so the tutor can revisit that flow when they want.
 */

interface EditFormState {
  fullName: string;
  email: string;
  headline: string;
  bio: string;
}

const EMPTY_FORM: EditFormState = {
  fullName: "",
  email: "",
  headline: "",
  bio: "",
};

export function EditTutorProfile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<EditFormState>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);

  // Photo state — local `photoUrl` for display, `savedPhotoUrl` to
  // suppress the persist effect from looping on every render. We
  // hydrate both from the Firestore doc on mount so a re-login keeps
  // showing the same avatar.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [confirmLogout, setConfirmLogout] = useState(false);

  function showComingSoon(feature: string) {
    Alert.alert(
      "Coming soon",
      `${feature} will be available in a future update.`,
    );
  }

  // One-shot read on mount. We don't use `onSnapshot` here because
  // this screen is the *source* of writes (avatar uploads, headline
  // edits) — a live mirror would re-render the inputs mid-typing.
  // The tutor dashboard subscribes to the same doc via `onSnapshot`
  // and re-renders after `handleSave` (or our `photoUrl` persist
  // effect) commits.
  useEffect(() => {
    if (!user) {
      setForm(EMPTY_FORM);
      setLoaded(true);
      return;
    }
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    let cancelled = false;
    getDoc(profileRef)
      .then((snap) => {
        if (cancelled) return;
        const d = snap.data() as
          | {
              fullName?: string;
              email?: string;
              headline?: string;
              bio?: string;
              photoUrl?: string;
            }
          | undefined;
        setForm({
          fullName: typeof d?.fullName === "string" ? d.fullName : "",
          email:
            typeof d?.email === "string"
              ? d.email
              : (user.email ?? ""),
          headline: typeof d?.headline === "string" ? d.headline : "",
          bio: typeof d?.bio === "string" ? d.bio : "",
        });
        // Seed both `photoUrl` and `savedPhotoUrl` from the doc so
        // the persist effect doesn't immediately re-write what we
        // just read.
        const persisted = typeof d?.photoUrl === "string" ? d.photoUrl : null;
        setPhotoUrl(persisted);
        setSavedPhotoUrl(persisted);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("EditTutorProfile: read failed", err);
        // Don't block the screen — render empty form so the user
        // can still edit; saving will overwrite whatever's there.
        setForm({
          fullName: "",
          email: user.email ?? "",
          headline: "",
          bio: "",
        });
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-persist `photoUrl` to Firestore whenever it changes. The
  // `savedPhotoUrl` gate prevents the effect from writing back what
  // it just read (a `photoUrl === savedPhotoUrl` short-circuit means
  // the local state matches the doc). This is fire-and-forget — if
  // it fails we log; the user still sees the new avatar immediately
  // because the local `photoUrl` updated synchronously when the
  // upload returned.
  useEffect(() => {
    if (!user || !loaded) return;
    if (!photoUrl || photoUrl === savedPhotoUrl) return;
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    setDoc(profileRef, { photoUrl, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => setSavedPhotoUrl(photoUrl))
      .catch((err) => console.warn("EditTutorProfile: photoUrl persist failed", err));
  }, [photoUrl, savedPhotoUrl, user, loaded]);

  async function pickImage() {
    const uid = user?.uid;
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in to update your photo.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access in system settings to choose a profile image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const localUri = result.assets[0].uri;

    setUploadingPhoto(true);
    try {
      const { publicUrl } = await uploadAvatar(uid, localUri);
      // Append a cache-buster query param exactly like `AvatarUploader`
      // does so React Native's `<Image>` re-fetches instead of
      // serving a cached version of the previous avatar.
      setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      console.error("EditTutorProfile: avatar upload failed", err);
      Alert.alert(
        "Upload failed",
        err?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSignOut() {
    setConfirmLogout(false);
    try {
      await logout();
      useAuthStore.getState().reset();
    } catch (err) {
      console.error("EditTutorProfile: sign-out failed", err);
      Alert.alert("Could not sign out", "Please try again.");
      return;
    }
    router.replace("/email-signup");
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Hero header — slate, matches the 5 other tutor surfaces. */}
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
            name={form.fullName || form.email || "Tutor"}
            uri={photoUrl}
            editable={!uploadingPhoto}
            onPress={pickImage}
          />
          <Text className="text-section-title font-medium text-text-primary mt-3">
            {form.fullName || "Add your name"}
          </Text>
          {form.email ? (
            <View className="flex-row items-center gap-1.5 mt-1">
              <Ionicons name="mail-outline" size={12} color="#64748B" />
              <Text className="text-caption text-text-muted">{form.email}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={pickImage}
            disabled={uploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel="Upload or change profile photo"
            className="mt-3 px-3 py-1.5 bg-sand rounded-pill active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-micro text-text-secondary font-medium">
              {uploadingPhoto
                ? "Uploading…"
                : photoUrl
                  ? "Change photo"
                  : "Upload photo"}
            </Text>
          </Pressable>
        </View>

        {/* Editable fields — Headline + About me are the two tutor-
            profile fields the user reasonably tweaks post-onboarding
            without redoing the whole setup form. */}
        <View className="mt-6 gap-5">
          <EditableField
            label="Headline"
            value={form.headline}
            onChange={(headline) => setForm((p) => ({ ...p, headline }))}
            onCommit={() => {
              /* TODO(phase-5): persist headline to tutorProfile doc */
            }}
            placeholder="e.g., Math & Physics tutor · SEE graduate"
          />

          <EditableField
            label="About me"
            value={form.bio}
            onChange={(bio) => setForm((p) => ({ ...p, bio }))}
            onCommit={() => {
              /* TODO(phase-5): persist bio to tutorProfile doc */
            }}
            placeholder="Tell parents about your teaching style and experience."
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
                {form.email || "Not signed in"}
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

        {/* Setup-time fields — monthlyRate / subjects / yearsExperience
            live on the original setup screen. The TODO MenuRow lets
            the tutor revisit it without redoing onboarding. The list
            below is just four menu rows, matching the student
            profile's "More" card. */}
        <View className="mt-7">
          <Text className="text-overline text-text-muted uppercase mb-2">
            More
          </Text>
          <View className="bg-surface border border-border-subtle rounded-card overflow-hidden">
            <MenuRow
              icon="calendar-outline"
              label="Availability"
              onPress={() => showComingSoon("Availability editor")}
            />
            <MenuRow
              icon="people-outline"
              label="My batches"
              onPress={() => router.push("/batches")}
            />
            <MenuRow
              icon="card-outline"
              label="Payouts"
              onPress={() => showComingSoon("Payouts")}
            />
            <MenuRow
              icon="help-circle-outline"
              label="Help & support"
              onPress={() => showComingSoon("Help & support")}
              last
            />
          </View>
          <Text className="text-caption text-text-muted mt-2 px-1">
            Teaching details (subjects, monthly rate, years of
            experience) are managed in your onboarding profile.
          </Text>
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
          EdumentX · v1.0 · build 2026.06.28
        </Text>
      </ScrollView>

      <TutorBottomBar />

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