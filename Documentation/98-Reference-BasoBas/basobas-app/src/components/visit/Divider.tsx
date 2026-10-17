import { View, StyleSheet, type ViewStyle } from 'react-native';

import { c } from '@/src/theme/visitTokens';

interface DividerProps {
  style?: ViewStyle;
}

/** 1px hairline in c.divider. */
export const Divider = ({ style }: DividerProps) => <View style={[styles.divider, style]} />;

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: c.divider,
  },
});
