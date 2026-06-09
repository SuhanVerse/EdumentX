import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type AvatarUploaderProps = {
  value: string | null;
  onChange: (uri: string | null) => void;
};

/**
 * 96×96 circular avatar + "Upload photo" / "Change photo" label.
 * Used by both the student and tutor profile forms.
 *
 * NativeWind migration: uses `Pressable` + `className` instead of
 * Tamagui `Button`. The press feedback is achieved with `active:opacity-80`.
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
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      onChange(result.assets[0].uri);
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
