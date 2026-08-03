import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import type { DockItem } from '../types/dock';

const ICON_SIZE = 24;
const INACTIVE_COLOR = '#0A0A0A';
const ACTIVE_COLOR = '#FFFFFF';

interface DockTabProps {
  item: DockItem;
  isActive: boolean;
  onPress: (key: string) => void;
}

/**
 * Single dock icon cell.
 *
 * Layout: `flex-1 self-stretch` — takes an equal share of the row width
 * and stretches to the full dock height, giving a large tap target.
 *
 * Active  → 52 × 52 black circle (w-[52px] h-[52px] bg-ink rounded-full) + white icon
 * Inactive → no background, dark-gray icon
 */
export const DockTab = React.memo(({ item, isActive, onPress }: DockTabProps) => {
  const Icon: LucideIcon = item.icon;

  return (
    <Pressable
      onPress={() => onPress(item.key)}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.key}
      hitSlop={8}
      className="flex-1 items-center justify-center self-stretch"
      style={({ pressed }) => (pressed ? { opacity: 0.5 } : undefined)}>
      {/* Black circle — shown only for the active tab */}
      {isActive && <View className="absolute h-[52px] w-[52px] rounded-pill bg-ink" />}

      {/* Icon sits above the circle via normal stacking order */}
      <Icon
        size={ICON_SIZE}
        color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        strokeWidth={isActive ? 2.2 : 1.8}
      />

      {/* Red notification badge */}
      {item.badge != null && item.badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
        </View>
      )}
    </Pressable>
  );
});

DockTab.displayName = 'DockTab';

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 6,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
  },
});
