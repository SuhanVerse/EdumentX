import { Home, Search, CalendarDays, User } from 'lucide-react-native';
import type { DockItem } from '../types/dock';

/**
 * Tenant bottom dock: Home → Search → Visits → Profile.
 *
 * Keys match the expo-router route names defined in
 * `app/(tenant)/(tabs)/_layout.tsx` so that navigation and active-state
 * detection work without a separate key→route mapping.
 */
export const TENANT_DOCK_ITEMS: readonly DockItem[] = [
  { key: 'index', icon: Home },
  { key: 'search', icon: Search },
  { key: 'visits', icon: CalendarDays },
  { key: 'profile', icon: User },
];
