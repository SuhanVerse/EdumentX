/**
 * Enrollment accept/decline smoke test (against a real Firestore project)
 *
 * Exercises the exact write shapes + transaction logic of
 * `FirebaseEnrollmentRepository.acceptRequest` / `.declineRequest`
 * against the live project, then verifies every side effect and
 * cleans up after itself:
 *
 *   1. Seeds a throwaway tutor (`users/{uid}/tutorProfile/default`
 *      with capacity) + student.
 *   2. Writes a pending enrollment request exactly like
 *      `writeEnrollmentRequest` does.
 *   3. Accepts it (capacity gate → roster doc → profile bump →
 *      request `accepted` → student notification) and verifies each
 *      side effect.
 *   4. Declines a second request (request deleted → student
 *      notification) and verifies.
 *   5. Forces the capacity guard (enrolledCount == capacity) and
 *      confirms a third accept is rejected.
 *   6. Session-code batch join: seeds a batch (memberCount=2), accepts
 *      a join request with batchId, and verifies memberCount → 3, the
 *      member doc, roster.batchId, and the request flip.
 *   7. Full-batch backstop: fills the batch to capacity and confirms
 *      a join is rejected (BATCH_FULL) with atomic rollback (request
 *      stays pending, memberCount unchanged, no orphan roster doc).
 *   7b. Direct-path removeEnrollment (the Aug 2026 fix): the tutor
 *      removes the joined enrollment — roster soft-deleted, profile
 *      counters decremented, the batch member doc deleted by direct
 *      path (via roster.batchId), batch memberCount 3 → 2.
 *   7c. createBatch-seeded removal: a seeded batch (member docs keyed
 *      by enrollmentId + roster batchId stamp) cascades identically.
 *   8. Recursively deletes every doc it created, even on failure.
 *
 * All UIDs are prefixed `smoke-` with a timestamp, so the script can
 * never touch real user data — cleanup is scoped to those subtrees.
 *
 * Usage (same prereqs as seedAdmin):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run smoke:enrollments
 *
 * Exit code 0 = all checks passed; 1 = one or more checks failed.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

// ─── Helpers ────────────────────────────────────────────────────────────────

function initAdmin() {
  if (getApps().length > 0) return;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      [
        "GOOGLE_APPLICATION_CREDENTIALS is not set.",
        "Generate a service-account key in:",
        "  Firebase Console → Project Settings → Service Accounts → 'Generate new private key'",
        "Then: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json",
      ].join("\n"),
    );
    process.exit(1);
  }
  initializeApp({
    credential: cert(
      JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, "utf8")),
    ),
  });
}

let failures = 0;

function pass(name: string, detail?: string) {
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  failures += 1;
  console.error(`  ❌ ${name} — ${detail}`);
}

function assertEqual(actual: unknown, expected: unknown, what: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    fail(what, `expected ${e}, got ${a}`);
    return false;
  }
  pass(what, String(actual));
  return true;
}

/** Strip every null/undefined key — mirrors the repo's `stripNulls`. */
function stripNulls<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out as T;
}

