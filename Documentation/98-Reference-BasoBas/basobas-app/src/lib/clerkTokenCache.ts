import * as SecureStore from 'expo-secure-store'

export const clerkTokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      console.warn('[ClerkTokenCache] SecureStore save failed:', key)
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {}
  },
}
