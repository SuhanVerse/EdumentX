import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";

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
 *
 * Motion: a 0.99 spring-scale press feedback (a "barely perceptible"
 * shift; list rows shouldn't feel as bouncy as buttons).
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
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.rowPressed,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={animatedStyle}
      className={
        last
          ? `flex-row items-center gap-3 px-4 py-3.5 ${disabled ? "opacity-50" : ""}`
          : `flex-row items-center gap-3 px-4 py-3.5 border-b border-border ${disabled ? "opacity-50" : ""}`
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
    </AnimatedPressable>
  );
}
