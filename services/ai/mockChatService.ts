/**
 * EdumentX — Mock Chat Service
 *
 * Client-side mock of `services/ai/chatService.ts`. Used when
 * `EXPO_PUBLIC_USE_MOCK_DATA=true`. Produces the same `ChatResponse`
 * shape as the live Edge Function so the Zustand store and chat UI
 * are unaffected.
 *
 * Pipeline:
 *   1. Run `parseMessageToConstraints(message, currentConstraints)` to
 *      merge the new message into the existing constraint patch.
 *   2. Check `hasMinimumConstraints(merged)` — if not, return a
 *      clarifying question (same source as the live path).
 *   3. Translate `ClientSearchConstraints` (snake_case server style)
 *      → `TutorSearchFilters` (camelCase repository style).
 *   4. Call `MockTutorRepository.searchTutors(filters)`.
 *   5. Project listings → `tutor_cards` shape (id, fullName, headline,
 *      subjects, monthlyRateNpr, rating, reviewCount, location,
 *      photoUrl, verificationStatus).
 *   6. Build a deterministic response text. No LLM call.
 *
 * Differences from the live Edge Function:
 *   - No LLM extraction — keyword parsing only.
 *   - No embeddings / vector search.
 *   - No fallback chain — the repository applies filters directly.
 *   - No Supabase PG row reads — pure JS in-memory.
 *
 * The point is to test the conversation logic + filter pipeline + UI
 * deterministically, with zero network. Switching back to the live
 * path requires only flipping the env var.
 */

import type { ChatResponse } from "@/services/ai/chatService";
import { MockTutorRepository } from "@/services/tutors/MockTutorRepository";
import type {
  TutorListing,
  TutorSearchFilters,
} from "@/services/tutors/TutorRepository";
import { parseMessageToConstraints } from "@/lib/ai/clientConstraintParser";
import {
  hasMinimumConstraints,
  getNextClientQuestion,
  type ClientSearchConstraints,
} from "@/lib/ai/minimumConstraints";
import { MOCK_TUTORS_COUNTS } from "@/lib/mock/tutors";
import {
  groqRank,
  hasReorderIntent,
  detectDeterministicSort,
  applyDeterministicSort,
} from "@/services/ai/groqRanker";
import {
  checkResponse,
  containsOffensiveContent,
  checkPromptInjection,
} from "@/ai/domain/guardrails";

