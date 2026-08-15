/**
 * `ActivePill` — the absolutely-positioned fill that slides behind a
 * row of tabs in a segmented control / bottom nav / top tab bar.
 * Renders an `Animated.View` whose `translateX` is driven by
 * `useActiveIndicator`.
 *
 * The pill is rendered with `position: absolute` and `top: 0`; the
 * caller is responsible for giving the parent row a known height and
 * `position: relative`. The pill's width is set by the caller via
 * `style` or `className` to match the tab width exactly.
 */
import { View, type ViewProps } from "react-native";
import Animated from "react-native-reanimated";

import { useActiveIndicator } from "./hooks";

export type ActivePillProps = ViewProps & {
  count: number;
  activeIndex: number;
  itemWidth: number;
  gap?: number;
  /** Tailwind className for the pill (e.g. bg-primary-light rounded-pill). */
  pillClassName?: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function ActivePill({
  count,
  activeIndex,
  itemWidth,
  gap = 0,
  pillClassName = "bg-primary-light rounded-pill",
  style,
  ...rest
}: ActivePillProps) {
  const animatedStyle = useActiveIndicator({
    count,
    activeIndex,
    itemWidth,
    gap,
  });

  return (
    <AnimatedView
      pointerEvents="none"
      // The pill lives in front of the tab row backgrounds but behind the
      // tab labels. Callers wrap the tabs in a `position: relative` View
      // with explicit height, and pass width / position / color via
      // `style` — merge it with the animated translateX so the pill
      // actually renders (it was silently dropped before, leaving the
      // white active label on the bare background).
      style={[animatedStyle, style]}
      className={pillClassName}
      {...rest}
    />
  );
}
