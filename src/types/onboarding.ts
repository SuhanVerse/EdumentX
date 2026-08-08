/**
 * EdumentX — Onboarding shared types.
 *
 * Phase 3 extracted the slide-data shape from
 * `screens/onboarding/OnboardingScreen.tsx` so it can be reused by
 * analytics, e2e tests, and the (future) onboarding-variant A/B
 * framework without importing the screen module.
 */
import type { ReactNode } from 'react';

/** The illustration slot a slide renders. Today this is either a
 *  pure-SVG component (slide 3) or a 3D scene wrapped in
 *  `<PremiumHero3D>` (slides 1 + 2). */
export type OnboardingIllustration = () => ReactNode;

/** A single onboarding slide. */
export type OnboardingSlide = {
  /** Slide title — rendered as a `<Text>` with `text-hero`. */
  title: string;
  /** Slide subtitle — rendered as a `<Text>` with `text-body`. */
  subtitle: string;
  /** Background colour token for the illustration panel. */
  backgroundColor: string;
  /** Accent colour used by PaginationDots when this slide is active. */
  accentColor: string;
  /** The illustration component — SVG or R3F scene. */
  Illustration: OnboardingIllustration;
};