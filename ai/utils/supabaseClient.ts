/**
 * EdumentX AI — Supabase Client
 *
 * Creates a Supabase client for server-side database access
 * (Edge Function / seed script). Uses the service_role key for
 * unrestricted database access. Authentication is handled separately
 * via Firebase JWT verification.
 *
 * RUNTIME-AGNOSTIC (C6): the service key is resolved from whichever
 * runtime is present — Deno (`Deno.env`) or Node/React Native
 * (`process.env`). Accessing `Deno` directly in a non-Deno runtime
 * throws a ReferenceError, so we probe `globalThis` instead.
 *
 * Environment variables:
 *   SUPABASE_URL — Project URL (https://[ref].supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (secret, never EXPO_PUBLIC_)
 *
 * Note: this top-level copy imports the npm package. The Deno-runnable
 * copy lives at `supabase/ai/utils/supabaseClient.ts` and keeps the
 * `jsr:` specifier (Deno resolves it natively); keep the two in sync.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NOTE: we type the cached client as `SupabaseClient` (default generics)
// rather than `ReturnType<typeof createClient>`. `createClient` is a
// generic function whose type parameters only appear in the return
// position, so `ReturnType` instantiates them with `unknown`/`never`
// (defaults don't apply during inference) — every `from()`/`rpc()` call
// then errors with "property does not exist on type 'never'". The
// explicit `SupabaseClient` type mirrors `services/supabase/client.ts`.
let client: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  const runtime = globalThis as unknown as {
    Deno?: { env?: { get: (key: string) => string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };
  return (
    runtime.Deno?.env?.get(name) ??
    runtime.process?.env?.[name]
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) throw new Error("SUPABASE_URL environment variable is not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");

  client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "public",
    },
  });

  return client;
}

/**
 * Execute a raw SQL query against the database.
 * Only available with the service_role key.
 */
export async function executeRawSQL(sql: string, params?: unknown[]): Promise<unknown> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("exec_sql", { sql, params });
  if (error) throw error;
  return data;
}
