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

import { groqChatJSON } from "../utils/groqClient.ts";
import { CONSTRAINT_EXTRACTION_SYSTEM_PROMPT } from "../domain/prompts.ts";
import type { SearchConstraints } from "../types/constraints.types.ts";

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

// Subject keyword table — exported so the merge rule can verify an LLM
// subject against the canonical labels. KEEP IN SYNC with the same table
// inside `fallbackExtractConstraints`.
const SUBJECT_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "Mathematics", keywords: ["math", "maths", "mathematics", "algebra", "calculus", "trigonometry", "geometry", "arithmetic"] },
  { label: "Physics", keywords: ["physics", "mechanics", "electricity", "optics", "thermodynamics"] },
  { label: "Chemistry", keywords: ["chemistry", "organic", "inorganic", "physical chemistry"] },
  { label: "Biology", keywords: ["biology", "bio", "zoology", "botany", "genetics", "cell biology", "photosynthesis", "ecosystem", "ecology", "cells", "dna", "anatomy", "physiology", "evolution", "microbiology", "molecular biology", "biochemistry"] },
  { label: "Science", keywords: ["science", "general science", "environmental science"] },
  { label: "English", keywords: ["english", "grammar", "literature", "writing", "communication"] },
  { label: "Nepali", keywords: ["nepali", "nepali language"] },
  { label: "Accountancy", keywords: ["account", "accountancy", "accounting"] },
  { label: "Economics", keywords: ["economics", "macro", "micro"] },
  // CRITICAL: Do NOT add bare "it" as a keyword. `lower.includes("it")`
  // matches every message that contains the substring "it" — e.g.
  // "cap**it**al", "ed**it**", "un**it**" — and changes the subject to
  // Computer Science. Users who mean "IT" (Information Technology) can
  // type "computer", "programming", "csit", or "information technology".
  { label: "Computer Science", keywords: ["computer", "programming", "coding", "python", "javascript", "html", "css", "information technology", "csit", "computer science"] },
  { label: "Social Studies", keywords: ["social", "social studies", "social science", "sociology"] },
  { label: "History", keywords: ["history", "world history", "nepali history"] },
  { label: "Geography", keywords: ["geography"] },
  { label: "Law", keywords: ["law", "legal"] },
  { label: "Philosophy", keywords: ["philosophy", "logic"] },
  { label: "Psychology", keywords: ["psychology"] },
];

/**
 * Look up the synonym keywords for a subject label.
 * Exported so `hybridSearch.ts` can send `subject_terms` to the RPC
 * (the RPC matches `s ILIKE ANY($terms)` — a tutor who lists "Math"
 * must be found by a "Mathematics" search and vice versa).
 */