// ─── FAQ entries (mirror of ai/knowledgeBase/faq.ts for the mock pipeline) ──
//
// The mock pipeline doesn't call the server's FAQ matcher. We inline the
// most common FAQ questions and answers here so the mock behaves the same
// way as the live server path.
const MOCK_FAQ: Array<{ keywords: string[]; question: string; answer: string }> = [
  {
    keywords: ["verified", "verification", "blue tick", "badge", "authentic", "trusted"],
    question: "What is a Verified Tutor?",
    answer:
      "A Verified Tutor has completed EdumentX's verification process, which confirms their identity and qualifications. " +
      "They display a verification badge on their profile. Only verified tutors appear in search results.",
  },
  {
    keywords: ["verification process", "how to verify", "verification steps", "tutor verification", "verification work"],
    question: "How does tutor verification work?",
    answer:
      "The verification process has 3 steps: (1) Submit documents — government-issued ID, education certificate, and introductory video. " +
      "(2) Admin review — typically 24-48 hours. (3) Approval or feedback with what to resubmit.",
  },
  {
    keywords: ["documents required", "what documents", "required documents", "what to submit", "id proof"],
    question: "What documents are required?",
    answer:
      "You need: (1) Government-issued ID (Citizenship, Passport, or National ID), " +
      "(2) Academic certificate or transcript, (3) A 2-minute introductory video explaining your teaching approach.",
  },
  {
    keywords: ["book", "booking", "enroll", "enrollment", "sign up with tutor", "hire", "register", "book a tutor", "book tutor"],
    question: "How do I book or enroll with a tutor?",
    answer:
      "Enrolling is easy: (1) Find a tutor you like, (2) Tap their profile, (3) Tap 'Enroll', " +
      "(4) Send a message with your subject and preferred schedule. The tutor will respond within 24 hours.",
  },
  {
    keywords: ["sign up", "register", "create account", "how to join", "become a tutor"],
    question: "How do I sign up as a tutor?",
    answer:
      "Sign up with your email or Google account, select 'Tutor' as your role, complete your profile with qualifications, " +
      "and submit your verification documents. The admin team will review within 24-48 hours.",
  },
  {
    keywords: ["edumentx", "platform", "app info", "what does edumentx do", "this app", "what does this app do"],
    question: "What is EdumentX?",
    answer:
      "EdumentX is a Nepali home tutoring marketplace connecting students with verified tutors. " +
      "We're currently serving the Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur).",
  },
  {
    keywords: ["recommendation", "how are tutors chosen", "matching", "algorithm", "how it works", "how does it work"],
    question: "How does the AI tutor recommendation work?",
    answer:
      "The AI considers: subject match, budget range, tutor rating, experience level, and your preferences. " +
      "All recommended tutors are verified and approved.",
  },
  {
    keywords: ["no tutors", "can't find", "no results", "no match", "nothing available"],
    question: "What if I can't find a tutor?",
    answer:
      "Try widening your budget range, try a different subject, remove location filters, or check back later. " +
      "You can also browse all available tutors in the Discover section.",
  },
  {
    keywords: ["privacy", "data", "information safe", "secure", "personal data"],
    question: "Is my personal information safe?",
    answer:
      "Yes. Your contact information is only shared with tutors you choose to enroll with. " +
      "We follow standard data protection practices and never share your data with third parties.",
  },
  {
    keywords: ["rejected", "application rejected", "why rejected", "resubmit", "reapply"],
    question: "Why was my application rejected?",
    answer:
      "Common reasons: unclear documents, wrong document type, missing information, or inconsistent information. " +
      "You'll receive specific feedback on what to fix and can resubmit.",
  },
  // ── General app usage (not tutor search, not off-topic) ──
  {
    keywords: ["navigate", "navigation", "how to use this app", "how to use edumentx", "how do i use", "get started", "getting started"],
    question: "How do I navigate the app?",
    answer:
      "Here's how to get around EdumentX:\n\n" +
      "• **Find tutors** — Use the search bar, browse the map, or chat with me for recommendations!\n" +
      "• **View a tutor's profile** — Tap on any tutor card to see their full details\n" +
      "• **Enroll with a tutor** — Tap 'Enroll' on their profile and send a message\n" +
      "• **Your profile** — Tap the profile icon to manage your account and settings\n" +
      "• **Your enrollments** — Track your enrollment requests in the Enrollments tab\n\n" +
      "What would you like to do? I can help you find a tutor for any subject!",
  },
];

// ─── Warm-tone bank (no LLM) ────────────────────────────────────────────────

/** Short, deterministic, optional follow-up phrase. No tutor names. */
const WARM_TONE_BANK = [
  "Hope this helps you find a good fit!",
  "Let me know if you'd like to refine any of these.",
  "Tap any card to see the full profile.",
  "Each card has the tutor's headline, subjects, and rate.",
];

function pickWarmTone(seed: number): string {
  return WARM_TONE_BANK[seed % WARM_TONE_BANK.length];
}

// ─── Constraint → Filter translation ────────────────────────────────────────

/**
 * Map `ClientSearchConstraints` (snake_case) to `TutorSearchFilters`
 * (camelCase). Drops server-side fields the mock doesn't understand
 * (e.g. `radius_km`, `min_rating`, `query_text`).
 */
