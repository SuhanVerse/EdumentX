/**
 * EdumentX — Tailwind/NativeWind migration note:
 *
 * With NativeWind, colors are no longer consumed as JS string constants
 * (no more `colors.brand.primary` -> `'#2F5D50'`). They live in
 * `tailwind.config.js` under `theme.extend.colors` and are referenced
 * via Tailwind classes (`bg-primary`, `text-ink`, `bg-night`, etc.).
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
    primary: '#2F5D50',
    primaryPressed: '#254B41',
    primaryLight: '#F1ECE0',
    accent: '#E5A03B',
    accentSoft: '#FBEBCF',
    verification: '#3F8A5A',
    verificationLight: '#DCF0E4',
    ai: '#4A7FA5',
    aiDark: '#2D5F80',
    splash: '#0F172A',
    splashText: '#FBF8F2',
    splashTrack: 'rgba(251, 248, 242, 0.20)',
  },
  semantic: {
    success: '#3F8A5A',
    successText: '#2D6B44',
    successBg: '#DCF0E4',
    warning: '#E5A03B',
    warningText: '#8B5E10',
    warningBg: '#FBEBCF',
    danger: '#C1503D',
    dangerText: '#8B3628',
    dangerBg: '#F9E5E1',
  },
  background: {
    page: '#FBF8F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F1ECE0',
    admin: '#F6F3EC',
  },
  text: {
    primary: '#0F172A',
    secondary: '#6B7280',
    muted: '#6B7280',
    inverse: '#FFFFFF',
    link: '#2F5D50',
  },
  border: {
    default: '#E7E1D3',
    strong: '#6B7280',
    subtle: 'rgba(15, 23, 42, 0.05)',
  },
  onboarding: {
    mapBackground: '#F0EBE0',
    aiBackground: '#EBF3F9',
    verifyBackground: '#DCF0E4',
  },
} as const;
