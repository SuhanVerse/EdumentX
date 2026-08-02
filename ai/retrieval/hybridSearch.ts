/**
 * EdumentX AI — Hybrid Search
 *
 * Combines structured SQL filters (subjects, budget, rating, etc.)
 * with vector similarity search (semantic matching on bio/headline).
 *
 * Uses the `hybrid_search_tutors` PostgreSQL function created in
 * migration 007. This function handles the complex query internally,
 * avoiding SQL injection risks and Deno compatibility issues.
 *
 * Pipeline:
 *   1. Generate embedding from query text
 *   2. Call hybrid_search_tutors() via supabase.rpc()
 *   3. Fallback: metadata-only search if embedding fails
 *   4. Fallback chain: relax constraints on empty results
 */

import { getSupabaseClient } from "../../ai/utils/supabaseClient";
import { generateEmbedding } from "../../ai/embeddings/generateEmbedding";
import { buildSearchQueryText } from "../../ai/embeddings/buildEmbeddingText";
import type { SearchConstraints } from "../../ai/types/constraints.types";
import type { TutorResult } from "../../ai/types/conversation.types";
import type { HybridSearchResult } from "../../ai/types/search.types";
import { FALLBACK_TIERS } from "../../ai/types/conversation.types";
import { getSubjectKeywords } from "@/ai/domain/keywords";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchOptions {
  limit?: number;
  enableFallback?: boolean;
}

// ─── Main Search ─────────────────────────────────────────────────────────────

/**
 * Execute a hybrid search for tutors matching the given constraints.
 */
export async function hybridSearch(
  constraints: SearchConstraints,
  options: SearchOptions = {},
): Promise<HybridSearchResult> {
  const startTime = Date.now();
  const limit = options.limit ?? 20;
  const enableFallback = options.enableFallback ?? true;

  // Step 1: Build the query text for semantic search
  const queryText = constraints.query_text ?? buildSearchQueryText(constraints);

  // Step 2: Generate embedding for semantic search
  let embedding: number[] | null = null;
  if (queryText) {
    embedding = await generateEmbedding(queryText);
  }

  // Step 3: Execute search via PostgreSQL function
  let results: TutorResult[] = [];

  if (embedding) {
    results = await callHybridSearch(constraints, embedding, limit);
  }

  // If vector search failed or returned nothing, try metadata-only
  if (results.length === 0) {
    results = await callMetadataSearch(constraints, limit);
  }

  // Step 4: Fallback on empty results
  if (results.length === 0 && enableFallback) {
    results = await applyFallback(constraints, limit);
  }

  // Step 5: Deduplicate
  results = deduplicate(results);

  return {
    tutors: results,
    total_count: results.length,
    query_time_ms: Date.now() - startTime,
  };
}

// ─── PostgreSQL Function Calls ───────────────────────────────────────────────

/**
 * Typed wrapper for the `hybrid_search_tutors` PostgreSQL RPC (migration 010).
 *
 * THE CONTRACT — what the SQL function accepts:
 *   SELECT * FROM hybrid_search_tutors(
 *     constraints_json JSONB,        -- every constraint the chatbot knows
 *     query_embedding   vector(384), -- optional 384-dim embedding for semantic search
 *     result_limit      INTEGER      -- cap on returned rows (default 20)
 *   )
 *
 * `constraints_json` keys the RPC understands (each becomes a WHERE clause):
 *   - subject           → EXISTS (unnest(subjects) ILIKE %x%)
 *   - budget_max        → monthly_rate_npr <= N
 *   - budget_min        → monthly_rate_npr >= N
 *   - location_text     → city ILIKE %x% OR neighborhood ILIKE %x%
 *   - grade_level       → grades_teaching @> ARRAY[x]
 *   - min_rating        → rating >= N
 *   - min_experience    → years_experience >= N
 *   - gender_preference → gender = 'male'|'female'|'other'   (C3 — verified wired)
 *   - tutoring_mode     → tutoring_mode = $n OR tutoring_mode = 'both'
 *   - language          → languages && ARRAY[$n]
 *   - verified_only     → is_verified_professional = true
 *
 * Return shape: the TutorResult columns (snake_case) plus a `similarity`
 * REAL (1 - cosine distance) when an embedding is passed, else 0.
 * Mapped to `TutorResult` in `mapResults` below.
 *
 * Keep this wrapper in sync with `supabase/ai/retrieval/hybridSearch.ts`
 * (the Edge Function copy — identical logic, `.ts` import suffixes there).
 */
interface HybridSearchRpcParams {
  constraints_json: Record<string, unknown>;
  query_embedding: string | null;
  result_limit: number;
}

async function invokeHybridSearchTutors(
  params: HybridSearchRpcParams,
): Promise<TutorResult[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc(
      "hybrid_search_tutors",
      params,
    );

    if (error) {
      console.error("[hybridSearch] RPC error:", error.message);
      return [];
    }

    return mapResults(data as Record<string, unknown>[]);
  } catch (err) {
    console.error("[hybridSearch] RPC exception:", err);
    return [];
  }
}

