/**
 * EdumentX — Tutor profile edit policy
 *
 * Single source of truth for which fields a verified tutor can edit
 * themselves (live, no admin review) and which fields require a
 * re-review pass through the `tutorProfileUpdates/{uid}` queue.
 *
 * Why split at all? See `Documentation/01-Architecture/ARCHITECTURE.md`
 * §6 (admin + verification). In short: low-risk fields (name, headline,
 * bio, photo) are presentation — a typo shouldn't make a tutor wait
 * for an admin to re-review their application. High-risk fields
 * (subjects, rate, location) are what the admin verified in the first
 * place; changing them materially affects the marketplace offer and
 * needs a second look.
 *
 * This module is the *only* place the whitelist is defined. The edit
 * screen (`screens/tutor/edit_profile.tsx`) imports `splitProfileChanges`
 * to drive its write path, and the admin queue
 * (`screens/admin/VerificationQueue.tsx`) imports `LIVE_EDITABLE_FIELDS`
 * to label edit cards. If we ever want to move a field between buckets
 * — e.g. let tutors edit their own location live — this is the one
 * file we change.
 */

/**
 * Fields a verified tutor can change without re-review. Edits to these
 * fields go directly to `users/{uid}/tutorProfile/default` and become
 * visible to students immediately.
 *
 * Keep this list narrow on purpose. Every field here is one fewer thing
 * the admin sees; every field *not* here is one more reason the admin
 * queue exists.
 */
export const LIVE_EDITABLE_FIELDS = [
  "fullName",
  "headline",
  "bio",
  "photoUrl",
] as const;

export type LiveEditableField = (typeof LIVE_EDITABLE_FIELDS)[number];

/**
 * Type guard for the union. Lets the edit screen narrow a
 * `keyof TutorProfileChanges` to a `LiveEditableField` with a single
 * `if (isLiveEditableField(key))` check.
 */
export function isLiveEditableField(
  key: string,
): key is LiveEditableField {
  return (LIVE_EDITABLE_FIELDS as readonly string[]).includes(key);
}

/**
 * The shape of a tutor profile-change submission. Keys are the field
 * names on `users/{uid}/tutorProfile/default`; values are the proposed
 * new values. We type every known field as `unknown` rather than
 * narrowly typed so a single `Partial<>` covers strings, numbers,
 * arrays, and the `LocationValue` object without us having to maintain
 * parallel unions.
 */
export type TutorProfileChanges = Partial<{
  fullName: string;
  headline: string;
  bio: string;
  photoUrl: string;
  // High-risk:
  subjects: string[];
  gradesTeaching: string[];
  yearsExperience: number;
  monthlyRateNpr: number;
  location: { neighborhood: string; city: string } | null;
  phone: string;
}>;

/**
 * Result of splitting a `TutorProfileChanges` payload into the two
 * bags the write path cares about:
 *
 *   - `live`: fields that go directly to the profile doc. No review.
 *   - `proposed`: fields that go to `tutorProfileUpdates/{uid}` for
 *     admin re-review.
 *
 * A change set that only touches `live` fields results in
 * `proposed = {}`; the caller can short-circuit the queue write in
 * that case. Conversely, a change set that only touches high-risk
 * fields results in `live = {}`; the caller skips the live write.
 */
export type SplitChanges = {
  live: Partial<Record<LiveEditableField, unknown>>;
  proposed: Record<string, unknown>;
};

/**
 * Split a `TutorProfileChanges` into the two write bags. Empty
 * fields (null / undefined / empty string) are dropped from the
 * result so the live merge never overwrites a real value with `null`
 * (which would clobber a populated field on a partial edit).
 *
 * Examples:
 *
 *   splitProfileChanges({ headline: "New headline" })
 *     → { live: { headline: "New headline" }, proposed: {} }
 *
 *   splitProfileChanges({ monthlyRateNpr: 8000, location: {...} })
 *     → { live: {}, proposed: { monthlyRateNpr: 8000, location: {...} } }
 *
 *   splitProfileChanges({ headline: "x", subjects: ["Math"] })
 *     → { live: { headline: "x" }, proposed: { subjects: ["Math"] } }
 *     (both writes happen — see the edit-profile screen)
 */
export function splitProfileChanges(
  changes: TutorProfileChanges,
): SplitChanges {
  const live: Partial<Record<LiveEditableField, unknown>> = {};
  const proposed: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(changes)) {
    if (raw === undefined) continue;

    if (isLiveEditableField(key)) {
      // Skip null / empty-string values so we never erase a real
      // photoUrl with a missing field on a partial submit.
      if (raw === null || raw === "") continue;
      live[key] = raw;
    } else {
      proposed[key] = raw;
    }
  }

  return { live, proposed };
}
