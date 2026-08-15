/**
 * EdumentX — Mock Saved Tutors repository
 *
 * In-memory stand-in used when `EXPO_PUBLIC_USE_MOCK_DATA=true`.
 * Mirrors the Firebase repository's method contract exactly so the
 * UI layer is source-agnostic.
 */

import type { SavedTutorsRepository } from "./SavedTutorsRepository";

// Per-student saved set, keyed by student uid. Toggle writes are
// applied synchronously and subscribers are notified on the next
// microtask so the list re-renders like the live Firestore path.
const savedByStudent = new Map<string, Set<string>>();
const listenersByStudent = new Map<string, Set<() => void>>();

function emit(studentUid: string) {
  const listeners = listenersByStudent.get(studentUid);
  if (!listeners) return;
  listeners.forEach((l) => l());
}

export const MockSavedTutorsRepository: SavedTutorsRepository = {
  subscribeSavedTutorIds(studentUid, onData) {
    const set = savedByStudent.get(studentUid) ?? new Set<string>();
    savedByStudent.set(studentUid, set);

    const emitFor = () => onData([...set]);

    let listeners = listenersByStudent.get(studentUid);
    if (!listeners) {
      listeners = new Set();
      listenersByStudent.set(studentUid, listeners);
    }
    listeners.add(emitFor);

    // Initial push (synchronous, matching Firestore's first snapshot).
    emitFor();

    return () => {
      const current = listenersByStudent.get(studentUid);
      current?.delete(emitFor);
    };
  },

  async toggleSavedTutor(studentUid, tutorUid, currentlySaved) {
    const set =
      savedByStudent.get(studentUid) ?? new Set<string>();
    savedByStudent.set(studentUid, set);
    if (currentlySaved) {
      set.delete(tutorUid);
    } else {
      set.add(tutorUid);
    }
    emit(studentUid);
  },
};
