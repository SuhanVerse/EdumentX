import "@/global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {
  // The native splash module is not always available in dev. Safe to ignore.
});

export default function RootLayout() {
  useEffect(() => {
    // Give gesture-handler one frame to register its TurboModule before
    // the native splash hides and the JS-side keep-awake can resolve.
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        // ignore — the splash may have already auto-hidden
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="phone-entry" />
          <Stack.Screen name="otpverify" />
          <Stack.Screen name="create_password" />
          <Stack.Screen name="role-selection" />
          <Stack.Screen name="profile-student" />
          <Stack.Screen name="profile-tutor" />
          <Stack.Screen name="student-home" />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
