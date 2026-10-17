import { useCallback } from 'react';
import { useUser } from '@clerk/expo';
import { Tabs, useFocusEffect } from 'expo-router';
import { FloatingDock } from '@/src/components/navigation/FloatingDock';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useLandlordPendingCount } from '@/src/hooks/useLandlordPendingCount';
import { useNotificationsRealtime } from '@/src/hooks/useNotificationsRealtime';
import { useNotificationsStore } from '@/src/store/notificationsStore';

export default function LandlordTabsLayout() {
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  // Live badge count — realtime-synced with the DB (re-queries on any
  // visit_requests change for this landlord).
  const { count: pendingCount, refresh } = useLandlordPendingCount(clerkId);

  // Fallback: re-check on focus in case an event was missed while backgrounded.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Notification inbox sync. Mounted here so the channel outlives the
  // notifications tab itself and the badge stays live across tabs.
  useNotificationsRealtime(clerkId);
  const notificationCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount(supabase);
    }, [fetchUnreadCount, supabase]),
  );

  return (
    <Tabs
      tabBar={(props) => (
        <FloatingDock
          variant="landlord"
          pendingCount={pendingCount}
          notificationCount={notificationCount}
          {...props}
        />
      )}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="requests" options={{ title: 'Request' }} />
      <Tabs.Screen name="listings" options={{ title: 'Listing' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
