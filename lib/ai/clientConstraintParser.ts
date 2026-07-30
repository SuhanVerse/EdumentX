/**
 * EdumentX — Client-side Constraint Parser
 *
 * Pure synchronous keyword parser used for instant chip-tap feedback.
 * All keyword tables are imported from the canonical source at
 * `ai/domain/keywords.ts` — if you need to add a subject, location,
 * or pattern, edit that single file and all consumers pick it up.
 *
 * This is a PURE, SYNCHRONOUS parser. No fetch, no LLM. If the parser
 * can't decide a value, it returns an empty patch and the server's
 * extractor (with its LLM fallback) still gets a chance.
 */

import type { ClientSearchConstraints } from "./minimumConstraints.ts";
import {
  SUBJECT_KEYWORDS,
  LOCATIONS,
  GRADE_WORDS,
  ANYWHERE_TRIGGERS,
  BARE_ANYWHERE,
  FEMALE_PATTERN,
  MALE_PATTERN,
  ONLINE_KEYWORDS,
  HOME_KEYWORDS,
  RATING_PATTERNS,
  EXPERIENCE_PATTERNS,
  WITHIN_KM_PATTERN,
  PROXIMITY_PATTERN,
} from "@/ai/domain/keywords";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a free-text user message into a `Partial<ClientSearchConstraints>`
 * using the same keyword tables as the server-side fallback.
 *
 * `existing` is consulted for the answer-inference block — when a user
 * sends a bare "11", we need to know whether they mean "grade 11" or
 * "budget 11" (always grade here, since 11 < 500).
 */
