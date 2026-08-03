import { useSession } from '@clerk/expo'
import { useMemo } from 'react'
import { createClerkSupabaseClient } from '@/src/lib/supabase'

/**
 * Returns a Supabase client that automatically injects
 * the current Clerk session token on every request.
 *
 * Sends the **raw Clerk session token** (no JWT template needed).
 * The Edge Functions verify it manually using `jose` against
 * Clerk's public JWKS endpoint, so no Supabase JWT template or
 * custom signing key configuration is required.
 *
 * The client is memoized and only recreated when the
 * Clerk session changes.
 *
 * Usage in any component or screen:
 *   const supabase = useClerkSupabase()
 *   const { data } = await supabase.from('profiles').select('*')
 */
export function useClerkSupabase() {
  const { session } = useSession()

  return useMemo(
    () =>
      createClerkSupabaseClient(
        async () => (session ? await session.getToken() : null)
      ),
    [session]
  )
}
