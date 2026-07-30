/**
 * EdumentX AI — Constraint Extractor
 *
 * Uses Groq LLM to extract structured search constraints from natural
 * language messages. Merges new constraints with existing session
 * constraints for incremental conversation context.
 *
 * Example:
 *   "I need a Maths tutor under Rs 5000 in Baneshwor"
 *   → { subject: "Mathematics", budget_max: 5000, location_text: "Baneshwor" }
 *
 * PIPELINE:
 *   1. LLM extraction (handles semantic ambiguity in location/mode/gender).
 *   2. Deterministic keyword extraction (always runs — handles bare-
 *      number answers like "12" or "5000" and "anywhere" / "doesn't matter").
 *   3. Merge rule: keyword wins for SUBJECT (sanity check), GRADE, BUDGET
 *      (deterministic). LLM wins for location/mode/gender (semantic).
 *
 * Why the merge: the LLM occasionally hallucinates a subject (e.g. picking
 * "Computer Science" when the message has nothing to do with CS) or returns
 * null for grade_level on bare numbers. The keyword pass gives us a safe
 * baseline; the LLM pass handles the cases keyword can't reach.
 */

import { groqChatJSON } from "@/ai/utils/groqClient";
import { CONSTRAINT_EXTRACTION_SYSTEM_PROMPT } from "@/ai/domain/prompts";
import type { SearchConstraints } from "@/ai/types/constraints.types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtractionResponse {
  constraints: {
    subject?: string | null;
    budget_max?: number | null;
    budget_min?: number | null;
    location_text?: string | null;
    radius_km?: number | null;
    gender_preference?: string | null;
    tutoring_mode?: string | null;
    grade_level?: string | null;
    language?: string | null;
    min_rating?: number | null;
    min_experience?: number | null;
    verified_only?: boolean | null;
    query_text?: string | null;
  };
  missing_core_fields?: string[];
  needs_clarification?: boolean;
  clarification_question?: string | null;
}

import {
  SUBJECT_KEYWORDS,
  getSubjectKeywords,
  LOCATIONS,
  ANYWHERE_TRIGGERS,
  FEMALE_PATTERN,
  MALE_PATTERN,
  ONLINE_KEYWORDS,
  HOME_KEYWORDS,
  GRADE_WORDS,
  RATING_PATTERNS,
  EXPERIENCE_PATTERNS,
  WITHIN_KM_PATTERN,
  PROXIMITY_PATTERN,
} from "@/ai/domain/keywords";

function getKeywordsFor(label: string): string[] {
  return getSubjectKeywords(label) as string[];
}

// ─── Extractor ───────────────────────────────────────────────────────────────

/**
 * Extract structured search constraints from a user message,
 * taking existing constraints into account.
 *
 * @param message - The user's message
 * @param existingConstraints - Current constraints from session state
 * @returns Extracted constraints (only new/changed fields)
 */
