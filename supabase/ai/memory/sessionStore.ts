/**
 * EdumentX AI — Session Store
 *
 * Manages conversation session state in the PostgreSQL `conversations` table.
 * Each session tracks:
 *   - Current state machine step
 *   - Accumulated search constraints
 *   - Last search results (for follow-up refinement)
 *   - Fallback state
 */

import { getSupabaseClient } from "../utils/supabaseClient.ts";
import type { SessionState, ConversationStep } from "../types/conversation.types.ts";
import type { SearchConstraints } from "../types/constraints.types.ts";
import type { TutorResult } from "../types/conversation.types.ts";
import { mergeConstraints } from "../memory/constraintMerger.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  session_id: string;
  student_id: string;
  current_step: ConversationStep;
  constraints: Record<string, unknown>;
  last_results: Record<string, unknown>[];
  fallback_attempted: boolean;
  fallback_level: number;
  total_messages: number;
  search_count: number;
  created_at: string;
  updated_at: string;
  last_activity: string;
  is_expired: boolean;
}

const SESSION_TTL_MINUTES = 30;

// ─── Session CRUD ────────────────────────────────────────────────────────────

/**
 * Get or create a session for the given session_id and student_id.
 * Returns existing session if found, creates a new one if not.
 */
export async function getOrCreateSession(
  sessionId: string,
  studentId: string,
): Promise<SessionState> {
  const supabase = getSupabaseClient();

  // Try to find existing session
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing && !existing.is_expired) {
    // Check if session has expired (30 min inactivity)
    const lastActivity = new Date(existing.last_activity).getTime();
    const now = Date.now();
    if (now - lastActivity > SESSION_TTL_MINUTES * 60 * 1000) {
      // Mark as expired
      await supabase
        .from("conversations")
        .update({ is_expired: true })
        .eq("id", existing.id);

      // Create new session
      return createSession(sessionId, studentId);
    }

    // Update last_activity
    await supabase
      .from("conversations")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", existing.id);

    return rowToSession(existing);
  }

  // Create new session
  return createSession(sessionId, studentId);
}

/**
 * Create a new conversation session.
 */
async function createSession(
  sessionId: string,
  studentId: string,
): Promise<SessionState> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      session_id: sessionId,
      student_id: studentId,
      current_step: "collecting",
      constraints: {},
      last_results: [],
      fallback_attempted: false,
      fallback_level: 0,
      total_messages: 0,
      search_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[sessionStore] Create session error:", error);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return rowToSession(data);
}

/**
 * Update the current step in the state machine.
 */
export async function updateSessionStep(
  sessionId: string,
  step: ConversationStep,
): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from("conversations")
    .update({
      current_step: step,
      last_activity: new Date().toISOString(),
    })
    .eq("session_id", sessionId);
}

/**
 * Update session constraints.
 *
 * Two modes:
 *   - DEFAULT: merge `newConstraints` into the existing DB row. Used by
 *     handlers that produce a partial patch.
 *   - REPLACE: write `newConstraints` as-is. Used by the orchestrator,
 *     which has already merged the constraints authoritatively in the
 *     state machine and must not double-merge over a stale DB read.
 *
 * Also increments the `total_messages` counter on every call.
 *
 * ⚠️ IMPORTANT: Do NOT use supabase.rpc() inside .update() — RPC calls
 * return a builder object, not a value, which silently breaks the SQL query.
 * Increment counters manually instead.
 */
export async function updateSessionConstraints(
  sessionId: string,
  newConstraints: Partial<SearchConstraints>,
  options: { replace?: boolean } = {},
): Promise<SearchConstraints> {
  const supabase = getSupabaseClient();

  // Read existing row once — used for the message counter and (in
  // non-replace mode) as the merge base.
  const { data: session } = await supabase
    .from("conversations")
    .select("constraints, total_messages")
    .eq("session_id", sessionId)
    .single();

  let finalConstraints: SearchConstraints;
  if (options.replace) {
    // Authoritative — caller has already merged. Skip the second merge
    // to avoid races where the second merge reads a stale pre-write row.
    finalConstraints = { ...(newConstraints as SearchConstraints) };
  } else {
    const current = (session?.constraints ?? {}) as SearchConstraints;
    finalConstraints = mergeConstraints(current, newConstraints);
  }

  const currentTotal = (session?.total_messages as number) ?? 0;

  const { error } = await supabase
    .from("conversations")
    .update({
      constraints: finalConstraints as Record<string, unknown>,
      total_messages: currentTotal + 1,
    })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[sessionStore] Update constraints error:", error);
  }

  return finalConstraints;
}

/**
 * Store search results in the session (for follow-up refinement).
 * Also increments search_count counter.
 *
 * ⚠️ IMPORTANT: Increment search_count manually — do NOT use supabase.rpc().
 */
export async function storeSearchResults(
  sessionId: string,
  results: TutorResult[],
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get current search_count
  const { data: session } = await supabase
    .from("conversations")
    .select("search_count")
    .eq("session_id", sessionId)
    .single();

  const currentSearchCount = (session?.search_count as number) ?? 0;

  const { error } = await supabase
    .from("conversations")
    .update({
      last_results: results.map((r) => ({
        tutor_id: r.id,
        full_name: r.full_name,
        score: r.score ?? 0,
        similarity: r.similarity,
      })),
      search_count: currentSearchCount + 1,
      fallback_attempted: false,
    })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[sessionStore] Store search results error:", error);
  }
}

/**
 * Update fallback state.
 */
export async function updateFallbackState(
  sessionId: string,
  attempted: boolean,
  level: number,
): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from("conversations")
    .update({
      fallback_attempted: attempted,
      fallback_level: level,
    })
    .eq("session_id", sessionId);
}

/**
 * Delete a session (cleanup).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from("conversations")
    .delete()
    .eq("session_id", sessionId);
}

/**
 * Clean up expired sessions (called periodically).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = getSupabaseClient();

  const cutoff = new Date(
    Date.now() - SESSION_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("conversations")
    .update({ is_expired: true })
    .eq("is_expired", false)
    .lt("last_activity", cutoff)
    .select("id");

  if (error) {
    console.error("[sessionStore] Cleanup error:", error);
    return 0;
  }

  return data?.length ?? 0;
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

function rowToSession(row: ConversationRow): SessionState {
  return {
    session_id: row.session_id,
    student_id: row.student_id,
    current_step: row.current_step,
    constraints: (row.constraints ?? {}) as SearchConstraints,
    last_results: Array.isArray(row.last_results)
      ? (row.last_results.map((r) => ({
          id: String(r.tutor_id ?? ""),
          full_name: String(r.full_name ?? ""),
          similarity: Number(r.similarity ?? 0),
        })) as TutorResult[])
      : [],
    fallback_attempted: row.fallback_attempted ?? false,
    fallback_level: row.fallback_level ?? 0,
    total_messages: row.total_messages ?? 0,
    search_count: row.search_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_activity: row.last_activity,
    is_expired: row.is_expired ?? false,
  };
}
