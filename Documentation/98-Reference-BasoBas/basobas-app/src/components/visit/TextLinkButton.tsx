import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';

import { c, font, t } from '@/src/theme/visitTokens';

interface TextLinkButtonProps {
  label: string;
  onPress: () => void;
  /**
   * `destructive` (red), `positive` (the only allowed green accent for
   * the Finalize action), or `muted` (gray secondary). Default muted.
   */
  variant?: 'destructive' | 'positive' | 'muted';
  style?: ViewStyle;
}

/**
 * Text-link button — the destructive grammar across the visit flow.
 * Per spec: decline / cancel are text links, not filled red buttons.
 * Finalize is the single positive terminal action allowed to use green.
 */
export const TextLinkButton = ({
  label,
  onPress,
  variant = 'muted',
  style,
}: TextLinkButtonProps) => {
  const color = variant === 'destructive' ? '#A14545' : variant === 'positive' ? c.accent : c.meta;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.6}
      style={[styles.btn, style]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.sansSemi,
    fontSize: t.meta,
  },
});
