import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';

import { c, font, radius, t } from '@/src/theme/visitTokens';

interface OutlineButtonProps {
  label: string;
  onPress: () => void;
  /** Layout flex weight (1 default; use 2 for the Accept variant on reschedule). */
  flex?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Outline button — 1px #E5E5E5 border, black text, 54px height, radius
 * 999. The secondary CTA grammar across the visit flow.
 */
export const OutlineButton = ({
  label,
  onPress,
  flex = 1,
  disabled,
  style,
}: OutlineButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={[styles.btn, { flex }, disabled && styles.disabled, style]}>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#C6C6C6',
    backgroundColor: c.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
  },
});
