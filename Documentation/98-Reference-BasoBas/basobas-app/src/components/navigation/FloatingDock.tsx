import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { GlassDock } from './GlassDock/GlassDock';
import { TENANT_DOCK_ITEMS } from './GlassDock/constants/tenantDockItems';
import { LANDLORD_DOCK_ITEMS } from './GlassDock/constants/landlordDockItems';
import type { DockItem } from './GlassDock/types/dock';

// ─── Types ─────────────────────────────────────────────────────────────────────

type FloatingDockProps = BottomTabBarProps & {
  /** Which icon set and route map to use. */
  variant: 'tenant' | 'landlord';
  /** Pending visit request count for the requests tab badge. */
  pendingCount?: number;
  /** Unread notification count for the notifications tab badge. */
  notificationCount?: number;
};

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * FloatingDock — expo-router `tabBar` adapter for {@link GlassDock}.
 *
 * Bridges the `BottomTabBarProps` (state, navigation) that expo-router
 * provides to the clean `(items, activeTab, onTabPress)` API of GlassDock.
 *
 * Usage in a `_layout.tsx`:
 * ```tsx
 * <Tabs tabBar={(props) => <FloatingDock variant="tenant" {...props} />}>
 * ```
 *
 * Active-state accuracy:
 *   `activeTab` is derived from `state.routeNames[state.index]` which is the
 *   canonical current route name. Dock item `key` values are set to the exact
 *   same route names, so `item.key === activeTab` is always correct.
 *
 * Navigation correctness:
 *   `onTabPress` uses `navigation.emit` + `navigation.navigate` — the standard
 *   pattern recommended by React Navigation for custom tab bars. It respects
 *   `tabPress` event listeners and the `defaultPrevented` flag so deep-link
 *   interception and modal guards continue to work.
 */
export const FloatingDock = React.memo(({ state, navigation, variant, pendingCount, notificationCount }: FloatingDockProps) => {
  const items: DockItem[] =
    variant === 'landlord'
      ? LANDLORD_DOCK_ITEMS.map((item) => {
          if (item.key === 'requests') return { ...item, badge: pendingCount };
          if (item.key === 'notifications') return { ...item, badge: notificationCount };
          return item;
        })
      : ([...TENANT_DOCK_ITEMS] as DockItem[]);

  // The current route name — equals the `key` of whichever DockItem is active.
  const activeTab = state.routeNames[state.index] ?? '';

  const onTabPress = (key: string) => {
    const route = state.routes.find((r) => r.name === key);
    if (!route) return;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    // Only navigate if we're not already on this tab and nothing prevented it.
    const isAlreadyActive = state.index === state.routes.indexOf(route);
    if (!isAlreadyActive && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return <GlassDock items={items} activeTab={activeTab} onTabPress={onTabPress} />;
});

FloatingDock.displayName = 'FloatingDock';
