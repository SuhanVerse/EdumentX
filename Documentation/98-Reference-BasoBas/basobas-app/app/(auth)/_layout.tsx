import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Onboarding — screen handles its own Reanimated enter animation */}
      <Stack.Screen name="onboarding" options={{ animation: 'none' }} />

      {/* Auth flow — slide for sub-screens */}
      <Stack.Screen name="phone" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="otp" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="role"
        options={{ animation: 'slide_from_right', animationDuration: 200 }}
      />
      <Stack.Screen
        name="profile-setup"
        options={{ animation: 'slide_from_right', animationDuration: 200 }}
      />
      <Stack.Screen
        name="kyc-tenant"
        options={{ animation: 'slide_from_right', animationDuration: 200 }}
      />
      <Stack.Screen
        name="kyc-landlord"
        options={{ animation: 'slide_from_right', animationDuration: 200 }}
      />
      <Stack.Screen name="confirmation" options={{ animation: 'fade', animationDuration: 400 }} />
    </Stack>
  );
}
