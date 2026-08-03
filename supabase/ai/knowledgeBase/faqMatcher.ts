/**
 * EdumentX AI — FAQ Matcher
 *
 * Matches user queries to FAQ entries using keyword overlap and
 * simple TF-IDF-like scoring.
 *
 * In Phase 1 (MVP), the FAQ is embedded in the system prompt.
 * This module provides a more structured matching approach for Phase 2.
 */

import { FAQ, type FaqEntry } from "./faq.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FaqMatchResult {
  matched: boolean;
  entry: FaqEntry | null;
  score: number;
  confidence: "high" | "medium" | "low";
}

// ─── Keyword Matching ────────────────────────────────────────────────────────

/**
 * Regex that detects a clear tutor-search signal in the user's message.
 *
 * If the message contains any of these phrases, the FAQ pre-check MUST
 * skip and let the LLM-based intent classifier route the message to the
 * search path. Examples that match: "looking for a Maths tutor",
 * "need a tutor who teaches English", "find a tutor for physics".
 *
 * Examples that DON'T match (correctly routed to FAQ):
 *   "What documents do I need for verification?"
 *   "How does tutor verification work?"
 *   "What is a verified tutor?"
 *
 * Exported as `TUTOR_SEARCH_SIGNAL_PATTERN` so the orchestrator can
 * use the same signal in other paths (e.g. when the LLM intent
 * classifier returns low confidence).
 */
export const TUTOR_SEARCH_SIGNAL_PATTERN =
  /\b(looking for|need a tutor|find a tutor|tutor who teaches|tutor for|tutor that|need help with)\b/i;

/**
 * Match a user query to FAQ entries by keyword overlap.
 * Returns the best matching entry or null.
 */
export function matchFaq(query: string): FaqMatchResult {
  if (!query || query.trim().length < 3) {
    return { matched: false, entry: null, score: 0, confidence: "low" };
  }

  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);

  if (queryWords.length === 0) {
    return { matched: false, entry: null, score: 0, confidence: "low" };
  }

  let bestScore = 0;
  let bestEntry: FaqEntry | null = null;

  for (const entry of FAQ) {
    const score = calculateMatchScore(normalizedQuery, queryWords, entry);

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Determine confidence based on score threshold.
  //
  // The bar is HIGH (0.6). Weak keyword matches — "tutor", "sign up",
  // generic terms shared across many FAQs — no longer auto-trigger. This
  // fixes the bug where "Can I get a tutor who teaches English?" was
  // misrouted to the verification FAQ because "tutor" overlapped with
  // "verified tutor" keywords.
  let confidence: FaqMatchResult["confidence"] = "low";
  if (bestScore >= 0.6) confidence = "high";
  else if (bestScore >= 0.4) confidence = "medium";

  return {
    // Only return a match when the score clears the high bar. Medium
    // confidence is reported but not matched — the caller decides what
    // to do with mid-confidence hits (typically: forward to the LLM
    // intent classifier).
    matched: bestScore >= 0.6,
    entry: bestEntry,
    score: bestScore,
    confidence,
  };
}

/**
 * Calculate how well a query matches a FAQ entry.
 *
 * Strong/weak keyword split:
 *   - STRONG keywords (multi-word phrases, or length > 8) are the entry's
 *     unique anchors — "verification process", "documents required",
 *     "verified tutor", "introductory video", etc. Each strong hit is
 *     worth 0.4.
 *   - WEAK keywords are generic single short words shared across many
 *     FAQs ("tutor", "book", "sign", "verified" used alone). Each weak
 *     hit is worth 0.05 only.
 *
 * Bail-out rule: if the query has ZERO strong hits, the entry scores 0.
 * This prevents generic phrases like "I need a tutor" from triggering
 * the verification FAQ because the keyword list contained "verified tutor".
 *
 * Base score then adds question-word overlap (+0.1) and related-question
 * word overlap (+0.05) as tiebreakers.
 */
function calculateMatchScore(
  normalizedQuery: string,
  queryWords: string[],
  entry: FaqEntry,
): number {
  let strongHits = 0;
  let weakHits = 0;

  // 1. Strong vs. weak keyword matches
  for (const keyword of entry.keywords) {
    const lower = keyword.toLowerCase();
    // Strong = multi-word (e.g. "verification process") OR length > 8
    // (e.g. "introductory", "verification", "documents").
    const isStrong = lower.includes(" ") || lower.length > 8;
    if (normalizedQuery.includes(lower)) {
      if (isStrong) strongHits++;
      else weakHits++;
    }
  }

  // Bail-out: no strong FAQ anchor. The entry is not a real match.
  if (strongHits === 0) return 0;

  // Base score from keyword hits (strong dominates, weak is filler)
  let score = strongHits * 0.4 + weakHits * 0.05;

  // 2. Word overlap with canonical question (small bonus)
  const questionWords = entry.question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const qWord of questionWords) {
    if (queryWords.includes(qWord)) {
      score += 0.1;
    }
  }

  // 3. Word overlap with related questions (small bonus)
  for (const related of entry.related_questions) {
    const relatedWords = related
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    for (const rWord of relatedWords) {
      if (queryWords.includes(rWord)) {
        score += 0.05;
      }
    }
  }

  // Cap at 1.0
  return Math.min(score, 1);
}

/**
 * Get the best FAQ answer for a query, or null if no good match.
 */
export function getFaqAnswer(query: string): string | null {
  const result = matchFaq(query);

  if (result.matched && result.entry) {
    return result.entry.answer;
  }

  return null;
}

/**
 * Check if this query is likely a FAQ question (quick pre-check).
 */
export function isLikelyFaqQuery(query: string): boolean {
  const faqTriggers = [
    "what is", "what are", "what does", "how does", "how do",
    "how to", "can i", "is it", "why was", "why is", "what if",
    "document", "verif", "enroll", "book", "sign up",
    "recommend", "match", "algorithm", "approved", "rejected",
  ];

  const lower = query.toLowerCase();
  return faqTriggers.some((trigger) => lower.includes(trigger));
}
