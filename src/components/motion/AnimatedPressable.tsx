/**
 * `AnimatedPressable` — the canonical animated pressable for the
 * EdumentX motion pass. Identical to the pattern in
 * `components/ui/PrimaryButton.tsx` (L32) so any new use site that
 * wraps a `Pressable` for scale-down feedback uses the same plumbing.
 *
 * Why a separate file?
 *   - One import line at the call site, no need to repeat the
 *     `createAnimatedComponent` boilerplate.
 *   - Gives us a single seam if we ever need to swap to a gesture-aware
 *     pressable (e.g. `Animated.createAnimatedComponent(Gesture.Pressable)`)
 *     without touching every consumer.
 */
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
