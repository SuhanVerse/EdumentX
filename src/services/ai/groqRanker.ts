/**
 * EdumentX — Groq Re-Ranker
 *
 * Post-filter re-ranking + conversational refinement for the mock
 * tutor-search pipeline. Runs after `MockTutorRepository.searchTutors`
 * so the candidate list is already constrained by `MockTutorRepository`'s
 * filter pipeline — this module's job is to:
 *
 *   1. Interpret any conversational refinement the regex parser missed
 *      (e.g. "actually make it female", "in Kathmandu, not Baneshwor",
 *      "any tutor who teaches online is fine too").
 *   2. Re-rank the candidate list using a small LLM call so the cards
 *      presented to the user reflect the *intent* of the conversation,
 *      not just the keyword-extracted constraints.
 *   3. Generate the assistant's reply text — a short warm summary that
 *      references 1-2 specific cards when the user asked a refining
 *      question.
 *
 * Falls back to the input list unchanged (in input order) if Groq is
 * unreachable, returns malformed JSON, or the API key is missing. The
 * mock repository's deterministic ranking (verified → rating → reviews)
 * stays authoritative — this layer only *re-orders* the input.
 *
 * Reachable from React Native because it reads `process.env` (Metro
 * injects `EXPO_PUBLIC_*` vars at bundle time). The server-side Groq
 * client lives in `supabase/ai/utils/groqClient.ts` (Deno) — do NOT
 * import from `supabase/` here.
 */

import type { ChatResponse } from "@/services/ai/chatService";
import type { ClientSearchConstraints } from "@/lib/ai/minimumConstraints";

// ─── Types ───────────────────────────────────────────────────────────────────

type TutorCard = NonNullable<ChatResponse["tutor_cards"]>[number];

export interface GroqRankInput {
  /** Last few user/assistant turns, in chronological order. Already-truncated by caller. */
  recentMessages: readonly { role: "user" | "assistant"; text: string }[];
  /** Constraints accumulated from chip presets + keyword parsing so far this turn. */
  currentConstraints: ClientSearchConstraints;
  /** The deterministic top-N from MockTutorRepository. We re-order these, never add new ones. */
  candidates: readonly TutorCard[];
  /** Number of cards to return (default 5). */
  cap?: number;
}

export interface GroqRankOutput {
  /** Re-ordered cards. Same elements, new order. Falls back to input order on failure. */
  cards: TutorCard[];
  /** Refined constraints (LLM-interpreted). Falls back to input on failure. */
  refinedConstraints: ClientSearchConstraints;
  /** Optional reply text. Falls back to a short deterministic intro on failure. */
  replyText: string | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
// llama-3.1-70b-versatile was deprecated by Groq; use the newer variant.
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 20000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read the Groq API key from the React Native / Metro environment.
 * `EXPO_PUBLIC_*` vars are bundled into the JS at build time by Expo.
 * Returns null when unset — caller treats this as "skip the LLM call".
 */
function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!key || key.trim().length === 0) return null;
  return key.trim();
}

/**
 * Sliding-window truncation for context. Caps each message at
 * `maxChars` to bound the token budget. ~4 chars/token, so 280 chars
 * ≈ 70 tokens per message; 4 messages ≈ 280 tokens + system prompt.
 */
function truncateForContext(
  messages: readonly { role: "user" | "assistant"; text: string }[],
  maxChars = 280,
): { role: "user" | "assistant"; text: string }[] {
  return messages.map((m) => ({
    role: m.role,
    text: m.text.length > maxChars ? `${m.text.slice(0, maxChars - 1)}…` : m.text,
  }));
}

/**
 * Build the Groq system prompt. We ask for two things:
 *   - `refined_constraints` — same shape as ClientSearchConstraints
 *   - `reply` — short (1-3 sentence) response the user sees
 *   - `card_order` — array of tutor IDs in the order to display
 *
 * We deliberately do NOT ask the LLM to invent new tutors. The
 * `card_order` array is constrained to IDs from `candidates`, and
 * any IDs we don't recognise are dropped.
 */
function buildSystemPrompt(): string {
  return [
    "You are the EdumentX AI tutor-finder assistant.",
    "Your job: interpret conversational refinements in the student's latest",
    "message and re-rank the candidate tutors already filtered by the keyword",
    "parser. You do NOT invent new tutors. You do NOT add tutors that aren't",
    "in the candidate list. You only re-order and (optionally) rephrase the",
    "reply.",
    "",
    "Return strict JSON:",
    "{",
    '  "refined_constraints": { /* same fields as the input; only fill fields',
    '                            you are changing based on the latest message */ },',
    '  "reply": "1-3 sentences. Warm. Reference 1-2 specific tutors by name',
    '           when the user asked for a comparison or refinement.",',
    '  "card_order": ["id1", "id2", ...]   // tutor IDs from candidate list,',
    '                                         // in the order the user should see them.',
    '                                         // Must be a subset of candidates.',
    "}",
    "",
    "If the user is just searching (not refining), return refined_constraints",
    "as {} and reply as a short intro. card_order is required even for",
    "simple searches — order verified tutors first.",
  ].join("\n");
}

