/**
 * Singleton Supabase browser client.
 *
 * Why a singleton: `createClient()` opens internal listeners and a
 * realtime socket. Re-creating it on every import would leak sockets
 * under hot reload. We lazy-init and cache.
 *
 * Why the anon key is safe to ship: this client only ever talks to the
 * Supabase Storage REST API, which enforces per-bucket RLS policies.
 * Avatars are intentionally public-read (we want them to load in any
 * app session); verification docs are owner-read (the user can only
 * read their own). There is no service-role key here.
 *
 * Why we never use the service-role key on the client: it would bypass
 * RLS and let any user read every other user's verification document.
 * Service-role ops (signed URLs for admins, etc.) must run on a server
 * we control — and since we have no Cloud Functions (Spark plan), they
 * live in admin scripts we run from a developer laptop, not in-app.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns the lazily-initialized Supabase client. Throws if either
 * `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is
 * missing — fail loudly at first use rather than silently produce
 * 401s on every upload.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or " +
        "EXPO_PUBLIC_SUPABASE_ANON_KEY in .env. See " +
        "Documentation/01-Architecture/ARCHITECTURE.md §3.",
    );
  }

  _client = createClient(url, anonKey, {
    auth: {
      // We do not use Supabase Auth (Firebase owns identity).
      // Disable persistence so the JS SDK never tries to read/write
      // a session cookie we don't actually use.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // We only use the Storage REST API. Disable realtime + global fetch
    // shims we don't need — smaller surface, faster cold start.
    realtime: { params: { eventsPerSecond: 0 } },
    global: {
      // RN provides `fetch` on the global object; use it directly
      // instead of going through the WHATWG polyfill that the SDK
      // tries to install.
      fetch: globalThis.fetch.bind(globalThis),
    },
  });

  return _client;
}

/** Convenience export for code that prefers a direct `supabase.x.y()` call. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Touch the lazy client on first access.
    const client = getSupabase();
    const value = (client as unknown as Record<string | symbol, unknown>)[
      prop
    ];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
