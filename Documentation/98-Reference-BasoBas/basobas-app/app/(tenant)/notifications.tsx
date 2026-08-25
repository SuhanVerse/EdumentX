import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

import {
  NotificationsList,
  type NotificationTab,
} from '@/src/components/notifications/NotificationsList';

/**
 * Tenant notifications inbox.
 *
 * Tabs match the dummy copy the screen carried before the module was
 * built (All / Visits / Property / System) so navigation labels don't
 * jump between the old and new versions:
 *   - All      → no kind filter
 *   - Visits   → every tenant-receives visit-lifecycle kind
 *     (VISIT_CANCELLED_BY_TENANT is landlord-received, so it is NOT
 *     in this list — a tenant is never its recipient.)
 *   - Property → LISTING_FINALIZED + LISTING_CLOSED
 *   - System   → SYSTEM (none in v1; tab shows empty state)
 */
const TENANT_TABS: NotificationTab[] = [
  { key: 'all', label: 'All', kinds: null },
  {
    key: 'visits',
    label: 'Visits',
    kinds: ['VISIT_ACCEPTED', 'VISIT_RESCHEDULED', 'VISIT_REJECTED'],
  },
  {
    key: 'property',
    label: 'Property',
    kinds: ['LISTING_FINALIZED', 'LISTING_CLOSED'],
  },
  { key: 'system', label: 'System', kinds: ['SYSTEM'] },
];

export default function TenantNotificationsScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-1">
        <NotificationsList viewer="tenant" tabs={TENANT_TABS} showHeader showMarkAllRead />
      </View>
    </SafeAreaView>
  );
}