/**
 * Build the user-side prompt: history + constraints + candidate summary.
 * Each candidate is rendered as a compact line so the LLM has a fair
 * basis for ranking. Cap on candidate size keeps the token budget
 * under 1500 input tokens.
 */
function buildUserPrompt(input: GroqRankInput): string {
  const lines: string[] = [];

  lines.push("Constraints so far:");
  lines.push(JSON.stringify(input.currentConstraints, null, 2));

  if (input.recentMessages.length > 0) {
    lines.push("");
    lines.push("Recent conversation (oldest → newest):");
    for (const m of input.recentMessages) {
      const tag = m.role === "user" ? "Student" : "Assistant";
      lines.push(`${tag}: ${m.text}`);
    }
  }

  lines.push("");
  lines.push("Candidate tutors (already filtered by subject/grade/location/budget):");
  for (const c of input.candidates) {
    const loc = c.location ? `${c.location.neighborhood}, ${c.location.city}` : "—";
    const yrs = c.yearsExperience != null ? `${c.yearsExperience}yr` : "?";
    lines.push(
      `- id=${c.id} | ${c.fullName} | ${c.headline} | ${c.subjects.join("/")} | ` +
        `Rs ${c.monthlyRateNpr.toLocaleString()} | rating ${c.rating} (${c.reviewCount} reviews) | ` +
        `${yrs} | ${loc} | verified=${c.verificationStatus ?? "unknown"}`,
    );
  }

  return lines.join("\n");
}

/**
 * Parse and validate the Groq JSON response. Defensive: missing fields
 * fall back to safe defaults; unrecognised card IDs are dropped.
 */
function parseGroqResponse(
  raw: unknown,
  input: GroqRankInput,
): { ok: true; out: GroqRankOutput } | { ok: false } {
  if (typeof raw !== "object" || raw === null) return { ok: false };
  const obj = raw as Record<string, unknown>;

  // card_order — required, must be a subset of candidate IDs.
  if (!Array.isArray(obj.card_order)) return { ok: false };
  const byId = new Map(input.candidates.map((c) => [c.id, c]));
  const ordered: TutorCard[] = [];
  const seen = new Set<string>();
  for (const id of obj.card_order) {
    if (typeof id !== "string") continue;
    const card = byId.get(id);
    if (!card || seen.has(id)) continue;
    seen.add(id);
    ordered.push(card);
  }
  // Append any candidates the LLM forgot — we never drop a valid candidate.
  for (const c of input.candidates) {
    if (!seen.has(c.id)) ordered.push(c);
  }
  const cap = input.cap ?? 5;
  const cards = ordered.slice(0, cap);

  // refined_constraints — sparse patch over ClientSearchConstraints.
  const rcRaw = (obj.refined_constraints ?? {}) as Record<string, unknown>;
  const refinedConstraints: ClientSearchConstraints = { ...input.currentConstraints };
  for (const [k, v] of Object.entries(rcRaw)) {
    if (v === null || v === undefined || v === "") continue;
    (refinedConstraints as Record<string, unknown>)[k] = v;
  }

  // reply — string or null.
  const replyText =
    typeof obj.reply === "string" && obj.reply.trim().length > 0
      ? obj.reply.trim()
      : null;

  return { ok: true, out: { cards, refinedConstraints, replyText } };
}

// ─── Reorder Intent Detection ──────────────────────────────────────────────

/**
 * Keywords that indicate the user wants to RE-ORDER the current results
 * rather than just search. If none of these are present, the groqRank
 * call can be skipped — the deterministic order is fine.
 */
const REORDER_KEYWORDS = [
  /\bsort\s+(by|with)/i,
  /\b(highest|lowest|best|top)\s+(rated|review|price)/i,
  /\b(cheapest|most\s+expensive|most\s+affordable)\b/i,
  /\bre(-)?order\b/i,
  /\b(re|re-)?rank\b/i,
  /\border\s+by\b/i,
  /\barrange\s+(by|in)/i,
  /\blist\s+(by|in\s+order)/i,
  /\b(sort|order|arrange|list)\s+(by|in)/i,
  /\b(best\s+match|top\s+rated|best\s+suited)\b/i,
  /\bmost\s+(qualified|experienced|popular|reviewed)\b/i,
  /\b(by|sorted\s+by|arranged\s+by)\s+(experience|seniority|years)\b/i,
  /\b(experience[d]?|seniority|years?\s+of\s+experience)\s+(first|top|highest)\b/i,
  /\b(high|highest|most)\s+(experience|seniority)\b/i,
  /\bput\s+(the\s+)?(most\s+)?(experienced|senior)\s+(at|on)\s+(top|first)/i,
];

