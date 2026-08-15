/**
 * DiscoverIllustration — Onboarding slide 1 of 3 ("Discover tutors on
 * the map"). Pure SVG — no GL, no R3F (the 3D `DiscoverScene3D` was
 * removed after the device crash in
 * `WebGLCapabilities.getMaxPrecision`).
 *
 * Composition (viewBox 220×220):
 *   - tinted panel (onboarding map background)
 *   - a white "map card" with soft road grid
 *   - the slate EdumentX pin with its amber ring at center (same
 *     visual language as `assets/markers/pin-tutor.png`) casting a
 *     soft drop ring; two quieter pins read as nearby tutors
 *   - a "search" pill above the card and a distance chip beside the
 *     main pin — the BasoBas map-illustration pattern (mini UI scene
 *     instead of literal geography)
 *
 * SVG primitives need raw hex — colors come from
 * `constants/colors.ts`; the outer wrapper takes Tailwind classes.
 */
import { Circle, Path, Rect, Svg } from "react-native-svg";

import { colors } from "@/constants/colors";

const T = {
  panel: colors.onboarding.mapBackground,
  surface: colors.background.surface,
  borderSoft: colors.border.default,
  slate: colors.text.primary,
  slateMuted: colors.text.secondary,
  amber: colors.brand.accent,
  brandLight: colors.brand.primaryLight,
  road: colors.border.subtle,
} as const;

// 4-point sparkle star at (x, y), size s.
function Star({ x, y, s }: { x: number; y: number; s: number }) {
  const d = `M ${x} ${y - s} L ${x + s * 0.32} ${y - s * 0.32} L ${x + s} ${y} L ${x + s * 0.32} ${y + s * 0.32} L ${x} ${y + s} L ${x - s * 0.32} ${y + s * 0.32} L ${x - s} ${y} L ${x - s * 0.32} ${y - s * 0.32} Z`;
  return <Path d={d} fill={T.amber} />;
}

export function DiscoverIllustration() {
  return (
    <Svg
      viewBox="0 0 220 220"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Panel */}
      <Rect x={0} y={0} width={220} height={220} rx={24} fill={T.panel} />

      {/* Map card */}
      <Rect x={28} y={46} width={164} height={112} rx={14} fill={T.surface} stroke={T.borderSoft} strokeWidth={1.2} />

      {/* Road grid */}
      <Path
        d="M 52 80 H 184 M 52 108 H 184 M 52 136 H 184 M 82 62 V 142 M 118 62 V 142 M 152 62 V 142"
        stroke={T.road}
        strokeWidth={2}
        opacity={0.6}
      />
      {/* Park patch */}
      <Rect x={110} y={84} width={58} height={46} rx={10} fill={T.brandLight} />

      {/* Search chip */}
      <Rect x={52} y={54} width={92} height={12} rx={6} fill={T.surface} stroke={T.borderSoft} strokeWidth={1} />
      <Circle cx={59} cy={60} r={3} fill={T.slateMuted} opacity={0.7} />
      <Rect x={66} y={63} width={52} height={3.5} rx={1.75} fill={T.slateMuted} opacity={0.5} />

      {/* Main pin (slate teardrop + amber ring/dot) */}
      <Circle cx={110} cy={104} r={9.5} fill={T.slate} />
      <Path d="M 110 113 L 114.4 123 L 105.6 123 Z" fill={T.slate} />
      <Circle cx={110} cy={104} r={12.5} fill="none" stroke={T.amber} strokeWidth={1.6} strokeDasharray="3 3" />
      <Circle cx={110} cy={104} r={4} fill={T.amber} />

      {/* Nearby pins */}
      <Circle cx={176} cy={88} r={3.4} fill={T.slateMuted} opacity={0.65} />
      <Circle cx={148} cy={132} r={3} fill={T.slateMuted} opacity={0.5} />

      {/* Distance chip under main pin */}
      <Rect x={86} y={138} width={48} height={14} rx={7} fill={T.amber} />
      <Circle cx={93} cy={145} r={2.6} fill={T.surface} />
      <Rect x={99.5} y={143.6} width={26} height={2.8} rx={1.4} fill={T.surface} />

      {/* Bottom bar — "8 tutors nearby" */}
      <Rect x={58} y={172} width={104} height={16} rx={8} fill={T.slate} />
      <Circle cx={68} cy={180} r={3.2} fill={T.amber} />
      <Rect x={75} y={178.4} width={58} height={3.2} rx={1.6} fill={T.surface} opacity={0.92} />

      {/* Ambient accent stars */}
      <Star x={182} y={60} s={3.4} />
      <Star x={46} y={28} s={2.6} />
      <Star x={46} y={184} s={3} />
    </Svg>
  );
}