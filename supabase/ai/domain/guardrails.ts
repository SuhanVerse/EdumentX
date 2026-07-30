/**
 * EdumentX AI — Guardrails
 *
 * Safety checks that run BEFORE and AFTER LLM response generation.
 *
 * Pre-generation:
 *   - Quick off-topic keyword check
 *   - Rate limiting check
 *
 * Post-generation:
 *   - Hallucination check: verify all tutors named in response actually exist in results
 *   - Contact info leak check
 *   - Safety keyword check
 */

import type { TutorResult } from "../types/conversation.types.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuardrailResult {
  passed: boolean;
  severity: "none" | "low" | "medium" | "high";
  issues: string[];
  suggested_fallback?: string;
}

// ─── Post-Generation Guardrails ──────────────────────────────────────────────

/**
 * Check if the assistant's response contains hallucinated tutor names.
 * Extracts all proper names from the response and cross-references
 * with the actual search results.
 */
export function checkHallucinatedTutors(
  response: string,
  actualTutors: TutorResult[],
): GuardrailResult {
  const issues: string[] = [];
  const actualNames = new Set(actualTutors.map((t) => t.full_name.toLowerCase()));

  // Extract potential tutor names: words that start with capital letters
  // and appear in sequence (likely full names)
  const namePattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g;
  const mentionedNames = response.match(namePattern) ?? [];

  for (const name of mentionedNames) {
    const lower = name.toLowerCase();
    if (!actualNames.has(lower)) {
      // Check if it's a partial match (e.g., "Saraswoti" without "Adhikari")
      const isPartialMatch = Array.from(actualNames).some(
        (actual) => actual.includes(lower) || lower.includes(actual),
      );
      if (!isPartialMatch) {
        issues.push(`Response mentions "${name}" which is not in search results`);
      }
    }
  }

  return {
    passed: issues.length === 0,
    severity: issues.length > 0 ? "high" : "none",
    issues,
    suggested_fallback: issues.length > 0
      ? "I apologize, but I can only recommend tutors from our verified database. Let me show you the actual tutors that match your criteria."
      : undefined,
  };
}

/**
 * Check if the response contains any personal contact information.
 */
export function checkContactInfoLeak(response: string): GuardrailResult {
  const issues: string[] = [];

  // Phone number patterns (Nepali: 98XXXXXXXX, 97XXXXXXXX, landline)
  const phonePatterns = [
    /\b9[78]\d{8}\b/,       // Mobile: 98XXXXXXXX or 97XXXXXXXX
    /\b0[1-9]\d{7}\b/,      // Landline: 01-XXXXXXX
    /\b\d{2,3}[-.]?\d{6,7}\b/, // Generic phone patterns
  ];

  for (const pattern of phonePatterns) {
    if (pattern.test(response)) {
      issues.push("Response may contain a phone number");
      break;
    }
  }

  // Email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  if (emailPattern.test(response)) {
    issues.push("Response may contain an email address");
  }

  return {
    passed: issues.length === 0,
    severity: issues.length > 0 ? "high" : "none",
    issues,
  };
}

/**
 * Combined post-generation guardrail check.
 */
export function checkResponse(
  response: string,
  actualTutors: TutorResult[],
): GuardrailResult {
  const allIssues: string[] = [];

  // Check 1: Hallucinated tutors
  const hallucinationCheck = checkHallucinatedTutors(response, actualTutors);
  allIssues.push(...hallucinationCheck.issues);

  // Check 2: Contact info leak
  const contactCheck = checkContactInfoLeak(response);
  allIssues.push(...contactCheck.issues);

  // Determine severity
  let severity: GuardrailResult["severity"] = "none";
  if (allIssues.length >= 2) severity = "high";
  else if (allIssues.length === 1) severity = "medium";

  return {
    passed: allIssues.length === 0,
    severity,
    issues: allIssues,
    suggested_fallback: allIssues.length > 0
      ? "I apologize, but I need to correct my previous response. Let me provide you with accurate information."
      : undefined,
  };
}

// ─── Pre-Generation Checks ───────────────────────────────────────────────────

/**
 * Check if the user's message contains abusive or harmful content.
 * This is a simple keyword-based pre-filter. A more thorough check
 * is done by the LLM intent classifier.
 */
export function containsOffensiveContent(message: string): boolean {
  const lower = message.toLowerCase();

  // Abusive language patterns (basic filter)
  const abusivePatterns = [
    /\b(fuck|shit|ass|bitch|damn|crap|dick|cunt)\b/i,
    /\b(hate|kill|die|murder|suicide)\b/i,
    /\b(spam|scam|fraud)\b/i,
  ];

  for (const pattern of abusivePatterns) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

/**
 * Check if the message appears to be an attempt at prompt injection.
 * Looks for patterns like "ignore previous instructions", "system prompt", etc.
 */
export function checkPromptInjection(message: string): GuardrailResult {
  const lower = message.toLowerCase();

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|directions)/,
    /forget\s+(everything|all\s+previous)/,
    /you\s+are\s+(now|not)\s+(an?\s+)?(AI|assistant|bot)/,
    /system\s+prompt/,
    /pretend\s+(you\s+are|to\s+be)/,
    /bypass\s+(the\s+)?(rules|restrictions|limits)/,
    /act\s+as\s+if/,
  ];

  const issues: string[] = [];
  for (const pattern of injectionPatterns) {
    if (pattern.test(lower)) {
      issues.push("Possible prompt injection attempt detected");
      break;
    }
  }

  return {
    passed: issues.length === 0,
    severity: issues.length > 0 ? "high" : "none",
    issues,
    suggested_fallback: issues.length > 0
      ? "I'm designed to help you find tutors on EdumentX. Let's focus on that — what subject are you looking for help with?"
      : undefined,
  };
}
