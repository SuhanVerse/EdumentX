/**
 * EdumentX design tokens — single source of truth.
 *
 * Canvas: warm paper #FBF8F2 on light screens; deep slate #0F172A for dark heroes + AI chat.
 * Cards: white, 1px #E7E1D3 hairline border, radius 14px. NO drop shadows.
 * Brand: amber = the ONE primary CTA per screen; chalkboard green = secondary CTAs, active
 * tabs, links; verification green = verified/success; danger = destructive; AI blue = AI +
 * group-batch family.
 */

export const colors = {
  // Surfaces
  paper: "#FBF8F2", // warm paper canvas
  slate: "#0F172A", // dark hero / AI chat
  slateSoft: "#1E293B", // raised slate surface
  card: "#FFFFFF",
  sand: "#F1ECE0", // sand fills (composer, secondary buttons, inactive segments)
  sandDeep: "#F0EBE0", // tinted icon wells

  // Hairlines / borders
  hairline: "#E7E1D3",

  // Brand
  amber: "#E5A03B", // primary accent + single primary CTA per screen
  amberTint: "#FBEFD9", // amber-tinted pills / wells
  amberShield: "#E5A03B",
  green: "#2F5D50", // chalkboard green — secondary CTAs, active tabs, links
  greenTint: "#E4EDE9",
  verify: "#3F8A5A", // verification green — verified / success
  verifyTint: "#DCF0E4",
  danger: "#C1503D", // destructive
  dangerTint: "#F7E4E0",
  ai: "#4A7FA5", // AI assistant + group-batch family
  aiTint: "#E3EDF4",

  // Text
  text: "#0F172A", // primary
  muted: "#6B7280", // secondary / muted
  placeholder: "#9CA3AF",
  inverse: "#FFFFFF",

  // Status pill families
  pendingText: "#B45309",
  pendingBg: "#FBEFD9",
} as const;

export const radius = {
  card: 14,
  pill: 999,
  well: 12,
  sm: 10,
} as const;

/** 4px spacing grid. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  gutter: 24,
  cardPad: 16,
} as const;

export const type = {
  display: { fontSize: 28, fontWeight: 700 },
  hero: { fontSize: 28, fontWeight: 500 },
  screenTitle: { fontSize: 22, fontWeight: 500 },
  sectionTitle: { fontSize: 15, fontWeight: 500 },
  cardTitle: { fontSize: 14, fontWeight: 500 },
  body: { fontSize: 15, fontWeight: 400 },
  caption: { fontSize: 13, fontWeight: 500 },
  micro: { fontSize: 10, fontWeight: 500 },
} as const;

export const font = "Inter, sans-serif";

/** Standard control sizing. */
export const control = {
  buttonH: 52,
  buttonLgH: 56,
  inputH: 48,
  pressScale: 0.96,
} as const;

/** Amber underline used beneath headings. */
export const headingUnderline = {
  height: 2,
  background: colors.amber,
  borderRadius: 1,
  marginTop: 6,
} as const;
