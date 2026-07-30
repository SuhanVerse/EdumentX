/**
 * EdumentX — Client-side minimum-constraint gate (mirror)
 *
 * Mirrors `supabase/ai/memory/constraintMerger.ts#hasMinimumConstraints` and
 * `getMissingCoreFields` so the Zustand store (`store/aiChatStore.ts`) can
 * compute the same "are we ready to search?" answer without a roundtrip to
 * the Edge Function.
 *
 * WHY A DUPLICATE FILE?
 *   Sharing `constraintMerger.ts` across the server (Deno) and the client
 *   (React Native / Metro) would require a bundler config change to map
 *   `.ts` extensions and handle the `import type` syntax Deno uses. The
 *   refactor's scope explicitly excluded that. So we duplicate the eight
 *   lines of logic here with a banner.
 *
 * KEEP IN SYNC with `supabase/ai/memory/constraintMerger.ts`. If you change
 * the rules on the server, change them here too.
 */

// ─── Constraint shape (mirrors the server's `SearchConstraints`) ─────────────
//
// We redefine the type here rather than importing from the server because
// the server file uses Deno-only `.ts` import suffixes. Keep this list
// identical to `supabase/ai/types/constraints.types.ts`.

export interface ClientSearchConstraints {
  subject?: string;
  budget_max?: number;
  budget_min?: number;
  location_text?: string;
  radius_km?: number;
  gender_preference?: "male" | "female" | "other";
  tutoring_mode?: "online" | "home_tuition";
  grade_level?: string;
  language?: string;
  min_rating?: number;
  min_experience?: number;
  verified_only?: boolean;
  query_text?: string;
  /**
   * User opted out of a physical location requirement ("anywhere",
   * "doesn't matter", "no preference"). Mirrors the server's
   * `location_preference` field.
   */
  location_preference?: "anywhere" | "near_me";
}

// ─── Gate ────────────────────────────────────────────────────────────────────

/**
 * Mirrors `supabase/ai/memory/constraintMerger.ts#hasMinimumConstraints`.
 * See that file's docstring for the rules. KEEP IN SYNC.
 *
 * Phase 2: Minimum is now subject + grade + budget.
 * Location is optional — users can volunteer it or say "anywhere".
 */
export function hasMinimumConstraints(c: ClientSearchConstraints): boolean {
  return Boolean(hasSubject(c) && hasGrade(c) && hasBudget(c));
}

/**
 * Mirrors `supabase/ai/memory/constraintMerger.ts#getMissingCoreFields`.
 * Used by the pill strip to decide which constraints to display as
 * "still missing".
 *
 * Phase 2: budget replaces location in the minimum set.
 */
export function getMissingCoreFields(
  c: ClientSearchConstraints,
): Array<"subject" | "grade" | "budget"> {
  const missing: Array<"subject" | "grade" | "budget"> = [];
  if (!hasSubject(c)) missing.push("subject");
  if (!hasGrade(c)) missing.push("grade");
  if (!hasBudget(c)) missing.push("budget");
  return missing;
}

// ─── Client-side question picker ─────────────────────────────────────────────

/**
 * One clarifying question per call. Never combine — that's the source of
 * bug #4 ("Do you prefer home or online? If home, which area?").
 *
 * Mirrors `supabase/ai/state/states.ts#getNextQuestion`. KEEP IN SYNC.
 */
export function getNextClientQuestion(
  c: ClientSearchConstraints,
): string | null {
  if (!hasSubject(c)) return "What subject are you looking for help with?";
  if (!hasGrade(c)) return "What grade or level are you studying?";
  if (!hasBudget(c)) return "What's your approximate monthly budget for a tutor? (in NPR)";
  return null;
}

// ─── Local helpers (private — used only inside this file) ────────────────────

/**
 * Single source of truth for "is this field filled?". Both the gate
 * (`hasMinimumConstraints`) and the question picker
 * (`getNextClientQuestion`) call these — keeping them in lock-step so
 * the gate never returns false while the question picker has nothing
 * to ask (which manifested as the "Could you tell me more..." fallback
 * before the gate/picker were aligned).
 */

function hasSubject(c: ClientSearchConstraints): boolean {
  return typeof c.subject === "string" && c.subject.trim().length > 0;
}

function hasGrade(c: ClientSearchConstraints): boolean {
  return (
    c.grade_level !== undefined &&
    c.grade_level !== null &&
    String(c.grade_level).trim().length > 0
  );
}

/**
 * Location is satisfied when ANY of the following holds:
 *   - the student explicitly opted out ("anywhere" / "doesn't matter")
 *     via `location_preference === "anywhere"`
 *   - the student wants online-only tutoring (no physical location
 *     needed)
 *   - the student named a city / neighborhood
 */
function hasBudget(c: ClientSearchConstraints): boolean {
  return c.budget_max !== undefined && c.budget_max !== null && c.budget_max > 0;
}

/**
 * Location is NO LONGER required for minimum constraints.
 * Kept as a utility in case we need it for optional questions.
 */
function hasLocation(c: ClientSearchConstraints): boolean {
  if (c.location_preference === "anywhere") return true;
  if (c.tutoring_mode === "online") return true;
  return (
    typeof c.location_text === "string" && c.location_text.trim().length > 0
  );
}