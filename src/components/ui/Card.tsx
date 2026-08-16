/**
 * Card — the standard surface for EdumentX profile/detail sections.
 *
 * Baseline rhythm from BasoBas's `PropertyCard`/`PropertyMapPin`
 * (studied, not copied):
 *   - `bg-surface` body, 1px `border-border` (soft hairline, no hard ring),
 *   - radius `rounded-card` (14px — the standard card token; `lg` is
 *     reserved for hero blocks),
 *   - `p-5` inner padding (20px),
 *   - a soft floating shadow (offset `0,2`, opacity 0.15, radius 4,
 *     elevation 3) that lifts the card off the page instead of the old
 *     flat look.
 *
 * All colors/layout come from our tokens (`tailwind.config.js`),
 * translated per the EdumentX design protocol.
 */
import {
  AnimatedPressable,
  usePressScale,
} from "@/components/motion";
import { type ReactNode } from "react";
import { View } from "react-native";

type CardProps = {
  children: ReactNode;
  /** Inner padding. Default `lg` (p-5, 20px). */
  padding?: "none" | "sm" | "md" | "lg";
  /** Press feedback — renders as an AnimatedPressable instead of a View. */
  onPress?: () => void;
  className?: string;
};

const PADDING: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

/** Soft lift — mirrors the BasoBas elevation rhythm. */
export const CARD_SHADOW_STYLE = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 } as const,
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,
};

export function Card({
  children,
  padding = "lg",
  onPress,
  className = "",
}: CardProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: 0.985,
  });

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[animatedStyle, CARD_SHADOW_STYLE]}
        className={className ? `${className} ${baseLayout(padding)}` : baseLayout(padding)}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={CARD_SHADOW_STYLE} className={`${baseLayout(padding)} ${className}`}>
      {children}
    </View>
  );
}

function baseLayout(padding: NonNullable<CardProps["padding"]>): string {
  return `bg-surface border border-border rounded-card ${PADDING[padding]}`;
}