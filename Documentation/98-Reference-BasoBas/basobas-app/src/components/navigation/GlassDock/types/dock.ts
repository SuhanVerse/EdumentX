import type { LucideIcon } from 'lucide-react-native';

/**
 * A single tab entry shown inside the {@link GlassDock}.
 *
 * `key` must match the corresponding expo-router route name exactly so that
 * active-state detection and `navigation.navigate` both work without a
 * separate mapping layer.
 */
export interface DockItem {
  /** Route name as defined in the Tabs.Screen — also used as accessibility label. */
  key: string;
  /** Lucide icon component (passed as the class, not an element). */
  icon: LucideIcon;
}

export interface GlassDockProps {
  /** Ordered list of tabs to render inside the dock. */
  items: readonly DockItem[];
  /** `key` of the currently active tab (should equal the current route name). */
  activeTab: string;
  /** Fired with the pressed tab's `key`. */
  onTabPress: (key: string) => void;
}
