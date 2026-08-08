/**
 * `SwitchThumb` — the animated thumb that rides inside a custom switch
 * track. Wraps `useSwitchThumb` and renders the thumb as a
 * `Animated.View` whose `translateX` springs between the off and on
 * positions.
 *
 * The track is NOT rendered here — the caller composes the surrounding
 * box (border, bg, padding) themselves. This keeps the primitive
 * decoupled from the visual style of any specific switch (tutor
 * availability, filters verified-only, etc.).
 */
import { View, type ViewProps } from "react-native";
import Animated from "react-native-reanimated";

import { useSwitchThumb } from "./hooks";

export type SwitchThumbProps = ViewProps & {
  checked: boolean;
  trackWidth: number;
  thumbSize: number;
  /** Tailwind className for the thumb (e.g. bg-surface rounded-pill). */
  thumbClassName?: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function SwitchThumb({
  checked,
  trackWidth,
  thumbSize,
  thumbClassName = "bg-surface rounded-pill",
  style,
  ...rest
}: SwitchThumbProps) {
  const animatedStyle = useSwitchThumb(checked, trackWidth, thumbSize);

  return (
    <AnimatedView
      style={[animatedStyle, style]}
      className={thumbClassName}
      {...rest}
    />
  );
}
