import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

import {
  NotificationsList,
  type NotificationTab,
} from '@/src/components/notifications/NotificationsList';

/**
 * Landlord notifications deep screen (linked from Profile → Notifications
 * row). The tab screen (`/(landlord)/(tabs)/notifications.tsx`) shares the
 * same tabs and just hides the ScreenHeader.
 *
 * Tabs mirror the dummy copy the screen carried before the module was
 * built (All / Visits / Listings / System) so labels don't jump:
 *   - All      → no kind filter
 *   - Visits   → landlord-receives visit-lifecycle kinds
 *   - Listings → landlord listing-scoped kinds (none emitted in v1 yet)
 *   - System   → SYSTEM
 */
const LANDLORD_TABS: NotificationTab[] = [
  { key: 'all', label: 'All', kinds: null },
  {
    key: 'visits',
    label: 'Visits',
    kinds: [
      'VISIT_REQUESTED',
      'RESCHEDULE_ACCEPTED',
      'VISIT_CANCELLED_BY_TENANT',
      'VISIT_RESCHEDULED_BY_TENANT',
      'TENANT_FOLLOW_UP_SUBMITTED',
    ],
  },
  { key: 'listings', label: 'Listings', kinds: [] },
  { key: 'system', label: 'System', kinds: ['SYSTEM'] },
];

export default function LandlordNotificationsScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-1">
        <NotificationsList
          viewer="landlord"
          tabs={LANDLORD_TABS}
          showHeader
          showMarkAllRead
        />
      </View>
    </SafeAreaView>
  );
}
