/**
 * EdumentX AI — Search Types
 *
 * Types for the hybrid search pipeline (SQL filters + vector similarity).
 *
 * Mirrors `supabase/ai/types/search.types.ts` (the Edge Function copy).
 * `TutorResult` is imported from `./conversation.types` at the top — do NOT
 * switch to inline `import("./conversation.types").TutorResult` syntax here:
 * it makes `ScoredTutor extends TutorResult` fail typechecking in this file's
 * consumers (see Phase 5 rankingEngine fix).
 */

import type { TutorResult } from "./conversation.types";

// ─── SQL Query Types ─────────────────────────────────────────────────────────

/** Built SQL query with parameterized values */
export interface BuiltQuery {
  /** The SQL query string with $1, $2, ... placeholders */
  sql: string;
  /** Parameter values corresponding to $1, $2, ... */
  params: unknown[];
}

/** Result of a hybrid search query */
export interface HybridSearchResult {
  tutors: TutorResult[];
  total_count: number;
  query_time_ms: number;
}

// ─── Embedding Types ─────────────────────────────────────────────────────────

/** Result from HuggingFace embedding API */
export interface EmbeddingResult {
  embedding: number[];
  model_name: string;
  dimensions: number;
}

// ─── Ranking Types ───────────────────────────────────────────────────────────

/** Weights for the ranking algorithm */
export interface RankingWeights {
  similarity: number;   // Semantic match (0-1)
  budget: number;       // Budget proximity (0-1)
  rating: number;       // Tutor rating (0-1)
  experience: number;   // Years of experience (0-1)
  response_rate: number; // Response rate (0-1)
  /** Future: distance: number; */
}

/** Default ranking weights */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  similarity: 0.30,
  budget: 0.25,
  rating: 0.20,
  experience: 0.15,
  response_rate: 0.10,
};

/** A tutor with computed ranking scores */
export interface ScoredTutor extends TutorResult {
  scores: {
    similarity: number;
    budget: number;
    rating: number;
    experience: number;
    response_rate: number;
  };
  final_score: number;
}

// ─── Sync Types ──────────────────────────────────────────────────────────────

/** Record tracking the last sync between Firestore and Supabase */
export interface SyncRecord {
  id: string;
  last_synced_at: string;
  tutors_synced: number;
  embeddings_generated: number;
  errors: number;
}