/**
 * Call the hybrid_search_tutors PostgreSQL function with vector search.
 */
async function callHybridSearch(
  constraints: SearchConstraints,
  embedding: number[],
  limit: number,
): Promise<TutorResult[]> {
  return invokeHybridSearchTutors({
    constraints_json: buildConstraintsJson(constraints),
    query_embedding: `[${embedding.join(",")}]`,
    result_limit: limit,
  });
}

/**
 * Call the hybrid_search_tutors PostgreSQL function without vector search.
 */
async function callMetadataSearch(
  constraints: SearchConstraints,
  limit: number,
): Promise<TutorResult[]> {
  return invokeHybridSearchTutors({
    constraints_json: buildConstraintsJson(constraints),
    query_embedding: null,
    result_limit: limit,
  });
}

// ─── Fallback ────────────────────────────────────────────────────────────────

async function applyFallback(
  constraints: SearchConstraints,
  limit: number,
): Promise<TutorResult[]> {
  console.log("[hybridSearch] Applying fallback strategy (budget relaxation only)...");

  // Skip FALLBACK_TIERS[0] ("Exact match") — the exact metadata search
  // already ran and returned 0 rows before this function was called, so
  // re-running it is a guaranteed-empty RPC call. Start from the first
  // relaxation tier.
  for (const tier of FALLBACK_TIERS.slice(1)) {
    const relaxed = applyFallbackTier(constraints, tier);
    const results = await callMetadataSearch(relaxed, limit);
    if (results.length > 0) {
      console.log(`[hybridSearch] Fallback "${tier.description}" found ${results.length} tutors`);
      return results;
    }
  }

  // IMPORTANT: exhausted fallback returns EMPTY, never the whole
  // directory. The old "last resort" (verified_only search with no
  // other filters) silently dropped every constraint — that's why a
  // "maths tutor, female" search could list ALL tutors. The response
  // generator handles empty results with a transparent "no tutors
  // match" message instead.
  return [];
}

function applyFallbackTier(
  constraints: SearchConstraints,
  tier: typeof FALLBACK_TIERS[number],
): SearchConstraints {
  const relaxed: SearchConstraints = { ...constraints };

  // Only budget is ever relaxed by the fallback chain. Subject,
  // gender, grade, location and every other explicit constraint are
  // hard constraints — NEVER dropped, even if it means fewer (or
  // zero) results. If the student asked for a female maths tutor and
  // none exist, the response says so honestly rather than silently
  // returning male tutors from other subjects.
  if (tier.budget_multiplier > 1 && relaxed.budget_max) {
    relaxed.budget_max = Math.round(relaxed.budget_max * tier.budget_multiplier);
  }

  return relaxed;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the JSON constraints object for the PostgreSQL function.
 *
 * When a subject is present, ALSO send `subject_terms` — the canonical
 * label plus every synonym keyword ("Mathematics", "math", "maths",
 * "algebra", ...). The RPC matches `s ILIKE ANY($terms)` so a tutor who
 * listed "Math" is found by a "Mathematics" search and vice versa.
 * Without this, a search for "Mathematics" returned 0 rows when tutors
 * wrote "Math" — and the fallback chain then DELETED the subject,
 * showing physics tutors for a math query (user-reported bug).
 */
function buildConstraintsJson(constraints: SearchConstraints): Record<string, unknown> {
  const json = Object.fromEntries(
    Object.entries(constraints).filter(
      ([_, v]) => v !== undefined && v !== null && v !== "",
    ),
  );

  if (constraints.subject) {
    json.subject_terms = [constraints.subject, ...getSubjectKeywords(constraints.subject)];
  }

  return json;
}

function mapResults(data: Record<string, unknown>[]): TutorResult[] {
  if (!Array.isArray(data)) return [];

  return data.map((row) => ({
    id: String(row.id ?? ""),
    full_name: String(row.full_name ?? ""),
    headline: String(row.headline ?? ""),
    bio: String(row.bio ?? ""),
    subjects: Array.isArray(row.subjects) ? (row.subjects as string[]) : [],
    grades_teaching: Array.isArray(row.grades_teaching)
      ? (row.grades_teaching as string[])
      : [],
    years_experience: Number(row.years_experience ?? 0),
    monthly_rate_npr: Number(row.monthly_rate_npr ?? 0),
    neighborhood: String(row.neighborhood ?? ""),
    city: String(row.city ?? ""),
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    response_rate: Number(row.response_rate ?? 0),
    degree: String(row.degree ?? ""),
    institution: String(row.institution ?? ""),
    photo_url: row.photo_url ? String(row.photo_url) : null,
    similarity: Number(row.similarity ?? 0),
  }));
}

function deduplicate(results: TutorResult[]): TutorResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
