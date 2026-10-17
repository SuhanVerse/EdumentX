import 'react-native-url-polyfill/auto';
import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { clerkTokenCache } from '../src/lib/clerkTokenCache';
import { useAppReadyStore } from '../src/store/appReadyStore';

SplashScreen.preventAutoHideAsync();

const CLERK_KEY: string = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? 'MISSING';

if (CLERK_KEY === 'MISSING') {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing from .env');
}

// ─── AuthGate: hides native splash once Clerk is ready ────────────────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded } = useAuth();

  useEffect(() => {
    if (!clerkLoaded) return;
    // Tell the splash the session is ready — it hands off once fonts + Clerk
    // are both done, so the loader never outruns the app.
    useAppReadyStore.getState().setClerkReady(true);
    SplashScreen.hideAsync();
  }, [clerkLoaded]);

  return <>{children}</>;
}

// ─── Root layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  // Fonts are the first readiness signal for the splash loader. The animated
  // splash renders immediately (no intermediate loader) and simply holds its
  // wordmark/loader until the fonts land — or, on a font failure, proceeds
  // so the app can never hang on the splash.
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    useAppReadyStore.getState().setFontsReady(true);
  }, [fontsLoaded, fontError]);

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={clerkTokenCache}>
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tenant)" />
                <Stack.Screen name="(landlord)" />
              </Stack>
            </AuthGate>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