function constraintsToFilters(c: ClientSearchConstraints): TutorSearchFilters {
  const out: TutorSearchFilters = {};
  if (c.subject) out.subject = c.subject;
  if (c.grade_level) out.gradeLevel = c.grade_level;
  if (c.budget_max != null) out.budgetMax = c.budget_max;
  if (c.location_text) out.locationText = c.location_text;
  if (c.gender_preference) out.genderPreference = c.gender_preference;
  // The server uses "home_tuition" / "online" but the mock uses
  // "home" / "online" — normalize.
  if (c.tutoring_mode) {
    out.tutoringMode =
      c.tutoring_mode === "home_tuition" ? "home" : c.tutoring_mode;
  }
  if (c.language) out.language = c.language;
  if (c.min_experience != null) out.minExperience = c.min_experience;
  if (c.min_rating != null) out.minRating = c.min_rating;
  if (c.radius_km != null) out.radiusKm = c.radius_km;
  if (c.verified_only != null) out.verifiedOnly = c.verified_only;
  return out;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Mock implementation of `sendChatMessage`. Same signature, same
 * return type. See `chatService.ts` for the full contract.
 */
export async function sendMockChatMessage(
  sessionId: string,
  message: string,
  currentConstraints?: Record<string, unknown>,
  options?: {
    student_location?: { latitude: number; longitude: number };
    student_profile?: { grade?: string; subjects?: string[] };
    recent_messages?: Array<{ role: "user" | "assistant"; text: string }>;
  },
): Promise<ChatResponse> {
  const msgLower = message.toLowerCase().trim();

  // Step 0.1: Pre-generation guardrails — offensive content + prompt injection.
  // These run BEFORE any processing to catch abusive or manipulative messages.
  if (containsOffensiveContent(message)) {
    console.log("[guardrails] Offensive content detected, blocking");
    return {
      type: "message",
      content: "I'm designed to help you find tutors on EdumentX. Let's keep our conversation respectful and focused on finding the right tutor for you. What subject are you interested in?",
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: (currentConstraints ?? {}) as Record<string, unknown>,
      },
    };
  }

  const injectionCheck = checkPromptInjection(message);
  if (!injectionCheck.passed) {
    console.log("[guardrails] Prompt injection detected, blocking");
    return {
      type: "message",
      content: injectionCheck.suggested_fallback ?? "I'm designed to help you find tutors on EdumentX. Let's focus on that — what subject are you looking for help with?",
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: (currentConstraints ?? {}) as Record<string, unknown>,
      },
    };
  }

  // Step 0: FAQ pre-check (RUNS FIRST — FAQ questions are in-scope and
  // must be answered, not treated as off-topic or search).
  //
  // "What is a verified tutor?" → should return FAQ answer, not tutors.
  // "How does verification work?" → same.
  const faqAnswer = matchMockFaq(message);
  if (faqAnswer) {
    return {
      type: "message",
      content: faqAnswer + "\n\nWould you like help finding a tutor for a specific subject?",
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: (currentConstraints ?? {}) as Record<string, unknown>,
      },
    };
  }

  // Step 0.5: Greeting pre-check (runs after FAQ, before off-topic).
  //
  // Only matches PURE greetings — anchored to the full message so
  // "Hi I need a tutor" does NOT match (it goes to constraint parsing).
  const greetingPatterns = [
    /^(hi|hello|hey|howdy)(\s+there)?[.!?\s]*$/i,
    /^(good\s+)?(morning|afternoon|evening)[.!?\s]*$/i,
    /^what('s| is) up[!?\s]*$/i,
    /^how are you[!?\s]*$/i,
    /^how('s| is) it going[!?\s]*$/i,
  ];
  if (msgLower.length >= 1 && greetingPatterns.some((p) => p.test(msgLower))) {
    return {
      type: "message",
      content: "Hello! I'm EdumentX AI. I can help you find the perfect tutor for your needs. What subject are you looking for help with?",
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: (currentConstraints ?? {}) as Record<string, unknown>,
      },
    };
  }

  // Step 0.7: Off-topic guard (runs AFTER FAQ + greetings).
  //
  // Only catches the most obvious off-topic cases: code requests,
  // homework help, and stand-alone action words like "dance".
  // Everything else falls through to the constraint parser — if no
  // tutor-relevant keywords are found, existing constraints stay
  // unchanged and search runs as normal. That's acceptable for an MVP.
  const offTopicPatterns = [
    // Code & homework requests
    /^write\s+/,
    /^create\s+/,
    /^solve\s+/,
    /^calculate\s+/,
    /^(write|create|make) (a|an|me)\s+(python|javascript|code|program|function|app)/,
    /\b(homework|assignment|exam)\s+(help|answer|solution)\b/,
    /\bdo\s+(my|this)\s+(homework|assignment)\b/,

    // Performance / entertainment requests (word-boundary so "dancer"
    // doesn't match but "dance" does). NOTE: "tell me a joke" needs
    // an entertainment word after it — "tell me a good tutor" is VALID.
    /\b(dance|sing|joke|poem|riddle)\b/i,
    /^tell me a (joke|story|poem|riddle)/i,

    // General-knowledge "what is the X" questions — only factual topics
    // that are clearly NOT tutor-related (capital, meaning, definition,
    // largest, tallest, etc. are geography/general knowledge).
    // This does NOT catch "what is the best tutor" or "what is the fee"
    // which are valid EdumentX queries.
    /^what is the (capital|largest|tallest|smallest|oldest|newest|highest|lowest|meaning|definition|population)/i,
  ];
  if (msgLower.length >= 3 && offTopicPatterns.some((p) => p.test(msgLower))) {
    return {
      type: "message",
      content: "I'm designed to help you find the right tutor on EdumentX. I can't help with that, but I'd be happy to help you search for tutors by subject, budget, or preference. What subject are you looking for help with?",
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: (currentConstraints ?? {}) as Record<string, unknown>,
      },
    };
  }

  // Step 0.75: Contact-info request guard.
  //
  // Students occasionally ask for a tutor's phone/email. By design we NEVER
  // share personal contact details in chat — they're surfaced only after the
  // student enrolls with the tutor (see the privacy FAQ + checkContactInfoLeak
  // guardrail). Answer deterministically (no LLM) so the request can't be
  // misrouted to a search re-run or a generic FAQ answer.
  const contactInfoPatterns = [
    // Suffix REQUIRED (not optional) so a bare word like "phone" or "email"
    // in an unrelated message ("my phone is broken…") doesn't false-positive.
    // Possessive forms ("their email", "tutor's phone") are handled below.
    /\b(phone|whatsapp|viber)\s*(numbers?|nos?\.?|contacts?|details?|ids?)\b/i,
    /\b(mobile|cell)\s+(numbers?|nos?\.?)\b/i,
    /\bemail\s*(addresses?|ids?)\b/i,
    /\bcontact\s+(details?|info(?:rmation)?)\b/i,
    /\b(contact|reach|call|message)\s+(the\s+)?(tutor|teacher|them|her|him)\b/i,
    /\b(tutor's|their|his|her)\s+(phone|email|contact|numbers?|whatsapp|mobile)\b/i,
  ];
  if (msgLower.length >= 3 && contactInfoPatterns.some((p) => p.test(msgLower))) {
    return {
      type: "message",
      content:
        "I can't share tutors' personal contact details like phone numbers or emails — that protects their privacy. " +
        "Once you enroll with a tutor through the app, you'll be connected with them directly to schedule and communicate. " +
        "Would you like help finding a tutor?",
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: (currentConstraints ?? {}) as Record<string, unknown>,
      },
    };
  }

  // Step 0.8: Acknowledgment pre-check.
  //
  // "okay", "sounds good", "thanks", "great" etc. acknowledge the last
  // message rather than start a new search. Re-running the search would
  // just re-show identical cards (wasteful + confusing). Instead:
  //   - still collecting constraints → continue naturally with the next
  //     question (contextual continuation, no re-parse);
  //   - results already shown → short warm acknowledgment pointing back
  //     at the cards. (In-session, minimum constraints being met means a
  //     search already ran and cards are on screen.)
  // NOTE: `yes|yeah|yep` are included because the current collection flow
  // only asks OPEN-ENDED questions (subject/grade/budget) — "yes" can never
  // be a valid answer today. If a yes/no follow-up question is ever added
  // ("Do you prefer online tutoring?"), REMOVE them from this list or the
  // acknowledgment will silently swallow the answer.
  const acknowledgmentPatterns = [
    /^(ok|okay|k|kk|sure|alright|all right|fine|good|great|nice|awesome|cool|perfect|got it|understood|yes|yeah|yep)\b[.!?\s]*$/i,
    /^(sounds (good|great|perfect)|that('s| is) (good|great|perfect|fine)|works for me|makes sense)\b[.!?\s]*$/i,
    /^(thanks|thank you|thank u|thx|ty)(\s+(a lot|so much))?[.!?\s]*$/i,
    /^(ok|okay|sure|alright)\s+(thanks|thank you|thank u|thx|ty)[.!?\s]*$/i,
  ];
  if (msgLower.length >= 1 && acknowledgmentPatterns.some((p) => p.test(msgLower))) {
    const existingAck = (currentConstraints ?? {}) as ClientSearchConstraints;
    // Still collecting? Continue with the next question — don't re-run.
    if (!hasMinimumConstraints(existingAck)) {
      const question = getNextClientQuestion(existingAck);
      if (question) {
        return {
          type: "message",
          content: question,
          session_id: sessionId,
          state: {
            current_step: "collecting",
            constraints: existingAck as Record<string, unknown>,
          },
        };
      }
    }
    const isThanks = /^\s*(?:ok|okay|sure|alright)?\s*(?:thanks?|thank\s+(?:you|u)|thx|ty)\b[.!?\s]*$/i.test(msgLower);
    return {
      type: "message",
      content: isThanks
        ? "You're welcome! If you'd like to refine your results or search for another subject, just let me know."
        : // Neutral on purpose: the last response may have been the empty-result
          // hint ("No tutors match…"), in which case claiming matches are
          // "above" would be misleading. This ack works whether cards exist
          // or not.
          "Got it! Let me know if you'd like to adjust your filters or search for a different subject.",
      session_id: sessionId,
      state: {
        current_step: "presenting",
        constraints: existingAck as Record<string, unknown>,
      },
    };
  }

  // Step 1 — merge the new message into the existing patch.
  const existing = (currentConstraints ?? {}) as ClientSearchConstraints;
  const parsed = parseMessageToConstraints(message, existing);
  let merged: ClientSearchConstraints = { ...existing, ...parsed };

  // Step 1.5 — a pure sort phrase must not ALSO become a filter (mirrors
  // the Edge Function's stripSortPhraseFilters). "sort by experience" sets
  // no min_experience; "top rated" sets no min_rating — unless the user
  // states an explicit numeric threshold ("3+ years", "4.5+ stars").
  const earlySort = detectDeterministicSort(message);
  if (earlySort) {
    if (
      earlySort.key === "experience" &&
      merged.min_experience !== undefined &&
      !/\b\d+\s*(?:years?|yrs?)\b/i.test(message)
    ) {
      delete merged.min_experience;
    }
    if (
      earlySort.key === "rating" &&
      merged.min_rating !== undefined &&
      !/\b\d+(?:\.\d+)?\s*(?:stars?|rating|rated|out\s+of\s+5)\b/i.test(message)
    ) {
      delete merged.min_rating;
    }
  }

  // Step 2 — minimum-constraint gate. If not ready, ask one question.
  //
  // The gate (`hasMinimumConstraints`) and the question picker
  // (`getNextClientQuestion`) now share their helpers in
  // `lib/ai/minimumConstraints.ts` so they can never disagree. The
  // fallback below can only fire if a future change re-introduces an
  // inconsistency; if it does, we surface the *specific* missing field
  // instead of a generic "tell me more".
  if (!hasMinimumConstraints(merged)) {
    const question = getNextClientQuestion(merged);
    if (question) {
      return {
        type: "message",
        content: question,
        session_id: sessionId,
        state: {
          current_step: "collecting",
          constraints: merged as Record<string, unknown>,
        },
        // No tutor cards yet — we're still collecting.
      };
    }
    // Defensive fallback. Should never hit in practice.
    const missing = [];
    if (!merged.subject) missing.push("subject");
    if (!merged.grade_level) missing.push("grade");
    if (merged.budget_max == null || merged.budget_max <= 0) missing.push("budget");
    return {
      type: "message",
      content: `I still need: ${missing.join(", ")}. Could you tell me about those?`,
      session_id: sessionId,
      state: {
        current_step: "collecting",
        constraints: merged as Record<string, unknown>,
      },
    };
  }

  // Step 3 — translate constraints to repository filters.
  const filters = constraintsToFilters(merged);

  // Step 4 — search the mock repository.
  const { tutors, totalCount } = await MockTutorRepository.searchTutors(filters);

  // Step 5 — project to tutor_cards shape (matches the Edge Function
  // contract in `services/ai/chatService.ts#mapTutorCard`).
  const tutorCards = toTutorCards(tutors);

  // Step 5b — Groq re-rank + conversational refinement.
  //
  // Only called when the user explicitly asks for re-ordering
  // ("sort by rating", "cheapest first", "best tutors"). For normal
  // searches, the deterministic order from MockTutorRepository is
  // sufficient — avoiding the LLM call saves cost and latency.
  //
  // The keyword parser (`parseMessageToConstraints`) already handles
  // constraint extraction. groqRank's only remaining job is re-order
  // and reply text generation for refinement queries.
  //
  // NOTE: `recentMessages` does NOT include the current `message`.
  // We prepend it so `hasReorderIntent` can check the latest turn.
  const recentMessages = [
    ...(options?.recent_messages ?? []),
    { role: "user" as const, text: message },
  ];
  let finalCards: NonNullable<ChatResponse["tutor_cards"]> = tutorCards as NonNullable<ChatResponse["tutor_cards"]>;
  let refinedMerged: ClientSearchConstraints = { ...merged };
  let replyText: string | null = null;

  // Step 5b-i — Deterministic sort (LLM-free).
  //
  // Explicit sort requests ("sort by experience", "cheapest first",
  // "highest rated") are resolved here by sorting the cards directly.
  // This never fails, costs nothing, and is instant — no Groq call, no
  // fallback-to-deterministic-order surprise. Only vague reorder phrases
  // that can't be resolved here fall through to groqRank below.
  const sortIntent = detectDeterministicSort(message);
  if (sortIntent) {
    // Re-fetch a LARGER pool (cap 20) so the sort can surface the best
    // match (e.g. the most experienced tutor) even if they ranked beyond
    // the top-5 by the default deterministic order — then sort + cap to
    // the chat card limit. Mirrors the Edge Function's executeSearch.
    const biggerPool = await MockTutorRepository.searchTutors(filters, 20);
    finalCards = applyDeterministicSort(toTutorCards(biggerPool.tutors), message).slice(0, 5);
    replyText = `Here are ${finalCards.length} tutor${finalCards.length === 1 ? "" : "s"} for you, ${sortIntent.label}.`;
    console.log(`[mockChatService] Deterministic sort: ${sortIntent.key} (${sortIntent.direction})`);
  } else if (hasReorderIntent(recentMessages)) {
    console.log("[mockChatService] Reorder intent detected — calling groqRank");
    const rankOutput = await groqRank({
      recentMessages,
      currentConstraints: merged,
      candidates: tutorCards,
      cap: 5,
    });
    finalCards = rankOutput.cards;
    replyText = rankOutput.replyText;
    // Apply LLM refinements (only for fields the keyword parser missed).
    refinedMerged = {
      ...rankOutput.refinedConstraints,
    };
    for (const key of Object.keys(parsed) as Array<keyof ClientSearchConstraints>) {
      if (parsed[key] !== undefined) {
        (refinedMerged as Record<string, unknown>)[key] = parsed[key];
      }
    }
  }

  // Step 6 — response text. Prefer the LLM's reply when it returned
  // one; fall back to the deterministic intro. No invented tutors —
  // names/prices/ratings come exclusively from the cards.
  let content: string;
  if (finalCards.length === 0) {
    // Empty-result hint. Names the most-restrictive filter the user
    // actually set so the message is actionable, and tells the user
    // the exact phrasing ("anywhere") that will relax it.
    const restrictKey = pickMostRestrictiveFilter(refinedMerged);
    const relaxHint = pickRelaxHint(refinedMerged);
    content = `No tutors match your current requirements. The ${restrictKey} filter looks most restrictive. ${relaxHint}`;
  } else if (replyText) {
    content = replyText;
  } else {
    const intro =
      totalCount === 1
        ? `I found 1 tutor matching your request.`
        : `I found ${totalCount} tutors matching your request.`;
    content = `${intro} ${pickWarmTone(finalCards.length)}`;
  }

  // Step 7 — Post-generation guardrail: check for hallucinated tutors
  // or leaked contact info. If the response fails, use the guardrail's
  // suggested fallback.
  if (finalCards.length > 0) {
    const guardrailResult = checkResponse(
      content,
      finalCards.map((c) => ({ full_name: c.fullName })) as Parameters<typeof checkResponse>[1],
    );
    if (!guardrailResult.passed) {
      console.warn("[guardrails] Post-generation check failed:", guardrailResult.issues);
      if (guardrailResult.suggested_fallback) {
        content = guardrailResult.suggested_fallback;
      }
    }
  }

  return {
    type: "message",
    content,
    session_id: sessionId,
    state: {
      current_step: "presenting",
      constraints: refinedMerged as Record<string, unknown>,
    },
    tutor_cards: finalCards,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Project `TutorListing[]` into the `tutor_cards` shape (matches the
 * Edge Function contract in `services/ai/chatService.ts#mapTutorCard`).
 */
function toTutorCards(tutors: TutorListing[]): NonNullable<ChatResponse["tutor_cards"]> {
  return tutors.map((t) => ({
    id: t.uid,
    fullName: t.fullName,
    headline: t.headline,
    subjects: t.subjects,
    monthlyRateNpr: t.monthlyRateNpr,
    rating: t.rating,
    reviewCount: t.reviewCount,
    yearsExperience: t.yearsExperience,
    location: {
      neighborhood: t.location.neighborhood,
      city: t.location.city,
    },
    photoUrl: t.photoUrl,
    verificationStatus: t.verificationStatus,
  }));
}

/**
 * Pick the single most-restrictive filter the user has set, for the
 * empty-result message. Order: hard filters first (gender, mode),
 * then budget, then location, then subject.
 */
function pickMostRestrictiveFilter(
  c: ClientSearchConstraints,
): string {
  if (c.gender_preference) return `'${c.gender_preference}' tutor`;
  if (c.tutoring_mode) return `'${c.tutoring_mode}' mode`;
  if (c.language) return `'${c.language}' language`;
  if (c.budget_max != null) return `budget (under Rs ${c.budget_max.toLocaleString()})`;
  if (c.location_text) return `'${c.location_text}' location`;
  if (c.subject) return `'${c.subject}' subject`;
  return "filter combination";
}

/**
 * Compose the relax-hint sentence for the empty-result message. Names
 * the exact phrasing the user can type (or chip they can tap) to
 * relax the most-restrictive filter.
 */
function pickRelaxHint(c: ClientSearchConstraints): string {
  if (c.location_text) {
    return `Try saying "anywhere" or tap the "Anywhere is fine" chip below.`;
  }
  if (c.budget_max != null) {
    return `Try raising your budget or saying "around Rs ${Math.round(c.budget_max * 1.5).toLocaleString()}".`;
  }
  if (c.grade_level) {
    return `Try different subjects or adjusting your filters.`;
  }
  if (c.gender_preference) {
    return `Try removing the gender preference.`;
  }
  if (c.subject) {
    return `Try a related subject (e.g. "general science" instead of "physics").`;
  }
  return `Try relaxing your filters.`;
}

// ─── Dev-only assertion helper (optional) ───────────────────────────────────

/**
 * Match a user query against the inline FAQ entries.
 * Returns the answer string if matched, or null if no FAQ matches.
 */
function matchMockFaq(query: string): string | null {
  const lower = query.toLowerCase().trim();
  if (!lower || lower.length < 3) return null;

  for (const entry of MOCK_FAQ) {
    // Check if any keyword appears in the query
    const matchCount = entry.keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount >= 1) {
      // A keyword is "specific" if it's >= 4 characters (e.g. "book",
      // "verified", "enroll"). Short generic words like "it", "in",
      // "on", "at", "is", "be" are NOT in our FAQ keyword lists, so
      // >= 4 is a safe threshold for real topic words.
      const hasSpecificKeyword = entry.keywords.some(
        (kw) => kw.length >= 4 && lower.includes(kw),
      );
      const hasMultipleHits = matchCount >= 2;
      if (hasSpecificKeyword || hasMultipleHits) {
        console.log(`[mockChatService] FAQ matched: "${entry.question}" for query "${query}"`);
        return entry.answer;
      }
    }
  }

  return null;
}

/**
 * Returns the dataset coverage stats. Useful for a smoke test:
 * import { getMockDatasetCounts } from "@/services/ai/mockChatService";
 * console.log(getMockDatasetCounts());
 */
export function getMockDatasetCounts() {
  return MOCK_TUTORS_COUNTS;
}