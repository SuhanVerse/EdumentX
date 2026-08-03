/**
 * Barrel export for the EdumentX motion toolkit.
 *
 * Consumers (screen files, components) should import from this module
 * rather than reaching into individual files:
 *
 *   import { usePressScale, AnimatedPressable, motion } from "@/components/motion";
 *   import { motion } from "@/lib/motion";
 */
export { motion } from "@/lib/motion";

export { AnimatedPressable } from "./AnimatedPressable";
export {
  usePressScale,
  useSwitchThumb,
  useActiveIndicator,
  useShake,
  type UsePressScaleOptions,
  type UseActiveIndicatorOptions,
  type UseShakeOptions,
} from "./hooks";
export { Skeleton, SkeletonRow, SkeletonText } from "./Skeleton";
export { SwitchThumb, type SwitchThumbProps } from "./SwitchThumb";
export { ActivePill, type ActivePillProps } from "./ActivePill";
export { FieldShell, type FieldShellProps, type TextInputProps } from "./FieldShell";
export { FloatingEmptyIcon } from "./FloatingEmptyIcon";
