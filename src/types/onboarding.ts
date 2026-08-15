/**
 * EdumentX — Onboarding shared types.
 *
 * Phase 3 extracted the slide-data shape from
 * `screens/onboarding/OnboardingScreen.tsx` so it can be reused by
 * analytics, e2e tests, and the (future) onboarding-variant A/B
 * framework without importing the screen module.
 *
 * Every illustration is a pure-SVG component (`react-native-svg`).
 * The original R3F/three.js scenes (`PremiumHero3D`, `DiscoverScene3D`,
 * `AiOrb3D`) were removed in Task 1 of the Phase 3.5 stabilization —
 * they crashed the GL context on device
 * (`TypeError: Cannot read property 'precision' of undefined` in
 * `three/build/three.cjs` → `WebGLCapabilities.getMaxPrecision`).
 */
import type { ReactNode } from 'react';

/** The illustration slot a slide renders — always a pure SVG scene. */
export type OnboardingIllustration = () => ReactNode;

/** A single onboarding slide. */
export type OnboardingSlide = {
  /** Small uppercase overline above the title (BasoBas eyebrow pattern). */
  overline: string;
  /** Slide title — rendered as a `<Text>` with `text-display`. */
  title: string;
  /** Slide subtitle — rendered as a `<Text>` with `text-body`. */
  subtitle: string;
  /** Background colour token for the illustration panel. */
  backgroundColor: string;
  /** Accent colour used by the eyebrow + underline when active. */
  accentColor: string;
  /** The pure-SVG illustration component. */
  Illustration: OnboardingIllustration;
};