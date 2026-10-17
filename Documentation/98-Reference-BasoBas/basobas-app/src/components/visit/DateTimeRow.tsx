import { View, Text, StyleSheet } from 'react-native';

import { c, font, t } from '@/src/theme/visitTokens';
import { SectionLabel } from './SectionLabel';

interface DateTimeRowProps {
  date: string;
  time: string;
}

/** Two equal columns — SectionLabel (DATE / TIME) above a sansSemi value. */
export const DateTimeRow = ({ date, time }: DateTimeRowProps) => (
  <View style={styles.row}>
    <View style={styles.col}>
      <SectionLabel label="Date" />
      <Text style={styles.value}>{date}</Text>
    </View>
    <View style={[styles.col, styles.colGap]}>
      <SectionLabel label="Time" />
      <Text style={styles.value}>{time}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  colGap: {
    marginLeft: 24,
  },
  value: {
    marginTop: 4,
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
  },
});
