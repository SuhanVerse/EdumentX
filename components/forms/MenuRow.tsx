import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

/**
 * One row in a "settings menu" group — an icon on the left, a label
 * in the middle, and a chevron on the right. Used by both the
 * student profile tab (`StudentProfile.tsx`) and the tutor profile tab
 * (`edit_profile.tsx`) so the two stay in lock-step.
 *
 * Pass `last` to drop the bottom border (the final row in a card
 * shouldn't double-stroke the card's own border).
 */
export function MenuRow({
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