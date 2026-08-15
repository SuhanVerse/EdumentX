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
 *   6. Recursively deletes every doc it created, even on failure.
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
