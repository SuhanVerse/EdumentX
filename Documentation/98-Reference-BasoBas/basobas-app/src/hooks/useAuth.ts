import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth as useClerkAuth } from '@clerk/expo'

import { useAuthStore } from '@/src/store/authStore'
import { useOnboardingStore } from '@/src/store/onboardingStore'
import { useUserStore } from '@/src/store/userStore'

/**
 * Wraps Clerk's auth with our app's logout flow:
 *   1. sign out of Clerk
 *   2. clear the local auth + onboarding stores
 *   3. route back to the phone-entry screen
 *
 * Exposes `signOut` for callers that need the raw Clerk action, and
 * `logout` for the full flow wrapped in a confirmation Alert.
 */
export function useAuth() {
  const router = useRouter()
  const { signOut } = useClerkAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // Even if Clerk fails, we still want the local state cleared.
    }
    useAuthStore.getState().clearAll()
    useOnboardingStore.getState().reset()
    useUserStore.getState().reset()
    router.replace('/(auth)/phone')
  }

  const logout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: handleSignOut },
    ])
  }

  return { signOut: handleSignOut, logout }
}
