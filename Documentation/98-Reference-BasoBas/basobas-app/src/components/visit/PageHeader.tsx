import { View, Text, StyleSheet } from 'react-native';

import { c, font, sp, t } from '@/src/theme/visitTokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Dock-level page header — serif title at t.pageTitle with an optional
 * muted subtitle. No back arrow (these are tab screens). Horizontal
 * padding sp.lg matches the Body/FlatList gutters.
 */
export const PageHeader = ({ title, subtitle }: PageHeaderProps) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: sp.lg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontFamily: font.serif,
    fontSize: t.pageTitle,
    color: c.title,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 5,
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.faint,
  },
});
