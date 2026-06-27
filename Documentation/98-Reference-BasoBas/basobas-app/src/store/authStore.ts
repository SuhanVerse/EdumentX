import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/src/lib/supabase'
import type { Profile } from '@/src/types/database.types'

interface AuthState {
  session:      Session | null
  user:         User    | null
  profile:      Profile | null
  isLoading:    boolean
  isOnboarded:  boolean

  // Actions
  setSession:   (session: Session | null) => void
  setProfile:   (profile: Profile | null) => void
  setLoading:   (loading: boolean) => void
  initialize:   () => Promise<void>
  signOut:      () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  session:     null,
  user:        null,
  profile:     null,
  isLoading:   true,
  isOnboarded: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) =>
    set({ profile, isOnboarded: profile?.onboarding_complete ?? false }),

  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    set({ isLoading: true })

    // Restore session from SecureStore
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      set({ session, user: session.user })

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      set({
        profile,
        isOnboarded: profile?.onboarding_complete ?? false,
      })
    }

    set({ isLoading: false })

    // Listen to auth state changes (token refresh, sign-out)
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null })

      if (event === 'SIGNED_OUT') {
        set({ profile: null, isOnboarded: false })
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        set({
          profile,
          isOnboarded: profile?.onboarding_complete ?? false,
        })
      }
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, isOnboarded: false })
  },
}))
