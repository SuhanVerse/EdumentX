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
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import { mapBatch } from "@/services/enrollments/FirebaseEnrollmentRepository";
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

/** Resolve a tutor's display identity from their public profile
 *  (`users/{uid}/tutorProfile/default` is readable by ALL — see
 *  firestore.rules). Falls back to the uid so the card still has
 *  a name. */
async function readTutorDisplay(tutorUid: string): Promise<{
  name: string;
  avatar: string | null;
}> {
  try {
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, "users", tutorUid, "tutorProfile", "default"));
    const data = snap.data() as
      | { fullName?: unknown; photoUrl?: unknown }
      | undefined;
    return {
      name:
        typeof data?.fullName === "string" && data.fullName.length > 0
          ? data.fullName
          : `Tutor ${tutorUid.slice(0, 6)}`,
      avatar:
        typeof data?.photoUrl === "string" && data.photoUrl.length > 0
          ? data.photoUrl
          : null,
    };
  } catch (err) {
    console.warn("FirebaseBatchesRepository: tutor display read failed", err);
    return { name: `Tutor ${tutorUid.slice(0, 6)}`, avatar: null };
  }
}

export const FirebaseBatchesRepository: BatchesRepository = {
  subscribeBatches(tutorUid, onData, onError) {
    return enrollmentRepo.subscribeBatches(tutorUid, onData, onError);
  },

  subscribePublicBatches(onData, onError) {
    const db = getFirestore(getApp());
    // collectionGroup("classes") — every tutor's batch subcollection.
    // Scoped to ACTIVE batches (ended batches drop off the marketplace;
    // the recursive rule allows signed-in reads of active classes).
    const q = query(
      collectionGroup(db, "classes"),
      where("status", "==", "active"),
    );
    let cancelled = false;
    return onSnapshot(
      q,
      async (snap) => {
        if (cancelled) return;
        try {
          const batches = snap.docs.map((d) =>
            mapBatch(d.id, d.data() as Record<string, unknown>),
          );
          // Enrich with tutor display info — one read per distinct
          // tutor, batched. Missing profile docs fall back to a
          // uid-based name (readTutorDisplay handles that).
          const tutors = [...new Set(batches.map((b) => b.tutorUid))];
          const display = await Promise.all(tutors.map(readTutorDisplay));
          const byUid = new Map(tutors.map((uid, i) => [uid, display[i]]));
          const enriched = batches.map((b) => ({
            ...b,
            tutorName: byUid.get(b.tutorUid)?.name,
            tutorAvatar: byUid.get(b.tutorUid)?.avatar ?? null,
          }));
          enriched.sort((a, b) => b.createdAt - a.createdAt);
          if (!cancelled) onData(enriched);
        } catch (err) {
          if (!cancelled && onError) onError(err as Error);
        }
      },
      (err) => {
        if (!cancelled && onError) onError(err);
      },
    );
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
    // Keep the denormalized memberCount in sync (marketplace
    // capacity bar). Re-adding the same student is idempotent —
    // the counter only bumps when the member doc is new.
    await updateDoc(doc(db, "batches", input.tutorUid, "classes", input.batchId), {
      memberCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  },

  async removeBatchMember(tutorUid: string, batchId: string, memberId: string) {
    const db = getFirestore(getApp());
    await deleteDoc(doc(db, "batches", tutorUid, "classes", batchId, "members", memberId));
    await updateDoc(doc(db, "batches", tutorUid, "classes", batchId), {
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
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
