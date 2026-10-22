/**
 * `FloatingEmptyIcon` — a gently floating empty-state icon. The
 * motion is a 2400ms full cycle (-6 → 0 → -6) driven by an
 * infinite repeating sequence of timings on the UI thread. Reused
 * by the StudentHome dashboard and the tutor_home "no profile"
 * empty state so they feel like one design system.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import Animated, {
  ReduceMotion,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useMotionPreference } from "./useMotionPreference";

export function FloatingEmptyIcon({
  iconName,
  iconColor,
  iconBgClass,
  size,
  sizeClass = "w-14 h-14",
  floatDistance = 6,
  cycleMs = 1200,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgClass: string;
  size: number;
  sizeClass?: string;
  floatDistance?: number;
  cycleMs?: number;
}) {
  const y = useSharedValue(0);
  const reducedMotion = useMotionPreference();
  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(y);
      y.value = 0;
      return;
    }
    y.value = withRepeat(
      withSequence(
        ReduceMotion.Never,
        withTiming(-floatDistance, {
          duration: cycleMs,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.Never,
        }),
        withTiming(0, {
          duration: cycleMs,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.Never,
        }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.Never,
    );
    return () => cancelAnimation(y);
  }, [y, floatDistance, cycleMs, reducedMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : y.value }],
  }));
  return (
    <Animated.View
      style={animatedStyle}
      className={`${sizeClass} mb-3 rounded-pill items-center justify-center ${iconBgClass}`}
    >
      <Ionicons name={iconName} size={size} color={iconColor} />
    </Animated.View>
  );
}
