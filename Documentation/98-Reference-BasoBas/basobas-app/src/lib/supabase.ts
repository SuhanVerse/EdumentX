import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/src/types/database.types'

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Creates a Supabase client authenticated with a Clerk token.
 *
 * The accessToken function is called before every request.
 * Supabase passes this token in the Authorization header.
 * The RLS policies read requesting_user_id() from this token.
 *
 * Usage:
 *   const supabase = createClerkSupabaseClient(() => session.getToken())
 *   const { data } = await supabase.from('profiles').select('*')
 */
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>
) {
  return createClient<Database>(supabaseUrl, supabaseAnon, {
    accessToken: getToken,
  })
}

/**
 * Unauthenticated client.
 * Only use for genuinely public data.
 * Never use for user-specific queries.
 */
export const supabasePublic = createClient<Database>(
  supabaseUrl,
  supabaseAnon,
)
