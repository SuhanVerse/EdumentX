/**
 * EdumentX — Firebase Batches Repository
 *
 * Concrete `BatchesRepository` over Firestore.
 *
 * Reads + `createBatch` delegate to `FirebaseEnrollmentRepository` —
 * it already owns the canonical `batches/{tutorUid}/classes` write
 * shape (one transaction that creates the batch doc and seeds its
 * members, matching the security rules). This repository adds the
 * post-creation member operations (`addBatchMember` /
 * `removeBatchMember`) plus the active-roster feed the student
 * picker needs.
 *
 * The member doc id is the `enrollmentId` (same convention as
 * `createBatch`), which makes add idempotent and lets the
 * `removeEnrollment` cascade in the enrollment repo find members
 * via its `collectionGroup("members") where enrollmentId == …` query.
 */

import { getApp } from "@react-native-firebase/app";
import {
  deleteDoc,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "@react-native-firebase/firestore";

import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import type { Enrollment } from "@/services/enrollments/types";

import type {
  AddMemberInput,
  BatchesRepository,
} from "@/services/batches/BatchesRepository";
import type { RosterStudent } from "@/services/batches/types";

const enrollmentRepo = getEnrollmentRepository();

/** The roster is `enrollments/{tutorUid}/roster`; the picker only
 *  cares about live students. */
function toRosterStudent(e: Enrollment): RosterStudent {
  return {
    enrollmentId: e.enrollmentId,
    studentUid: e.studentUid,
    studentName: e.studentName,
    studentGrade: e.studentGrade,
    studentAvatar: e.studentAvatar,
    subjects: e.subjects,
    slotKey: e.slotKey,
  };
}

export const FirebaseBatchesRepository: BatchesRepository = {
  subscribeBatches(tutorUid, onData, onError) {
    return enrollmentRepo.subscribeBatches(tutorUid, onData, onError);
  },

  subscribeBatchMembers(tutorUid, batchId, onData, onError) {
    return enrollmentRepo.subscribeBatchMembers(tutorUid, batchId, onData, onError);
  },

  subscribeRoster(tutorUid, onData, onError) {
    return enrollmentRepo.subscribeEnrollments(
      tutorUid,
      (enrollments) => {
        onData(enrollments.filter((e) => e.status === "active").map(toRosterStudent));
      },
      onError,
    );
  },

  createBatch(input) {
    return enrollmentRepo.createBatch(input);
  },

  async addBatchMember(input: AddMemberInput) {
    const db = getFirestore(getApp());
    // Keyed by enrollmentId — re-adding the same student is a no-op.
    const memberRef = doc(
      db,
      "batches",
      input.tutorUid,
      "classes",
      input.batchId,
      "members",
      input.enrollmentId,
    );
    await setDoc(
      memberRef,
      {
        memberId: memberRef.id,
        enrollmentId: input.enrollmentId,
        studentUid: input.studentUid,
        studentName: input.studentName,
        studentAvatar: input.studentAvatar,
        joinedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async removeBatchMember(tutorUid: string, batchId: string, memberId: string) {
    const db = getFirestore(getApp());
    await deleteDoc(doc(db, "batches", tutorUid, "classes", batchId, "members", memberId));
  },

  async endBatch(tutorUid: string, batchId: string) {
    const db = getFirestore(getApp());
    // Direct path — avoids the collectionGroup("classes") scan the
    // enrollments repo's endBatch does to locate the tutorUid.
    await updateDoc(doc(db, "batches", tutorUid, "classes", batchId), {
      status: "ended",
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