/**
 * Check if the user's message expresses intent to re-order or re-sort
 * the current search results. Used by the mock pipeline to decide
 * whether to invoke the groqRanker or use deterministic order.
 */
export function hasReorderIntent(recentMessages: readonly { role: "user" | "assistant"; text: string }[]): boolean {
  // Only inspect the latest user message — that's where reorder intent lives.
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    if (recentMessages[i].role === "user") {
      const msg = recentMessages[i].text.toLowerCase();
      return REORDER_KEYWORDS.some((p) => p.test(msg));
    }
  }
  return false;
}

// ─── Deterministic Sort (LLM-free) ──────────────────────────────────────────

export interface DeterministicSort {
  key: "experience" | "rating" | "reviews" | "price";
  direction: "asc" | "desc";
  /** Short human phrase for the reply, e.g. "most experienced tutors first". */
  label: string;
}

/**
 * Patterns that map unambiguously to a deterministic re-order. When one
 * of these matches, the mock pipeline sorts the cards directly — no Groq
 * call, no failure mode, no latency. Only vague reorder phrases that
 * can't be resolved here ("reorder", "best match", "best suited") fall
 * through to the LLM re-ranker.
 */
const DETERMINISTIC_SORT_PATTERNS: { re: RegExp; sort: DeterministicSort }[] = [
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

/**
 * Detect an unambiguous sort request in a user message.
 * Returns null when no deterministic sort can be resolved.
 */
export function detectDeterministicSort(message: string): DeterministicSort | null {
  const lower = message.toLowerCase();
  for (const { re, sort } of DETERMINISTIC_SORT_PATTERNS) {
    if (re.test(lower)) return sort;
  }
  return null;
}

/**
 * Deterministically re-order the candidate cards according to a detected
 * sort intent. Returns the input order untouched when no sort intent is
 * found. Ties preserve their existing relative order (stable sort).
 */
export function applyDeterministicSort(
  cards: readonly TutorCard[],
  message: string,
): TutorCard[] {
  const sort = detectDeterministicSort(message);
  if (!sort) return [...cards];

  const value = (c: TutorCard): number | null => {
    switch (sort.key) {
      case "experience":
        return c.yearsExperience ?? null;
      case "rating":
        return c.rating ?? null;
      case "reviews":
        return c.reviewCount ?? null;
      case "price":
        return c.monthlyRateNpr ?? null;
    }
  };

  const sorted = [...cards].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    // Cards with missing sort data always sink to the bottom,
    // regardless of direction.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return sort.direction === "desc" ? bv - av : av - bv;
  });
  return sorted;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Re-rank candidates + interpret refinements via Groq.
 *
 * Returns the input candidates in their input order (deterministic
 * fallback) when:
 *   - the API key is missing
 *   - the network request fails or times out
 *   - the response isn't valid JSON or doesn't have the expected shape
 *
 * The function never throws — failures are observable via console.warn
 * and via the `replyText: null` field on the returned `GroqRankOutput`.
 */
export async function groqRank(input: GroqRankInput): Promise<GroqRankOutput> {
  const cap = input.cap ?? 5;
  const fallback: GroqRankOutput = {
    cards: input.candidates.slice(0, cap),
    refinedConstraints: input.currentConstraints,
    replyText: null,
  };

  const apiKey = getApiKey();
  if (!apiKey) {
    // No key — skip silently. The mock pipeline still returns the
    // deterministic top-N from MockTutorRepository.
    return fallback;
  }

  if (input.candidates.length === 0) {
    // Nothing to re-rank — skip the network call.
    return fallback;
  }

  const recentMessages = truncateForContext(input.recentMessages);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt({ ...input, recentMessages }) },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      // Log the response body to help debug the 400 error
      try {
        const errorBody = await response.text();
        console.warn(`[groqRanker] Groq API error ${response.status} — body: ${errorBody.slice(0, 500)}`);
      } catch {
        console.warn(`[groqRanker] Groq API error ${response.status} — (could not read body)`);
      }
      return fallback;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.warn("[groqRanker] Groq returned no content — using deterministic order");
      return fallback;
    }

    // Strip markdown code fences before parsing JSON.
    // Without `response_format: { type: "json_object" }`, the model
    // wraps its JSON output in ```json ... ``` fences. JSON.parse
    // chokes on the backticks and the "json" tag.
    const cleanJson = content
      .replace(/^```(?:json)?\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      console.warn("[groqRanker] Failed to parse Groq JSON:", err, "— raw:", cleanJson.slice(0, 200));
      return fallback;
    }

    const result = parseGroqResponse(parsed, input);
    if (!result.ok) {
      console.warn("[groqRanker] Groq response missing required fields — using deterministic order");
      return fallback;
    }

    return result.out;
  } catch (err) {
    clearTimeout(timer);
    // AbortError on timeout, network errors otherwise. All treated as
    // "fall back to deterministic order" — never break the bot.
    console.warn("[groqRanker] Re-rank failed, using deterministic order:", err);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}