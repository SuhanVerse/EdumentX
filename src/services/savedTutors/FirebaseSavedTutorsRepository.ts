/**
 * EdumentX — Firebase Saved Tutors repository
 *
 * Reads/writes the `savedTutors` map on
 * `users/{uid}/studentProfile/default`. The owner-only subcollection
 * rules (`match /users/{userId}/{subcollection}/{document=**}`)
 * cover both the read and the write — no rule edits required.
 */

import { getApp } from "@react-native-firebase/app";
import {
  deleteField,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";

import type { SavedTutorsRepository } from "./SavedTutorsRepository";

const PROFILE_PATH = ["studentProfile", "default"] as const;

export const FirebaseSavedTutorsRepository: SavedTutorsRepository = {
  subscribeSavedTutorIds(studentUid, onData, onError) {
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", studentUid, ...PROFILE_PATH);

    return onSnapshot(
      profileRef,
      (snap) => {
        const data = snap.data() as
          | { savedTutors?: Record<string, true> }
          | undefined;
        const map = data?.savedTutors;
        onData(map ? Object.keys(map) : []);
      },
      (err) => {
        console.warn(
          "SavedTutors: subscribeSavedTutorIds failed",
          err,
        );
        onError?.(err);
      },
    );
  },

  async toggleSavedTutor(studentUid, tutorUid, currentlySaved) {
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", studentUid, ...PROFILE_PATH);

    // One field, one write: adding uses `true`, removing uses
    // `deleteField()` so the key disappears instead of lingering.
    const savedTutors = {
      [tutorUid]: currentlySaved ? deleteField() : true,
    };
    await setDoc(
      profileRef,
      { savedTutors, updatedAt: serverTimestamp() },
      { merge: true },
    );
  },
};
