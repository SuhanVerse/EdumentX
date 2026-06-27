import { Home, Building2, Bell, User } from 'lucide-react-native';
import type { DockItem } from '../types/dock';

/**
 * Landlord bottom dock: Home → Properties → Requests → Profile.
 *
 * Keys match the expo-router route names defined in
 * `app/(landlord)/(tabs)/_layout.tsx`:
 *   index    → Home tab
 *   listings → Properties tab  (Building2 icon)
 *   requests → Requests/Notifications tab  (Bell icon)
 *   profile  → Profile tab
 *
 * The visual order (Home, Properties, Notifications, Profile) differs from
 * the Tabs.Screen declaration order but that is intentional — the dock order
 * is driven by UX, not the router's internal route index.
 */
export const LANDLORD_DOCK_ITEMS: readonly DockItem[] = [
  { key: 'index', icon: Home },
  { key: 'listings', icon: Building2 },
  { key: 'requests', icon: Bell },
  { key: 'profile', icon: User },
];
