import { Stack } from 'expo-router';

export default function LandlordLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ai-preferences" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="listing/new/step-1" />
      <Stack.Screen name="listing/new/step-2" />
      <Stack.Screen name="listing/new/step-3" />
      <Stack.Screen name="listing/new/step-4" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="request/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="tenant/[id]" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="visits" />
    </Stack>
  );
}
