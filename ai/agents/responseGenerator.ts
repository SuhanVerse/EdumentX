/**
 * EdumentX AI — Response Generator
 *
 * Generates the short intro message that accompanies tutor cards.
 *
 * CRITICAL DESIGN DECISION:
 *   The response string MUST NOT contain tutor names, prices, or
 *   ratings. Those fields are surfaced exclusively through the
 *   structured `tutor_cards` array that the orchestrator returns
 *   alongside `response`. The client renders cards from that array,
 *   eliminating the LLM-hallucinated-tutor bug (Fix E).
 *
 * What this generator returns:
 *   - Empty results:    "I couldn't find tutors matching your filters.
 *                        The 'gender' filter looks most restrictive —
 *                        try relaxing it."  (relax hint from
 *                        summarizeRelaxHint, deterministic.)
 *   - Non-empty:        "I found N tutors matching your request." plus
 *                        one optional warm-tone sentence from the LLM
 *                        (≤ 60 tokens, prompt forbids names/prices).
 *
 * Markdown is no longer emitted in the response text — the only
 * remaining markdown is the warm-tone sentence, which is short prose.
 */

import { groqChat } from "@/ai/utils/groqClient";
import type { SearchConstraints } from "@/ai/types/constraints.types";
import type { SessionState, TutorResult } from "@/ai/types/conversation.types";

// ─── Main Generator ──────────────────────────────────────────────────────────

/**
 * Generate a short intro message (no tutor details — those come from
 * the orchestrator's `tutor_cards` array).
 *
 * @param tutors - Ranked tutor results (max 5)
 * @param constraints - Student's search constraints
 * @param session - Current session state (unused today; reserved)
 * @returns A 1–2 sentence intro string, suitable for direct display
 */
export async function generateResponse(
  tutors: TutorResult[],
  constraints: SearchConstraints,
  _session?: SessionState,
): Promise<string> {
  if (tutors.length === 0) {
    return `I couldn't find tutors matching your filters. ${summarizeRelaxHint(constraints)}`;
  }

  // Deterministic intro line. The warm-tone follow-up is optional.
  const intro = `I found ${tutors.length} tutor${tutors.length !== 1 ? "s" : ""} matching your request.`;

  const warm = await safeWarmTone(tutors, constraints);
  return warm ? `${intro} ${warm}` : intro;
}

// ─── Warm-Tone LLM Cap ───────────────────────────────────────────────────────
//
// The LLM is allowed ONE sentence of follow-up warmth. It is explicitly
// forbidden from naming tutors, quoting prices, or quoting ratings —
// those fields belong to the structured tutor_cards array.

const WARM_TONE_SYSTEM_PROMPT =
  "You write one short warm follow-up sentence for a tutor-search result. " +
  "NEVER mention any tutor's name, price, rating, or qualification. " +
  "NEVER invent details. The user already sees the matching tutors as cards " +
  "below your sentence — your job is just to sound human and encouraging. " +
  "If unsure, return an empty string. Do not start with 'Here are', 'I found', " +
  "or 'Below' — the previous sentence already said that.";

async function safeWarmTone(
  _tutors: TutorResult[],
  _constraints: SearchConstraints,
): Promise<string> {
  try {
    const response = await groqChat(
      [
        { role: "system", content: WARM_TONE_SYSTEM_PROMPT },
        { role: "user", content: "Write one short warm follow-up sentence." },
      ],
      { temperature: 0.7, max_tokens: 60 },
    );
    const text = response.content ?? "";
    // Defensive: if the LLM ignored instructions and emitted a tutor
    // name or price, discard the warm-tone sentence.
    if (containsForbiddenDetail(text)) return "";
    return text.trim();
  } catch {
    // LLM outages are non-fatal — the deterministic intro stands alone.
    return "";
  }
}

/**
 * Reject warm-tone text that mentions tutor-like details. The LLM is
 * instructed not to, but small models occasionally slip. We err on the
 * side of dropping the warm-tone sentence rather than risk leaking
 * invented details into the response.
 */
function containsForbiddenDetail(text: string): boolean {
  // Any number followed by Rs / NPR / ₹ / /mo — a price-ish token
  if (/\b(rs\.?|npr|₹)\s*\d|\d+\s*(rs|npr)\b/i.test(text)) return true;
  // "out of 5" or "/5" or "stars" — a rating-ish token
  if (/\b(out of|\/)\s*5\b|\bstars?\b/i.test(text)) return true;
  // Years experience
  if (/\b\d+\s*(?:years?|yrs?)\b/i.test(text)) return true;
  // Capitalized full names (First Last) — risky heuristic, but our
  // tutor names in this market are two capitalized tokens. Drop the
  // warm-tone line if any show up.
  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text)) return true;
  return false;
}

// ─── Relax Hint ──────────────────────────────────────────────────────────────

/**
 * Deterministic hint that names the most-restrictive filter so the
 * student knows what to relax. Order matters — hard filters
 * (gender, mode) outrank soft ones (budget, location).
 */
function summarizeRelaxHint(constraints: SearchConstraints): string {
  const order: Array<{
    key: keyof SearchConstraints;
    label: (v: unknown) => string;
  }> = [
    { key: "gender_preference", label: (v) => `'${String(v)}' tutor` },
    { key: "tutoring_mode", label: (v) => `'${String(v)}' mode` },
    { key: "language", label: () => `'language' filter` },
    { key: "budget_max", label: () => `'budget_max' (under budget)` },
    { key: "location_text", label: () => `'location' (city filter)` },
    { key: "subject", label: () => `'subject' filter` },
  ];

  for (const { key, label } of order) {
    const value = constraints[key];
    if (value !== undefined && value !== null && value !== "") {
      return `The ${label(value)} looks most restrictive — try relaxing it.`;
    }
  }

  return "Try widening your budget or removing filters.";
}
