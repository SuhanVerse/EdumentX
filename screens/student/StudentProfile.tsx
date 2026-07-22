import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";

import { AvatarBubble } from "@/components/forms/AvatarBubble";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { EditableField } from "@/components/forms/EditableField";
import { MenuRow } from "@/components/forms/MenuRow";
import { BottomNav } from "@/components/shared/BottomNav";
import { logout } from "@/services/firebase/authService";
import { uploadAvatar } from "@/services/supabase/storage";
import { useAuthStore } from "@/store/authStore";

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
  // `savedPhotoUrl` gates the photo-persist effect from looping on
  // every render — we only write when the local value diverges from
  // what the doc already has. `uploadingPhoto` disables the picker
  // affordance while a request is in flight.
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Hydrate from Firestore on first mount. We prefer the saved
  // `fullName` from `users/{uid}/studentProfile/default` (the
  // value the user typed during profile setup) and fall back to
  // the Firebase Auth identity if no profile doc exists yet. We
  // use a one-shot `getDoc` instead of `onSnapshot` because this
  // screen is local-only for now — switching to a live read would
  // race the user's own edits and yank the TextInput out from
  // under them. When Phase 5 wires a real save handler, we
  // upgrade to `onSnapshot` and gate it on `loaded`.
  useEffect(() => {
    if (!user) return;
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "studentProfile", "default");
    let cancelled = false;
    getDoc(profileRef)
      .then((snap) => {
        if (cancelled) return;
        const d = snap.data() as
          | { fullName?: string; photoUrl?: string; phone?: string }
          | undefined;
        if (d?.fullName && d.fullName.trim().length > 0) {
          setName(d.fullName.trim());
        } else {
          setName(
            user.displayName?.trim() ||
              (user.email ? user.email.split("@")[0] : "Student"),
          );
        }
        // Seed both `avatarUri` and `savedPhotoUrl` from the doc so
        // the persist effect doesn't immediately re-write what we
        // just read.
        if (typeof d?.photoUrl === "string") {
          setAvatarUri(d.photoUrl);
          setSavedPhotoUrl(d.photoUrl);
        }
        // Load the phone number saved during profile setup.
        if (typeof d?.phone === "string") {
          setPhone(d.phone);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("StudentProfile: profile read failed", err);
        setName(
          user.displayName?.trim() ||
            (user.email ? user.email.split("@")[0] : "Student"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-persist `photoUrl` to Firestore whenever it changes. The
  // `savedPhotoUrl` gate prevents the effect from writing back what
  // it just read. Fire-and-forget — if it fails we log; the user
  // still sees the new avatar immediately because `setAvatarUri`
  // updated synchronously when the upload returned.
  useEffect(() => {
    if (!user) return;
    if (!avatarUri || avatarUri === savedPhotoUrl) return;
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "studentProfile", "default");
    setDoc(
      profileRef,
      { photoUrl: avatarUri, updatedAt: serverTimestamp() },
      { merge: true },
    )
      .then(() => setSavedPhotoUrl(avatarUri))
      .catch((err) => console.warn("StudentProfile: photoUrl persist failed", err));
  }, [avatarUri, savedPhotoUrl, user]);

  function showComingSoon(feature: string) {
    Alert.alert(
      "Coming soon",
      `${feature} will be available in a future update.`,
    );
  }

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
      setAvatarUri(`${publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      console.error("StudentProfile: avatar upload failed", err);
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
    <ScreenLayout variant="background">

      {/* Hero header — slate, matches the other 4 student surfaces. */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <Text className="text-body text-white/70 mb-0.5 mt-2">Profile</Text>
        <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
          <Text className="text-display text-white">
            Your account
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View className="bg-surface border border-border rounded-card p-5 items-center">
          <AvatarBubble
            name={name || user?.email || "Student"}
            uri={avatarUri}
            editable={!uploadingPhoto}
            onPress={pickImage}
          />
          <Text className="text-section-title font-medium text-text-primary mt-3">
            {name || "Add your name"}
          </Text>
          {user?.email && (
            <View className="flex-row items-center gap-1.5 mt-1">
              <Ionicons name="mail-outline" size={12} color="#6B7268" />
              <Text className="text-caption text-text-muted">
                {user.email}
              </Text>
            </View>
          )}
          <Pressable
            onPress={pickImage}
            disabled={uploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel="Upload or change profile photo"
            className="mt-3 px-3 py-1.5 bg-surface-muted rounded-sm active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-micro text-text-secondary font-medium">
              {uploadingPhoto
                ? "Uploading…"
                : avatarUri
                  ? "Change photo"
                  : "Upload photo"}
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
            <Text className="text-label text-ink-muted mb-2">
                Email
              </Text>
            <View className="flex-row items-center justify-between bg-surface-muted border border-border rounded-card h-input px-4">
                <Text
                  className="text-body-lg text-text-secondary flex-1"
                  numberOfLines={1}
                >
                  {user?.email ?? "Not signed in"}
                </Text>
              <View className="flex-row items-center gap-1 bg-success-bg rounded-pill px-2 py-1">
                <Ionicons name="checkmark-circle" size={11} color="#3F8A5A" />
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
          <Text className="text-label text-ink-muted mb-2">
            Notifications
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => router.push("/notification")}
            className="flex-row items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 active:opacity-80"
          >
            <View className="w-9 h-9 rounded-pill bg-accent-soft items-center justify-center relative">
              <Ionicons name="notifications-outline" size={18} color="#E5A03B" />
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
            <Ionicons name="chevron-forward" size={18} color="#6B7268" />
          </Pressable>
        </View>

        {/* Other menu rows — all alert "Coming soon". */}
        <View className="mt-7">
          <Text className="text-label text-ink-muted mb-2">
            More
          </Text>
          <View className="bg-surface border border-border rounded-card overflow-hidden">
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
          className="mt-7 min-h-btn rounded-card bg-surface border border-border flex-row items-center justify-center gap-2 active:opacity-80"
      >
        <Ionicons name="log-out-outline" size={18} color="#C1503D" />
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
    </ScreenLayout>
  );
}

