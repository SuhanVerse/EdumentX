// app/_layout.tsx
import "react-native-gesture-handler"; // <-- MUST BE LINE 1
import "react-native-reanimated";       // <-- MUST BE LINE 2
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import tamaguiConfig from "@/constants/tamagui.config";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="phone-entry" />
            <Stack.Screen name="otpverify" />
            <Stack.Screen name="create_password" />
            <Stack.Screen name="role-selection" />
            <Stack.Screen name="profile-student" />
            <Stack.Screen name="profile-tutor" />
          </Stack>
          <StatusBar style="dark" />
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}