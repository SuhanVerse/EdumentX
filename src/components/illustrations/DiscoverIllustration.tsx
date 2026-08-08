/**
 * DiscoverIllustration — Onboarding slide 1 of 3.
 *
 * A stylized map: warm sand background, hairline grid, two road lines,
 * three tutor pins, and a pulsing amber current-location dot in the
 * centre. Pure SVG composition — no images.
 *
 * NativeWind migration: SVG primitives (`Rect`, `Line`, `Circle`) don't
 * resolve `className`; they need raw hex values for `fill` and `stroke`.
 * Hex values come from `constants/colors` (the local fallback). Tailwind
 * classes are applied to the outer wrapper only.
 */
import { View } from 'react-native';
import { Circle, G, Line, Path, Rect, Svg } from 'react-native-svg';

import { colors } from '@/constants/colors';

const COLORS = {
  sand: colors.background.page,
  borderDefault: colors.border.default,
  night: colors.brand.primary,
  amber: colors.brand.accent,
  surface: colors.background.surface,
} as const;

export function DiscoverIllustration() {
  return (
    <View className="w-full h-full items-center justify-center">
      <Svg
        viewBox="0 0 220 220"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Map background */}
        <Rect
          x={0}
          y={0}
          width={220}
          height={220}
          rx={24}
          ry={24}
          fill={COLORS.sand}
        />

        {/* Hairline grid + roads */}
        <G>
          <Line x1={40} y1={16} x2={40} y2={204} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={80} y1={16} x2={80} y2={204} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={120} y1={16} x2={120} y2={204} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={160} y1={16} x2={160} y2={204} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={200} y1={16} x2={200} y2={204} stroke={COLORS.borderDefault} strokeWidth={1} />

          <Line x1={16} y1={50} x2={204} y2={50} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={16} y1={90} x2={204} y2={90} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={16} y1={130} x2={204} y2={130} stroke={COLORS.borderDefault} strokeWidth={1} />
          <Line x1={16} y1={170} x2={204} y2={170} stroke={COLORS.borderDefault} strokeWidth={1} />

          {/* Two thicker road lines */}
          <Line x1={16} y1={70} x2={204} y2={70} stroke={COLORS.borderDefault} strokeWidth={1.6} />
          <Line x1={16} y1={150} x2={204} y2={150} stroke={COLORS.borderDefault} strokeWidth={1.6} />
        </G>

        {/* Tutor pin — top-right */}
        <G>
          <Path
            d="M150 30 L162 30 A8 8 0 0 1 170 38 L170 56 A8 8 0 0 1 162 64 L150 64 A8 8 0 0 1 142 56 L142 38 A8 8 0 0 1 150 30 Z"
            fill={COLORS.surface}
            stroke={COLORS.night}
            strokeWidth={1.5}
          />
          <Circle cx={156} cy={47} r={4} fill={COLORS.night} />
        </G>

        {/* Tutor pin — mid-left */}
        <G>
          <Path
            d="M50 92 L62 92 A8 8 0 0 1 70 100 L70 118 A8 8 0 0 1 62 126 L50 126 A8 8 0 0 1 42 118 L42 100 A8 8 0 0 1 50 92 Z"
            fill={COLORS.surface}
            stroke={COLORS.night}
            strokeWidth={1.5}
          />
          <Circle cx={56} cy={109} r={4} fill={COLORS.night} />
        </G>

        {/* Tutor pin — bottom-right */}
        <G>
          <Path
            d="M160 142 L172 142 A8 8 0 0 1 180 150 L180 168 A8 8 0 0 1 172 176 L160 176 A8 8 0 0 1 152 168 L152 150 A8 8 0 0 1 160 142 Z"
            fill={COLORS.surface}
            stroke={COLORS.night}
            strokeWidth={1.5}
          />
          <Circle cx={166} cy={159} r={4} fill={COLORS.night} />
        </G>

        {/* Current-location pulse — outer ring */}
        <Circle cx={110} cy={120} r={24} fill={COLORS.amber} opacity={0.15} />
        {/* Inner pulse */}
        <Circle cx={110} cy={120} r={14} fill={COLORS.amber} opacity={0.3} />
        {/* Solid dot with white ring */}
        <Circle cx={110} cy={120} r={8} fill={COLORS.amber} stroke={COLORS.surface} strokeWidth={3} />
      </Svg>
    </View>
  );
}
