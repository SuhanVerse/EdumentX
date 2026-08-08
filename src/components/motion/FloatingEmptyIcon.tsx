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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

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
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-floatDistance, {
          duration: cycleMs,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: cycleMs,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [y, floatDistance, cycleMs]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return (
    <Animated.View
      style={[animatedStyle, { marginBottom: 12 }]}
      className={`${sizeClass} rounded-pill items-center justify-center ${iconBgClass}`}
    >
      <Ionicons name={iconName} size={size} color={iconColor} />
    </Animated.View>
  );
}
