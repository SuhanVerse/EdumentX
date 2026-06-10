/**
 * Tailwind/NativeWind migration note:
 *
 * Typography now lives in `tailwind.config.js` (`theme.extend.fontSize`).
 * Use Tailwind classes (`text-hero`, `text-body`, `font-medium`) instead
 * of importing from this file. This file is kept only for the few SVG
 * illustration paths that need raw `fontSize` numeric values.
 */
export const typography = {} as const;
