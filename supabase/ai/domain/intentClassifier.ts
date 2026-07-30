/**
 * EdumentX AI — Intent Classifier
 *
 * Classifies user messages into intents using Groq LLM.
 * This is the first stage of the domain guard — if the message is
 * off-topic, we skip all further processing.
 *
 * The same LLM call also extracts initial search constraints,
 * saving us a second API call.
 */

import { groqChatJSON } from "../utils/groqClient.ts";
import { INTENT_CLASSIFICATION_SYSTEM_PROMPT } from "../domain/prompts.ts";
import type { DomainCheck, Intent } from "../types/conversation.types.ts";
import type { SearchConstraints } from "../types/constraints.types.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassificationResult {
  domain_check: DomainCheck;
  constraints: Partial<SearchConstraints>;
  missing_fields: (keyof SearchConstraints)[];
  explanation: string;
}

/** Raw JSON shape returned by the LLM */
interface LLMClassificationResponse {
  intent: string;
  is_within_scope: boolean;
  confidence: "high" | "medium" | "low";
  constraints: {
    subject?: string | null;
    budget_max?: number | null;
    budget_min?: number | null;
    location_text?: string | null;
    tutoring_mode?: string | null;
    gender_preference?: string | null;
    grade_level?: string | null;
  };
  missing_fields?: string[];
  explanation?: string;
}

// ─── Classifier ──────────────────────────────────────────────────────────────

/**
 * Classify the user's message intent and extract initial constraints.
 *
 * @param message - The user's message
 * @param conversationHistory - Recent conversation history (last 3-6 messages)
 * @returns Classified intent + extracted constraints
 */
export async function classifyIntent(
  message: string,
  conversationHistory?: string,
): Promise<ClassificationResult> {
  // Build the classification prompt with optional history context
  let userPrompt = `User message: "${message}"`;
  if (conversationHistory) {
    userPrompt = `Conversation history: ${conversationHistory}\n\nLatest message: "${message}"`;
  }

  try {
    const response = await groqChatJSON<LLMClassificationResponse>(
      [
        { role: "system", content: INTENT_CLASSIFICATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, max_tokens: 512 }, // Low temp for consistent classification
    );

    // Normalize intent string
    const intent = normalizeIntent(response.intent);

    return {
      domain_check: {
        is_within_scope: response.is_within_scope ?? true,
        intent,
        confidence: response.confidence ?? "medium",
        explanation: response.explanation ?? "",
      },
      constraints: {
        subject: response.constraints?.subject ?? undefined,
        budget_max: response.constraints?.budget_max ?? undefined,
        budget_min: response.constraints?.budget_min ?? undefined,
        location_text: response.constraints?.location_text ?? undefined,
        tutoring_mode: (response.constraints?.tutoring_mode as "online" | "home_tuition") ?? undefined,
        gender_preference: (response.constraints?.gender_preference as "male" | "female") ?? undefined,
        grade_level: response.constraints?.grade_level ?? undefined,
      },
      missing_fields: (response.missing_fields as (keyof SearchConstraints)[]) ?? [],
      explanation: response.explanation ?? "",
    };
  } catch (err) {
    console.error("[intentClassifier] LLM call failed:", err);

    // Fallback: use local keyword-based detection before defaulting
    const lower = message.toLowerCase().trim();

    // Check for greeting patterns
    const greetingPatterns = [/^hi\b/, /^hello\b/, /^(good\s+)?morning\b/, /^(good\s+)?evening\b/, /^hey\b/];
    for (const pattern of greetingPatterns) {
      if (pattern.test(lower)) {
        return {
          domain_check: { is_within_scope: true, intent: "greeting", confidence: "high", explanation: "Fallback: keyword match" },
          constraints: {}, missing_fields: [], explanation: "",
        };
      }
    }

    // Check for off-topic patterns
    if (quickOffTopicCheck(message)) {
      return {
        domain_check: { is_within_scope: false, intent: "off_topic", confidence: "medium", explanation: "Fallback: keyword match" },
        constraints: {}, missing_fields: [], explanation: "",
      };
    }

    // Check for common FAQ question patterns
    const faqPatterns = [/\b(how|what|why|can|does|is|are)\b.*\b(verif|enroll|book|sign|document|tutor|recommend)\b/i];
    for (const pattern of faqPatterns) {
      if (pattern.test(lower)) {
        return {
          domain_check: { is_within_scope: true, intent: "ask_knowledge_base", confidence: "medium", explanation: "Fallback: keyword match" },
          constraints: {}, missing_fields: [], explanation: "",
        };
      }
    }

    // Default fallback
    return {
      domain_check: {
        is_within_scope: true,
        intent: "search_tutors",
        confidence: "low",
        explanation: "Classification failed, defaulting to search intent",
      },
      constraints: {},
      missing_fields: [],
      explanation: "Classification service unavailable",
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize intent string from LLM to our Intent type.
 * Handles slight variations in LLM output.
 */
function normalizeIntent(raw: string): Intent {
  const normalized = raw.toLowerCase().trim();

  const intentMap: Record<string, Intent> = {
    "search_tutors": "search_tutors",
    "search": "search_tutors",
    "find_tutor": "search_tutors",
    "tutor_search": "search_tutors",
    "refine_search": "refine_search",
    "refine": "refine_search",
    "ask_knowledge_base": "ask_knowledge_base",
    "knowledge_base": "ask_knowledge_base",
    "faq": "ask_knowledge_base",
    "greeting": "greeting",
    "greet": "greeting",
    "hello": "greeting",
    "off_topic": "off_topic",
    "offtopic": "off_topic",
    "offensive": "offensive",
    "abuse": "offensive",
    "feedback": "feedback",
    "compare_tutors": "compare_tutors",
    "compare": "compare_tutors",
    "view_profile": "view_profile",
    "profile": "view_profile",
    "book_tutor": "book_tutor",
    "book": "book_tutor",
    "enroll": "book_tutor",
    "change_criteria": "change_criteria",
    "change": "change_criteria",
    "clarify": "clarify",
    "clarification": "clarify",
    "list_all": "list_all",
    "browse": "list_all",
    "browse_tutors": "list_all",
    "show_all": "list_all",
    "all_tutors": "list_all",
    "list": "list_all",
  };

  return intentMap[normalized] ?? "search_tutors";
}

/**
 * Quick check if a message is likely off-topic without an API call.
 * This is a cheap pre-filter before the LLM classification.
 *
 * Returns true if the message contains keywords that suggest it's
 * off-topic (code, essay, homework, etc.).
 */
export function quickOffTopicCheck(message: string): boolean {
  const lower = message.toLowerCase().trim();

  // Very short messages are usually fine
  if (lower.length < 3) return false;

  // Common off-topic patterns
  const offTopicPatterns = [
    /^write\s+/,
    /^create\s+/,
    /^explain\s+/,
    /^what is the (meaning|definition)/,
    /^who is the (president|prime minister|king)/,
    /^solve\s+/,
    /^calculate\s+/,
    /^generate\s+/,
    /^(write|create|make) (a|an|me)\s+(python|javascript|code|program|function|app)/,
    /\b(homework|assignment|exam)\s+(help|answer|solution)\b/,
    /\bdo\s+(my|this)\s+(homework|assignment)\b/,
  ];

  for (const pattern of offTopicPatterns) {
    if (pattern.test(lower)) return true;
  }

  return false;
}
