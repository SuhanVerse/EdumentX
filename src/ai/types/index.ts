/**
 * EdumentX AI — Types Index
 *
 * Re-exports all AI-specific types from a single entry point.
 * Import with: import type { SearchConstraints, SessionState } from "@/ai/types";
 */

export type { SearchConstraints } from "./constraints.types";
export { CONSTRAINT_LABELS, CORE_CONSTRAINT_FIELDS } from "./constraints.types";

export type {
  Intent,
  ConversationStep,
  DomainCheck,
  TutorResult,
  SessionState,
  Message,
  ChatRequest,
  SSEEvent,
  FallbackTier,
} from "./conversation.types";

export { FALLBACK_TIERS } from "./conversation.types";

export type {
  BuiltQuery,
  HybridSearchResult,
  EmbeddingResult,
  RankingWeights,
  ScoredTutor,
  SyncRecord,
} from "./search.types";

export { DEFAULT_RANKING_WEIGHTS } from "./search.types";
