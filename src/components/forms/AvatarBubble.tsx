import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { colors } from "@/constants/colors";
import { initials } from "@/data/mockData";

/**
 * Student profile avatar — supports both a real image URI (when
 * the user has uploaded one via the avatar uploader) and an
 * initials-based fallback on the `bg-amber-light` disc.
 *
 * The `onPress` callback fires when the user taps the camera icon
 * overlay; the screen owns the picker flow (see StudentProfile).
 */
export function AvatarBubble({
  name,
  uri,
  size = 88,
  editable = false,
  onPress,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
}) {
  const hasImage = !!uri;
  return (
    <View className="items-center">
      <View
        className="rounded-pill border-4 border-border overflow-hidden items-center justify-center bg-surface-muted"
        style={{ width: size, height: size }}
      >
        {hasImage ? (
          <Image
            source={{ uri: uri! }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Text
            className="text-screen-title font-medium text-primary"
            style={{ fontSize: size * 0.36 }}
          >
            {initials(name) || "?"}
          </Text>
        )}
      </View>

      {editable && <CameraButton onPress={onPress} />}
    </View>
  );
}

function CameraButton({ onPress }: { onPress?: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: 0.9,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Change profile picture"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="absolute right-1/4 -bottom-1 w-9 h-9 rounded-pill bg-amber items-center justify-center border-2 border-surface"
    >
      <Ionicons name="camera" size={16} color={colors.text.inverse} />
    </AnimatedPressable>
  );
}