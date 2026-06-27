import { Tabs } from 'expo-router';
import { FloatingDock } from '@/src/components/navigation/FloatingDock';

export default function LandlordTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingDock variant="landlord" {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="requests" options={{ title: 'Request' }} />
      <Tabs.Screen name="listings" options={{ title: 'Listing' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
