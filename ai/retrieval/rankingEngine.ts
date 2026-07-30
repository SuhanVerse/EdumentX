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
import type { TutorResult, ScoredTutor } from "@/ai/types/search.types";
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
