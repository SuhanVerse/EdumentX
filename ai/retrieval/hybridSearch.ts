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
 * Call the hybrid_search_tutors PostgreSQL function with vector search.
 */
async function callHybridSearch(
  constraints: SearchConstraints,
  embedding: number[],
  limit: number,
): Promise<TutorResult[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc("hybrid_search_tutors", {
      constraints_json: buildConstraintsJson(constraints),
      query_embedding: `[${embedding.join(",")}]`,
      result_limit: limit,
    });

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
 * Call the hybrid_search_tutors PostgreSQL function without vector search.
 */
async function callMetadataSearch(
  constraints: SearchConstraints,
  limit: number,
): Promise<TutorResult[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc("hybrid_search_tutors", {
      constraints_json: buildConstraintsJson(constraints),
      query_embedding: null,
      result_limit: limit,
    });

    if (error) {
      console.error("[hybridSearch] Metadata RPC error:", error.message);
      return [];
    }

    return mapResults(data as Record<string, unknown>[]);
  } catch (err) {
    console.error("[hybridSearch] Metadata RPC exception:", err);
    return [];
  }
}

// ─── Fallback ────────────────────────────────────────────────────────────────

async function applyFallback(
  constraints: SearchConstraints,
  limit: number,
): Promise<TutorResult[]> {
  console.log("[hybridSearch] Applying fallback strategy...");

  for (const tier of FALLBACK_TIERS) {
    const relaxed = applyFallbackTier(constraints, tier);
    const results = await callMetadataSearch(relaxed, limit);
    if (results.length > 0) {
      console.log(`[hybridSearch] Fallback "${tier.description}" found ${results.length} tutors`);
      return results;
    }
  }

  return await callMetadataSearch({ verified_only: true }, limit);
}

function applyFallbackTier(
  constraints: SearchConstraints,
  tier: typeof FALLBACK_TIERS[number],
): SearchConstraints {
  const relaxed: SearchConstraints = { ...constraints };

  // Relax budget (if present and not a hard constraint)
  if (tier.budget_multiplier > 1 && relaxed.budget_max) {
    relaxed.budget_max = Math.round(relaxed.budget_max * tier.budget_multiplier);
  }

  // Relax subject only if not a hard constraint
  if (tier.broaden_subject && relaxed.subject) {
    delete relaxed.subject;
  }

  // Note: Hard constraints (gender_preference, verified_only) are NEVER
  // removed by the fallback chain. If the student explicitly asked for
  // a female tutor, we respect that even if it means fewer results.
  // The software should be transparent: if no female tutors exist, the
  // response should say so rather than silently returning male tutors.

  return relaxed;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the JSON constraints object for the PostgreSQL function.
 */
function buildConstraintsJson(constraints: SearchConstraints): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(constraints).filter(
      ([_, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
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
