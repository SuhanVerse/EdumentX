export const tokens = {
  color: {
    bg: '#FFFFFF',
    canvas: '#F4F4F0',
    ink: '#0A0A0A',
    ink2: '#6B6B6B',
    ink3: '#AAAAAA',
    placeholder: '#C0C0C0',
    brand: '#1A6B4A',
    brandLight: '#E8F5EE',
    line: '#E8E8E8',
    divider: '#F0F0F0',
    rowDivider: '#F5F5F5',
    input: '#F5F5F5',
    inputReadonly: '#F0F0F0',
    danger: '#E53E3E',
    dangerBg: '#FEE2E2',
    rating: '#F5A623',
    dockSurface: 'rgba(18, 18, 18, 0.78)',
    // KYC status palette — matches existing property-status chip pattern.
    warn: '#B45309',
    warnBg: '#FFF3E0',
    success: '#22C55E',
    successBg: '#DCFCE7',
    successDark: '#15803D',
  },
  font: {
    display: 'DMSerifDisplay_400Regular',
    sans: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
  size: { h1: 26, h2: 22, h3: 18, body: 15, bodySm: 13, caption: 12, label: 11, micro: 10 },
  radius: { sm: 8, md: 10, lg: 12, card: 14, hero: 20, pill: 999 },
  space: {
    screenH: 24,
    cardPad: 16,
    sectionGap: 20,
    inputH: 56,
    buttonH: 56,
    dockH: 64,
    dockW: 312,
    headerH: 56,
    statusBar: 44,
    safeBottom: 28,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    dock: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 32,
      elevation: 16,
    },
    sheet: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 48,
      elevation: 24,
    },
  },
} as const;

export type Tokens = typeof tokens;

// ─── Visit sub-theme ──────────────────────────────────────────────────────────
//
// Extends the shared tokens (per CLAUDE.md — extend, don't fork). Cards live
// on a warm off-white, status reads as a small subtly-tinted chip, and
// exactly one accent color (brand green) is reserved for price and the
// positive terminal action (Finalize).

export const visitTheme = {
  cardBg: '#F3F5F0',
  cardBgHover: '#EEF1EA',
  cardBorder: 'transparent',
  cardRadius: 20,
  screenBg: '#FFFFFF',
  divider: '#E2E5DE',

  textTitle: '#0A0A0A', // DM Sans SemiBold (serif reserved for page headlines)
  textPrice: '#1A6B4A', // brand green — price ONLY
  textMeta: '#6B6B6B',
  textIcon: '#8A8F85',

  statusConfirmed: { text: '#1A6B4A', bg: '#E3EEE7' },
  statusPending: { text: '#B8860B', bg: '#F5EDDD' },
  statusCancelled: { text: '#8A8A8A', bg: '#EFEFEF' },
  statusRescheduled: { text: '#3B5F8A', bg: '#E4EAF2' },
  statusRejected: { text: '#A14545', bg: '#F5E5E5' },
  // DISCUSSION inherits the confirmed family (same green), FINALIZED is a
  // neutral black-on-tint so it never competes with the accent.
  statusDiscussion: { text: '#1A6B4A', bg: '#E3EEE7' },
  statusFinalized: { text: '#0A0A0A', bg: '#E2E5DE' },

  tabActiveText: '#0A0A0A',
  tabInactiveText: '#A0A0A0',
  tabUnderline: '#0A0A0A',
  tabUnderlineHeight: 2,

  // Hairline shadows only — never glow.
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
  },
} as const;

export type VisitTheme = typeof visitTheme;
