import { create } from 'zustand'

// Profile row from the database
// (generated types from supabase gen types typescript)
export interface Profile {
  clerk_id:             string
  phone:                string | null
  full_name:            string | null
  avatar_url:           string | null
  avatar_path:          string | null
  city:                 string | null
  active_role:          'tenant' | 'landlord' | null
  onboarding_complete:  boolean
  created_at:           string
  updated_at:           string
}

interface AuthStore {
  profile:      Profile | null
  isLoaded:     boolean
  isOnboarded:  boolean

  setProfile:  (profile: Profile | null) => void
  setIsLoaded: (loaded: boolean) => void
  clearAll:    () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile:     null,
  isLoaded:    false,
  isOnboarded: false,

  setProfile: (profile) =>
    set({
      profile,
      isOnboarded: profile?.onboarding_complete ?? false,
    }),

  setIsLoaded: (isLoaded) => set({ isLoaded }),

  clearAll: () =>
    set({ profile: null, isOnboarded: false, isLoaded: false }),
}))
