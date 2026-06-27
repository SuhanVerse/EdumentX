import { Tabs } from 'expo-router';
import { FloatingDock } from '@/src/components/navigation/FloatingDock';

export default function TenantTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingDock variant="tenant" {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
