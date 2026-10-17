import { View, Text, Pressable, StyleSheet } from 'react-native';

import { c, font, sp, t } from '@/src/theme/visitTokens';

interface UnderlineTabsProps<T extends string> {
  tabs: readonly { key: T; label: string; count?: number }[];
  active: T;
  onChange: (key: T) => void;
}

/**
 * Underline tabs — horizontal row with sp.lg gaps, bottom 1px hairline.
 * Active tab is sansSemi c.title with a 2px c.ink underline; inactive is
 * sans c.faint with a transparent underline. Never filled pills.
 * Counts render inline as plain text (`Upcoming (3)`).
 */
export const UnderlineTabs = <T extends string>({
  tabs,
  active,
  onChange,
}: UnderlineTabsProps<T>) => {
  return (
    <View style={styles.row}>
      {tabs.map((tab, i) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label} tab`}
            style={[styles.tab, i > 0 && styles.tabSpacing]}>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? c.title : c.faint,
                  fontFamily: isActive ? font.sansSemi : font.sans,
                },
              ]}>
              {tab.label}
              {typeof tab.count === 'number' && (
                <Text style={{ color: isActive ? c.title : c.faint }}> ({tab.count})</Text>
              )}
            </Text>
            <View
              style={[
                styles.underline,
                isActive ? styles.underlineActive : styles.underlineInactive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: sp.lg,
    borderBottomWidth: 1,
    borderBottomColor: c.hairline,
  },
  tab: {
    paddingTop: 8,
  },
  tabSpacing: {
    marginLeft: sp.lg,
  },
  label: {
    fontSize: t.body,
    lineHeight: 20,
  },
  underline: {
    marginTop: 7,
    height: 2,
  },
  underlineActive: {
    backgroundColor: c.ink,
    borderRadius: 1,
  },
  underlineInactive: {
    backgroundColor: 'transparent',
  },
});
