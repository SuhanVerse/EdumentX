/**
 * Motion tokens — single source of truth for durations, easings, springs,
 * and scale values used by the interactive surfaces across EdumentX.
 *
 * Why a token file?
 *   - Every screen and component that adds Reanimated motion should pull
 *     from here so timings and feels stay in lock-step.
 *   - Keeps `PrimaryButton`'s spring (the project reference) and the new
 *     `usePressScale` hook aligned.
 *   - Pure constants — no React, no runtime, no JSX. Safe to import from
 *     any file (including non-component utilities).
 *
 * Color rule reminder: nothing in this file should ever reference a hex
 * value. Colors live in `tailwind.config.js` + `constants/colors.ts`.
 *
 * @example
 *   import { motion } from "@/lib/motion";
 *   pressed.value = withSpring(1, motion.spring.press);
 *   target.value = withTiming(1, { duration: motion.duration.medium });
 */

import type { WithSpringConfig } from "react-native-reanimated";

// Note: Reanimated 4 exports `Easing` (not a named `EasingFn` type).
// We accept any tuple at the type level so callers can pass a cubic-bezier
// array directly to `Easing.bezier(...)`.

/** Common duration targets (ms) for `withTiming`. */
export const motionDuration = {
  fast: 120,
  medium: 220,
  slow: 340,
} as const;

/**
 * Cubic-bezier easing tuples for `Easing.bezier(...)`.
 * Reanimated accepts a tuple `[x1, y1, x2, y2]`; we expose the standard
 * Material-style curve plus a slightly punchy "emphasized" curve.
 */
export const motionEasing = {
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
  decelerate: [0, 0, 0.2, 1] as [number, number, number, number],
  accelerate: [0.2, 0, 1, 1] as [number, number, number, number],
  emphasized: [0.2, 0, 0, 1.2] as [number, number, number, number],
} as const;

/**
 * Reusable spring configurations. These are the configs every animated
 * surface in the app should reach for, named by *intent* rather than
 * by raw numbers — `motion.spring.press` reads better at a call site
 * than `{ damping: 18, stiffness: 320, mass: 0.6 }`.
 */
export const motionSpring: Record<
  "press" | "gentle" | "indicator" | "pop",
  WithSpringConfig
> = {
  /**
   * Default for tap feedback. Mirrors `PrimaryButton`'s config exactly
   * so the new `usePressScale` hook and the existing reference button
   * feel identical.
   */
  press: { damping: 18, stiffness: 320, mass: 0.6 },

  /** Slower, calmer — slider thumbs, dialog enter, gentle reveals. */
  gentle: { damping: 22, stiffness: 220, mass: 0.8 },

  /** Mid-weight — segmented-control pill slides, tab indicators. */
  indicator: { damping: 20, stiffness: 260, mass: 0.7 },

  /** Snappy with a tiny overshoot — heart save, check-mark pop. */
  pop: { damping: 12, stiffness: 380, mass: 0.5 },
} as const;

/**
 * Target scale values for press feedback. `usePressScale` interpolates
 * between 1.0 and one of these based on a shared value that springs
 * 0 → 1 on press-in and 1 → 0 on press-out.
 *
 *   - `pressed`     : 0.96 — standard for buttons / rows.
 *   - `cardPressed` : 0.98 — bigger surfaces (tutor cards, role cards)
 *                     so the whole card visibly responds.
 *   - `chipPressed` : 0.94 — small chips, tight affordance.
 *   - `iconPressed` : 0.85 — icon-only buttons (heart, eye, dismiss).
 *   - `rowPressed`  : 0.99 — list rows; barely perceptible.
 */
export const motionScale = {
  pressed: 0.96,
  cardPressed: 0.98,
  chipPressed: 0.94,
  iconPressed: 0.85,
  rowPressed: 0.99,
} as const;

/** Convenience single-export object. */
export const motion = {
  duration: motionDuration,
  easing: motionEasing,
  spring: motionSpring,
  scale: motionScale,
} as const;

/**
 * Compile-time sanity checks: this file should only export constants
 * (numbers / tuples / spring configs). No React, no JSX, no runtime
 * side effects. If a future edit breaks this, the import graph will
 * grow and the build will surface the issue.
 */
export type MotionScale = (typeof motionScale)[keyof typeof motionScale];
export type SpringPreset = keyof typeof motionSpring;
