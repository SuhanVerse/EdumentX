/**
 * EdumentX AI — State Machine
 *
 * Orchestrates the conversation flow through 4 states:
 *   COLLECTING → SEARCHING → PRESENTING → FOLLOWUP → (loop)
 *
 * Each state has a dedicated handler. The state machine is a simple
 * switch statement — NOT LangGraph. This keeps the code simple,
 * testable, and easy to debug for MVP.
 *
 * LangGraph can be added in Phase 2 if the flow becomes more complex.
 */

import type { SessionState, ConversationStep, TutorResult } from "@/ai/types/conversation.types";
import type { SearchConstraints } from "@/ai/types/constraints.types";
import type { StateHandlerResult } from "@/ai/state/states";
import { isValidTransition, getNextQuestion } from "@/ai/state/states";
import { classifyIntent, quickOffTopicCheck } from "@/ai/domain/intentClassifier";
import { containsOffensiveContent, checkPromptInjection } from "@/ai/domain/guardrails";
import { extractConstraints } from "@/ai/agents/constraintExtractor";
import { mergeConstraints, hasMinimumConstraints } from "@/ai/memory/constraintMerger";
import { hybridSearch } from "@/ai/retrieval/hybridSearch";
import { rankTutors } from "@/ai/retrieval/rankingEngine";
import { generateResponse } from "@/ai/agents/responseGenerator";
import {
  matchFaq,
  TUTOR_SEARCH_SIGNAL_PATTERN,
} from "@/ai/knowledgeBase/faqMatcher";

// ─── Main Processor ──────────────────────────────────────────────────────────

/**
 * Process a user message through the state machine.
 *
 * @param state - Current session state
 * @param message - The user's message
 * @returns Response + updated state
 */
export async function processMessage(
  state: SessionState,
  message: string,
  historyString?: string,
): Promise<StateHandlerResult> {
  // Step 0: Pre-checks (run regardless of current state)
  if (containsOffensiveContent(message)) {
    return {
      response: "I'm here to help you find tutors on EdumentX. Please keep our conversation respectful. What subject are you looking for help with?",
      state,
    };
  }

  const injectionCheck = checkPromptInjection(message);
  if (!injectionCheck.passed) {
    return {
      response: injectionCheck.suggested_fallback ?? "I'm designed to help you find tutors on EdumentX. Let's focus on that — what subject are you looking for help with?",
      state,
    };
  }

  // Step 0.5a: Quick off-topic pre-check (before any LLM call)
  // Uses cheap keyword matching to catch non-tutor questions early.
  if (quickOffTopicCheck(message)) {
    return {
      response: "I'm designed to help you find the right tutor on EdumentX. I can't help with that, but I'd be happy to help you search for tutors by subject, budget, or preference. What subject are you looking for help with?",
      state,
    };
  }

  // Step 0.5b: FAQ pre-check (only fires when the message is NOT a
  // tutor-search query AND the FAQ match score clears the high bar).
  //
  // Why both gates:
  //   - Tutor-search signal exclusion prevents "Can I get a tutor who
  //     teaches English?" from being misrouted to the verification FAQ
  //     just because both contain the word "tutor".
  //   - High-confidence bar (0.6+) prevents medium-strength matches
  //     like "what is a tutor?" from short-circuiting to FAQ. Those
  //     get classified properly by the LLM intent classifier below.
  const faqResult = matchFaq(message);
  const hasTutorSearchSignal = TUTOR_SEARCH_SIGNAL_PATTERN.test(message);
  if (
    faqResult.matched &&
    faqResult.entry &&
    faqResult.confidence === "high" &&
    !hasTutorSearchSignal
  ) {
    return {
      response: faqResult.entry.answer +
        "\n\nWould you like help finding a tutor for a specific subject?",
      state: { ...state, current_step: "collecting" },
    };
  }

  // Route to the appropriate state handler
  switch (state.current_step) {
    case "collecting":
      return handleCollectingState(state, message, historyString);
    case "searching":
      return handleSearchingState(state, message);
    case "presenting":
      return handlePresentingState(state, message, historyString);
    case "followup":
      return handleFollowupState(state, message);
    default:
      return handleCollectingState(
        { ...state, current_step: "collecting" },
        message,
        historyString,
      );
  }
}

// ─── State Handlers ──────────────────────────────────────────────────────────

/**
 * COLLECTING state: Gather constraints and determine if we can search.
 */
