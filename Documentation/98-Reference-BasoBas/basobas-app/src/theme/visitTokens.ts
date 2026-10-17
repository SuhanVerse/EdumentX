/**
 * Visit-flow design tokens — the editorial/minimal system.
 *
 * Single source of truth for the five tenant visit screens and every
 * `src/components/visit/*` shared component. Warm off-white cards on pure
 * white, hairline dividers, one green accent (price + positive terminal
 * action only), serif reserved for page titles and "moment" headlines.
 *
 * Font family names reference the faces registered in `app/_layout.tsx`
 * via `@expo-google-fonts` (DM Sans 400/600, DM Serif Display 400).
 */

export const font = {
  sans: 'DMSans_400Regular',
  sansSemi: 'DMSans_600SemiBold',
  serif: 'DMSerifDisplay_400Regular',
} as const;

export const c = {
  screenBg: '#FFFFFF',
  cardBg: '#F3F5F0',
  divider: '#E2E5DE',
  hairline: '#E8E8E8',
  hairlineSoft: '#F2F1ED',
  surfaceAlt: '#FAFAF7',
  surfaceGrey: '#F5F5F5',
  title: '#0A0A0A',
  body: '#3A3A3A',
  inkSub: '#4A4A4A',
  meta: '#6B6B6B',
  faint: '#AAAAAA',
  icon: '#8A8F85',
  accent: '#1A6B4A', // green — price + one positive action ONLY
  greenBg: '#E8F5EE',
  ink: '#0A0A0A', // primary buttons
  border: '#E5E5E5',
} as const;

export const status = {
  confirmed: { label: 'Confirmed', text: '#1A6B4A', bg: '#E8F5EE' },
  pending: { label: 'Pending', text: '#B45309', bg: '#FEF3DC' },
  cancelled: { label: 'Cancelled', text: '#8A8A8A', bg: '#EFEFEF' },
  rescheduled: { label: 'Rescheduled', text: '#3B5BA5', bg: '#EAF0FB' },
  declined: { label: 'Declined', text: '#C0392B', bg: '#FDECEC' },
} as const;

/**
 * Card elevation — soft, diffuse shadow per the landlord design spec.
 * iOS: shadowOpacity 0.05 / radius 20 / offset {0,6}; Android: elevation 3.
 */
export const shadow = {
  card: {
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;
export type StatusKey = keyof typeof status;

// Spacing scale — use everywhere for consistent rhythm.
export const sp = { xs: 4, sm: 6, md: 8, base: 12, lg: 16, xl: 20 } as const;

// Type scale (device-scale values).
export const t = {
  pageTitle: 26,
  moment: 24,
  cardTitle: 16,
  body: 15,
  meta: 13,
  label: 11,
  chip: 12,
} as const;

export const radius = { card: 20, chip: 6, control: 12, pill: 999, thumb: 12 } as const;
