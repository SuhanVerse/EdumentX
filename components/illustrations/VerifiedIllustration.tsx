/**
 * VerifiedIllustration — Onboarding slide 3 of 3.
 *
 * NativeWind migration: SVG primitives need raw hex; Tailwind classes
 * apply to the outer wrapper.
 */
import { View } from 'react-native';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

import { colors } from '@/constants/colors';

const COLORS = {
  verificationLight: colors.onboarding.verifyBackground,
  surface: colors.background.surface,
  borderDefault: colors.border.default,
  night: colors.brand.primary,
  amber: colors.brand.accent,
  brandVerification: colors.brand.verification,
} as const;

export function VerifiedIllustration() {
  return (
    <View className="w-full h-full items-center justify-center">
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
    </View>
  );
}

export default VerifiedIllustration;
