/**
 * Reanimated motion hooks for EdumentX.
 *
 * Each hook is a thin wrapper around a shared-value pattern so call sites
 * stay declarative (`usePressScale({ targetScale: 0.96 })`) and the
 * implementation is consistent across the app.
 *
 * These hooks are UI-thread-safe: they read/write shared values inside
 * `useAnimatedStyle` and worklet handlers, never on the JS thread during
 * render. Spring/timing configs come from `lib/motion.ts` so timings
 * stay in lock-step with the rest of the motion system.
 *
 * Conventions
 *   - Every hook returns its animated style last, so destructuring is
 *     `{ onPressIn, onPressOut, animatedStyle } = usePressScale(...)`.
 *   - Every hook accepts its inputs as plain values (no callbacks) so
 *     it can be re-exported through `useMemo` safely.
 *   - Hooks never call `Animated.View` themselves — the caller chooses
 *     the animated component (e.g. `AnimatedPressable` for pressables,
 *     `Animated.View` for the indicator pill).
 */

import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from "react-native-reanimated";

import { motion } from "@/lib/motion";

// ─── usePressScale ────────────────────────────────────────────────────────────

export type UsePressScaleOptions = {
  /**
   * The scale to spring *to* on press-in. Defaults to
   * `motion.scale.pressed` (0.96). Pass `motion.scale.cardPressed`,
   * `motion.scale.chipPressed`, `motion.scale.iconPressed`, or any
   * other 0..1 number for a different feel.
   */
  targetScale?: number;
  /** Optional override for the spring config (defaults to `motion.spring.press`). */
  spring?: WithSpringConfig;
  /**
   * Fire a light device impact on press-in (default true). Skipped on
   * web (no native module) and wrapped in try/catch so a device with
   * haptics disabled never crashes or rattles the JS thread.
   */
  haptic?: boolean;
};

/**
 * Returns `onPressIn`, `onPressOut`, and `animatedStyle` to drop onto
 * an `AnimatedPressable` (or `Animated.View`) for spring-scale press
 * feedback. The spring settles in ~100ms (`motion.spring.press` —
 * Phase 2 tactile goal) and fires a light haptic impact on press-in.
 * Mirrors the pattern in `PrimaryButton.tsx`.
 *
 * @example
 *   const { onPressIn, onPressOut, animatedStyle } = usePressScale({ targetScale: 0.94 });
 *   <AnimatedPressable onPressIn={onPressIn} onPressOut={onPressOut} style={animatedStyle} ... />
 */
export function usePressScale({
  targetScale = motion.scale.pressed,
  spring = motion.spring.press,
  haptic = true,
}: UsePressScaleOptions = {}) {
  const pressed = useSharedValue(0);

  const onPressIn = () => {
    if (haptic && Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics disabled / unavailable — never let a tap crash.
      }
    }
    pressed.value = withSpring(1, spring);
  };
  const onPressOut = () => {
    pressed.value = withSpring(0, spring);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - targetScale) }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}

// ─── useSwitchThumb ───────────────────────────────────────────────────────────

/**
 * Returns an animated style that springs a switch's thumb between the
 * "off" and "on" positions. Pair with the `SwitchThumb` primitive.
 *
 *   - `checked`     : the controlled boolean.
 *   - `trackWidth`  : total width of the track (in px).
 *   - `thumbSize`   : width/height of the thumb (in px).
 *
 * The thumb's resting `left` (in the off position) is up to the caller;
 * the animated `translateX` here is added to that. Most callers render
 * the thumb at `left: 2` and let `translateX` move it from 0 to
 * `trackWidth - thumbSize - 2`.
 */
export function useSwitchThumb(
  checked: boolean,
  trackWidth: number,
  thumbSize: number
) {
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, motion.spring.gentle);
  }, [checked, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const range = Math.max(0, trackWidth - thumbSize);
    return {
      transform: [{ translateX: progress.value * range }],
    };
  });

  return animatedStyle;
}

// ─── useActiveIndicator ───────────────────────────────────────────────────────

export type UseActiveIndicatorOptions = {
  count: number;
  activeIndex: number;
  itemWidth: number;
  gap?: number;
};

/**
 * Returns an animated `translateX` for a sliding active pill behind a
 * row of tabs / segmented controls. Pair with the `ActivePill`
 * primitive.
 *
 *   - `count`        : total number of tabs.
 *   - `activeIndex`  : the currently active tab (0-indexed).
 *   - `itemWidth`    : width of one tab (in px).
 *   - `gap`          : horizontal gap between tabs (in px; default 0).
 */
export function useActiveIndicator({
  count,
  activeIndex,
  itemWidth,
  gap = 0,
}: UseActiveIndicatorOptions) {
  const target = useSharedValue(activeIndex);
  // First-render guard: when a nav/segmented row mounts it typically
  // renders once with `itemWidth = 0` (the row hasn't been laid out
  // yet), then re-renders with the real width. Without this guard the
  // pill would spring from tab 0 to the active tab on every mount —
  // the "pill slides in from the left" jank users reported on the
  // bottom nav. The first measured position is a hard jump, and only
  // subsequent active-index changes animate.
  const firstMeasure = useRef(true);

  useEffect(() => {
    // Clamp to valid range so a stale prop doesn't spring past the end.
    const clamped = Math.max(0, Math.min(count - 1, activeIndex));
    if (firstMeasure.current) {
      firstMeasure.current = false;
      target.value = clamped;
      return;
    }
    target.value = withSpring(clamped, motion.spring.indicator);
  }, [activeIndex, count, target]);

  const animatedStyle = useAnimatedStyle(() => {
    const step = itemWidth + gap;
    return {
      transform: [{ translateX: target.value * step }],
    };
  });

  return animatedStyle;
}

// ─── useShake ─────────────────────────────────────────────────────────────────

export type UseShakeOptions = {
  /**
   * Amplitude in px (default 8). The shake runs three 60ms timings
   * (-amp → +amp → 0). Mirrors the typical "invalid input" wobble.
   */
  amplitude?: number;
  /**
   * Per-half duration in ms (default 60). Total animation length is
   * 3 * duration.
   */
  duration?: number;
  /**
   * Optional spring/timing override (defaults to `withTiming`).
   */
  config?: WithTimingConfig;
};

/**
 * Returns `{ shake, animatedStyle }`. Call `shake()` to trigger a
 * horizontal shake. The bound animated style is `{ translateX }`.
 *
 * @example
 *   const { shake, animatedStyle } = useShake();
 *   const onInvalidSubmit = () => shake();
 *   <Animated.View style={animatedStyle}>...</Animated.View>
 */
export function useShake({
  amplitude = 8,
  duration = 60,
  config,
}: UseShakeOptions = {}) {
  const offset = useSharedValue(0);

  const shake = () => {
    offset.value = withSequence(
      withTiming(-amplitude, { duration, ...(config ?? {}) }),
      withTiming(amplitude, { duration, ...(config ?? {}) }),
      withTiming(0, { duration, ...(config ?? {}) })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return { shake, animatedStyle };
}
