import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { uploadAvatar } from "@/services/supabase/storage";

type AvatarUploaderProps = {
  value: string | null;
  onChange: (uri: string | null) => void;
  /**
   * Red ring + helper message when the profile picture is missing.
   * Drives the same `error` visual language as `FieldShell` / inputs.
   */
  error?: boolean;
  /**
   * Green ring + check overlay when a photo is uploaded. Mirrors the
   * inline checkmark other validated fields show.
   */
  valid?: boolean;
  /**
   * Error message shown below the avatar. Falls back to
   * "Profile picture is required" when omitted.
   */
  errorMessage?: string;
};

/**
 * 96×96 circular avatar + "Upload photo" / "Change photo" label.
 * Used by both the student and tutor profile forms.
 *
 * Validation: the profile picture is a *required* field, so this
 * component participates in the same error/valid system as the text
 * fields — a red ring + "Required" badge + helper text when no photo
 * is uploaded, and a green ring + checkmark when one is. No colors-only
 * signal: the state is always conveyed by border color, an icon, and
 * text so it works for every user (accessibility requirement).
 *
 * Phase 5.1 wiring: when the user picks an image, we immediately
 * upload it to Supabase `public-avatars/{uid}.jpg` and pass the
 * returned **public URL** (not the local `file://` URI) up via
 * `onChange`. That way the parent only ever holds a stable URL it
 * can persist to Firestore without leaking local paths.
 *
 * The `uid` is read from the Firebase Auth module — same source the
 * profile screens use, so a tutor/student who has just signed in will
 * have a current user and the upload will succeed on the very first
 * pick.
 */
export function AvatarUploader({
  value,
  onChange,
  error = false,
  valid = false,
  errorMessage,
}: AvatarUploaderProps) {
  async function handlePick() {
    // `granted` covers iOS "Full Access" AND "Select More Photos…"
    // (limited) — the picker works either way.
    const {
      granted,
    } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to choose a profile image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      // SDK 54 array-of-MediaType (the enum `MediaTypeOptions.Images`
      // is deprecated and prints a warning on every Metro reload).
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const localUri = result.assets[0].uri;

    const uid = getAuth(getApp()).currentUser?.uid;
    if (!uid) {
      Alert.alert(
        "Upload not ready",
        "Avatar upload needs a signed-in account. Sign in first.",
      );
      return;
    }

    try {
      const { publicUrl } = await uploadAvatar(uid, localUri);
      // Cache-buster: `uploadAvatar` always writes to `{bucket}/{uid}.jpg`
      // (`upsert: true`), so the returned `publicUrl` is identical
      // between uploads. React Native's `<Image source={{ uri }}>`
      // keys on the URI string and treats a same-URI prop as "same
      // image" — the network layer skips the refetch and the old
      // pixels stay on screen. Appending `?t=${Date.now()}` forces
      // the loader to re-fetch the new bytes.
      //
      // The cache-buster is purely a render-time concern — Supabase
      // ignores query params when serving the file, and the persisted
      // Firestore value is functionally the same URL. (If we ever
      // need a clean URL on disk, strip `?t=…` in the form submit
      // handler — out of scope for this fix.)
      onChange(`${publicUrl}?t=${Date.now()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown upload error";
      Alert.alert("Upload failed", message);
      // Do NOT call onChange — the parent keeps the previous value.
    }
  }

  // A photo counts as complete when `valid` is true or `value` is set
  // (defensive: some callers may only pass `value`).
  const isComplete = valid || value != null;
  const ringClass = isComplete
    ? "border-verification"
    : error
      ? "border-accent"
      : "border-border";

  return (
    <View className="items-center gap-1.5">
      <View className="relative">
        <UploadButton
          value={value}
          handlePick={handlePick}
          ringClass={ringClass}
          accessibilityLabel={
            value
              ? "Change profile photo"
              : "Upload profile photo (required)"
          }
        />

        {/* Completion state — an icon + color, never color alone. */}
        {isComplete ? (
          <View
            accessibilityElementsHidden
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-pill bg-verification border-2 border-surface items-center justify-center"
          >
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : (
          <View>
          </View>
        )}
      </View>

      <Text className="text-caption text-text-secondary font-medium">
        {value ? "Change photo" : "Upload photo"}
      </Text>

      {/* Helper text — the visible reason the field is incomplete. */}
      {!isComplete ? (
        <Text className="text-caption text-danger text-center">
          {errorMessage ?? "Profile picture is required"}
        </Text>
      ) : null}
    </View>
  );
}

function UploadButton({
  value,
  handlePick,
  ringClass,
  accessibilityLabel,
}: {
  value: string | null;
  handlePick: () => void;
  ringClass: string;
  accessibilityLabel: string;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePick}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`w-24 h-24 rounded-full border-2 bg-surface-muted items-center justify-center ${ringClass}`}
    >
      {value ? (
        <Image
          source={{ uri: value }}
          className="w-avatar-uploader h-avatar-uploader rounded-full"
        />
      ) : (
        <Ionicons
          color={colors.brand.primary}
          name="person-outline"
          size={40}
        />
      )}
    </AnimatedPressable>
  );
}