/**
 * EdumentX — Tailwind/NativeWind migration note:
 *
 * With NativeWind, colors are no longer consumed as JS string constants
 * (no more `colors.brand.primary` -> `'#0F172A'`). They live in
 * `tailwind.config.js` under `theme.extend.colors` and are referenced
 * via Tailwind classes (`bg-night`, `text-amber`, etc.).
 *
 * This file is kept only for two narrow consumers that need raw hex
 * strings:
 *
 *   1. `components/illustrations/*.tsx` — `react-native-svg` primitives
 *      do not resolve `className`; they need literal hex values for
 *      `fill` and `stroke` props.
 *
 *   2. Anywhere a single hex value is interpolated into a style prop
 *      that Tailwind classes can't reach (e.g. `shadowColor`).
 *
 * If you're building a new component, prefer Tailwind classes over
 * importing from this file.
 */
export const colors = {
  brand: {
    primary: '#0F172A',
    primaryLight: '#F1F5F9',
    accent: '#B45309',
    verification: '#047857',
    verificationLight: '#ECFDF5',
    ai: '#4F46E5',
    splash: '#0F172A',
    splashText: '#F1F5F9',
    splashTrack: 'rgba(241, 245, 249, 0.12)',
  },
  semantic: {
    success: '#047857',
    warning: '#B45309',
    danger: '#DC2626',
  },
  background: {
    page: '#F1F5F9',
    surface: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E2E8F0',
    strong: '#64748B',
    subtle: 'rgba(15, 23, 42, 0.04)',
  },
  onboarding: {
    mapBackground: '#F1F5F9',
    aiBackground: '#EEF2FF',
    verifyBackground: '#ECFDF5',
  },
} as const;
