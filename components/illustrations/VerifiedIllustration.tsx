/**
 * VerifiedIllustration — Onboarding slide 3 of 3.
 *
 * A document/card with content lines, stat bars, and an emerald check
 * seal overlapping the bottom-right corner. Pure SVG — no images.
 *
 * NOTE: `react-native-svg` primitives do NOT resolve Tamagui token
 * strings — they take raw color values. We import the hex values from
 * `constants/theme` (the single source of truth) and pass them as
 * plain strings.
 *
 * Token map (theme.ts → hex):
 *   verificationLight  → background
 *   surface            → card + seal check
 *   borderDefault      → card stroke + content lines
 *   night              → accent content bar
 *   amber              → accent content bar
 *   brandVerification  → seal disc (emerald)
 */
import { YStack } from 'tamagui';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

import { theme } from '@/constants/theme';

const COLORS = {
  verificationLight: theme.colors.brand.verificationLight,
  surface: theme.colors.background.surface,
  borderDefault: theme.colors.border.default,
  night: theme.colors.brand.primary,
  amber: theme.colors.brand.accent,
  brandVerification: theme.colors.brand.verification,
} as const;

export function VerifiedIllustration() {
  return (
    <YStack width="100%" height="100%" alignItems="center" justifyContent="center">
      <Svg
        viewBox="0 0 220 220"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={220}
          height={220}
          rx={24}
          ry={24}
          fill={COLORS.verificationLight}
        />

        {/* Card */}
        <Rect
          x={46}
          y={44}
          width={128}
          height={132}
          rx={14}
          ry={14}
          fill={COLORS.surface}
          stroke={COLORS.borderDefault}
          strokeWidth={1}
        />

        {/* Content lines (abstract text rows) */}
        <Rect x={62} y={68} width={64} height={8} rx={4} fill={COLORS.borderDefault} />
        <Rect x={62} y={86} width={96} height={6} rx={3} fill={COLORS.borderDefault} />
        <Rect x={62} y={100} width={80} height={6} rx={3} fill={COLORS.borderDefault} />
        <Rect x={62} y={114} width={72} height={6} rx={3} fill={COLORS.borderDefault} />

        {/* Stat pair — accent bars */}
        <Rect x={62} y={140} width={40} height={10} rx={5} fill={COLORS.night} />
        <Rect x={110} y={140} width={40} height={10} rx={5} fill={COLORS.amber} />

        {/* Verified seal — outer ring */}
        <Circle cx={160} cy={158} r={24} fill={COLORS.brandVerification} />
        {/* Inner disc */}
        <Circle cx={160} cy={158} r={18} fill={COLORS.brandVerification} />
        {/* Check mark */}
        <Path
          d="M 152 158 L 158 164 L 170 152"
          stroke={COLORS.surface}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </YStack>
  );
}

export default VerifiedIllustration;
