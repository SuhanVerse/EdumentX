import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/expo';
import { Tabs, useFocusEffect } from 'expo-router';
import { FloatingDock } from '@/src/components/navigation/FloatingDock';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getPendingVisitCount } from '@/src/services/visits.service';

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

  return (
    <Tabs
      tabBar={(props) => <FloatingDock variant="landlord" pendingCount={pendingCount} {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="requests" options={{ title: 'Request' }} />
      <Tabs.Screen name="listings" options={{ title: 'Listing' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
