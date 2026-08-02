/**
 * EdumentX AI — Conversation Types
 *
 * Defines the session state, message types, and conversation
 * data structures used by the AI chatbot state machine.
 */

import type { SearchConstraints } from "./constraints.types.ts";

// ─── Intents ────────────────────────────────────────────────────────────────

/** Classified intent of a user message */
export type Intent =
  | "search_tutors"       // "I need a Maths tutor"
  | "refine_search"       // "What about under 5000?" (has existing results)
  | "ask_knowledge_base"  // "What is a verified tutor?"
  | "greeting"            // "Hi", "Hello"
  | "off_topic"           // "Write a Python program"
  | "offensive"           // Abusive or harmful content
  | "feedback"            // "You're helpful" / "This is bad"
  | "compare_tutors"      // "Which one has better ratings?"
  | "view_profile"        // "Tell me more about Saraswoti"
  | "book_tutor"          // "I want to book Ramesh"
  | "change_criteria"     // "Actually, I want a different subject"
  | "clarify"             // "What do you mean?" / "Can you explain?"
  | "list_all"            // "Show me all tutors", "Browse tutors", "List all tutors"

// ─── State Machine ──────────────────────────────────────────────────────────

/** Current step in the conversation state machine */
export type ConversationStep =
  | "collecting"    // Gathering constraints
  | "searching"     // Running the search
  | "presenting"    // Showing results
  | "followup"      // Refining existing results

// ─── Domain Check ───────────────────────────────────────────────────────────

/** Result of the domain guard / intent classification */
export interface DomainCheck {
  is_within_scope: boolean;
  intent: Intent;
  confidence: "high" | "medium" | "low";
  explanation?: string;
}

// ─── Tutor Result (from search) ─────────────────────────────────────────────

/** A single tutor result returned by the hybrid search */
export interface TutorResult {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  subjects: string[];
  grades_teaching: string[];
  years_experience: number;
  monthly_rate_npr: number;
  neighborhood: string;
  city: string;
  rating: number;
  review_count: number;
  response_rate: number;
  degree: string;
  institution: string;
  photo_url: string | null;
  /** Where the tutor teaches — surfaced so the response generator can
   *  explain why a filtered-out tutor wasn't included. */
  tutoring_mode?: "home" | "online" | "both" | null;
  /** Languages the tutor teaches in. Empty array = unknown. */
  languages?: string[];
  /** Cosine similarity score (0-1, higher = more similar) */
  similarity: number;
  /** Composite ranking score */
  score?: number;
  /** Distance from student in km (Phase 2) */
  distance_km?: number;
}

// ─── Session State ──────────────────────────────────────────────────────────

/** Full session state stored in the conversations table */
export interface SessionState {
  session_id: string;
  student_id: string;

  /** State machine */
  current_step: ConversationStep;

  /** Accumulated constraints across turns */
  constraints: SearchConstraints;

  /** Last search results (for follow-up refinement) */
  last_results: TutorResult[];

  /** Fallback state */
  fallback_attempted: boolean;
  fallback_level: number;

  /** Interaction metadata */
  total_messages: number;
  search_count: number;

  /** Timestamps */
  created_at?: string;
  updated_at?: string;
  last_activity?: string;

  /** Whether the session has expired */
  is_expired: boolean;
}

// ─── Messages ───────────────────────────────────────────────────────────────

/** A single message in a conversation */
export interface Message {
  id?: string;
  conversation_id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  message_type: "text" | "tutor_card" | "error" | "suggestion";
  metadata?: Record<string, unknown>;
  response_time_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  created_at?: string;
}

// ─── API Types ──────────────────────────────────────────────────────────────

/** Request payload for the chat endpoint */
export interface ChatRequest {
  session_id: string;
  message: string;
  student_location?: {
    latitude: number;
    longitude: number;
  };
  student_profile?: {
    grade?: string;
    subjects?: string[];
  };
}

/** SSE event sent from the Edge Function */
export type SSEEvent =
  | {
      type: "message";
      content: string;
      session_id: string;
      state: {
        current_step: ConversationStep;
        constraints: SearchConstraints;
      };
    }
  | {
      type: "tutor_card";
      tutors: TutorResult[];
    }
  | {
      type: "done";
      session_id: string;
    }
  | {
      type: "error";
      code: string;
      message: string;
      suggestion?: string;
    };

// ─── Fallback ───────────────────────────────────────────────────────────────

/**
 * Fallback tier for relaxing search constraints when a search returns no
 * results.
 *
 * IMPORTANT: only BUDGET is ever relaxed by the fallback chain. Subject,
 * gender, grade and all other explicit filters are hard constraints — the
 * assistant must never silently drop them (previously tiers with
 * `broaden_subject: true` deleted the subject and the final "maximum
 * relaxation" tier returned the ENTIRE tutor directory, which is why a
 * "maths tutor, female" search could show every tutor in the DB). If
 * relaxing the budget still finds nothing, the fallback returns an empty
 * result and the response generator explains that no tutors match.
 */
export type FallbackTier = {
  budget_multiplier: number;
  radius_multiplier: number;
  broaden_subject: boolean;
  description: string;
};

export const FALLBACK_TIERS: FallbackTier[] = [
  { budget_multiplier: 1.0, radius_multiplier: 1.0, broaden_subject: false, description: "Exact match" },
  { budget_multiplier: 1.5, radius_multiplier: 1.0, broaden_subject: false, description: "Budget +50%" },
  { budget_multiplier: 2.0, radius_multiplier: 1.0, broaden_subject: false, description: "Budget +100%" },
];
