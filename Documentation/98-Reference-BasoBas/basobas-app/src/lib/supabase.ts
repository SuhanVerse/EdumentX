import 'react-native-url-polyfill/auto'   // MUST be first import

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { Database } from '@/src/types/database.types'

// SecureStore has a 2048 byte value limit.
// Supabase auth tokens can exceed this — split by key.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const result = await SecureStore.getItemAsync(key)
      if (result !== null) return result
      // Fallback: check AsyncStorage for non-sensitive chunks
      return AsyncStorage.getItem(key)
    } catch {
      return AsyncStorage.getItem(key)
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      // SecureStore max value = 2048 bytes
      if (value.length > 2000) {
        await AsyncStorage.setItem(key, value)
      } else {
        await SecureStore.setItemAsync(key, value)
      }
    } catch {
      await AsyncStorage.setItem(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {}
    try {
      await AsyncStorage.removeItem(key)
    } catch {}
  },
}

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    storage:           ExpoSecureStoreAdapter,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl:false,
  },
})

// ─── Typed helpers ─────────────────────────────────────────────────────────

/** Strongly-typed table accessor */
export const db = {
  profiles:         () => supabase.from('profiles'),
  userRoles:        () => supabase.from('user_roles'),
  landlordProfiles: () => supabase.from('landlord_profiles'),
  userPreferences:  () => supabase.from('user_preferences'),
  kycSubmissions:   () => supabase.from('kyc_submissions'),
}

/** Strongly-typed storage accessor */
export const storage = {
  avatars:      () => supabase.storage.from('avatars'),
  kycDocuments: () => supabase.storage.from('kyc-documents'),
}

/**
 * DEV-ONLY: Clear all Supabase auth keys from both SecureStore and AsyncStorage.
 * Use when a stale session is causing auth issues.
 */
export async function clearAllAuthStorage(): Promise<void> {
  const SUPABASE_PREFIX = 'sb-'

  // Clear from AsyncStorage
  try {
    const keys = await AsyncStorage.getAllKeys()
    const authKeys = keys.filter((k) => k.startsWith(SUPABASE_PREFIX))
    if (authKeys.length > 0) {
      console.log(`[DEV] Clearing ${authKeys.length} auth keys from AsyncStorage:`, authKeys)
      await AsyncStorage.multiRemove(authKeys)
    }
  } catch (e) {
    console.warn('[DEV] AsyncStorage clear error:', e)
  }

  // Clear from SecureStore (need to iterate — no getAllKeys)
  try {
    const keysToTry = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-verify-otp-store',
    ]
    for (const key of keysToTry) {
      await SecureStore.deleteItemAsync(key)
    }
  } catch (e) {
    console.warn('[DEV] SecureStore clear error:', e)
  }

  console.log('[DEV] All auth storage cleared')
}
