import React from 'react';
import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import type { DockItem } from '../types/dock';

const ICON_SIZE = 22;
const INACTIVE_COLOR = 'rgba(75, 75, 75, 0.78)';
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
 * Active  → 44 × 44 black circle (w-11 h-11 bg-ink rounded-full) + white icon
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
      {isActive && <View className="absolute h-11 w-11 rounded-full bg-ink" />}

      {/* Icon sits above the circle via normal stacking order */}
      <Icon
        size={ICON_SIZE}
        color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
    </Pressable>
  );
});

DockTab.displayName = 'DockTab';
