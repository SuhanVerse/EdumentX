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
 * `createBatch` and the session-code join in `acceptRequest`), which
 * makes add idempotent and lets the `removeEnrollment` cascade in
 * the enrollment repo delete a member by DIRECT PATH
 * (`batches/{tutorUid}/classes/{batchId}/members/{enrollmentId}`,
 * located via the roster row's `batchId`) — no collectionGroup scan,
 * which Firestore rules can't prove safe anyway.
 */

import { getApp } from "@react-native-firebase/app";
import {
  collectionGroup,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";

import { MAX_BATCH_MEMBERS } from "@/services/enrollments/types";

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

  subscribePublicBatches(onData, onError, tutorUids) {
    const db = getFirestore(getApp());
    // Zero-trust contextual filtering: when the caller scopes to the
    // student's enrolled tutors, an EMPTY list means "no active
    // enrollments" — emit [] without querying (Firestore rejects an
    // empty `in` array client-side).
    if (tutorUids && tutorUids.length === 0) {
      onData([]);
      return () => {};
    }
    // collectionGroup("classes") — every tutor's batch subcollection.
    // Scoped to ACTIVE batches (ended batches drop off the marketplace;
    // the recursive rule allows signed-in reads of active classes).
    // When `tutorUids` is given, an `in` query scopes the marketplace
    // to exactly those tutors (BrowseBatchesScreen passes the tutors
    // the student is currently enrolled with).
    const filters = [where("status", "==", "active")];
    if (tutorUids && tutorUids.length > 0) {
      filters.push(where("tutorUid", "in", tutorUids));
    }
    const q = query(collectionGroup(db, "classes"), ...filters);
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

  subscribeBatch(tutorUid, batchId, onData, onError) {
    const db = getFirestore(getApp());
    // Direct-path doc read — the rules allow any signed-in user to
    // GET `batches/{tutorUid}/classes/{batchId}` regardless of
    // status, so ended batches render instead of "not found".
    const ref = doc(db, "batches", tutorUid, "classes", batchId);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists) {
          onData(null);
          return;
        }
        onData(mapBatch(snap.id, snap.data() as Record<string, unknown>));
      },
      (err) => onError?.(err as Error),
    );
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
    const batchRef = doc(db, "batches", input.tutorUid, "classes", input.batchId);
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
    // ── Aug 24 audit fix: transactional add with seat cap. ──
    // The previous get-then-set (setDoc merge + unconditional
    // increment) inflated memberCount on re-adds and could push a
    // batch past MAX_BATCH_MEMBERS.
    await runTransaction(db, async (tx) => {
      const [batchSnap, memberSnap] = await Promise.all([
        tx.get(batchRef),
        tx.get(memberRef),
      ]);
      if (!batchSnap.exists()) {
        throw new Error("Batch not found");
      }
      if (memberSnap.exists()) {
        // Already a member — idempotent no-op, counter untouched.
        return;
      }
      const batchData = batchSnap.data();
      const memberCount =
        typeof batchData?.memberCount === "number"
          ? batchData.memberCount
          : 0;
      if (memberCount >= MAX_BATCH_MEMBERS) {
        throw new Error("This group is full.");
      }
      tx.set(memberRef, {
        memberId: memberRef.id,
        enrollmentId: input.enrollmentId,
        studentUid: input.studentUid,
        studentName: input.studentName,
        studentAvatar: input.studentAvatar,
        joinedAt: serverTimestamp(),
      });
      tx.update(batchRef, {
        memberCount: memberCount + 1,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async removeBatchMember(tutorUid: string, batchId: string, memberId: string) {
    const db = getFirestore(getApp());
    const batchRef = doc(db, "batches", tutorUid, "classes", batchId);
    const memberRef = doc(db, "batches", tutorUid, "classes", batchId, "members", memberId);
    // ── Aug 24 audit fix: transactional remove. The old
    // deleteDoc+unconditional decrement drove memberCount negative
    // when the member doc didn't exist and threw raw on ended batches.
    await runTransaction(db, async (tx) => {
      const [batchSnap, memberSnap] = await Promise.all([
        tx.get(batchRef),
        tx.get(memberRef),
      ]);
      if (!batchSnap.exists() || !memberSnap.exists()) {
        // Nothing to remove — treat as an idempotent no-op.
        return;
      }
      const batchData = batchSnap.data();
      const memberCount =
        typeof batchData?.memberCount === "number"
          ? batchData.memberCount
          : 0;
      tx.delete(memberRef);
      tx.update(batchRef, {
        memberCount: Math.max(0, memberCount - 1),
        updatedAt: serverTimestamp(),
      });
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
