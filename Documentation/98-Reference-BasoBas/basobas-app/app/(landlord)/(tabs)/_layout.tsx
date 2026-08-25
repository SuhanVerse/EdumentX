import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/expo';
import { Tabs, useFocusEffect } from 'expo-router';
import { FloatingDock } from '@/src/components/navigation/FloatingDock';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useNotificationsRealtime } from '@/src/hooks/useNotificationsRealtime';
import { getPendingVisitCount } from '@/src/services/visits.service';
import { useNotificationsStore } from '@/src/store/notificationsStore';

export default function LandlordTabsLayout() {
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;
  const [pendingCount, setPendingCount] = useState(0);

  const loadPending = useCallback(async () => {
    if (!clerkId) return;
    const result = await getPendingVisitCount(clerkId, supabase);
    if (result.success) setPendingCount(result.data);
  }, [clerkId, supabase]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useFocusEffect(
    useCallback(() => {
      loadPending();
    }, [loadPending]),
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
