/**
 * AiMatchIllustration — Onboarding slide 2 of 3 ("Ask AI for the best
 * match"). Pure SVG — no GL, no R3F (the 3D `AiOrb3D` was removed
 * after the device crash in `WebGLCapabilities.getMaxPrecision`).
 *
 * Composition (viewBox 220×220): an indigo AI orb with a soft white
 * highlight, a dashed orbit arc with an amber node, four amber
 * sparkles, and a match pill — the "AI recommends" motif. Restates
 * the old 3D orb in flat, stable primitives.
 */
import { Circle, Ellipse, Path, Rect, Svg } from "react-native-svg";

import { colors } from "@/constants/colors";

const T = {
  panel: colors.onboarding.aiBackground,
  surface: colors.background.surface,
  borderSoft: colors.border.default,
  ai: colors.brand.ai,
  aiDark: colors.brand.aiDark,
  slateSoft: colors.text.secondary,
  amber: colors.brand.accent,
} as const;

// 4-point sparkle star at (x, y), size s.
function Star({ x, y, s }: { x: number; y: number; s: number }) {
  const d = `M ${x} ${y - s} L ${x + s * 0.32} ${y - s * 0.32} L ${x + s} ${y} L ${x + s * 0.32} ${y + s * 0.32} L ${x} ${y + s} L ${x - s * 0.32} ${y + s * 0.32} L ${x - s} ${y} L ${x - s * 0.32} ${y - s * 0.32} Z`;
  return <Path d={d} fill={T.amber} />;
}

export function AiMatchIllustration() {
  return (
    <Svg
      viewBox="0 0 220 220"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Panel */}
      <Rect x={0} y={0} width={220} height={220} rx={24} fill={T.panel} />

      {/* Orbit ring — dashed arc sweeping around the orb */}
      <Circle
        cx={110}
        cy={100}
        r={58}
        fill="none"
        stroke={T.borderSoft}
        strokeWidth={1.6}
        strokeDasharray="2 7"
      />
      {/* Amber orbit node */}
      <Circle cx={168} cy={94} r={4.5} fill={T.amber} />

      {/* Orb body */}
      <Circle cx={108} cy={102} r={36} fill={T.aiDark} />
      <Ellipse cx={98} cy={90} rx={20} ry={16} fill={T.ai} opacity={0.9} />
      {/* Specular highlight */}
      <Ellipse cx={93} cy={84} rx={9} ry={7} fill={T.surface} opacity={0.5} />

      {/* Match pill — "97% AI match" */}
      <Rect x={66} y={152} width={88} height={24} rx={12} fill={T.surface} stroke={T.borderSoft} strokeWidth={1} />
      <Circle cx={106} cy={164} r={4} fill={T.amber} />
      <Rect x={115} y={161.4} width={30} height={5} rx={2.5} fill={T.aiDark} opacity={0.85} />

      {/* Sparkles */}
      <Star x={60} y={44} s={4.2} />
      <Star x={168} y={38} s={3.2} />
      <Star x={182} y={150} s={3.6} />
      <Star x={42} y={140} s={2.8} />
    </Svg>
  );
}