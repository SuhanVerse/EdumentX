import { View, Text, StyleSheet } from 'react-native';
import { CalendarX2 } from 'lucide-react-native';

import { c, font, t } from '@/src/theme/visitTokens';

interface EmptyStateProps {
  title: string;
  body: string;
}

/**
 * Shared empty state for the visit list screens. Centered outline
 * CalendarX2 (30px, #C6C6C6, stroke 1.5) above a cardTitle meta line and
 * a muted meta line. No icon-in-tinted-circle.
 */
export const VisitEmptyState = ({ title, body }: EmptyStateProps) => (
  <View style={styles.wrap}>
    <CalendarX2 size={30} color="#C6C6C6" strokeWidth={1.5} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 24,
  },
  title: {
    marginTop: 12,
    fontFamily: font.sansSemi,
    fontSize: t.cardTitle,
    color: c.meta,
  },
  body: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.faint,
    lineHeight: 20,
  },
});
