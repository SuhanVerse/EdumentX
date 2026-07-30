/**
 * EdumentX AI — Canonical Keyword Tables
 *
 * SINGLE SOURCE OF TRUTH for all keyword-based extraction.
 * All consumers (client parser, server extractor, SQL builder, intent
 * classifier) import from here — no more duplicate tables to keep in sync.
 *
 * If you add a keyword here, all consumers get it automatically.
 *
 * Tables:
 *   - SUBJECT_KEYWORDS   — subject → keyword mapping (used by parser + prompts)
 *   - LOCATIONS          — Kathmandu Valley neighborhood/city names
 *   - GRADE_WORDS        — word → number mapping for grades
 *   - OFF_TOPIC_PATTERNS — regex patterns for quick off-topic detection
 */

// ─── Subject Keywords ────────────────────────────────────────────────────────
//
// Order matters: Computer Science is checked BEFORE Science so a phrase like
// "+2 computer science" matches CS instead of generic Science.
//
// CRITICAL: Do NOT add bare "it" as a keyword. `str.includes("it")` matches
// every message containing the substring "it" — e.g. "cap**it**al", "ed**it**",
// "un**it**" — and changes the subject to Computer Science. Users who mean "IT"
// (Information Technology) should type "computer", "programming", "csit", or
// "information technology".

export const SUBJECT_KEYWORDS: ReadonlyArray<{
  label: string;
  keywords: readonly string[];
}> = [
  { label: "Mathematics", keywords: ["math", "maths", "mathematics", "algebra", "calculus", "trigonometry", "geometry", "arithmetic"] },
  { label: "Physics", keywords: ["physics", "mechanics", "electricity", "optics", "thermodynamics"] },
  { label: "Chemistry", keywords: ["chemistry", "organic", "inorganic", "physical chemistry"] },
  { label: "Biology", keywords: ["biology", "bio", "zoology", "botany", "genetics", "cell biology", "photosynthesis", "ecosystem", "ecology", "cells", "dna", "anatomy", "physiology", "evolution", "microbiology", "molecular biology", "biochemistry"] },
  { label: "Computer Science", keywords: ["computer", "programming", "coding", "python", "javascript", "html", "css", "information technology", "csit", "computer science"] },
  { label: "Science", keywords: ["science", "general science", "environmental science"] },
  { label: "English", keywords: ["english", "grammar", "literature", "writing", "communication"] },
  { label: "Nepali", keywords: ["nepali", "nepali language"] },
  { label: "Accountancy", keywords: ["account", "accountancy", "accounting"] },
  { label: "Economics", keywords: ["economics", "macro", "micro"] },
  { label: "Social Studies", keywords: ["social", "social studies", "social science", "sociology"] },
  { label: "History", keywords: ["history", "world history", "nepali history"] },
  { label: "Geography", keywords: ["geography"] },
  { label: "Law", keywords: ["law", "legal"] },
  { label: "Philosophy", keywords: ["philosophy", "logic"] },
  { label: "Psychology", keywords: ["psychology"] },
];

/** Look up keywords for a given subject label. */
export function getSubjectKeywords(label: string): readonly string[] {
  return SUBJECT_KEYWORDS.find((s) => s.label === label)?.keywords ?? [];
}

// ─── Location Keywords (Kathmandu Valley) ────────────────────────────────────

export const LOCATIONS: readonly string[] = [
  "baneshwor", "kathmandu", "lalitpur", "patan", "bhaktapur",
  "baluwatar", "kalanki", "balkhu", "gongabu", "bhaisepati",
  "mahalaxmisthan", "taumadhi", "suryabinayak", "swayambhu",
  "pulchowk", "jawalakhel", "kupondole", "sanepa", "chakrapath",
  "basundhara", "sitapaila", "tokha", "budhanilkantha", "chabahil",
  "koteshwor", "sinamangal", "tinkune", "new baneshwor", "old baneshwor",
  "dhumbarahi", "pingalsthan", "putalisadak", "maharajgunj",
];

// ─── Grade Word Lookup ──────────────────────────────────────────────────────

export const GRADE_WORDS: Readonly<Record<string, string>> = {
  eleven: "11", eleventh: "11", twelve: "12", twelfth: "12",
  nursery: "Nursery", lkg: "LKG", ukg: "UKG",
};

// ─── Off-Topic Patterns ─────────────────────────────────────────────────────
//
// Patterns used by `quickOffTopicCheck` in the intent classifier.
// These are cheap pre-filters before any LLM call.
//
// NOTE: `/^explain\s+/` is intentionally NOT here — "explain calculus"
// should map to a tutor search (subject = Mathematics), not off-topic.
// Users who type "explain" usually want a tutor who can teach that topic.
// The LLM intent classifier handles truly off-topic "explain" requests.

