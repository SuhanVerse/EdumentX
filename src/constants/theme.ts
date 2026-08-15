/**
 * EdumentX — theme.ts
 *
 * Mirrors every primitive design token as typed JS constants.
 *
 * Use this file when you need raw values that Tailwind classes can't reach:
 *   • `StyleSheet.create({ shadow: theme.shadow.card })`
 *   • `<Ionicons color={theme.colors.primary} />`
 *   • `<Svg fill={theme.colors.accent} />`
 *
 * For everything else (layout, padding, color backgrounds on Views / Text),
 * prefer NativeWind `className` props backed by `tailwind.config.js`.
 */

export const theme = {
  colors: {
    // ── Backgrounds ──────────────────────────────────────────────────────────
    background:    '#FBF8F2',
    surface:       '#FFFFFF',
    surfaceMuted:  '#F1ECE0',

    // ── Ink / text ───────────────────────────────────────────────────────────
    ink:           '#0F172A',
    inkMuted:      '#6B7280',

    // ── Brand ────────────────────────────────────────────────────────────────
    primary:       '#2F5D50',
    primaryPressed:'#254B41',
    primaryLight:  '#F1ECE0',

    accent:        '#E5A03B',
    accentSoft:    '#FBEBCF',

    // ── States ───────────────────────────────────────────────────────────────
    success:       '#3F8A5A',
    successText:   '#2D6B44',
    successBg:     '#DCF0E4',

    warning:       '#E5A03B',
    warningText:   '#8B5E10',
    warningBg:     '#FBEBCF',

    danger:        '#C1503D',
    dangerText:    '#8B3628',
    dangerBg:      '#F9E5E1',

    // ── AI feature ───────────────────────────────────────────────────────────
    ai:            '#4A7FA5',
    aiDark:        '#2D5F80',
    aiLight:       '#EBF3F9',
    aiBorder:      '#B8D4E8',

    // ── Border ───────────────────────────────────────────────────────────────
    border:        '#E7E1D3',
    borderStrong:  '#6B7268',
    borderSubtle:  'rgba(38, 48, 43, 0.05)',

    // ── Text ─────────────────────────────────────────────────────────────────
    textPrimary:   '#0F172A',
    textSecondary: '#6B7280',
    textInverse:   '#FFFFFF',
    textLink:      '#2F5D50',

    // ── Splash ───────────────────────────────────────────────────────────────
    splash:        '#0F172A',
    splashText:    '#FBF8F2',
    splashTrack:   'rgba(251, 248, 242, 0.20)',
  },

  shadow: {
    card: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    elevated: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  },

  radius: {
    xs:   6,
    sm:   8,
    md:   12,
    card: 14,
    lg:   18,
    xl:   24,
    pill: 9999,
  },

  spacing: {
    1:  4,
    2:  8,
    3:  12,
    4:  16,
    6:  24,
    8:  32,
    12: 48,
  },
} as const;
