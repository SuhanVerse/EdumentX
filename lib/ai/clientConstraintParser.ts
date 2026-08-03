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
  BUDGET_PATTERNS,
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
  // Uses the canonical BUDGET_PATTERNS from ai/domain/keywords.ts — they
  // reject bare numbers. Previously a loose regex matched the `2` inside
  // `+2 Science` and turned it into `budget_max: 2` — a number that's
  // clearly a grade marker, not a budget. The patterns now require either
  // a currency hint (rs / npr / ₹) OR a budget qualifier (under, below,
  // less than, max, around, about, approx, budget, afford, pay, spent,
  // spend, salary, cost, price, fee) OR a bare "k" suffix immediately
  // adjacent to the digits.
  for (const { regex, qualifier } of BUDGET_PATTERNS) {
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
      // "around / about / approx" → approximate CEILING only: raise the
      // upper bound by a flat Rs 3,000 slack, never set a lower bound.
      // The user is naming a rough maximum they can pay, not a range.
      out.budget_max = amount + 3000;
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

  // ── Radius / proximity (C12: map integration groundwork) ──
  //
  // "within 5 km" → explicit radius. "near me" / "nearby" → default 5 km
  // AND `location_preference: "near_me"`. The preference flag is the hook
  // the future map integration reads to prioritize location / use the
  // student's GPS. It doesn't change the current filter behavior — the
  // search still runs without real distance math.
  if (WITHIN_KM_PATTERN.test(lower)) {
    const m = lower.match(WITHIN_KM_PATTERN);
    if (m) {
      out.radius_km = parseFloat(m[1]);
    }
  } else if (PROXIMITY_PATTERN.test(lower)) {
    out.radius_km = 5;
    // "anywhere" wins over "nearby" if both appear (e.g. "anywhere nearby")
    if (!out.location_preference) {
      out.location_preference = "near_me";
    }
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
      // Roman-numeral grades ("grade XII" → 12). Word-boundary only —
      // `includes("xi")` would match "maximum". Mirrors the server
      // extractors.
      const romanGrade = lower.match(/\b(xii|xi|x)\b/i);
      if (romanGrade) {
        out.grade_level = { xii: "12", xi: "11", x: "10" }[romanGrade[1].toLowerCase()];
      } else {
        for (const [word, val] of Object.entries(GRADE_WORDS)) {
          if (lower.includes(word)) {
            out.grade_level = val;
            break;
          }
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
      out.location_preference = "near_me";
    }
  }

  // Normalize higher-secondary grades 11/12 → "+2" (the Nepali +2 marker).
  // "+2" is the canonical token the filters already understand — the mock
  // repository expands it to grades 11 AND 12, and migration 014's
  // grade_to_terms does the same server-side. So a student typing "11"
  // gets the same "+2" pill and result set as a student typing "12"
  // (grades 11-12 are one level in the Nepali system). Mirrors the
  // server extractors.
  if (out.grade_level === "11" || out.grade_level === "12") {
    out.grade_level = "+2";
  }

  return out;
}