export function getKeywordsFor(label: string): string[] {
  return SUBJECT_KEYWORDS.find((s) => s.label === label)?.keywords ?? [];
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

  // Subject hallucination guard: if the keyword pass found NO subject and
  // the LLM invented one, only keep it when the message actually contains
  // a subject keyword. The LLM regularly hallucinates "Computer Science"
  // from messages that merely contain the substring "it" or from
  // off-topic trivia ("What is the capital of France?"). The keyword
  // pass is the deterministic source of truth for subjects.
  if (!kw.subject && out.subject) {
    const messageHasAnySubjectWord = SUBJECT_KEYWORDS.some((entry) =>
      entry.keywords.some((k) => messageLower.includes(k)),
    );
    if (!messageHasAnySubjectWord) delete out.subject;
  }

  // Gender: keyword wins (the word-boundary regex is deterministic and
  // safe against "Kathmandu" → "man" false positives). Two guards:
  //   • Negation guard — "I don't want male tutors" matches the MALE
  //     pattern but means the OPPOSITE. When the message contains a
  //     negation word, keep the LLM's interpretation instead of blindly
  //     applying the keyword value.
  //   • Hallucination guard — an LLM-only gender is only kept when the
  //     message literally contains a gender word (kills "Kathmandu" → male).
  const hasGenderNegation = /\b(?:not|no|don't|dont|without|avoid|except|not\s+really)\b/i.test(messageLower);
  if (kw.gender_preference && !hasGenderNegation) {
    out.gender_preference = kw.gender_preference;
  } else if (
    !hasGenderNegation &&
    out.gender_preference &&
    !/\b(female|lady|woman|girl|male|man|gentleman|boy)\b/i.test(messageLower)
  ) {
    delete out.gender_preference;
  }

  // Deterministic wins for grade and budget. GRADE is keyword-wins even
  // when the LLM disagrees — the LLM regularly hallucinates "12" for input
  // "11" (bare-number answers), and the keyword pass is the deterministic
  // source of truth for grades.
  if (kw.grade_level !== undefined) {
    out.grade_level = kw.grade_level;
  }

  // Normalize higher-secondary grades 11/12 → "+2" (Nepali +2 marker).
  // The RPC's grade_to_terms expands "+2" to {11,12}, so one pill covers
  // both grades. Mirrors lib/ai/clientConstraintParser.ts + the root
  // extractor.
  if (out.grade_level === "11" || out.grade_level === "12") {
    out.grade_level = "+2";
  }
  if (kw.budget_max !== undefined && out.budget_max === undefined) {
    out.budget_max = kw.budget_max;
  }
  if (kw.budget_min !== undefined && out.budget_min === undefined) {
    out.budget_min = kw.budget_min;
  }

  // "around/about/approx" budgets are CEILINGS — the keyword pass never
  // sets a lower bound for them, and the LLM must not either. When a
  // vague qualifier is present, the deterministic +3,000 keyword value
  // OVERRIDES the LLM's (which may return the raw amount), and any
  // LLM-invented budget_min is stripped. ("what about 5k" → 8000, no min.)
  if (/\b(?:around|about|approx|approximately|roughly)\b/i.test(messageLower)) {
    if (kw.budget_max !== undefined) out.budget_max = kw.budget_max;
    delete out.budget_min;
  }

  // Bare-number guard: a message that is ONLY a number (e.g. "12") is a
  // GRADE answer, never a budget — even if the LLM hallucinated a budget
  // for it. The deterministic keyword answer-inference wins. Mirrors the
  // mock pipeline, which treats a bare number <= 12 as the grade.
  if (/^\d+$/.test(message.trim()) && kw.grade_level !== undefined) {
    delete out.budget_max;
    delete out.budget_min;
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
 * answers. Used when the LLM call fails.
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

  // ── Budget detection (tightened — mirrors lib/ai/clientConstraintParser.ts) ──
  //
  // A bare number ("12", "5000") is NOT a budget — it's usually a grade
  // answer ("12") or handled by the answer-inference block below
  // ("5000" after the budget question). We only treat a number as budget
  // when it's accompanied by a currency hint (rs/npr/₹), a budget
  // qualifier (under, around, max, per month...), or a bare "k"
  // shorthand ("12k"). The old loose regex matched ANY number and turned
  // "12" into `budget_max: 12` — which also suppressed the grade
  // answer-inference (it only runs when nothing else was extracted).
  const budgetPatterns: Array<{ regex: RegExp; qualifier: "max" | "min" | "vague" }> = [
    // Currency hint: always a max (the user is naming an amount they can pay).
    { regex: /(?:rs\.?|npr|₹)\s*(\d[\d,]*(?:\.\d+)?)(k)?\b/i, qualifier: "max" },
    // "under / below / less than / max / budget / afford / pay / spend /
    //  cost / fee / salary / per month" → max.
    { regex: /\b(?:under|below|less\s+than|budget(?:\s+of)?|afford|pay|spend|spent|cost|fee|charge|rate|monthly)\b[^.\d]{0,15}(\d[\d,]*(?:\.\d+)?)(k)?\b/i, qualifier: "max" },
    { regex: /(\d[\d,]*(?:\.\d+)?)(k)?\s*(?:per\s+month|monthly|in\s+total|total|max)\b/i, qualifier: "max" },
    // "above / over / min / more than / at least / from" → min
    { regex: /\b(?:above|over|minimum|more\s+than|at\s+least|from)\b[^.\d]{0,15}(\d[\d,]*(?:\.\d+)?)(k)?\b/i, qualifier: "min" },
    { regex: /(\d[\d,]*(?:\.\d+)?)(k)?\s*(?:or\s+more|minimum|min)\b/i, qualifier: "min" },
    // "around / about / approx" → vague range (±20%)
    { regex: /\b(?:around|about|approx|approximately|roughly)\b[^.\d]{0,15}(\d[\d,]*(?:\.\d+)?)(k)?\b/i, qualifier: "vague" },
    // Bare "k" suffix — "12k", "5k", "100k" — common shorthand for
    // thousands. No currency or qualifier needed. Goes LAST so more
    // specific patterns (with qualifier words) win if present.
    { regex: /\b(\d{1,3}(?:\.\d+)?)\s*(k)\b/i, qualifier: "max" },
  ];
  for (const { regex, qualifier } of budgetPatterns) {
    const m = lower.match(regex);
    if (!m) continue;
    const matchIdx = m.index ?? 0;
    const matchFull = m[0] ?? "";
    let amount = parseInt(m[1].replace(/,/g, ""), 10);
    if (!Number.isFinite(amount)) continue;

    // Guard: if the text right after the matched number is "years", "yr",
    // "experience", or "exp", this is an experience constraint, not a
    // budget. Skip so the experience parser below can handle it.
    const afterMatch = lower.slice(matchIdx + matchFull.length);
    const isExperienceContext = /^\s*(?:years?|yrs?|exp(?:erience)?)\b/i.test(afterMatch);
    if (isExperienceContext) continue;

    const hasK = m[2] && m[2].toLowerCase() === "k";
    if (hasK) amount *= 1000;
    if (qualifier === "max") {
      constraints.budget_max = amount;
    } else if (qualifier === "min") {
      constraints.budget_min = amount;
    } else {
      // "around / about / approx" → approximate CEILING only: raise the
      // upper bound by a flat Rs 3,000 slack, never set a lower bound.
      // The user is naming a rough maximum they can pay, not a range.
      constraints.budget_max = amount + 3000;
    }
    break; // first match wins
  }

  // ── Location detection ──
  const locations = [
    "baneshwor", "kathmandu", "lalitpur", "patan", "bhaktapur",
    "baluwatar", "kalanki", "balkhu", "gongabu", "bhaisepati",
    "mahalaxmisthan", "taumadhi", "suryabinayak", "swayambhu",
    "pulchowk", "jawalakhel", "kupondole", "sanepa", "chakrapath",
    "basundhara", "sitapaila", "tokha", "budhanilkantha", "chabahil",
    "koteshwor", "sinamangal", "tinkune", "new baneshwor", "old baneshwor",
    "dhumbarahi", "pingalsthan", "putalisadak", "maharajgunj",
  ];

  for (const location of locations) {
    if (lower.includes(location)) {
      constraints.location_text = location.charAt(0).toUpperCase() + location.slice(1);
      break;
    }
  }

  // ── Tutoring mode ──
  if (lower.includes("online") || lower.includes("virtual") || lower.includes("remote")) {
    constraints.tutoring_mode = "online";
  } else if (
    lower.includes("home") || lower.includes("nearby") || lower.includes("in-person") ||
    lower.includes("near me") || lower.includes("at home") || lower.includes("in person") ||
    lower.includes("house") || lower.includes("doorstep")
  ) {
    constraints.tutoring_mode = "home_tuition";
  }

  // ── Gender preference ──
  //
  // WARNING: Use word-boundary regex (`\b`) instead of `.includes()` to
  // avoid false positives like "Kathmandu" containing "man".
  //   ✓ "female tutor" → female
  //   ✓ "man" / "male tutor" → male
  //   ✗ "Kathmandu" — no longer triggers male (Fix #1)
  if (/\b(female|lady|woman|girl)\b/i.test(lower)) {
    constraints.gender_preference = "female";
  } else if (/\b(male|man|gentleman|boy)\b/i.test(lower)) {
    constraints.gender_preference = "male";
  }

  // ── Grade detection ──
  const gradeMatch = lower.match(/(?:grade|class|level|standard|\+2|plus.?2)\s*(\d{1,2})/i);
  if (gradeMatch) {
    constraints.grade_level = gradeMatch[1];
  }
  const gradeWords: Record<string, string> = {
    "eleven": "11", "eleventh": "11", "twelve": "12", "twelfth": "12",
    "nursery": "Nursery", "lkg": "LKG", "ukg": "UKG",
  };
  // Roman-numeral grades ("grade XII" → 12). Word-boundary only —
  // `includes("xi")` would match "maximum". Only applied when NO digit
  // grade was already extracted, so "grade 12, find x" keeps grade 12
  // (the standalone "x" must not override it to 10). Mirror of
  // ai/agents/constraintExtractor.ts + ROMAN_GRADE_PATTERN.
  const romanGrade = lower.match(/\b(xii|xi|x)\b/i);
  if (romanGrade && !constraints.grade_level) {
    constraints.grade_level = { xii: "12", xi: "11", x: "10" }[romanGrade[1].toLowerCase()];
  }
  if (!constraints.grade_level) {
    for (const [word, val] of Object.entries(gradeWords)) {
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
  }

  // ── Build query text ──
  const parts: string[] = [];
  if (constraints.subject) parts.push(constraints.subject);
  if (constraints.grade_level) parts.push(`grade ${constraints.grade_level}`);
  if (constraints.budget_max) parts.push(`under Rs ${constraints.budget_max}`);
  if (constraints.budget_min) parts.push(`from Rs ${constraints.budget_min}`);
  if (constraints.location_text) parts.push(`in ${constraints.location_text}`);
  // Gender: keep in the semantic query so "female tutor" ranks higher.
  // tutoring_mode/language are intentionally NOT included — they are
  // SQL-only filters (see buildSearchQueryText / migration 010).
  if (constraints.gender_preference) parts.push(`${constraints.gender_preference} tutor`);
  if (parts.length > 0) {
    parts.push("tutor");
    constraints.query_text = parts.join(" ");
  }

  // ── Open-ended location preference ──
  // "Anywhere", "doesn't matter", "no preference", "I don't mind" — the
  // user is opting out of a physical location requirement. The state
  // machine's `getNextQuestion` checks this flag to skip the location
  // question and proceed to search.
  const openLocationTriggers = [
    "anywhere", "doesn't matter", "doesnt matter", "no preference",
    "no specific location", "don't mind", "dont mind", "not picky",
    "any location", "all locations",
  ];
  if (openLocationTriggers.some((t) => lower.includes(t))) {
    constraints.location_preference = "anywhere";
  }

  // ── Proximity (C12: map integration groundwork) ──
  //
  // "within 5 km" → explicit radius. "near me" / "nearby" → default 5 km
  // AND `location_preference: "near_me"`. The preference flag is the hook
  // the future map integration reads to prioritize location / use the
  // student's GPS. No radius math yet — the preference flag alone is the
  // groundwork (the user asked for ready-but-not-perfect until the map
  // lands). Mirrors `ai/agents/constraintExtractor.ts` + `lib/ai/clientConstraintParser.ts`.
  const withinKmPattern = /\bwithin\s+(\d+(?:\.\d+)?)\s*(?:km|kms?|kilometers?|kilometres?)\b/i;
  const proximityPattern = /\b(nearby|near\s+me|close\s+to|walking\s+distance|near\s+my|proximity)\b/i;
  if (withinKmPattern.test(lower)) {
    const m = lower.match(withinKmPattern);
    if (m) {
      constraints.radius_km = parseFloat(m[1]);
    }
  } else if (proximityPattern.test(lower)) {
    // "anywhere" wins over "nearby" if both appear (e.g. "anywhere nearby")
    if (!constraints.location_preference) {
      constraints.location_preference = "near_me";
    }
    // Mirror the root extractor + client parser (C12 parity): default 5 km.
    // Inert today (the RPC doesn't filter by radius yet) but ready for the
    // map integration.
    constraints.radius_km = 5;
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
    // NOTE: `verified_only` is intentionally NOT defaulted to true here.
    // Mock mode never sets it (the client parser doesn't extract it), so
    // defaulting to true made real mode diverge: the RPC adds
    // `is_verified_professional = true` on EVERY search while mock never
    // filtered — and any tutor missing that flag silently vanished. It's
    // only set when the user explicitly asks ("verified tutors only").
    verified_only: raw.verified_only ?? undefined,
    query_text: raw.query_text ?? undefined,
    // location_preference is detected by the keyword fallback, not the LLM;
    // leaving it undefined here is intentional.
    location_preference: undefined,
  };
}