async function handleCollectingState(
  state: SessionState,
  message: string,
  historyString?: string,
): Promise<StateHandlerResult> {
  // Step 0: Check for location opt-out BEFORE intent classification
  //
  // The LLM intent classifier often misclassifies "anywhere", "doesn't
  // matter", "no preference" as off_topic because they don't look like
  // a tutor-search query. If that happens, the function returns the
  // off-topic response before the keyword fallback in extractConstraints
  // ever gets a chance to detect the location opt-out.
  //
  // We cheat: detect these phrases right here and jump straight to
  // constraint extraction. This is safe because the only thing these
  // phrases can mean is "waive the location requirement".
  const LOCATION_OPTOUT_PHRASES = [
    "anywhere", "anything", "any location", "any city", "any area",
    "doesn't matter", "doesnt matter", "don't mind", "dont mind",
    "no preference", "no specific location", "not picky", "no location",
    "anywhere is fine", "anything is fine", "anywhere works",
    "i don't care about location", "location doesn't matter",
    "online is fine",
  ];
  const msgLower = message.toLowerCase().trim();
  const isLocationOptOut = LOCATION_OPTOUT_PHRASES.some(
    (phrase) => msgLower === phrase || msgLower.startsWith(phrase + " ") || msgLower.startsWith(phrase + "."),
  );
  if (isLocationOptOut) {
    // No need to call extractConstraints() here — we already know the
    // user opted out of location. Directly construct the patch.
    const locationPatch: Partial<SearchConstraints> = {
      location_preference: "anywhere" as const,
      location_text: undefined,
    };
    const mergedConstraints = mergeConstraints(state.constraints, locationPatch);
    if (!hasMinimumConstraints(mergedConstraints)) {
      const question = getNextQuestion(mergedConstraints);
      return {
        response: question ?? "What subject are you looking for help with?",
        state: { ...state, constraints: mergedConstraints },
      };
    }
    return await executeSearch(state, mergedConstraints);
  }

  // Step 1: Classify intent (with conversation history for context)
  const classification = await classifyIntent(message, historyString);

  // Step 2: Handle off-topic
  if (!classification.domain_check.is_within_scope) {
    return {
      response: "I'm designed to help you find the right tutor on EdumentX. I can't help with that, but I'd be happy to help you search for tutors by subject, budget, or preference. What subject are you looking for help with?",
      state,
    };
  }

  // Step 3: Handle greetings directly (no search needed)
  if (classification.domain_check.intent === "greeting") {
    return {
      response: "Hello! I'm EdumentX AI. I can help you find the perfect tutor for your needs. What subject are you looking for help with?",
      state,
    };
  }

  // Step 4: Handle knowledge base questions
  if (classification.domain_check.intent === "ask_knowledge_base") {
    return {
      response: "Let me answer that from what I know about EdumentX!\n\n" +
        "A Verified Tutor has completed EdumentX's verification process, which confirms their identity and qualifications. " +
        "They display a verification badge on their profile.\n\n" +
        "The verification process requires: (1) Government-issued ID, (2) Education certificate, (3) A short introductory video. " +
        "The admin team reviews these within 24-48 hours.\n\n" +
        "Would you like help finding a tutor for a specific subject?",
      state,
    };
  }

  // Step 5: Handle "list all" intent — extract any mentioned constraints
  // but don't require a subject (skip hasMinimumConstraints check)
  if (classification.domain_check.intent === "list_all") {
    const newConstraints = await extractConstraints(message, state.constraints);
    const mergedConstraints = mergeConstraints(state.constraints, newConstraints);
    return await executeSearch(state, mergedConstraints);
  }

  // Step 6: Extract and merge constraints
  const newConstraints = await extractConstraints(message, state.constraints);
  const mergedConstraints = mergeConstraints(state.constraints, newConstraints);

  // Step 7: Check if we have enough to search
  if (!hasMinimumConstraints(mergedConstraints)) {
    // Ask a clarifying question
    const question = getNextQuestion(mergedConstraints);
    return {
      response: question ?? "What subject are you looking for help with? I can find you a great tutor!",
      state: {
        ...state,
        constraints: mergedConstraints,
      },
    };
  }

  // Step 8: Check if we need more info before searching
  const question = getNextQuestion(mergedConstraints);
  if (question) {
    return {
      response: question,
      state: {
        ...state,
        constraints: mergedConstraints,
      },
    };
  }

  // Step 9: We have enough info — transition to SEARCHING
  return await executeSearch(state, mergedConstraints);
}

/**
 * SEARCHING state: Execute the hybrid search.
 * (This state is usually passed through quickly.)
 */
async function handleSearchingState(
  state: SessionState,
  message: string,
): Promise<StateHandlerResult> {
  // If user sends a message during searching, treat it as collecting
  return handleCollectingState(
    { ...state, current_step: "collecting" },
    message,
  );
}

/**
 * PRESENTING state: User has seen results and can refine or change.
 */
