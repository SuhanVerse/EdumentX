import { Home, Inbox, Bell, User } from 'lucide-react-native';
import type { DockItem } from '../types/dock';

/**
 * Landlord bottom dock: Home → Visit Requests → Notifications → Profile.
 *
 * Keys match the expo-router route names defined in
 * `app/(landlord)/(tabs)/_layout.tsx`.
 */
export const LANDLORD_DOCK_ITEMS: readonly DockItem[] = [
  { key: 'index', icon: Home },
  { key: 'requests', icon: Inbox },
  { key: 'notifications', icon: Bell },
  { key: 'profile', icon: User },
];
