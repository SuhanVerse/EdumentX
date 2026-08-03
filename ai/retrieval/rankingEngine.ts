/**
 * EdumentX AI — Ranking Engine
 *
 * Computes composite scores for tutor search results using a weighted
 * formula that considers: semantic similarity, budget proximity,
 * rating, experience, and response rate.
 *
 * The weights can be dynamically adjusted based on conversation context
 * (e.g., if the student emphasizes budget, increase budget weight).
 */

import type { SearchConstraints } from "@/ai/types/constraints.types";
import type { TutorResult } from "@/ai/types/conversation.types";
import type { ScoredTutor } from "@/ai/types/search.types";
import { DEFAULT_RANKING_WEIGHTS, type RankingWeights } from "@/ai/types/search.types";

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Calculate the composite score for a single tutor.
 *
 * @param tutor - Tutor result with similarity score
 * @param constraints - Student's search constraints
 * @param weights - Optional custom weights (uses defaults if not provided)
 * @returns Final score (0 to 1)
 */
export function calculateScore(
  tutor: TutorResult,
  constraints: SearchConstraints,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): { final_score: number; scores: ScoredTutor["scores"] } {
  // 1. Semantic similarity score (0 to 1)
  //    Cosine distance is 0-2 (lower = more similar).
  //    We convert: 1 - (similarity / 2) → 0 to 1, higher = more similar
  const simScore = 1 - Math.min(tutor.similarity / 2, 1);

  // 2. Budget proximity score (0 to 1)
  //    At or under budget: 1.0
  //    50% over budget: 0.5
  //    100% over budget: 0.0
  let budgetScore = 1.0;
  if (constraints.budget_max && constraints.budget_max > 0) {
    const budgetRatio = tutor.monthly_rate_npr / constraints.budget_max;
    budgetScore = budgetRatio <= 1
      ? 1.0
      : Math.max(0, 1 - (budgetRatio - 1) * 2);
  }

  // 3. Rating score (0 to 1)
  const ratingScore = Math.min((tutor.rating || 0) / 5, 1);

  // 4. Experience score (0 to 1, capped at 15 years)
  const experienceScore = Math.min((tutor.years_experience || 0) / 15, 1);

  // 5. Response rate score (0 to 1)
  const responseScore = Math.min((tutor.response_rate || 0) / 100, 1);

  // Weighted combination
  const final_score =
    weights.similarity * simScore +
    weights.budget * budgetScore +
    weights.rating * ratingScore +
    weights.experience * experienceScore +
    weights.response_rate * responseScore;

  return {
    final_score,
    scores: {
      similarity: simScore,
      budget: budgetScore,
      rating: ratingScore,
      experience: experienceScore,
      response_rate: responseScore,
    },
  };
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

/**
 * Rank tutors by composite score, returning the top N.
 *
 * @param tutors - Array of tutor results from hybrid search
 * @param constraints - Student's search constraints
 * @param topN - Number of top tutors to return (default: 5)
 * @param weights - Optional custom ranking weights
 * @returns Ranked and scored tutors
 */
export function rankTutors(
  tutors: TutorResult[],
  constraints: SearchConstraints,
  topN = 5,
  weights?: RankingWeights,
): ScoredTutor[] {
  const activeWeights = adjustWeightsByContext(weights ?? DEFAULT_RANKING_WEIGHTS, constraints);

  const scored = tutors.map((tutor) => {
    const { final_score, scores } = calculateScore(tutor, constraints, activeWeights);
    return {
      ...tutor,
      scores,
      final_score,
    };
  });

  // Sort by score descending, then by rating as tiebreaker
  scored.sort((a, b) => {
    const scoreDiff = b.final_score - a.final_score;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
    return (b.rating || 0) - (a.rating || 0);
  });

  return scored.slice(0, topN);
}

// ─── Dynamic Weight Adjustment ───────────────────────────────────────────────

/**
 * Adjust ranking weights based on conversation context.
 *
 * For example, if the student emphasizes budget, increase the
 * budget weight. If they want "the best rated", increase rating weight.
 */
export function adjustWeightsByContext(
  baseWeights: RankingWeights,
  constraints: SearchConstraints,
): RankingWeights {
  const weights = { ...baseWeights };

  // If student specified a strict budget, increase budget weight
  if (constraints.budget_max && constraints.budget_max > 0) {
    weights.budget += 0.10;
    // Normalize: subtract from other weights proportionally
    const totalReduction = 0.10;
    const otherWeights = ["similarity", "rating", "experience", "response_rate"] as const;
    const otherTotal = otherWeights.reduce((sum, w) => sum + weights[w], 0);
    if (otherTotal > 0) {
      for (const w of otherWeights) {
        weights[w] -= totalReduction * (weights[w] / otherTotal);
      }
    }
  }

  // If student asks for "best" or "top rated", increase rating weight
  if (constraints.min_rating && constraints.min_rating >= 4) {
    weights.rating += 0.10;
    const totalReduction = 0.10;
    const otherWeights = ["similarity", "budget", "experience", "response_rate"] as const;
    const otherTotal = otherWeights.reduce((sum, w) => sum + weights[w], 0);
    if (otherTotal > 0) {
      for (const w of otherWeights) {
        weights[w] -= totalReduction * (weights[w] / otherTotal);
      }
    }
  }

  // If student asks for experienced tutors
  if (constraints.min_experience && constraints.min_experience >= 5) {
    weights.experience += 0.10;
    const totalReduction = 0.10;
    const otherWeights = ["similarity", "budget", "rating", "response_rate"] as const;
    const otherTotal = otherWeights.reduce((sum, w) => sum + weights[w], 0);
    if (otherTotal > 0) {
      for (const w of otherWeights) {
        weights[w] -= totalReduction * (weights[w] / otherTotal);
      }
    }
  }

  return weights;
}

// ─── Deterministic Sort (LLM-free) ──────────────────────────────────────────
//
// Mirrors `supabase/ai/retrieval/rankingEngine.ts` so explicit sort requests
// ("sort by experience", "cheapest first", "highest rated") re-order results
// WITHOUT an LLM call. The mock pipeline and the Edge Function share the same
// intent patterns and ordering rules. Only vague reorder phrases ("reorder",
// "best match") still rely on the LLM.

export interface SortIntent {
  key: "experience" | "rating" | "reviews" | "price";
  direction: "asc" | "desc";
  /** Short human phrase for the reply, e.g. "most experienced tutors first". */
  label: string;
}

const SORT_INTENT_PATTERNS: Array<{ re: RegExp; sort: SortIntent }> = [
  // ── Experience ──
  {
    re: /\b(by|sorted\s+by|sort\s+by|arranged\s+by|arrange\s+by)\s+(experience|seniority|years)\b/i,
    sort: { key: "experience", direction: "desc", label: "most experienced tutors first" },
  },
  {
    re: /\b(most|more)\s+experienced\b/i,
    sort: { key: "experience", direction: "desc", label: "most experienced tutors first" },
  },
  {
    re: /\b(experience[d]?|senior)\s+(first|top|highest)\b/i,
    sort: { key: "experience", direction: "desc", label: "most experienced tutors first" },
  },
  {
    re: /\b(high|highest|most)\s+(experience|seniority)\b/i,
    sort: { key: "experience", direction: "desc", label: "most experienced tutors first" },
  },
  {
    re: /\bput\s+(the\s+)?(most\s+)?(experienced|senior)\s+(at|on)\s+(top|first)/i,
    sort: { key: "experience", direction: "desc", label: "most experienced tutors first" },
  },
  // ── Rating ──
  {
    re: /\b(by|sorted\s+by|sort\s+by|arranged\s+by|arrange\s+by)\s+(rating|ratings)\b/i,
    sort: { key: "rating", direction: "desc", label: "highest rated tutors first" },
  },
  {
    re: /\b(highest|best|top|most)\s+rated\b/i,
    sort: { key: "rating", direction: "desc", label: "highest rated tutors first" },
  },
  // ── Reviews ──
  {
    re: /\b(most|top|highest)\s+reviewed\b/i,
    sort: { key: "reviews", direction: "desc", label: "most reviewed tutors first" },
  },
  // ── Price / budget ──
  {
    re: /\b(cheapest|most\s+affordable|lowest\s+(price|budget|cost|rate|fee))\b/i,
    sort: { key: "price", direction: "asc", label: "cheapest options first" },
  },
  {
    re: /\b(most\s+expensive|highest\s+(price|budget|cost|rate|fee))\b/i,
    sort: { key: "price", direction: "desc", label: "most expensive options first" },
  },
  {
    re: /\b(by|sorted\s+by|sort\s+by|arranged\s+by|arrange\s+by)\s+(price|budget|cost|rate|fee)\b/i,
    sort: { key: "price", direction: "asc", label: "cheapest options first" },
  },
];

/** Detect an unambiguous sort request in a user message (null = no sort). */
export function detectSortIntent(message: string): SortIntent | null {
  const lower = message.toLowerCase();
  for (const { re, sort } of SORT_INTENT_PATTERNS) {
    if (re.test(lower)) return sort;
  }
  return null;
}

/**
 * Deterministically re-order scored results by the detected sort intent.
 * Missing sort data sinks to the bottom regardless of direction. Ties keep
 * their existing relative order (stable sort).
 */
export function applySortToResults(
  scored: ScoredTutor[],
  sort: SortIntent,
): ScoredTutor[] {
  const value = (t: ScoredTutor): number | null => {
    switch (sort.key) {
      case "experience":
        return t.years_experience ?? null;
      case "rating":
        return t.rating ?? null;
      case "reviews":
        return t.review_count ?? null;
      case "price":
        return t.monthly_rate_npr ?? null;
    }
  };

  const sorted = [...scored].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return sort.direction === "desc" ? bv - av : av - bv;
  });
  return sorted;
}

/**
 * Format the ranking breakdown as a human-readable string.
 * Useful for debugging and for the LLM to explain recommendations.
 */
export function formatRankingBreakdown(
  tutor: ScoredTutor,
  constraints: SearchConstraints,
): string {
  return [
    `${tutor.full_name}:`,
    `  Overall: ${(tutor.final_score * 100).toFixed(0)}%`,
    `  Similarity: ${(tutor.scores.similarity * 100).toFixed(0)}%`,
    `  Budget: ${(tutor.scores.budget * 100).toFixed(0)}% (Rs ${tutor.monthly_rate_npr})`,
    `  Rating: ${(tutor.scores.rating * 100).toFixed(0)}% (${tutor.rating}/5)`,
    `  Experience: ${(tutor.scores.experience * 100).toFixed(0)}% (${tutor.years_experience} yrs)`,
    `  Response rate: ${(tutor.scores.response_rate * 100).toFixed(0)}%`,
  ].join("\n");
}
