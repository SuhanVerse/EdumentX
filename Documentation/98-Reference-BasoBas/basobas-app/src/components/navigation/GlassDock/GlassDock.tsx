import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockTab } from './components/DockTab';
import type { GlassDockProps } from './types/dock';

/**
 * Gap between the dock's bottom edge and the safe-area bottom.
 * Exported so other screens can position content to avoid the dock.
 */
export const DOCK_BOTTOM_GAP = 8;

/**
 * GlassDock — floating iOS-style pill navigation bar.
 *
 * Layer stack (bottom → top), all sharing the same bounding box:
 *
 *   shadow   w-dock-w h-dock-h rounded-pill   carries drop-shadow, no overflow clip
 *   ├─ pill  absolute inset-0  overflow-hidden  clips everything to pill shape
 *   │  ├─ BlurView  absoluteFillObject          frosted-glass effect (no children)
 *   │  ├─ tint      absolute inset-0            rgba silver wash over blur
 *   │  ├─ rim       absolute inset-0 border     hairline glass-edge highlight
 *   │  └─ tabRow    absolute inset-0 flex-row   four equal-width tab cells
 *   │     └─ DockTab × 4  flex-1 self-stretch   each cell = dock_width/4 × dock_height
 *
 * Why content is NOT inside BlurView:
 *   On iOS, BlurView wraps a native UIVisualEffectView whose React content layer
 *   does not reliably propagate its resolved width to JS children. Children using
 *   flex-1 receive no width to divide and collapse left. Placing the tab row as a
 *   sibling (with absolute inset-0 for an explicit bounding box) avoids this entirely.
 */
export const GlassDock = ({ items, activeTab, onTabPress }: GlassDockProps) => {
  const insets = useSafeAreaInsets();

  return (
    /* Full-width absolute row; pointer events pass through the transparent region */
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ bottom: insets.bottom + DOCK_BOTTOM_GAP }}>
      {/*
        Shadow shell — w-dock-w h-dock-h (312 × 64 px) + rounded-pill.
        Shadow is applied via StyleSheet because NativeWind has no RN shadow utility.
        Must NOT have overflow:hidden — that clips the shadow on iOS.
      */}
      <View className="h-dock-h w-dock-w rounded-pill" style={styles.shadow}>
        {/* Pill clip — overflow:hidden shapes every absolutely-filled child */}
        <View className="absolute inset-0 overflow-hidden rounded-pill border border-white/[0.15]">
          {/* Blur — frosted-glass effect */}
          <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFillObject} />

          {/* Background color from Figma: rgba(100, 100, 100, 0.35) */}
          <View
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(100, 100, 100, 0.35)' }}
            pointerEvents="none"
          />

          {/* Tab row */}
          <View className="absolute inset-0 flex-row items-center px-1">
            {items.map((item) => (
              <DockTab
                key={item.key}
                item={item}
                isActive={item.key === activeTab}
                onPress={onTabPress}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

GlassDock.displayName = 'GlassDock';

// StyleSheet used only for shadow — NativeWind has no React Native shadow utilities.
const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 14,
  },
});
