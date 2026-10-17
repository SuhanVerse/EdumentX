import { Children, Fragment } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, type ViewStyle } from 'react-native';

import { c, font, radius, sp } from '@/src/theme/visitTokens';

type Variant = 'primary' | 'accent' | 'outline' | 'link' | 'danger';

interface ButtonProps {
  variant?: Variant;
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** Layout flex weight — used for side-by-side action rows. */
  flex?: number;
  style?: ViewStyle;
}

/** Outline border — a touch darker than c.border (#E5E5E5) so the button
 *  reads as a button on pure-white screens. Still neutral and minimal. */
const OUTLINE_BORDER = '#C6C6C6';

const LABEL_COLORS: Record<Variant, string> = {
  primary: c.screenBg,
  accent: c.screenBg,
  outline: c.title,
  link: c.faint,
  danger: '#A14545',
};

/**
 * Button — full-width pill, height 52, centered row with sp.sm spacing.
 *   primary: ink fill, white text
 *   accent:  green fill, white text (positive terminal action only)
 *   outline: transparent, 1px visible border, c.title
 *   danger:  transparent, 1px soft-red border, red text (destructive outline)
 *   link:    transparent, no border, faint, height 44, regular weight
 *
 * Uses TouchableOpacity instead of a Pressable style-callback: with
 * `jsxImportSource: 'nativewind'`, Pressable style *functions* are never
 * invoked (nativewind#1105), so styles would silently not render. Press
 * feedback comes from the activeOpacity prop, which NativeWind leaves
 * alone.
 */
export const Button = ({
  variant = 'primary',
  children,
  onPress,
  disabled,
  flex,
  style,
}: ButtonProps) => {
  const isLink = variant === 'link';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      activeOpacity={disabled ? 0.5 : 0.85}
      style={[styles.base, styles[variant], flex != null ? { flex } : null, style]}>
      <View style={styles.row}>
        {typeof children === 'string' ? (
          <Text
            numberOfLines={1}
            style={[styles.label, { color: LABEL_COLORS[variant] }, isLink && styles.linkLabel]}>
            {children}
          </Text>
        ) : (
          Children.map(children, (child, i) => {
            const total = Children.count(children);
            return (
              <Fragment key={i}>
                {child}
                {i < total - 1 ? <View style={styles.rowSpacer} /> : null}
              </Fragment>
            );
          })
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  accent: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: OUTLINE_BORDER,
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: '#D9B4B4',
  },
  link: {
    height: 44,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSpacer: {
    width: sp.sm,
  },
  label: {
    fontFamily: font.sansSemi,
    fontSize: 15,
  },
  linkLabel: {
    fontFamily: font.sans,
    fontSize: 13,
  },
});
