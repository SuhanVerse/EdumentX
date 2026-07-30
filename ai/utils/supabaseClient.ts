/**
 * EdumentX AI — Supabase Client
 *
 * Creates a Supabase client configured for use inside
 * Supabase Edge Functions (Deno runtime).
 *
 * Uses the service_role key for unrestricted database access.
 * Authentication is handled separately via Firebase JWT verification.
 *
 * Environment variables:
 *   SUPABASE_URL — Project URL (https://[ref].supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (secret)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient(): ReturnType<typeof createClient> {
  if (client) return client;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