async function handlePresentingState(
  state: SessionState,
  message: string,
  historyString?: string,
): Promise<StateHandlerResult> {
  const classification = await classifyIntent(message, historyString);

  // Handle off-topic
  if (!classification.domain_check.is_within_scope) {
    return {
      response: "I'm here to help you find tutors. Would you like to: (a) Know more about these tutors, (b) Refine your search, or (c) Start a new search?",
      state,
    };
  }

  // Handle greetings (regardless of state)
  if (classification.domain_check.intent === "greeting") {
    return {
      response: "Hello! I'm EdumentX AI. I can help you find the perfect tutor for your needs. What subject are you looking for help with?",
      state: { ...state, current_step: "collecting" },
    };
  }

  // Handle knowledge base questions (regardless of state)
  if (classification.domain_check.intent === "ask_knowledge_base") {
    return {
      response: "Let me answer that from what I know about EdumentX!\n\n" +
        "A Verified Tutor has completed EdumentX's verification process, which confirms their identity and qualifications. " +
        "They display a verification badge on their profile.\n\n" +
        "The verification process requires: (1) Government-issued ID, (2) Education certificate, (3) A short introductory video. " +
        "The admin team reviews these within 24-48 hours.\n\n" +
        "Would you like help finding a tutor for a specific subject?",
      state: { ...state, current_step: "collecting" },
    };
  }

  // Refine search (e.g., "only female", "cheaper")
  if (
    classification.domain_check.intent === "refine_search" ||
    classification.domain_check.intent === "compare_tutors"
  ) {
    const newConstraints = await extractConstraints(message, state.constraints);
    const mergedConstraints = mergeConstraints(state.constraints, newConstraints);
    return await executeSearch(state, mergedConstraints);
  }

  // Change criteria entirely
  if (classification.domain_check.intent === "change_criteria") {
    return handleCollectingState(
      { ...state, current_step: "collecting", fallback_attempted: false, fallback_level: 0 },
      message,
    );
  }

  // View profile of a specific tutor
  if (classification.domain_check.intent === "view_profile") {
    return {
      response: "I'd recommend checking out the tutor's full profile by tapping on their card. You'll find their complete bio, qualifications, reviews, and more details there. Is there a specific tutor you'd like to know more about?",
      state,
    };
  }

  // Book a tutor
  if (classification.domain_check.intent === "book_tutor") {
    return {
      response: "Great! You can enroll with a tutor by going to their profile and tapping the 'Enroll' button. Send them a message about which subject you need help with and your preferred schedule. Is there a tutor above you'd like to enroll with?",
      state,
    };
  }

  // Default: redirect to collecting for proper re-classification
  // This handles cases where the intent classifier didn't match a presenting-specific
  // intent — it's safer than blindly calling executeSearch (which would return tutor
  // cards for non-search questions like FAQ or feedback).
  return handleCollectingState(
    { ...state, current_step: "collecting" },
    message,
  );
}

/**
 * FOLLOWUP state: Refining existing results.
 */
async function handleFollowupState(
  state: SessionState,
  message: string,
): Promise<StateHandlerResult> {
  // Followup is very similar to presenting — just re-search with refinements
  return handlePresentingState(state, message);
}

// ─── Search Execution ────────────────────────────────────────────────────────

/**
 * Execute a search with the given constraints and transition to PRESENTING.
 */
async function executeSearch(
  state: SessionState,
  constraints: SearchConstraints,
): Promise<StateHandlerResult> {
  // Perform the hybrid search
  const searchResult = await hybridSearch(constraints, {
    enableFallback: true,
    limit: 20,
  });

  // Rank the results
  const rankedResults = rankTutors(searchResult.tutors, constraints, 5);

  // If no results found
  if (rankedResults.length === 0) {
    return {
      response: "I couldn't find any tutors matching your criteria. Here are some suggestions:\n" +
        "• Try a different subject\n" +
        "• Increase your budget range\n" +
        "• Remove the location filter\n" +
        "• Check back later as new tutors join regularly\n\n" +
        "What would you like to try?",
      state: {
        ...state,
        constraints,
        current_step: "collecting",
        fallback_attempted: true,
        fallback_level: 0,
        search_count: state.search_count + 1,
      },
      search_performed: true,
      results: [],
    };
  }

  // Generate the response
  const response = await generateResponse(
    rankedResults,
    constraints,
    state,
  );

  return {
    response,
    state: {
      ...state,
      constraints,
      current_step: "presenting",
      last_results: rankedResults,
      search_count: state.search_count + 1,
      total_messages: state.total_messages + 1,
    },
    search_performed: true,
    results: rankedResults,
  };
}
