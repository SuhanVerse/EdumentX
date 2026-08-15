/**
 * EdumentX — Saved Tutors repository abstraction
 *
 * The single contract between the student "Saved tutors" UI (the
 * heart on TutorDetailsScreen, the list on `/saved-tutors`) and the
 * underlying data source.
 *
 * Storage: a `savedTutors` map on the student's own profile doc
 * (`users/{uid}/studentProfile/default`). Map keys are tutor uids;
 * a present key means "saved". A map (not an array) lets us toggle a
 * single tutor with `deleteField()` in one `setDoc(merge)` instead of
 * read-modify-write array churn. The existing rules
 * (`match /users/{userId}/{subcollection}/{document=**}` owner
 * read/write) already permit this — no rule changes needed.
 *
 * Two concrete implementations:
 *   - `FirebaseSavedTutorsRepository` — production default.
 *   - `MockSavedTutorsRepository` — in-memory, fully offline.
 *
 * Selection is gated by `EXPO_PUBLIC_USE_MOCK_DATA` and performed by
 * `services/savedTutors/dataSource.ts` at module load.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

export interface SavedTutorsRepository {
  /**
   * Live list of the student's saved tutor uids. Fires immediately
   * with the current set, then again on every change. Returns an
   * Unsubscribe handle that the caller MUST invoke on cleanup.
   */
  subscribeSavedTutorIds(
    studentUid: string,
    onData: (tutorUids: string[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /**
   * Add or remove a tutor from the student's saved set.
   *
   * @param studentUid  The current student's uid.
   * @param tutorUid    The tutor to save/unsave.
   * @param currentlySaved  Whether the tutor is saved RIGHT NOW
   *   (i.e. before this toggle). `true` removes it (deleteField),
   *   `false` adds it.
   */
  toggleSavedTutor(
    studentUid: string,
    tutorUid: string,
    currentlySaved: boolean,
  ): Promise<void>;
}