export async function extractConstraints(
  message: string,
  existingConstraints: SearchConstraints,
): Promise<Partial<SearchConstraints>> {
  // 1. LLM extraction — handles semantic ambiguity in location, mode, gender.
  let llmResult: Partial<SearchConstraints> = {};
  try {
    const existingStr = Object.entries(existingConstraints)
      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const userPrompt = existingStr
      ? `Current constraints: { ${existingStr} }\n\nNew message: "${message}"`
      : `New message: "${message}"`;

    const response = await groqChatJSON<ExtractionResponse>(
      [
        { role: "system", content: CONSTRAINT_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, max_tokens: 512 },
    );

    llmResult = cleanConstraints(response.constraints);
  } catch (err) {
    // Don't bail — fall through to keyword extraction. LLM outages
    // must not break the conversation.
    console.error("[constraintExtractor] LLM call failed:", err);
  }

  // 2. Always run deterministic keyword extraction — it handles cases
  // the LLM drops: bare numbers ("12", "5000"), "anywhere", etc.
  const keywordResult = fallbackExtractConstraints(
    message,
    existingConstraints,
  );

  // 3. Merge the two extractions with a deterministic rule.
  return mergeExtractions(llmResult, keywordResult, message);
}

/**
 * Merge LLM and keyword extractions.
 *
 *   - Subject: keyword wins when the message contains a keyword that
 *     disagrees with the LLM (LLM hallucinates here regularly).
 *   - Grade, budget: keyword always wins (deterministic, handles bare
 *     numbers the LLM drops).
 *   - Location, mode, gender, language: LLM wins (semantic).
 *   - `location_preference` ("anywhere"): keyword wins (the LLM is
 *     unlikely to detect this).
 */
function mergeExtractions(
  llm: Partial<SearchConstraints>,
  kw: Partial<SearchConstraints>,
  message: string,
): Partial<SearchConstraints> {
  const out: Partial<SearchConstraints> = { ...llm };
  const messageLower = message.toLowerCase();

  // Subject: prefer the keyword value if it disagrees with the LLM.
  if (kw.subject && llm.subject && kw.subject !== llm.subject) {
    const messageHasKwSubject = getKeywordsFor(kw.subject).some((k) =>
      messageLower.includes(k),
    );
    if (messageHasKwSubject) out.subject = kw.subject;
  }
  if (!out.subject && kw.subject) {
    out.subject = kw.subject;
  }

  // Deterministic wins for grade and budget
  if (kw.grade_level !== undefined && out.grade_level === undefined) {
    out.grade_level = kw.grade_level;
  }
  if (kw.budget_max !== undefined && out.budget_max === undefined) {
    out.budget_max = kw.budget_max;
  }
  if (kw.budget_min !== undefined && out.budget_min === undefined) {
    out.budget_min = kw.budget_min;
  }

  // `location_preference` ("anywhere") — keyword wins, the LLM rarely
  // detects the opt-out phrasing.
  if (kw.location_preference !== undefined) {
    out.location_preference = kw.location_preference;
  }

  return out;
}

// ─── Fallback ────────────────────────────────────────────────────────────────

/**
 * Fallback: keyword-based extraction + answer inference for single-word
 * answers. Always runs alongside the LLM pass (Fix A) so bare numbers
 * like "12" never bypass the deterministic rules.
 *
 * @param message - The user's message
 * @param existingConstraints - Current constraints, used to infer which
 *   field a short answer might fill
 */
function fallbackExtractConstraints(
  message: string,
  existingConstraints: SearchConstraints,
): Partial<SearchConstraints> {
  const constraints: Partial<SearchConstraints> = {};
  const lower = message.toLowerCase().trim();

  // ── Expanded subject keyword matching ──
  //
  // Reuses the canonical SUBJECT_KEYWORDS table at the top of this file
  // so the LLM merge (`mergeExtractions`) and the keyword fallback
  // agree on labels. Editing one place updates both.
  for (const entry of SUBJECT_KEYWORDS) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        constraints.subject = entry.label;
        break;
      }
    }
    if (constraints.subject) break;
  }

  // ── Budget detection with tolerance ──
  const budgetMatch = lower.match(/(?:around|about|approx|approximately|rs\.?\s*|npr\s*|₹\s*)?(\d{1,3}(?:,\d{3})*|\d{1,6})(k|k\b)?/i);
  if (budgetMatch) {
    // Guard: if the number is followed by "years" / "yr" / "experience",
    // this is an experience constraint, not budget. Skip so the
    // experience parser below can handle it.
    // E.g. "more than 6 years" → min_experience=6, not budget.
    const matchIdx = budgetMatch.index ?? 0;
    const matchFull = budgetMatch[0] ?? "";
    const afterText = lower.slice(matchIdx + matchFull.length);
    const isExperienceContext = /^\s*(?:years?|yrs?|exp(?:erience)?)\b/i.test(afterText);
    if (!isExperienceContext) {
      let amount = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
      if (budgetMatch[2] && budgetMatch[2].toLowerCase() === "k") {
        amount *= 1000;
      }

      const isVague = /\b(around|about|approx|approximately|roughly)\b/i.test(lower);

      if (lower.includes("under") || lower.includes("below") || lower.includes("less than") || lower.includes("max")) {
        constraints.budget_max = amount;
      } else if (lower.includes("above") || lower.includes("over") || lower.includes("min") || lower.includes("more than")) {
        constraints.budget_min = amount;
      } else if (isVague) {
        constraints.budget_min = Math.round(amount * 0.8);
        constraints.budget_max = Math.round(amount * 1.2);
      } else {
        constraints.budget_max = amount;
      }
    }
  }

  // ── Location detection ──
  for (const location of LOCATIONS) {
    if (lower.includes(location)) {
      constraints.location_text = location.charAt(0).toUpperCase() + location.slice(1);
      break;
    }
  }

  // ── Open-ended location preference ──
  // "Anywhere", "doesn't matter", "no preference", "I don't mind" — the
  // user is opting out of a physical location requirement. The state
  // machine's `getNextQuestion` checks this flag to skip the location
  // question and proceed to search.
  if (ANYWHERE_TRIGGERS.some((t) => lower.includes(t))) {
    constraints.location_preference = "anywhere";
  }

  // ── Tutoring mode ──
  if (ONLINE_KEYWORDS.some((kw) => lower.includes(kw))) {
    constraints.tutoring_mode = "online";
  } else if (HOME_KEYWORDS.some((kw) => lower.includes(kw))) {
    constraints.tutoring_mode = "home_tuition";
  }

  // ── Gender preference ──
  //
  // WARNING: Use word-boundary regex (`\b`) instead of `.includes()` to
  // avoid false positives like "Kathmandu" containing "man".
  //   ✓ "female tutor" → female
  //   ✓ "man" / "male tutor" → male
  //   ✗ "Kathmandu" — no longer triggers male (Fix #1)
  if (FEMALE_PATTERN.test(lower)) {
    constraints.gender_preference = "female";
  } else if (MALE_PATTERN.test(lower)) {
    constraints.gender_preference = "male";
  }

  // ── Minimum rating ──
  for (const { regex, value } of RATING_PATTERNS) {
    const m = lower.match(regex);
    if (m) {
      const rating = value(m);
      if (rating >= 1 && rating <= 5) {
        constraints.min_rating = rating;
        break;
      }
    }
  }

  // ── Minimum experience ──
  for (const { regex, value } of EXPERIENCE_PATTERNS) {
    const m = lower.match(regex);
    if (m) {
      const exp = value(m);
      if (exp >= 1 && exp <= 50) {
        constraints.min_experience = exp;
        break;
      }
    }
  }

  // ── Radius / proximity ──
  if (WITHIN_KM_PATTERN.test(lower)) {
    const m = lower.match(WITHIN_KM_PATTERN);
    if (m) {
      constraints.radius_km = parseFloat(m[1]);
    }
  } else if (PROXIMITY_PATTERN.test(lower)) {
    constraints.radius_km = 5;
  }

  // ── Grade detection ──
  const gradeMatch = lower.match(/(?:grade|class|level|standard|\+2|plus.?2)\s*(\d{1,2})/i);
  if (gradeMatch) {
    constraints.grade_level = gradeMatch[1];
  }
  if (!constraints.grade_level) {
    for (const [word, val] of Object.entries(GRADE_WORDS)) {
      if (lower.includes(word)) {
        constraints.grade_level = val;
        break;
      }
    }
  }

  // ── Answer inference for single-word values ──
  // If we found nothing via keyword matching AND the message is a
  // simple value, infer which field it answers based on missing
  // constraints. This fixes the repeated-questions bug when a user
  // answers "11" (grade) or "5000" (budget) without context words.
  const extractedKeys = Object.keys(constraints);
  if (extractedKeys.length === 0 || (extractedKeys.length === 1 && extractedKeys[0] === "query_text")) {
    // Any pure number → could be grade, budget, or experience
    const pureNumber = lower.match(/^(\d+)$/);
    if (pureNumber) {
      const num = parseInt(pureNumber[1], 10);
      const isLikelyBudget = num >= 500;
      const isLikelyGrade = num <= 12 && !existingConstraints.grade_level;

      if (isLikelyGrade && !existingConstraints.grade_level) {
        constraints.grade_level = String(num);
      } else if (isLikelyBudget) {
        constraints.budget_max = num;
      } else if (num <= 50 && !existingConstraints.min_experience) {
        constraints.min_experience = num;
      }
    }

    // Single word gender
    if (lower === "female" || lower === "male" || lower === "other") {
      if (!existingConstraints.gender_preference) {
        constraints.gender_preference = lower as "male" | "female" | "other";
      }
    }

    // Single word tutoring mode
    if (lower === "online" && !existingConstraints.tutoring_mode) {
      constraints.tutoring_mode = "online";
    }
    if ((lower === "home" || lower === "offline") && !existingConstraints.tutoring_mode) {
      constraints.tutoring_mode = "home_tuition";
    }

    // Single word experience
    if (lower === "experienced" && !existingConstraints.min_experience) {
      constraints.min_experience = 3;
    } else if (lower === "expert" && !existingConstraints.min_experience) {
      constraints.min_experience = 5;
    }

    // Single word rating
    if (lower === "top" || lower === "best") {
      if (!existingConstraints.min_rating) constraints.min_rating = 4.5;
    }

    // Single word proximity
    if (lower === "nearby" && !existingConstraints.radius_km) {
      constraints.radius_km = 5;
    }
  }

  // ── Build query text ──
  const parts: string[] = [];
  if (constraints.subject) parts.push(constraints.subject);
  if (constraints.grade_level) parts.push(`grade ${constraints.grade_level}`);
  if (constraints.budget_max) parts.push(`under Rs ${constraints.budget_max}`);
  if (constraints.budget_min) parts.push(`from Rs ${constraints.budget_min}`);
  if (constraints.location_text) parts.push(`in ${constraints.location_text}`);
  if (constraints.tutoring_mode) parts.push(constraints.tutoring_mode);
  if (parts.length > 0) {
    parts.push("tutor");
    constraints.query_text = parts.join(" ");
  }

  return constraints;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Clean constraint values: remove nulls, normalize strings.
 */
function cleanConstraints(
  raw: ExtractionResponse["constraints"],
): Partial<SearchConstraints> {
  return {
    subject: raw.subject ?? undefined,
    budget_max: raw.budget_max ?? undefined,
    budget_min: raw.budget_min ?? undefined,
    location_text: raw.location_text ?? undefined,
    radius_km: raw.radius_km ?? undefined,
    gender_preference: (raw.gender_preference as "male" | "female" | "other") ?? undefined,
    tutoring_mode: (raw.tutoring_mode as "online" | "home_tuition") ?? undefined,
    grade_level: raw.grade_level ?? undefined,
    language: raw.language ?? undefined,
    min_rating: raw.min_rating ?? undefined,
    min_experience: raw.min_experience ?? undefined,
    verified_only: raw.verified_only ?? true,
    query_text: raw.query_text ?? undefined,
    // location_preference is detected by the keyword fallback, not the LLM;
    // leaving it undefined here is intentional.
    location_preference: undefined,
  };
}
