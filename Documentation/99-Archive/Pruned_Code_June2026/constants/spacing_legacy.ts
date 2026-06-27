/**
 * Tailwind/NativeWind migration note:
 *
 * Spacing now lives in `tailwind.config.js` (`theme.extend.spacing`).
 * Use Tailwind utility classes (`p-4`, `gap-2`, `mt-3`) instead of
 * importing from this file. This file is kept only for the few SVG
 * illustration paths that need raw pixel values.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
