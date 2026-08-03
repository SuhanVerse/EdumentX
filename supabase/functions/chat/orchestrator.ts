/**
 * EdumentX AI — Chat Orchestrator
 *
 * The main orchestrator for the chat Edge Function.
 * Wires together: domain guard → state machine → search → response.
 *
 * This is the "main()" function that the Edge Function entry point calls.
 *
 * NOTE: All imports use relative paths with .ts extensions for Deno compat.
 */

import type { SessionState, TutorResult } from "../../ai/types/conversation.types.ts";
import { processMessage } from "../../ai/state/stateMachine.ts";
import { getOrCreateSession, updateSessionStep, updateSessionConstraints, storeSearchResults } from "../../ai/memory/sessionStore.ts";
import { saveMessage, getRecentMessages, buildHistoryString } from "../../ai/memory/messageStore.ts";
import { getSupabaseClient } from "../../ai/utils/supabaseClient.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrchestratorInput {
  session_id: string;
  student_id: string;
  message: string;
  /** Constraint keys removed by pill taps — reset in the session first. */
  removed_constraints?: string[];
}

export interface OrchestratorOutput {
  response: string;
  session_id: string;
  state: {
    current_step: string;
    constraints: Record<string, unknown>;
  };
  tutor_cards?: TutorResult[];
  usage?: {
    total_messages: number;
    search_count: number;
  };
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Process a chat message through the full AI pipeline.
 * This is the single entry point called by the Edge Function handler.
 */
export async function orchestrateChat(
  input: OrchestratorInput,
): Promise<OrchestratorOutput> {
  const { session_id, student_id, message, removed_constraints } = input;
  const supabase = getSupabaseClient();

  // Step 1: Get or create session
  const session = await getOrCreateSession(session_id, student_id);

  // Step 2: Save user message
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("session_id", session_id)
    .single();

  if (conversation?.id) {
    await saveMessage(conversation.id as string, {
      role: "user",
      content: message,
      message_type: "text",
    });
  }

  // Step 3: Get recent conversation history for context
  let historyString = "";
  if (conversation?.id) {
    const recentMessages = await getRecentMessages(conversation.id as string, 6);
    historyString = buildHistoryString(recentMessages.slice(0, -1));
  }

  // Step 4: Process through state machine (with conversation history).
  // Pass pill-tap removals so the session's stale constraints (e.g.
  // "male") are reset before merging — otherwise the removed filter
  // survives and re-applies on every search.
  const result = await processMessage(
    session,
    message,
    historyString,
    removed_constraints,
  );

  // Step 5: Save assistant response
  if (conversation?.id) {
    await saveMessage(conversation.id as string, {
      role: "assistant",
      content: result.response,
      message_type: result.results && result.results.length > 0 ? "tutor_card" : "text",
    });
  }

  // Step 6: Update session state in database.
  //
  // We pass `{ replace: true }` because the state machine has already
  // merged the constraints authoritatively (in handleCollectingState /
  // handlePresentingState). Without this flag, sessionStore would re-read
  // the (still-stale, pre-write) row and merge again — which can lose
  // fields like `gender_preference` when the second merge runs before
  // the first write commits.
  await updateSessionStep(session_id, result.state.current_step);
  await updateSessionConstraints(
    session_id,
    result.state.constraints,
    { replace: true },
  );

  if (result.results && result.results.length > 0) {
    await storeSearchResults(session_id, result.results);
  }

  return {
    response: result.response,
    session_id,
    state: {
      current_step: result.state.current_step,
      constraints: result.state.constraints as Record<string, unknown>,
    },
    tutor_cards: result.results,
    usage: {
      total_messages: result.state.total_messages,
      search_count: result.state.search_count,
    },
  };
}
