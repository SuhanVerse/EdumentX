import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { c, font, sp } from '@/src/theme/visitTokens';

interface DetailHeaderProps {
  title: string;
  /** Optional node rendered on the right (e.g. MoreHorizontal). */
  right?: React.ReactNode;
}

/**
 * Detail-screen header — 44px row with a left back chevron (16px c.body
 * inside a 32px pressable), centered title (sansSemi 17), optional right
 * node. The 32px right slot balances the 32px back target so the title
 * stays optically centered.
 */
export const DetailHeader = ({ title, right }: DetailHeaderProps) => {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        style={styles.side}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}>
        <ChevronLeft size={16} color={c.body} strokeWidth={2} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.side}>{right ?? <View style={styles.side} />}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
  },
  side: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.sansSemi,
    fontSize: 17,
    color: c.title,
  },
});
