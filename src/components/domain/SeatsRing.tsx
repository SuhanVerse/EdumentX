/**
 * EdumentX — SeatsRing
 *
 * Seats-remaining progress ring for group batches. The SVG arc is
 * proportional to seats left (empty at full); the center shows the
 * seat count ("Full" at 0). Used on the student marketplace cards
 * and the batch detail screen so the capacity signal is identical
 * everywhere.
 *
 * `colors` is the sanctioned raw-hex source for `react-native-svg`
 * primitives (see `src/constants/colors.ts`).
 */

import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "@/constants/colors";
import {
  seatsRingColorKey,
  seatsRingFrac,
  seatsRingLabel,
  type SeatsRingColorKey,
} from "./seatsRingMath";

const RING_COLORS: Record<SeatsRingColorKey, string> = {
  danger: colors.semantic.danger,
  accent: colors.brand.accent,
  verification: colors.brand.verification,
};

export function SeatsRing({
  seatsLeft,
  max,
}: {
  seatsLeft: number;
  max: number;
}) {
  const size = 32;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const frac = seatsRingFrac(seatsLeft, max);
  const color = RING_COLORS[seatsRingColorKey(seatsLeft)];

  return (
    <View
      accessible
      accessibilityLabel={`${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`}
      className="items-center justify-center"
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border.default}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Remaining-seats arc, starting at 12 o'clock */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * frac} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        className={`absolute font-semibold ${
          seatsLeft <= 1 ? "text-micro" : "text-xs"
        }`}
        style={{ color }}
      >
        {seatsRingLabel(seatsLeft)}
      </Text>
    </View>
  );
}
