import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { tokens } from '@/src/theme/tokens';
import type { FollowUpResponse } from '@/src/types/property.types';

const { color, font, size } = tokens;

/**
 * Single-select follow-up option row — radio-style, full width, one row per
 * option (Post-visit follow-up screen). The leading icon sits in a soft tint
 * circle; the selected row gets a brand-tinted border and a check badge.
 */
interface FollowUpOptionCardProps {
  option: FollowUpResponse;
  label: string;
  icon: ReactNode;
  iconBg: string;
  selected: boolean;
  onPress: () => void;
}

export const FollowUpOptionCard = ({
  option,
  label,
  icon,
  iconBg,
  selected,
  onPress,
}: FollowUpOptionCardProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    style={[styles.row, selected && styles.rowSelected]}>
    <View style={[styles.iconSlot, { backgroundColor: iconBg }]}>{icon}</View>
    <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <Check size={12} color={color.bg} strokeWidth={3.5} />}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowSelected: {
    borderColor: color.brand,
    backgroundColor: color.brandLight,
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink,
    lineHeight: 19,
  },
  labelSelected: {
    fontFamily: font.semibold,
    color: color.ink,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: color.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: color.brand,
    backgroundColor: color.brand,
  },
});