export function parseMessageToConstraints(
  message: string,
  existing: ClientSearchConstraints = {},
): Partial<ClientSearchConstraints> {
  const out: Partial<ClientSearchConstraints> = {};
  const lower = (message || "").toLowerCase().trim();

  // ── Subject ──
  for (const entry of SUBJECT_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      out.subject = entry.label;
      break;
    }
  }

  // ── Budget ──
  //
  // Tightened to reject bare numbers. Previously this regex matched the
  // `2` inside `+2 Science` and turned it into `budget_max: 2` — a number
  // that's clearly a grade marker, not a budget. We now require either a
  // currency hint (rs / npr / ₹) OR a budget qualifier (under, below,
  // less than, max, around, about, approx, budget, afford, pay, spent,
  // spend, salary, cost, price, fee) immediately adjacent to the digits.
  const budgetPatterns: Array<{ regex: RegExp; qualifier: "max" | "min" | "vague" }> = [
    // Currency hint: always a max (the user is naming an amount they can pay).
    { regex: /(?:rs\.?|npr|₹)\s*(\d[\d,]*(?:\.\d+)?)(k)?\b/i, qualifier: "max" },
    // "under / below / less than / max / budget / afford / pay / spend /
    //  cost / fee / salary / per month" → max. The qualifier may appear
    //  BEFORE or AFTER the number ("under 5000" or "5000 per month").
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
    // NOTE: must capture `k` as group 2 so `hasK` multiplies by 1000.
    { regex: /\b(\d{1,3}(?:\.\d+)?)\s*(k)\b/i, qualifier: "max" },
  ];
  for (const { regex, qualifier } of budgetPatterns) {
    const m = lower.match(regex);
    if (!m) continue;
    // After the null guard, m is RegExpMatchArray with index: number.
    const matchIdx = m.index ?? 0;
    const matchFull = m[0] ?? "";
    let amount = parseInt(m[1].replace(/,/g, ""), 10);
    if (!Number.isFinite(amount)) continue;

    // Guard: if the text right after the matched number is "years", "yr",
    // "experience", or "exp", this is an experience constraint, not a
    // budget. Skip so the experience parser below can handle it.
    // E.g. "more than 6 years" should set min_experience=6, not budget.
    const afterMatch = lower.slice(matchIdx + matchFull.length);
    const isExperienceContext = /^\s*(?:years?|yrs?|exp(?:erience)?)\b/i.test(afterMatch);
    if (isExperienceContext) continue;

    const hasK = m[2] && m[2].toLowerCase() === "k";
    if (hasK) amount *= 1000;
    if (qualifier === "max") {
      out.budget_max = amount;
    } else if (qualifier === "min") {
      out.budget_min = amount;
    } else {
      out.budget_min = Math.round(amount * 0.8);
      out.budget_max = Math.round(amount * 1.2);
    }
    break; // first match wins
  }

  // ── Location ──
  for (const loc of LOCATIONS) {
    if (lower.includes(loc)) {
      out.location_text = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // ── "Anywhere" / opt-out of location ──
  //
  // Detects phrasings like "anywhere", "anything", "doesn't matter",
  // "I don't mind", "no preference", "any location". When matched,
  // the bot treats the location requirement as satisfied (the
  // minimum-constraint gate in `minimumConstraints.ts` accepts
  // `location_preference: "anywhere"`).
  //
  // IMPORTANT: this runs AFTER the location-detection loop above so a
  // sentence like "anywhere in kathmandu is fine" still records
  // "Kathmandu" — but a bare "anywhere" / "anything" alone opts out.
  //
  // Apostrophe normalization: users type both ASCII `'` (U+0027) and
  // curly `'` (U+2019) — the regex below matches both.
  const lowerNormalized = lower
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (ANYWHERE_TRIGGERS.some((t) => lowerNormalized.includes(t))) {
    out.location_preference = "anywhere";
    // If they typed "anywhere in kathmandu" we still want the city,
    // but a bare "anywhere" / "anything" / "doesn't matter" should
    // clear any pre-filled location so the search is unconstrained.
    if (BARE_ANYWHERE.some((t) => lowerNormalized === t || lowerNormalized.startsWith(t + " ") || lowerNormalized.startsWith(t + "."))) {
      out.location_text = undefined;
    }
  }

  // ── Tutoring mode ──
  if (ONLINE_KEYWORDS.some((kw) => lower.includes(kw))) {
    out.tutoring_mode = "online";
  } else if (HOME_KEYWORDS.some((kw) => lower.includes(kw))) {
    out.tutoring_mode = "home_tuition";
  }

  // ── Gender ──
  //
  // WARNING: Use word-boundary regex (`\b`) to avoid false positives
  // like "Kathmandu" containing "man".
  if (FEMALE_PATTERN.test(lower)) {
    out.gender_preference = "female";
  } else if (MALE_PATTERN.test(lower)) {
    out.gender_preference = "male";
  }

  // ── Minimum rating ──
  for (const { regex, value } of RATING_PATTERNS) {
    const m = lower.match(regex);
    if (m) {
      const rating = value(m);
      if (rating >= 1 && rating <= 5) {
        out.min_rating = rating;
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
        out.min_experience = exp;
        break;
      }
    }
  }

  // ── Radius / proximity ──
  if (WITHIN_KM_PATTERN.test(lower)) {
    const m = lower.match(WITHIN_KM_PATTERN);
    if (m) {
      out.radius_km = parseFloat(m[1]);
    }
  } else if (PROXIMITY_PATTERN.test(lower)) {
    out.radius_km = 5;
  }

  // ── Grade ──
  //
  // Handled in priority order:
  //   1. `+2` / `plus two` / `plus 2` → "+2" (Nepali higher-secondary marker)
  //   2. `grade 11` / `class 11` / `level 11` / `standard 11` → "11"
  //   3. Word lookup: "eleven" → "11", "twelve" → "12", etc.
  //
  // Note: previously the regex was `/(?:grade|class|level|standard|\+2|plus.?2)\s*(\d{1,2})/i`
  // which matched the `2` inside `+2 Science` and produced `grade_level: "2"`. The new
  // version treats `+2` as a special marker (Nepali convention) and requires the
  // digit-after-keyword pattern to be bounded.
  if (/\+2\b/.test(lower) || /\bplus\s*(?:2|two)\b/.test(lower)) {
    out.grade_level = "+2";
  } else {
    const gradeMatch = lower.match(/\b(?:grade|class|level|standard)\s+(\d{1,2})\b/);
    if (gradeMatch) {
      out.grade_level = gradeMatch[1];
    } else {
      for (const [word, val] of Object.entries(GRADE_WORDS)) {
        if (lower.includes(word)) {
          out.grade_level = val;
          break;
        }
      }
    }
  }

  // ── Answer inference (single-token replies) ──
  // If we extracted nothing meaningful, try to infer the field from
  // what's missing. Mirrors constraintExtractor.ts lines 205–242.
  const extractedKeys = Object.keys(out);
  if (
    extractedKeys.length === 0 ||
    (extractedKeys.length === 1 && extractedKeys[0] === "query_text")
  ) {
    const pureNumber = lower.match(/^(\d+)$/);
    if (pureNumber) {
      const num = parseInt(pureNumber[1], 10);
      const isLikelyBudget = num >= 500;
      const isLikelyGrade = num <= 12 && !existing.grade_level;
      if (isLikelyGrade && !existing.grade_level) {
        out.grade_level = String(num);
      } else if (isLikelyBudget) {
        out.budget_max = num;
      } else if (num <= 50 && !existing.min_experience) {
        out.min_experience = num;
      }
    }

    if ((lower === "female" || lower === "male" || lower === "other") && !existing.gender_preference) {
      out.gender_preference = lower as "male" | "female" | "other";
    }

    if (lower === "online" && !existing.tutoring_mode) {
      out.tutoring_mode = "online";
    }
    if ((lower === "home" || lower === "offline") && !existing.tutoring_mode) {
      out.tutoring_mode = "home_tuition";
    }

    // Single word experience ("experienced", "expert")
    if (lower === "experienced" && !existing.min_experience) {
      out.min_experience = 3;
    } else if (lower === "expert" && !existing.min_experience) {
      out.min_experience = 5;
    }

    // Single word rating ("top", "best")
    if (lower === "top" || lower === "best") {
      if (!existing.min_rating) out.min_rating = 4.5;
    }

    // Single word proximity
    if (lower === "nearby" && !existing.radius_km) {
      out.radius_km = 5;
    }
  }

  return out;
}