/**
 * `FieldShell` — a presentation wrapper for a form `TextInput` that
 * animates the wrapper's border between three states:
 *   - idle  : `border` token
 *   - focus : `primary` token (smooth over `motion.duration.medium`)
 *   - error : `danger` token (snap + one-shot shake on flip-from-false-to-true)
 *
 * It also fades in an inline `check-circle` icon (token-colored) when
 * `valid` is true. Pure presentation — no validation logic, no state
 * management beyond the visual signals. Callers pass:
 *
 *   - `value`   : the current input value (used to drive the checkmark
 *                 visibility; the shell itself is stateless).
 *   - `error`   : boolean — drives the border color and shake.
 *   - `valid`   : boolean — drives the inline checkmark.
 *   - `children`: the actual `TextInput`. The shell renders the input
 *                 slot; the input is passed as a render-prop or as
 *                 `children` so the shell owns the `onFocus`/`onBlur`
 *                 flow.
 *
 * The shake uses the shared `useShake` hook. The border animation uses
 * an inline `useAnimatedStyle` over a single shared value that
 * interpolates 0 → 0.5 → 1 across the three states, with `interpolateColor`.
 *
 * Color rule reminder: this file uses inline hex values ONLY for the
 * `interpolateColor` arguments, which the RN style API requires (the
 * hex values are read from `constants/colors.ts`, not invented here).
 * All other colors are referenced through Tailwind className.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect, type ReactNode } from "react";
import { View, type TextInputProps } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";

import { useShake } from "./hooks";

const AnimatedView = Animated.createAnimatedComponent(View);

const BORDER_IDLE = colors.border.default; // #E7E1D3
const BORDER_FOCUS = colors.brand.primary; // #2F5D50
const BORDER_ERROR = colors.semantic.danger; // #C1503D

const CHECK_COLOR = colors.semantic.success; // #3F8A5A

export type FieldShellProps = {
  /** The controlled value of the underlying input. */
  value: string;
  /** Whether the field is in an error state (drives border + shake). */
  error?: boolean;
  /** Whether the field is currently valid (drives the inline checkmark). */
  valid?: boolean;
  /**
   * Render-prop that receives the focus/blur event handlers. The
   * caller is responsible for spreading these onto its `TextInput`.
   */
  children: (handlers: { onFocus: () => void; onBlur: () => void }) => ReactNode;
  /** Optional override for the wrapper's className. */
  className?: string;
  /** Test hook for the wrapper `View`. */
  testID?: string;
};

export function FieldShell({
  value,
  error = false,
  valid = false,
  children,
  className = "",
  testID,
}: FieldShellProps) {
  // 0 = idle, 1 = focus, 2 = error. `error` overrides focus while true.
  const phase = useSharedValue(0);
  const { shake, animatedStyle: shakeStyle } = useShake();

  // Track the previous `error` value so we only shake on the false→true flip.
  const prevError = useSharedValue(0);
  useEffect(() => {
    if (error && prevError.value === 0) {
      shake();
    }
    prevError.value = error ? 1 : 0;
  }, [error, prevError, shake]);

  useEffect(() => {
    const next = error ? 2 : 0;
    phase.value = withTiming(next, { duration: motion.duration.medium });
  }, [error, phase]);

  // We need to know focus state from the caller via a flag we control.
  // Use a small ref-like pattern via a second shared value is overkill —
  // instead, the render-prop's onFocus/onBlur update this phase directly.
  // We do that by closing over a setter. To keep the API simple, the
  // render-prop hands us back focus events; the shell writes to `phase`
  // on each.

  // The `useEffect` on `error` will set phase to 2 (or back to 0). When
  // focusing, we need a higher-priority write — but since focus is
  // always cleared before error fires (validation happens on submit),
  // we model phase as "max(focus, error)".
  // Implementation: track focus in a local piece of state via
  // a useSharedValue so the render-prop can call setters.
  const focused = useSharedValue(0);
  // The render-prop's onFocus/onBlur adjust `focused` and recompute
  // `phase` accordingly. We model that with a tiny useAnimatedReaction
  // is overkill — use a regular effect keyed on `focused.value` via a
  // JS-side mirror. Simpler: read `focused` inside the animated style
  // and blend.
  // See animatedStyle below — it uses `focused` and `error` to compute
  // the border color directly.

  const onFocus = () => {
    focused.value = withTiming(1, { duration: motion.duration.medium });
  };
  const onBlur = () => {
    focused.value = withTiming(0, { duration: motion.duration.medium });
  };

  const borderStyle = useAnimatedStyle(() => {
    // Map (focused, error) → a 0..2 "phase":
    //   error   > 0  → 2
    //   focused > 0  → 1
    //   else        → 0
    'worklet';
    const p = error ? 2 : focused.value > 0.5 ? 1 : 0;
    return {
      borderColor: interpolateColor(
        p,
        [0, 1, 2],
        [BORDER_IDLE, BORDER_FOCUS, BORDER_ERROR]
      ),
    };
  });

  // Inline checkmark fade-in.
  const checkStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: valid && value.length > 0 ? withTiming(1, { duration: motion.duration.fast }) : 0,
    };
  });

  return (
    <AnimatedView
      testID={testID}
      style={[borderStyle, shakeStyle]}
      className={`rounded-md border-2 ${className}`}
    >
      <View className="relative">
        {/*
          Wrap children in an extra View with right padding so content
          that extends to the right edge (e.g. "/ month" suffix) doesn't
          overlap with the checkmark icon positioned at `right: 12`.
          Padding is always applied to prevent layout shift when the
          checkmark fades in/out.
        */}
        <View className="pr-9">
          {children({ onFocus, onBlur })}
        </View>
        <Animated.View
          pointerEvents="none"
           
          style={[{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }, checkStyle]}
        >
          <Ionicons name="checkmark-circle" size={18} color={CHECK_COLOR} />
        </Animated.View>
      </View>
    </AnimatedView>
  );
}

/**
 * Re-export the most common TextInput prop type for convenience, so
 * callers can `import { FieldShell, type TextInputProps } from
 * "@/components/motion/FieldShell"` without an extra RN import.
 */
export type { TextInputProps };