export const OFF_TOPIC_PATTERNS: ReadonlyArray<RegExp> = [
  // Code & homework requests
  /^write\s+/,
  /^create\s+/,
  /^solve\s+/,
  /^calculate\s+/,
  /^(write|create|make) (a|an|me)\s+(python|javascript|code|program|function|app)/,
  /\b(homework|assignment|exam)\s+(help|answer|solution)\b/,
  /\bdo\s+(my|this)\s+(homework|assignment)\b/,

  // Performance / entertainment requests (word-boundary so "dancer" doesn't match)
  /\b(dance|sing|joke|poem|riddle)\b/i,
  /^tell me a (joke|story|poem|riddle)/i,

  // General-knowledge "what is the X" — only factual topics, NOT tutor-related
  /^what is the (capital|largest|tallest|smallest|oldest|newest|highest|lowest|meaning|definition|population)/i,
];

// ─── Open-ended Location Opt-Out Phrases ─────────────────────────────────────

export const ANYWHERE_TRIGGERS: readonly string[] = [
  "anywhere", "anything", "any location", "any place", "any city",
  "any area", "any tutor location", "doesn't matter", "doesnt matter",
  "don't mind", "dont mind", "no preference", "no specific location",
  "not picky", "no location", "online is fine", "doesn't care", "don't care",
];

export const BARE_ANYWHERE: readonly string[] = [
  "anywhere", "anywhere.", "anything", "anything.",
  "doesn't matter", "doesnt matter", "don't mind", "dont mind",
  "no preference", "any location", "any city", "any area",
  "anywhere is fine", "anything is fine", "not picky", "no location",
  "anywhere works", "anywhere please",
  "i don't care about location", "location doesn't matter",
];

// ─── Gender Detection Patterns ───────────────────────────────────────────────
//
// WARNING: Use word-boundary regex (`\b`) to avoid false positives
// like "Kathmandu" containing "man".

export const FEMALE_PATTERN = /\b(female|lady|woman|girl)\b/i;
export const MALE_PATTERN = /\b(male|man|gentleman|boy)\b/i;

// ─── Tutoring Mode Detection ─────────────────────────────────────────────────

export const ONLINE_KEYWORDS = ["online", "virtual", "remote"];
export const HOME_KEYWORDS = ["home", "nearby", "in-person", "near me", "at home", "in person", "house", "doorstep"];

// ─── Rating Extraction Patterns ──────────────────────────────────────────────

export type RatingPattern = {
  regex: RegExp;
  /** Returns the rating value from the match. */
  value: (match: RegExpMatchArray) => number;
};

export const RATING_PATTERNS: ReadonlyArray<RatingPattern> = [
  { regex: /(\d+(?:\.\d+)?)\s*\+?\s*(?:stars?|rating|rated|out\s+of\s+5)\b/i, value: (m) => parseFloat(m[1]) },
  { regex: /\b(top|best|highest)\s+rated\b/i, value: () => 4.5 },
  { regex: /\bhighly\s+rated\b/i, value: () => 4 },
  { regex: /\b(?:only\s+)?(?:the\s+)?best\b(?!\s+tutor)/i, value: () => 4.5 },
];

// ─── Experience Extraction Patterns ──────────────────────────────────────────

export type ExperiencePattern = {
  regex: RegExp;
  /** Returns the experience value from the match. */
  value: (match: RegExpMatchArray) => number;
};

export const EXPERIENCE_PATTERNS: ReadonlyArray<ExperiencePattern> = [
  // "4+ years experience" / "4+ years of experience" / "4+ years teaching"
  { regex: /(\d+)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp|teaching)\b/i, value: (m) => parseInt(m[1], 10) },
  // "4+ years exp" / "4+ years exp."
  { regex: /(\d+)\s*\+?\s*years?\s+(?:experience|exp|exp.)/i, value: (m) => parseInt(m[1], 10) },
  // Bare "4+ years" — no "experience" required after it
  { regex: /(\d+)\s*\+\s*(?:years?|yrs?)\b/i, value: (m) => parseInt(m[1], 10) },
  // "more than X years" / "over X years" / "above X years" — no "+" needed
  { regex: /\b(more\s+than|over|above)\s+(\d+)\s*(?:years?|yrs?)\b/i, value: (m) => parseInt(m[2], 10) },
  // "X+ experience year(s)" — words in reverse order ("6+ experience year")
  { regex: /(\d+)\s*\+\s*experience\s+(?:years?|yrs?)\b/i, value: (m) => parseInt(m[1], 10) },
  // "experienced" or "experience" — default 3 (catch-all for bare word)
  { regex: /\bexperience[d]?\b/i, value: () => 3 },
  // "at least 3 years" / "minimum 5 years" / "min 3 years"
  { regex: /\b(at\s+least|minimum|min)\s+(\d+)\s*(?:years?|yrs?)\b/i, value: (m) => parseInt(m[2], 10) },
];

// ─── Proximity / Radius Patterns ─────────────────────────────────────────────

export const WITHIN_KM_PATTERN = /\bwithin\s+(\d+(?:\.\d+)?)\s*(?:km|kms?|kilometers?|kilometres?)\b/i;
export const PROXIMITY_PATTERN = /\b(nearby|near\s+me|close\s+to|walking\s+distance|near\s+my|proximity)\b/i;
