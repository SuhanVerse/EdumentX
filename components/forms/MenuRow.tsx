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
 *
 * Pass `disabled` to render the row in a non-interactive state
 * (e.g. while a tutor's high-risk edit is under admin review).
 * The row's `onPress` is not called when disabled, and the styling
 * drops to a muted opacity.
 */
export function MenuRow({
  icon,
  label,
  onPress,
  last,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: (() => void) | undefined;
  last?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      className={
        last
          ? `flex-row items-center gap-3 px-4 py-3.5 ${disabled ? "opacity-50" : "active:opacity-80"}`
          : `flex-row items-center gap-3 px-4 py-3.5 border-b border-border ${disabled ? "opacity-50" : "active:opacity-80"}`
      }
    >
      <Ionicons
        name={icon}
        size={20}
        color={disabled ? "#6B7268" : "#26302B"}
      />
      <Text
        className={
          disabled
            ? "flex-1 text-body-lg text-text-muted"
            : "flex-1 text-body-lg text-text-primary"
        }
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={disabled ? "#6B7268" : "#6B7268"}
      />
    </Pressable>
  );
}