/**
 * EdumentX AI — State Machine State Definitions
 *
 * Defines the 4 conversation states and their transition logic.
 * Each state has a unique handler function that processes user input
 * and determines the next state.
 *
 * State diagram:
 *   COLLECTING → (enough info?) → SEARCHING → (has results?) → PRESENTING
 *   PRESENTING → (follow-up?) → FOLLOWUP → (search again?) → SEARCHING
 *   PRESENTING → (new criteria?) → COLLECTING
 *   SEARCHING → (no results, relax) → COLLECTING (ask to widen)
 */

import type { SessionState, ConversationStep, TutorResult } from "../types/conversation.types.ts";
import type { SearchConstraints } from "../types/constraints.types.ts";

// ─── State Handler Types ────────────────────────────────────────────────────

export interface StateHandlerResult {
  /** Response message to send to the student */
  response: string;
  /** Updated session state */
  state: SessionState;
  /** Whether a search was performed (for metrics) */
  search_performed?: boolean;
  /** Tutor results if a search was done */
  results?: TutorResult[];
}

/**
 * Each state gets the current session state and user message,
 * and returns a response + updated state.
 */
export type StateHandler = (
  state: SessionState,
  message: string,
  constraints: SearchConstraints,
) => Promise<StateHandlerResult>;

// ─── State Metadata ─────────────────────────────────────────────────────────

export interface StateMetadata {
  name: string;
  label: string;
  description: string;
  can_transition_to: ConversationStep[];
  /** Whether we need the LLM for this state's processing */
  requires_llm: boolean;
}

export const STATE_METADATA: Record<ConversationStep, StateMetadata> = {
  collecting: {
    name: "collecting",
    label: "Collecting Information",
    description: "Gathering search constraints from the student. Asking clarifying questions as needed.",
    can_transition_to: ["collecting", "searching"],
    requires_llm: true,
  },
  searching: {
    name: "searching",
    label: "Searching Tutors",
    description: "Executing the hybrid search query with accumulated constraints.",
    can_transition_to: ["presenting", "collecting"],
    requires_llm: false,
  },
  presenting: {
    name: "presenting",
    label: "Showing Results",
    description: "Presenting search results to the student. Waiting for follow-up or new search.",
    can_transition_to: ["followup", "collecting", "searching"],
    requires_llm: true,
  },
  followup: {
    name: "followup",
    label: "Follow-up",
    description: "Refining search results based on student's follow-up request.",
    can_transition_to: ["searching", "presenting", "collecting"],
    requires_llm: true,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if the state transition is valid.
 */
export function isValidTransition(
  from: ConversationStep,
  to: ConversationStep,
): boolean {
  return STATE_METADATA[from].can_transition_to.includes(to);
}

/**
 * Get the next suggested question for the collecting state.
 *
 * Rules (do NOT call more than once per turn — see stateMachine.ts):
 *   • One question per call — never combine ("home or online? which area?").
 *   • Ordered by missing core field: subject → grade → budget.
 *   • Skip optionals (location, gender, experience, language, mode).
 *   • Returns null once the minimum gate is met — the caller then runs
 *     `executeSearch` instead of asking another question.
 *
 * Phase 2: budget replaces location as the third minimum constraint.
 * Location is now optional — students volunteer it or search runs
 * without it.
 *
 * Mirrored client-side at `lib/ai/minimumConstraints.ts#getNextClientQuestion`.
 */
export function getNextQuestion(constraints: SearchConstraints): string | null {
  if (!constraints.subject) {
    return "What subject are you looking for help with?";
  }

  if (!constraints.grade_level) {
    return "What grade or level are you studying?";
  }

  // Phase 2: budget is the third core constraint (replaces location).
  if (
    constraints.budget_max === undefined ||
    constraints.budget_max === null ||
    constraints.budget_max <= 0
  ) {
    return "What's your approximate monthly budget for a tutor? (in NPR)";
  }

  // Minimum met. Optional fields (location, gender, experience, language,
  // mode) are picked up if the user volunteers them — we never ask.
  return null;
}
