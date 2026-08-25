import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

import {
  NotificationsList,
  type NotificationTab,
} from '@/src/components/notifications/NotificationsList';

/**
 * Landlord notifications tab screen — sibling of the deep Profile →
 * Notifications screen. Same tabs; `showHeader=false` because the
 * landlord dock already renders its own header / tab context.
 */
const LANDLORD_TAB_TABS: NotificationTab[] = [
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

export default function LandlordNotificationsTab() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-1">
        <NotificationsList
          viewer="landlord"
          tabs={LANDLORD_TAB_TABS}
          showHeader={false}
          showMarkAllRead
        />
      </View>
    </SafeAreaView>
  );
}
