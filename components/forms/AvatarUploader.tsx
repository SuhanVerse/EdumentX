import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { Alert, Image, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { uploadAvatar } from "@/services/supabase/storage";

type AvatarUploaderProps = {
  value: string | null;
  onChange: (uri: string | null) => void;
};

/**
 * 96×96 circular avatar + "Upload photo" / "Change photo" label.
 * Used by both the student and tutor profile forms.
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
export function AvatarUploader({ value, onChange }: AvatarUploaderProps) {
  async function handlePick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
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
      onChange(publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown upload error";
      Alert.alert("Upload failed", message);
      // Do NOT call onChange — the parent keeps the previous value.
    }
  }

  return (
    <View className="items-center gap-2 mb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? "Change profile photo" : "Upload profile photo"}
        onPress={handlePick}
        className="w-24 h-24 rounded-full border-4 border-surface bg-border items-center justify-center active:opacity-80"
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
      </Pressable>
      <Text className="text-caption text-text-secondary font-medium">
        {value ? "Change photo" : "Upload photo"}
      </Text>
    </View>
  );
}