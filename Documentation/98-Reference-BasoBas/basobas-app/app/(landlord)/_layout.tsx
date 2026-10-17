import { Stack } from 'expo-router';
import { FollowUpPrompt } from '@/src/components/visit/FollowUpPrompt';

export default function LandlordLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auto post-visit follow-up drawer — prompts the landlord once a
          visit's window has passed and their outcome is still missing. */}
      <FollowUpPrompt role="landlord" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ai-preferences" />
      <Stack.Screen name="decline-request" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="location-picker" />
      <Stack.Screen name="listing/new/step-1" />
      <Stack.Screen name="listing/new/step-2" />
      <Stack.Screen name="listing/new/step-3" />
      <Stack.Screen name="listing/new/step-4" />
      <Stack.Screen name="all-applicants/[propertyId]" />
      <Stack.Screen name="request/[id]" />
      <Stack.Screen name="reschedule" />
      <Stack.Screen name="reschedule-sent" />
      <Stack.Screen name="share-details" />
      <Stack.Screen name="share-confirmation" />
      <Stack.Screen name="suggest-time" />
      <Stack.Screen name="suggest-time-confirmation" />
      <Stack.Screen name="tenant/[id]" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="visits" />
    </Stack>
  );
}
