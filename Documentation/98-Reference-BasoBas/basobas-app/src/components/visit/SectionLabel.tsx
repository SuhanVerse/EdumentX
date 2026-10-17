import { Text, StyleSheet } from 'react-native';

import { c, font, t } from '@/src/theme/visitTokens';

interface SectionLabelProps {
  label: string;
}

/** Uppercase micro-label — sansSemi t.label, faint, wide tracking. */
export const SectionLabel = ({ label }: SectionLabelProps) => (
  <Text style={styles.label}>{label.toUpperCase()}</Text>
);

const styles = StyleSheet.create({
  label: {
    fontFamily: font.sansSemi,
    fontSize: t.label,
    color: c.faint,
    letterSpacing: 0.9,
  },
});
