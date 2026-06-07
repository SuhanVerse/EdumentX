/**
 * AiMatchIllustration — Onboarding slide 2 of 3.
 *
 * A glowing indigo AI orb with a soft highlight, two floating chat bubbles
 * holding suggestion dots, and four amber sparkles arranged around the orb.
 * Pure SVG composition — no images.
 *
 * Token map (Tamagui → theme.ts):
 *   $aiLight         → background
 *   $ai              → orb + chat bubble stroke
 *   $surface         → highlight + chat bubble fill + sparkle fill (using $amber)
 *   $amber           → sparkles
 *   $brandPrimary    → chat bubble suggestion dots
 */
import { YStack } from 'tamagui';
import { Circle, Ellipse, Path, Rect, Svg } from 'react-native-svg';

export function AiMatchIllustration() {
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
          fill="$aiLight"
        />

        {/* Central orb */}
        <Circle cx={110} cy={110} r={44} fill="$ai" />

        {/* Soft white highlight on the orb */}
        <Ellipse cx={98} cy={98} rx={12} ry={8} fill="$surface" opacity={0.35} />

        {/* Top-left chat bubble */}
        <Rect
          x={30}
          y={42}
          width={48}
          height={28}
          rx={10}
          ry={10}
          fill="$surface"
          stroke="$ai"
          strokeWidth={1.5}
        />
        <Circle cx={46} cy={56} r={2.5} fill="$ai" />
        <Circle cx={56} cy={56} r={2.5} fill="$ai" />

        {/* Bottom-right chat bubble */}
        <Rect
          x={144}
          y={158}
          width={48}
          height={28}
          rx={10}
          ry={10}
          fill="$surface"
          stroke="$ai"
          strokeWidth={1.5}
        />
        <Circle cx={160} cy={172} r={2.5} fill="$ai" />
        <Circle cx={170} cy={172} r={2.5} fill="$ai" />

        {/* Sparkles — 4-pointed star (diamond) drawn with Path */}
        {/* Top-right of orb */}
        <Path
          d="M 160 58 L 162 64 L 168 66 L 162 68 L 160 74 L 158 68 L 152 66 L 158 64 Z"
          fill="$amber"
        />
        {/* Top-left */}
        <Path
          d="M 44 70 L 46 76 L 52 78 L 46 80 L 44 86 L 42 80 L 36 78 L 42 76 Z"
          fill="$amber"
        />
        {/* Bottom-left of orb */}
        <Path
          d="M 58 170 L 60 176 L 66 178 L 60 180 L 58 186 L 56 180 L 50 178 L 56 176 Z"
          fill="$amber"
        />
        {/* Bottom-right */}
        <Path
          d="M 170 180 L 172 186 L 178 188 L 172 190 L 170 196 L 168 190 L 162 188 L 168 186 Z"
          fill="$amber"
        />
      </Svg>
    </YStack>
  );
}

export default AiMatchIllustration;