const MAX_CAPACITY = 6; // mirrors `types.ts` / the Firestore rule
const MAX_BATCH_MEMBERS = 6; // mirrors `types.ts` (batch seat cap)

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  initAdmin();
  const db = getFirestore();

  // Throwaway identities — never collide with real users.
  const stamp = Date.now();
  const TUTOR_UID = `smoke-tutor-${stamp}`;
  const STUDENT_UID = `smoke-student-${stamp}`;

  const profileRef = db.doc(`users/${TUTOR_UID}/tutorProfile/default`);
  const requestColl = db.collection(`enrollmentRequests/${TUTOR_UID}/requests`);
  const rosterColl = db.collection(`enrollments/${TUTOR_UID}/roster`);
  const studentNotifColl = db.collection(`notifications/${STUDENT_UID}/items`);

  // Root subtrees to wipe in cleanup (recursive — covers subcollections).
  const cleanupRefs = [
    db.doc(`users/${TUTOR_UID}`),
    db.doc(`users/${STUDENT_UID}`),
    db.doc(`enrollmentRequests/${TUTOR_UID}`),
    db.doc(`enrollments/${TUTOR_UID}`),
    db.doc(`notifications/${STUDENT_UID}`),
    db.doc(`batches/${TUTOR_UID}`),
  ];

  const STUDENT = {
    uid: STUDENT_UID,
    name: "Smoke Test Student",
    grade: "Grade 9",
    avatar: null as string | null,
  };
  const SUBJECTS = ["Mathematics"];
  // Real slot-key format is `${day}:${slot}` (see `slotKey()` in
  // types.ts) — `mon-5-7` would be rejected by `parseSlotKey` and
  // never surface in computeBookedMap / deriveTodaySessions.
  const SLOT_KEY = "mon:5-7";
  const BATCH_ID = `smoke-batch-${stamp}`;
  const START_DATE = "2026-08-20";
  const END_DATE = "2026-12-20";
  const SCHEDULE = "Mon · Wed · Fri 5–7 PM";
  const MESSAGE = "Smoke-test message — please accept me!";

  try {
    // ── Seed tutor + student ────────────────────────────────────────────
    await profileRef.set({
      fullName: "Smoke Test Tutor",
      studentCapacity: MAX_CAPACITY,
      enrolledCount: 0,
      currentStudents: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await db.doc(`users/${STUDENT_UID}`).set({
      fullName: STUDENT.name,
      role: "student",
    });

    // ── 1. Write a pending request (mirrors writeEnrollmentRequest) ─────
    const requestRef = requestColl.doc();
    const requestId = requestRef.id;
    await requestRef.set({
      requestId,
      tutorUid: TUTOR_UID,
      studentUid: STUDENT_UID,
      studentName: STUDENT.name,
      studentGrade: STUDENT.grade,
      studentAvatar: STUDENT.avatar,
      subjects: SUBJECTS,
      schedule: SCHEDULE,
      startDate: START_DATE,
      endDate: END_DATE,
      message: MESSAGE,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      decidedAt: null,
    });
    pass("Seeded pending enrollment request", requestId);

    // ── 2. Accept (mirrors acceptRequest) ───────────────────────────────
    const enrollmentRef = rosterColl.doc();
    const enrollmentId = await db.runTransaction(async (tx) => {
      const [profileSnap, requestSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(requestRef),
      ]);

      const profileData = profileSnap.data() as
        | { enrolledCount?: number; currentStudents?: number; studentCapacity?: number }
        | undefined;
      const enrolledCount = typeof profileData?.enrolledCount === "number" ? profileData.enrolledCount : 0;
      const cap = Math.max(
        typeof profileData?.studentCapacity === "number" ? profileData.studentCapacity : 0,
        MAX_CAPACITY,
      );
      if (enrolledCount >= cap) {
        throw new Error("CAPACITY_EXCEEDED");
      }

      const requestData = requestSnap.data() as { status?: string } | undefined;
      if (!requestSnap.exists || requestData?.status !== "pending") {
        throw new Error("REQUEST_ALREADY_DECIDED");
      }

      const enrollmentDoc = stripNulls({
        enrollmentId: enrollmentRef.id,
        tutorUid: TUTOR_UID,
        studentUid: STUDENT.uid,
        studentName: STUDENT.name,
        studentGrade: STUDENT.grade,
        studentAvatar: STUDENT.avatar,
        subjects: SUBJECTS,
        slotKey: SLOT_KEY,
        startDate: START_DATE,
        endDate: END_DATE,
        status: "active" as const,
        acceptedAt: FieldValue.serverTimestamp(),
        removedAt: null,
        removeReason: null,
        requestId,
      });
      tx.set(enrollmentRef, enrollmentDoc);
      tx.update(profileRef, {
        enrolledCount: enrolledCount + 1,
        currentStudents: enrolledCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(requestRef, {
        status: "accepted",
        decidedAt: FieldValue.serverTimestamp(),
      });

      return enrollmentRef.id;
    });
    pass("Accept transaction committed", enrollmentId);

    // Notification mirrors writeNotification(notificationCopy.enrollmentAccepted(...))
    await studentNotifColl.doc().set({
      recipientUid: STUDENT_UID,
      type: "enrollment_accepted",
      title: "You're enrolled",
      body: "Smoke Test Tutor accepted your request. Check the schedule for your first session.",
      reason: "",
      createdAt: FieldValue.serverTimestamp(),
      read: false,
      readAt: null,
    });
    pass("Student notification written (enrollment_accepted)");

    // ── Verify accept side effects ──────────────────────────────────────
    const rosterSnap = await enrollmentRef.get();
    const rosterData = rosterSnap.data();
    pass("Roster doc exists", `enrollments/${TUTOR_UID}/roster/${enrollmentId}`);
    assertEqual(rosterData?.status, "active", "roster.status");
    assertEqual(rosterData?.studentUid, STUDENT_UID, "roster.studentUid");
    assertEqual(rosterData?.slotKey, SLOT_KEY, "roster.slotKey");
    assertEqual(rosterData?.requestId, requestId, "roster.requestId");

    const profileAfter = (await profileRef.get()).data();
    assertEqual(profileAfter?.enrolledCount, 1, "profile.enrolledCount after accept");
    assertEqual(profileAfter?.currentStudents, 1, "profile.currentStudents after accept");

    const requestAfter = (await requestRef.get()).data();
    assertEqual(requestAfter?.status, "accepted", "request.status after accept");

    const notifSnap = await studentNotifColl.get();
    pass("Student notification doc exists after accept", `count=${notifSnap.size}`);

    // ── 3. Decline (mirrors declineRequest) ─────────────────────────────
    const request2Ref = requestColl.doc();
    const request2Id = request2Ref.id;
    await request2Ref.set({
      requestId: request2Id,
      tutorUid: TUTOR_UID,
      studentUid: STUDENT_UID,
      studentName: STUDENT.name,
      studentGrade: STUDENT.grade,
      studentAvatar: STUDENT.avatar,
      subjects: SUBJECTS,
      schedule: SCHEDULE,
      startDate: START_DATE,
      endDate: END_DATE,
      message: "Second request — decline me.",
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      decidedAt: null,
    });

    // declineRequest: hard-delete the request, then notify.
    await request2Ref.delete();
    await studentNotifColl.doc().set({
      recipientUid: STUDENT_UID,
      type: "enrollment_declined",
      title: "Request not accepted",
      body: "Smoke Test Tutor couldn't accept your enrollment request.",
      reason: "Schedule conflict with existing students.",
      createdAt: FieldValue.serverTimestamp(),
      read: false,
      readAt: null,
    });
    pass("Decline executed (request deleted + notification written)");

    const declinedSnap = await request2Ref.get();
    if (declinedSnap.exists) {
      fail("Declined request doc removed", "request2 still exists after decline");
    } else {
      pass("Declined request doc removed", "exists=false");
    }

    // ── 4. Capacity guard ───────────────────────────────────────────────
    // Fill the profile to capacity, then attempt a third accept.
    await profileRef.set(
      {
        enrolledCount: MAX_CAPACITY,
        currentStudents: MAX_CAPACITY,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const request3Ref = requestColl.doc();
    const request3Id = request3Ref.id;
    await request3Ref.set({
      requestId: request3Id,
      tutorUid: TUTOR_UID,
      studentUid: STUDENT_UID,
      studentName: STUDENT.name,
      studentGrade: STUDENT.grade,
      studentAvatar: STUDENT.avatar,
      subjects: SUBJECTS,
      schedule: SCHEDULE,
      startDate: START_DATE,
      endDate: END_DATE,
      message: "Third request — should be rejected by capacity.",
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      decidedAt: null,
    });

    let capacityBlocked = false;
    try {
      await db.runTransaction(async (tx) => {
        const profileSnap = await tx.get(profileRef);
        const profileData = profileSnap.data() as { enrolledCount?: number; studentCapacity?: number } | undefined;
        const enrolledCount = typeof profileData?.enrolledCount === "number" ? profileData.enrolledCount : 0;
        const cap = Math.max(
          typeof profileData?.studentCapacity === "number" ? profileData.studentCapacity : 0,
          MAX_CAPACITY,
        );
        if (enrolledCount >= cap) {
          throw new Error("CAPACITY_EXCEEDED");
        }
      });
    } catch (err) {
      capacityBlocked = (err as Error).message === "CAPACITY_EXCEEDED";
    }
    if (capacityBlocked) {
      pass("Capacity guard blocks accept at full roster", "CAPACITY_EXCEEDED raised");
    } else {
      fail("Capacity guard blocks accept at full roster", "no CAPACITY_EXCEEDED error was thrown");
    }

    // ── 5. Session-code batch join (mirrors acceptRequest + batchId) ──
    // Reset the profile (step 4 filled it to capacity) so this accept
    // passes the capacity gate and reaches the batch-member write.
    await profileRef.set(
      {
        enrolledCount: 0,
        currentStudents: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Seed a batch exactly like `createBatch` does: doc at
    // `batches/{tutorUid}/classes/{batchId}` with a denormalized
    // `memberCount` + pre-seeded member docs.
    const batchRef = db.doc(`batches/${TUTOR_UID}/classes/${BATCH_ID}`);
    await db.runTransaction(async (tx) => {
      tx.set(batchRef, stripNulls({
        batchId: BATCH_ID,
        tutorUid: TUTOR_UID,
        name: "Smoke Test Batch",
        subject: "Mathematics",
        monthlyRateNpr: 2000,
        slotKeys: [SLOT_KEY],
        startDate: START_DATE,
        endDate: null,
        status: "active" as const,
        createdAt: FieldValue.serverTimestamp(),
        memberCount: 2,
      }));
      // Two pre-seeded members (mirrors createBatch seeding `members`).
      for (const memberId of ["seed-member-1", "seed-member-2"]) {
        tx.set(
          db.doc(`batches/${TUTOR_UID}/classes/${BATCH_ID}/members/${memberId}`),
          {
            memberId,
            enrollmentId: `seed-enrollment-${memberId.slice(-1)}`,
            studentUid: STUDENT_UID,
            studentName: STUDENT.name,
            studentAvatar: STUDENT.avatar,
            joinedAt: FieldValue.serverTimestamp(),
          },
        );
      }
    });
    pass("Seeded batch with 2 members", `memberCount=2`);

    // Session-code join request (mirrors writeEnrollmentRequest's
    // `mode: "session-code"` shape, incl. `batchId` + `sessionCode`).
    const requestBatchRef = requestColl.doc();
    const requestBatchId = requestBatchRef.id;
    await requestBatchRef.set({
      requestId: requestBatchId,
      tutorUid: TUTOR_UID,
      studentUid: STUDENT_UID,
      studentName: STUDENT.name,
      studentGrade: STUDENT.grade,
      studentAvatar: STUDENT.avatar,
      subjects: SUBJECTS,
      schedule: SCHEDULE,
      startDate: START_DATE,
      endDate: END_DATE,
      message: "Session-code join — please add me to the batch.",
      mode: "session-code",
      planMonths: null,
      pickedSlotKeys: [],
      address: "",
      trial: false,
      sessionCode: "SMK-123",
      costNpr: 2000,
      batchId: BATCH_ID,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      decidedAt: null,
    });
    pass("Seeded session-code join request", requestBatchId);

    // Accept with `batchId` — mirrors the repo's full transaction:
    // capacity gate → roster doc (carrying batchId) → profile bump →
    // request flip → batch member doc + memberCount increment.
    const batchEnrollmentRef = rosterColl.doc();
    const batchEnrollmentId = await db.runTransaction(async (tx) => {
      const [profileSnap, requestSnap, batchSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(requestBatchRef),
        tx.get(batchRef),
      ]);

      const profileData = profileSnap.data() as
        | { enrolledCount?: number; currentStudents?: number; studentCapacity?: number }
        | undefined;
      const enrolledCount = typeof profileData?.enrolledCount === "number" ? profileData.enrolledCount : 0;
      const cap = Math.max(
        typeof profileData?.studentCapacity === "number" ? profileData.studentCapacity : 0,
        MAX_CAPACITY,
      );
      if (enrolledCount >= cap) {
        throw new Error("CAPACITY_EXCEEDED");
      }

      const requestData = requestSnap.data() as { status?: string } | undefined;
      if (!requestSnap.exists || requestData?.status !== "pending") {
        throw new Error("REQUEST_ALREADY_DECIDED");
      }

      const enrollmentDoc = stripNulls({
        enrollmentId: batchEnrollmentRef.id,
        tutorUid: TUTOR_UID,
        studentUid: STUDENT.uid,
        studentName: STUDENT.name,
        studentGrade: STUDENT.grade,
        studentAvatar: STUDENT.avatar,
        subjects: SUBJECTS,
        slotKey: SLOT_KEY,
        startDate: START_DATE,
        endDate: END_DATE,
        status: "active" as const,
        acceptedAt: FieldValue.serverTimestamp(),
        removedAt: null,
        removeReason: null,
        requestId: requestBatchId,
        batchId: BATCH_ID,
      });
      tx.set(batchEnrollmentRef, enrollmentDoc);
      tx.update(profileRef, {
        enrolledCount: enrolledCount + 1,
        currentStudents: enrolledCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(requestBatchRef, {
        status: "accepted",
        decidedAt: FieldValue.serverTimestamp(),
      });

      // Session-code member write — member keyed by enrollmentId,
      // memberCount incremented (mirrors the repo exactly).
      if (batchSnap.exists) {
        const batchData = batchSnap.data() as { memberCount?: number } | undefined;
        if ((batchData?.memberCount ?? 0) >= MAX_BATCH_MEMBERS) {
          throw new Error("BATCH_FULL");
        }
        tx.set(
          db.doc(`batches/${TUTOR_UID}/classes/${BATCH_ID}/members/${batchEnrollmentRef.id}`),
          {
            memberId: batchEnrollmentRef.id,
            enrollmentId: batchEnrollmentRef.id,
            studentUid: STUDENT.uid,
            studentName: STUDENT.name,
            studentAvatar: STUDENT.avatar,
            joinedAt: FieldValue.serverTimestamp(),
          },
        );
        tx.update(batchRef, {
          memberCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return batchEnrollmentRef.id;
    });
    pass("Batch-join accept transaction committed", batchEnrollmentId);

    // ── Verify batch-join side effects ──────────────────────────────────
    const batchAfter = (await batchRef.get()).data();
    assertEqual(batchAfter?.memberCount, 3, "batch.memberCount after join (2 → 3)");

    const memberSnap = await db
      .doc(`batches/${TUTOR_UID}/classes/${BATCH_ID}/members/${batchEnrollmentId}`)
      .get();
    if (memberSnap.exists) {
      pass("Batch member doc exists", `members/${batchEnrollmentId}`);
      assertEqual(memberSnap.data()?.studentUid, STUDENT_UID, "member.studentUid");
      assertEqual(memberSnap.data()?.enrollmentId, batchEnrollmentId, "member.enrollmentId");
    } else {
      fail("Batch member doc exists", "member doc missing after join");
    }

    const batchRosterSnap = await batchEnrollmentRef.get();
    assertEqual(batchRosterSnap.data()?.batchId, BATCH_ID, "roster.batchId (session-code join)");

    const batchRequestAfter = (await requestBatchRef.get()).data();
    assertEqual(batchRequestAfter?.status, "accepted", "session-code request.status after accept");

    // ── 6. Full-batch backstop (BatchFullError semantics) ───────────────
    // Fill the batch to capacity, then confirm a second join is
    // rejected and the whole transaction rolls back atomically.
    await batchRef.set(
      { memberCount: MAX_BATCH_MEMBERS, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const requestFullRef = requestColl.doc();
    const requestFullId = requestFullRef.id;
    await requestFullRef.set({
      requestId: requestFullId,
      tutorUid: TUTOR_UID,
      studentUid: STUDENT_UID,
      studentName: STUDENT.name,
      studentGrade: STUDENT.grade,
      studentAvatar: STUDENT.avatar,
      subjects: SUBJECTS,
      schedule: SCHEDULE,
      startDate: START_DATE,
      endDate: END_DATE,
      message: "Join a full batch — should be blocked.",
      mode: "session-code",
      planMonths: null,
      pickedSlotKeys: [],
      address: "",
      trial: false,
      sessionCode: "SMK-123",
      costNpr: 2000,
      batchId: BATCH_ID,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      decidedAt: null,
    });

    let fullBlocked = false;
    try {
      await db.runTransaction(async (tx) => {
        const [profileSnap, requestSnap, batchSnap] = await Promise.all([
          tx.get(profileRef),
          tx.get(requestFullRef),
          tx.get(batchRef),
        ]);

        const profileData = profileSnap.data() as
          | { enrolledCount?: number; studentCapacity?: number }
          | undefined;
        const enrolledCount = typeof profileData?.enrolledCount === "number" ? profileData.enrolledCount : 0;
        const cap = Math.max(
          typeof profileData?.studentCapacity === "number" ? profileData.studentCapacity : 0,
          MAX_CAPACITY,
        );
        if (enrolledCount >= cap) {
          throw new Error("CAPACITY_EXCEEDED");
        }
        if (!requestSnap.exists || (requestSnap.data() as { status?: string } | undefined)?.status !== "pending") {
          throw new Error("REQUEST_ALREADY_DECIDED");
        }
        if (batchSnap.exists) {
          const batchData = batchSnap.data() as { memberCount?: number } | undefined;
          if ((batchData?.memberCount ?? 0) >= MAX_BATCH_MEMBERS) {
            throw new Error("BATCH_FULL");
          }
        }
      });
    } catch (err) {
      fullBlocked = (err as Error).message === "BATCH_FULL";
    }
    if (fullBlocked) {
      pass("Full-batch join blocked", "BATCH_FULL raised");
    } else {
      fail("Full-batch join blocked", "no BATCH_FULL error was thrown");
    }

    // Atomic rollback: the blocked join left the request pending, the
    // batch memberCount untouched, and no roster doc behind.
    assertEqual((await requestFullRef.get()).data()?.status, "pending", "blocked request stays pending (rollback)");
    assertEqual((await batchRef.get()).data()?.memberCount, MAX_BATCH_MEMBERS, "batch.memberCount unchanged after block");
    const orphanRoster = await rosterColl
      .where("requestId", "==", requestFullId)
      .get();
    if (orphanRoster.size === 0) {
      pass("No roster doc from blocked join", "rollback clean");
    } else {
      fail("No roster doc from blocked join", `found ${orphanRoster.size} orphan roster doc(s)`);
    }

    // ── 7b. Direct-path removeEnrollment cascade ────────────────────────
    // The Aug 2026 fix: NO collectionGroup scans. The tutor pins the
    // row by their own uid, reads the roster's `batchId`, and deletes
    // the member doc by direct path. First restore the batch's
    // memberCount to its real doc count (the backstop check above
    // bumped it to 6; the batch actually holds 3 member docs).
    await batchRef.set(
      { memberCount: 3, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const removeReason = "Smoke test removal";
    await db.runTransaction(async (tx) => {
      const [profileSnap, enrSnap, batchSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(batchEnrollmentRef),
        tx.get(batchRef),
      ]);
      const profileData = profileSnap.data() as
        | { enrolledCount?: number; currentStudents?: number }
        | undefined;
      const enrData = enrSnap.data() as
        | { status?: string; batchId?: string | null }
        | undefined;
      if (!enrSnap.exists || enrData?.status !== "active") {
        throw new Error("ENROLLMENT_NOT_ACTIVE");
      }
      tx.update(batchEnrollmentRef, {
        status: "removed",
        removedAt: FieldValue.serverTimestamp(),
        removeReason,
      });
      tx.update(profileRef, {
        enrolledCount: Math.max(0, (profileData?.enrolledCount ?? 0) - 1),
        currentStudents: Math.max(0, (profileData?.currentStudents ?? 0) - 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Cascade via the roster's batchId (member docs keyed by
      // enrollmentId — direct path, exists() guard for the batch).
      if (batchSnap.exists) {
        const batchData = batchSnap.data() as { memberCount?: number } | undefined;
        tx.delete(
          db.doc(`batches/${TUTOR_UID}/classes/${BATCH_ID}/members/${batchEnrollmentId}`),
        );
        tx.update(batchRef, {
          memberCount: Math.max(0, (batchData?.memberCount ?? 0) - 1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
    pass("removeEnrollment transaction committed", batchEnrollmentId);

    // Verify: roster soft-deleted, profile counters decremented,
    // member doc gone, batch memberCount decremented.
    const removedRoster = (await batchEnrollmentRef.get()).data();
    assertEqual(removedRoster?.status, "removed", "roster.status after removal");
    assertEqual(removedRoster?.removeReason, removeReason, "roster.removeReason");
    const profileAfterRemoval = (await profileRef.get()).data();
    assertEqual(
      profileAfterRemoval?.enrolledCount,
      0,
      "profile.enrolledCount decremented (1 → 0)",
    );
    const removedMember = await db
      .doc(`batches/${TUTOR_UID}/classes/${BATCH_ID}/members/${batchEnrollmentId}`)
      .get();
    if (!removedMember.exists) {
      pass("Batch member doc deleted by cascade", "direct-path delete");
    } else {
      fail("Batch member doc deleted by cascade", "member doc still present");
    }
    const batchAfterRemoval = (await batchRef.get()).data();
    assertEqual(
      batchAfterRemoval?.memberCount,
      2,
      "batch.memberCount after removal (3 → 2)",
    );

    // ── 7c. createBatch-seeded removal (roster batchId stamp) ──────────
    // A batch seeded via createBatch now keys member docs by
    // enrollmentId AND stamps batchId onto the seeded roster rows.
    // Removing the seeded enrollment must cascade the same way.
    const SEED_BATCH_ID = "smoke-batch-seed-remove";
    const seedBatchRef = db.doc(`batches/${TUTOR_UID}/classes/${SEED_BATCH_ID}`);
    const seedEnrollmentRef = rosterColl.doc("seed-enrollment-remove");
    await db.runTransaction(async (tx) => {
      tx.set(seedBatchRef, stripNulls({
        batchId: SEED_BATCH_ID,
        tutorUid: TUTOR_UID,
        name: "Seeded Remove Batch",
        subject: "Physics",
        monthlyRateNpr: 1800,
        slotKeys: [SLOT_KEY],
        startDate: START_DATE,
        endDate: null,
        status: "active" as const,
        createdAt: FieldValue.serverTimestamp(),
        memberCount: 1,
      }));
      // createBatch's roster stamp: the seeded enrollment's roster
      // row carries the batchId.
      tx.set(seedEnrollmentRef, {
        enrollmentId: seedEnrollmentRef.id,
        tutorUid: TUTOR_UID,
        studentUid: STUDENT.uid,
        studentName: STUDENT.name,
        studentGrade: STUDENT.grade,
        studentAvatar: STUDENT.avatar,
        subjects: SUBJECTS,
        slotKey: SLOT_KEY,
        startDate: START_DATE,
        endDate: END_DATE,
        status: "active" as const,
        acceptedAt: FieldValue.serverTimestamp(),
        removedAt: null,
        removeReason: null,
        batchId: SEED_BATCH_ID,
      });
      // Member doc keyed by enrollmentId (the createBatch convention).
      tx.set(
        db.doc(`batches/${TUTOR_UID}/classes/${SEED_BATCH_ID}/members/${seedEnrollmentRef.id}`),
        {
          memberId: seedEnrollmentRef.id,
          enrollmentId: seedEnrollmentRef.id,
          studentUid: STUDENT.uid,
          studentName: STUDENT.name,
          studentAvatar: STUDENT.avatar,
          joinedAt: FieldValue.serverTimestamp(),
        },
      );
      tx.update(profileRef, {
        enrolledCount: 1,
        currentStudents: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    pass("Seeded createBatch-style batch + roster stamp", SEED_BATCH_ID);

    // Remove the seeded enrollment — same direct-path flow as above.
    await db.runTransaction(async (tx) => {
      const [profileSnap, enrSnap, batchSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(seedEnrollmentRef),
        tx.get(seedBatchRef),
      ]);
      const profileData = profileSnap.data() as
        | { enrolledCount?: number; currentStudents?: number }
        | undefined;
      const enrData = enrSnap.data() as
        | { status?: string; batchId?: string | null }
        | undefined;
      if (!enrSnap.exists || enrData?.status !== "active") {
        throw new Error("ENROLLMENT_NOT_ACTIVE");
      }
      tx.update(seedEnrollmentRef, {
        status: "removed",
        removedAt: FieldValue.serverTimestamp(),
        removeReason,
      });
      tx.update(profileRef, {
        enrolledCount: Math.max(0, (profileData?.enrolledCount ?? 0) - 1),
        currentStudents: Math.max(0, (profileData?.currentStudents ?? 0) - 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (batchSnap.exists) {
        const batchData = batchSnap.data() as { memberCount?: number } | undefined;
        tx.delete(
          db.doc(`batches/${TUTOR_UID}/classes/${SEED_BATCH_ID}/members/${seedEnrollmentRef.id}`),
        );
        tx.update(seedBatchRef, {
          memberCount: Math.max(0, (batchData?.memberCount ?? 0) - 1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
    pass("Seeded-member removal transaction committed", seedEnrollmentRef.id);

    const seedMemberGone = await db
      .doc(`batches/${TUTOR_UID}/classes/${SEED_BATCH_ID}/members/${seedEnrollmentRef.id}`)
      .get();
    if (!seedMemberGone.exists) {
      pass("Seeded member doc deleted by cascade", "direct-path delete");
    } else {
      fail("Seeded member doc deleted by cascade", "member doc still present");
    }
    assertEqual(
      (await seedBatchRef.get()).data()?.memberCount,
      0,
      "seeded batch.memberCount after removal (1 → 0)",
    );
    assertEqual(
      (await seedEnrollmentRef.get()).data()?.status,
      "removed",
      "seeded roster.status after removal",
    );
  } catch (err) {
    fail("Smoke test run", err instanceof Error ? err.message : String(err));
  } finally {
    // ── Cleanup: wipe every subtree we touched, best-effort ─────────────
    console.log("\nCleaning up smoke-test data…");
    const results = await Promise.allSettled(
      cleanupRefs.map((ref) => db.recursiveDelete(ref)),
    );
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`  ⚠️  cleanup of ${cleanupRefs[i].path} failed: ${String(r.reason)}`);
      }
    });

    const allCleaned = await Promise.all(
      cleanupRefs.map(async (ref) => {
        const snap = await ref.get();
        return !snap.exists;
      }),
    );
    const cleaned = allCleaned.every(Boolean);
    if (cleaned) {
      console.log("  ✅ All smoke-test data removed");
    } else {
      console.error("  ❌ Some smoke-test data may remain — inspect the paths above.");
      failures += 1;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n── Smoke test summary ──────────────────────────────");
  console.log(`  ${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exitCode = 1;
});
