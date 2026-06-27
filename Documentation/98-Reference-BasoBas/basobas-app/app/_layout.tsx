import 'react-native-url-polyfill/auto'
import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useAuth } from '../src/store/authStore';
import { getDevMode } from '../src/config/devMode';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const { session, isOnboarded, isLoading, initialize, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize Supabase auth on mount
  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || isLoading) return;
    SplashScreen.hideAsync();

    const devMode = getDevMode();

    // ── Development mode ───────────────────────────────────────────────────
    if (devMode) {
      if (devMode === 'auth') {
        // No auth redirect — stay wherever the URL says.
        return;
      }

      useAuth.getState().setSession({ user: { id: 'dev-user', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' }, expires_at: 0, expires_in: 0, token_type: 'bearer', access_token: '', refresh_token: '' } as any);

      const target = devMode === 'tenant' ? '/(tenant)/(tabs)' : '/(landlord)/(tabs)';
      const currentGroup = segments[0];
      if (currentGroup !== `(${devMode})`) {
        router.replace(target as any);
      }
      return;
    }

    // ── Production Supabase auth flow ────────────────────────────────────────
    const inAuth = segments[0] === '(auth)';

    if (!session && !inAuth) {
      // Not logged in → go to auth
      router.replace('/(auth)/loading');
    } else if (session && !isOnboarded && !inAuth) {
      // Logged in but hasn't completed onboarding
      router.replace('/(auth)/profile-setup');
    } else if (session && isOnboarded) {
      // Logged in + onboarded
      const role = profile?.active_role ?? 'tenant';
      const target = role === 'landlord' ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)';
      const inRole = segments[0] === `(${role})`;
      if (!inRole) router.replace(target as any);
    }
  }, [fontsLoaded, isLoading, session, isOnboarded, profile, segments, router]);

  if (!fontsLoaded || isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
            <ActivityIndicator size="large" color="#1A6B4A" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tenant)" />
          <Stack.Screen name="(landlord)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
