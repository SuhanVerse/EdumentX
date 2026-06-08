import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image } from "react-native";
import { Button, Text, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

type AvatarUploaderProps = {
  value: string | null;
  onChange: (uri: string | null) => void;
};

/**
 * 96×96 circular avatar + "Upload photo" / "Change photo" label.
 * Used by both the student and tutor profile forms. Wraps the existing
 * `expo-image-picker` flow. No new deps.
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
    <YStack alignItems="center" gap={spacing.sm} marginBottom={spacing.md}>
      <Button
        accessibilityRole="button"
        accessibilityLabel={value ? "Change profile photo" : "Upload profile photo"}
        width={96}
        height={96}
        padding={0}
        borderRadius={9999}
        borderWidth={4}
        borderColor={colors.background.surface}
        backgroundColor={colors.border.default}
        onPress={handlePick}
        pressStyle={{ backgroundColor: colors.border.default, opacity: 0.85 }}
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={{
              width: 88,
              height: 88,
              borderRadius: 9999,
            }}
          />
        ) : (
          <Ionicons
            color={colors.brand.primary}
            name="person-outline"
            size={40}
          />
        )}
      </Button>
      <Text {...typography.caption} color={colors.text.secondary} fontWeight="500">
        {value ? "Change photo" : "Upload photo"}
      </Text>
    </YStack>
  );
}
