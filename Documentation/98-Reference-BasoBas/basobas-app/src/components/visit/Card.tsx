import { Children, Fragment } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

import { c, radius, sp } from '@/src/theme/visitTokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * The only card surface in the visit flow — warm off-white, radius.card,
 * padding sp.base, column with sp.md vertical rhythm (margins, not `gap`,
 * so spacing renders on every RN version/architecture). No border, no
 * shadow.
 */
export const Card = ({ children, style }: CardProps) => (
  <View style={[styles.card, style]}>
    {Children.map(children, (child, i) => {
      const total = Children.count(children);
      return (
        <Fragment key={i}>
          {child}
          {i < total - 1 ? <View style={styles.gap} /> : null}
        </Fragment>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.cardBg,
    borderRadius: radius.card,
    padding: sp.base,
  },
  gap: {
    height: sp.md,
  },
});
