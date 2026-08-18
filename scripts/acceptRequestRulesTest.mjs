/**
 * Rules-emulation test for the acceptRequest transaction write paths.
 *
 * Reproduces the exact 3 writes `FirebaseEnrollmentRepository.acceptRequest`
 * performs, as a tutor, against the LOCAL emulator rules:
 *   1. update `users/{tutor}/tutorProfile/default` (enrolledCount bump)
 *   2. create `enrollments/{tutor}/roster/{id}` (status active)
 *   3. update `enrollmentRequests/{tutor}/requests/{id}` (status accepted)
 *   4. SESSION-CODE JOIN: create `batches/{tutor}/classes/{batchId}/members`
 *      + bump the batch's memberCount (accepting a batch-join request)
 * Plus the post-commit student notification create.
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/acceptRequestRulesTest.mjs"
 */
import { Buffer } from "node:buffer";

const PROJECT = process.env.RULES_TEST_PROJECT ?? "demo-edumentx";
const HOST = process.env.RULES_TEST_HOST ?? "http://127.0.0.1:8080";
const BASE = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function tokenFor(uid) {
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: uid })}.`;
}

// Firestore REST payload helper. The emulator's rule evaluation is
// TYPE-SENSITIVE — the real SDK sends numbers as integers, so the
// capacity counters must be sent as integerValue, not stringValue.
function field(v) {
  if (typeof v === "number") return { integerValue: String(v) };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}
function payload(obj, arrays = []) {
  const fields = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, field(v)]));
  for (const key of arrays) {
    fields[key] = {
      arrayValue: { values: obj[key].map((item) => ({ stringValue: String(item) })) },
    };
  }
  return { fields };
}

async function req(method, path, uid, body, query = "") {
  const res = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: { Authorization: `Bearer ${tokenFor(uid)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.text()).slice(0, 300) };
}

let pass = 0;
let fail = 0;
function check(name, actual, expected, extra = "") {
  const ok = actual === expected;
  console.log(`${ok ? "✅" : "❌"} ${name} — expected ${expected}, got ${actual}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
}

const TUTOR = "tutor-accept-1";
const STUDENT = "student-accept-1";
const REQ_ID = "req-1";
const ENR_ID = "enr-1";
const BATCH_ID = "batch-join-1";

// ── Seed via emulator admin channel ("Bearer owner") ──
async function seed(path, data, arrays = []) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify(payload(data, arrays)),
  });
  if (res.status !== 200) {
    console.error("seed failed:", path, res.status, await res.text());
    process.exit(1);
  }
}

console.log("Seeding tutor profile + pending request…");
await seed(`/users/${TUTOR}/tutorProfile/default`, {
  enrolledCount: 0,
  currentStudents: 0,
  studentCapacity: 4,
});
await seed(`/enrollmentRequests/${TUTOR}/requests/${REQ_ID}`, {
  requestId: REQ_ID,
  tutorUid: TUTOR,
  studentUid: STUDENT,
  status: "pending",
  studentName: "Student One",
});

// ── 1. Tutor updates own profile (enrolledCount bump) ──
{
  const r = await req(
    "PATCH",
    `/users/${TUTOR}/tutorProfile/default?updateMask.fieldPaths=enrolledCount&updateMask.fieldPaths=currentStudents&updateMask.fieldPaths=updatedAt`,
    TUTOR,
    payload({ enrolledCount: 1, currentStudents: 1, updatedAt: "2026-08-15T00:00:00Z" }),
  );
  check("tutor updates own tutorProfile (enrolledCount bump)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 2. Tutor creates roster enrollment (status active) ──
// PATCH at the explicit ${ENR_ID} path (create-with-id — the doc
// doesn't exist yet) so the fast-forward tests in 2b hit the same
// row instead of a doc that doesn't exist.
{
  const r = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}`,
    TUTOR,
    payload(
      {
        enrollmentId: ENR_ID,
        tutorUid: TUTOR,
        studentUid: STUDENT,
        studentName: "Student One",
        status: "active",
        slotKey: "mon:5-7",
        startDate: "2026-08-15",
        endDate: "2026-12-15",
        subjects: ["Math"],
      },
      ["subjects"],
    ),
  );
  check("tutor creates roster enrollment (capacity gate)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 2b. Student fast-forward (dev QA helper on My Enrollments).
//        The owning student may update ONLY `endDate`/`updatedAt` on
//        their own roster row so `sweepExpiredEnrollments` can flip
//        the card Active → Past. Status/removal fields stay
//        tutor-only — a student moving their own row to "removed"
//        must be denied.
{
  const ok = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=endDate&updateMask.fieldPaths=updatedAt`,
    STUDENT,
    payload({ endDate: "2026-08-14", updatedAt: "2026-08-16T00:00:00Z" }),
  );
  check("student fast-forwards own roster endDate (dev QA helper)", ok.status, 200);
  if (ok.status !== 200) console.log("   ", ok.body);

  const statusBump = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt`,
    STUDENT,
    payload({ status: "removed", updatedAt: "2026-08-16T00:00:00Z" }),
  );
  check("student cannot flip own roster status (tutor-only)", statusBump.status, 403);

  const stranger = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=endDate&updateMask.fieldPaths=updatedAt`,
    "student-accept-2",
    payload({ endDate: "2026-08-14", updatedAt: "2026-08-16T00:00:00Z" }),
  );
  check("non-member student cannot touch another student's roster row", stranger.status, 403);
}

// ── 3. Tutor updates the request status → accepted ──
{
  const r = await req(
    "PATCH",
    `/enrollmentRequests/${TUTOR}/requests/${REQ_ID}?updateMask.fieldPaths=status&updateMask.fieldPaths=decidedAt`,
    TUTOR,
    payload({ status: "accepted", decidedAt: "2026-08-15T00:00:00Z" }),
  );
  check("tutor accepts the request (status flip)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 3b. SESSION-CODE JOIN: seed the target batch, then tutor creates
//        the member doc (keyed by enrollmentId) + bumps memberCount —
//        exactly what acceptRequest does when input.batchId is set.
{
  await seed(`/batches/${TUTOR}`, { _namespaceAnchor: "true" });
  await seed(`/batches/${TUTOR}/classes/${BATCH_ID}`, {
    batchId: BATCH_ID,
    tutorUid: TUTOR,
    name: "Join Batch",
    subject: "Math",
    monthlyRateNpr: 2200,
    slotKeys: ["mon:5-7"],
    status: "active",
    memberCount: 0,
  }, ["slotKeys"]);

  const memberCreate = await req(
    "POST",
    `/batches/${TUTOR}/classes/${BATCH_ID}/members`,
    TUTOR,
    payload({
      memberId: ENR_ID,
      enrollmentId: ENR_ID,
      studentUid: STUDENT,
      studentName: "Student One",
      studentAvatar: "",
    }),
  );
  check("tutor adds accepted student to batch members", memberCreate.status, 200);

  const bump = await req(
    "PATCH",
    `/batches/${TUTOR}/classes/${BATCH_ID}?updateMask.fieldPaths=memberCount&updateMask.fieldPaths=updatedAt`,
    TUTOR,
    payload({ memberCount: 1, updatedAt: "2026-08-15T00:00:00Z" }),
  );
  check("tutor bumps batch memberCount", bump.status, 200);

  // The member doc's id is the enrollmentId — re-adding the same
  // student is a new doc id, so this can't be idempotent-tested here,
  // but the create-rule's parent-batch `tutorUid == auth.uid` gate is.
}

// ── 3c. FULL BATCH: the rules deliberately do NOT gate on capacity
//        (Firestore can't count subcollection docs transactionally —
//        that's the accept transaction's job, and `BatchFullError`
//        throws BEFORE these writes, rolling everything back). At
//        `memberCount: 6` the tutor's writes stay PERMITTED, and a
//        NON-TUTOR student stays BLOCKED regardless of fullness.
{
  const FULL_BATCH = "batch-full-1";
  await seed(`/batches/${TUTOR}/classes/${FULL_BATCH}`, {
    batchId: FULL_BATCH,
    tutorUid: TUTOR,
    name: "Full Batch",
    subject: "Math",
    monthlyRateNpr: 2200,
    slotKeys: ["mon:5-7"],
    status: "active",
    memberCount: 6,
  }, ["slotKeys"]);

  const tutorCreate = await req(
    "POST",
    `/batches/${TUTOR}/classes/${FULL_BATCH}/members`,
    TUTOR,
    payload({
      memberId: "enr-full-1",
      enrollmentId: "enr-full-1",
      studentUid: STUDENT,
      studentName: "Student One",
      studentAvatar: "",
    }),
  );
  check(
    "full batch: tutor member create stays permitted (cap is the transaction's job)",
    tutorCreate.status,
    200,
  );

  const tutorBump = await req(
    "PATCH",
    `/batches/${TUTOR}/classes/${FULL_BATCH}?updateMask.fieldPaths=memberCount&updateMask.fieldPaths=updatedAt`,
    TUTOR,
    payload({ memberCount: 7, updatedAt: "2026-08-15T00:00:00Z" }),
  );
  check("full batch: tutor memberCount bump stays permitted", tutorBump.status, 200);

  const studentCreate = await req(
    "POST",
    `/batches/${TUTOR}/classes/${FULL_BATCH}/members`,
    STUDENT,
    payload({
      memberId: "enr-sneak",
      enrollmentId: "enr-sneak",
      studentUid: STUDENT,
      studentName: "Sneaky Student",
      studentAvatar: "",
    }),
  );
  check(
    "full batch: student member create still denied (ownership gate)",
    studentCreate.status,
    403,
  );
}

// ── 4. Post-commit: notification to the student ──
{
  const r = await req("POST", `/notifications/${STUDENT}/items`, TUTOR, payload({
    recipientUid: STUDENT,
    type: "enrollment_accepted",
    title: "Enrollment accepted",
    body: "Your tutor accepted your request",
    read: "false",
  }));
  check("tutor writes enrollment_accepted notification to student", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 5. LEGACY PROFILE: no counters at all (the live-data bug). The
//       rule must default enrolledCount→0 / studentCapacity→0 (cap→6)
//       instead of comparing undefined.
{
  await seed(`/users/tutor-legacy-1/tutorProfile/default`, {
    fullName: "Legacy Tutor",
  });
  const r = await req("POST", `/enrollments/tutor-legacy-1/roster`, "tutor-legacy-1", payload(
    {
      enrollmentId: "enr-legacy",
      tutorUid: "tutor-legacy-1",
      studentUid: "student-9",
      studentName: "Student Nine",
      status: "active",
      slotKey: "mon:5-7",
      startDate: "2026-08-15",
      endDate: "2026-12-15",
      subjects: ["Math"],
    },
    ["subjects"],
  ));
  check("legacy profile (no counters) can create first roster enrollment", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 6. CAPACITY EXHAUSTED: enrolledCount 6 >= cap 6 → still denied.
{
  await seed(`/users/tutor-full-1/tutorProfile/default`, {
    enrolledCount: 6,
    currentStudents: 6,
    studentCapacity: 6,
  });
  const r = await req("POST", `/enrollments/tutor-full-1/roster`, "tutor-full-1", payload(
    {
      enrollmentId: "enr-full",
      tutorUid: "tutor-full-1",
      studentUid: "student-10",
      studentName: "Student Ten",
      status: "active",
      slotKey: "mon:5-7",
      startDate: "2026-08-15",
      endDate: "2026-12-15",
      subjects: ["Math"],
    },
    ["subjects"],
  ));
  check("full capacity (6 >= 6) still denies roster create", r.status, 403);
}

// ── 7. LEGACY ROSTER ROW (no `tutorUid` field): the auto-expiry sweep
//       (`sweepExpiredEnrollments`) flips `status` on rows the tutor's
//       OWN subscription sees. Rows created before `tutorUid` was a
//       required field lack it — the update rule now keys the tutor
//       clause on the PATH owner (`request.auth.uid == tutorUid`), so
//       the tutor can still expire them and the sweep batch doesn't
//       die on permission-denied. Students stay blocked.
{
  await seed(`/enrollments/tutor-legacy-sweep-1/roster/enr-legacy-sweep`, {
    enrollmentId: "enr-legacy-sweep",
    studentUid: "student-11",
    studentName: "Student Eleven",
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-07-01",
  });
  const r = await req(
    "PATCH",
    `/enrollments/tutor-legacy-sweep-1/roster/enr-legacy-sweep?updateMask.fieldPaths=status&updateMask.fieldPaths=removedAt&updateMask.fieldPaths=removeReason`,
    "tutor-legacy-sweep-1",
    payload({
      status: "expired",
      removedAt: "2026-08-16T00:00:00Z",
      removeReason: "Enrollment period ended",
    }),
  );
  check("tutor expires legacy roster row (no tutorUid field)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);

  // NOTE: the student's write must be a REAL mutation — a no-op
  // (same status value) produces an empty `changedKeys()` set, and
  // `hasOnly([...])` is vacuously true on an empty set, which would
  // let the write through. `removed` is a real change → denied.
  const studentSweep = await req(
    "PATCH",
    `/enrollments/tutor-legacy-sweep-1/roster/enr-legacy-sweep?updateMask.fieldPaths=status`,
    "student-11",
    payload({ status: "removed" }),
  );
  check("student cannot flip a legacy roster row status", studentSweep.status, 403);
}

// ── 8. ZERO-TRUST LOCATION PRIVACY: the `locationAccess` marker
//        under `users/{studentUid}/locationAccess/{tutorUid}` is what
//        unlocks reading the student's precise location
//        (`studentProfile/default.location`). It may ONLY be written
//        by the tutor whose uid matches the path AND who has a real
//        ACTIVE roster row for that student. Without the marker, the
//        student profile read is denied.
{
  // Seed the student profile (precise location) via the admin
  // channel — the student owns it, but seeding with `owner` is fine.
  await seed(`/users/${STUDENT}/studentProfile/default`, {
    fullName: "Student One",
    location: "hidden",
  });

  // 8a. Enrolled tutor (roster row exists from step 2) writes the
  //     marker → allowed.
  const markerOk = await req(
    "PATCH",
    `/users/${STUDENT}/locationAccess/${TUTOR}`,
    TUTOR,
    payload({
      studentUid: STUDENT,
      tutorUid: TUTOR,
      status: "active",
      enrollmentId: ENR_ID,
    }),
  );
  check("enrolled tutor writes locationAccess marker", markerOk.status, 200);
  if (markerOk.status !== 200) console.log("   ", markerOk.body);

  // 8b. With the marker present, the tutor may read the student's
  //     profile (which carries the precise location).
  const profileRead = await req(
    "GET",
    `/users/${STUDENT}/studentProfile/default`,
    TUTOR,
    null,
  );
  check("enrolled tutor can read student profile (location unlocked)", profileRead.status, 200);

  // 8c. A NON-enrolled tutor cannot forge a marker for an arbitrary
  //     student (no roster row references them) → denied.
  const forged = await req(
    "PATCH",
    `/users/student-victim-1/locationAccess/tutor-attacker-1`,
    "tutor-attacker-1",
    payload({
      studentUid: "student-victim-1",
      tutorUid: "tutor-attacker-1",
      status: "active",
      enrollmentId: "enr-fake",
    }),
  );
  check("non-enrolled tutor cannot forge locationAccess marker", forged.status, 403);

  // 8d. A tutor with NO marker cannot read a stranger's profile.
  const deniedRead = await req(
    "GET",
    `/users/student-victim-1/studentProfile/default`,
    "tutor-attacker-1",
    null,
  );
  check("tutor without marker cannot read student profile", deniedRead.status, 403);

  // 8e. Marker with a mismatched studentUid (path says X, doc says Y)
  //     → denied.
  const mismatch = await req(
    "PATCH",
    `/users/${STUDENT}/locationAccess/${TUTOR}`,
    TUTOR,
    payload({
      studentUid: "student-other",
      tutorUid: TUTOR,
      status: "active",
      enrollmentId: ENR_ID,
    }),
  );
  check("marker with mismatched studentUid denied", mismatch.status, 403);

  // 8f. The owning student can always read their own profile.
  const ownerRead = await req(
    "GET",
    `/users/${STUDENT}/studentProfile/default`,
    STUDENT,
    null,
  );
  check("student can read own profile", ownerRead.status, 200);

  // 8g. Marker deletion: the tutor may remove their own marker
  //     (removeEnrollment / sweep) — revoking location access.
  const markerDelete = await req(
    "DELETE",
    `/users/${STUDENT}/locationAccess/${TUTOR}`,
    TUTOR,
    null,
  );
  check("tutor deletes own locationAccess marker (revoke)", markerDelete.status, 200);

  // 8h. After deletion the profile read is locked again.
  const lockedRead = await req(
    "GET",
    `/users/${STUDENT}/studentProfile/default`,
    TUTOR,
    null,
  );
  check("profile read locked after marker deletion", lockedRead.status, 403);
}

// ── 9. PRO SUBSCRIPTION GATES (Phase 2 Advanced Architecture) ──
//      a) The discovery doc mirror allows the OWNER to update ONLY
//         subscriptionTier / subscriptionExpiresAt (+updatedAt) —
//         same carve-out shape as the availability flag.
//      b) FREE tutors are capped at 5 active students in the roster
//         create rule; Pro tutors keep the studentCapacity/6 cap.
{
  // Seed the discovery doc (admin-write, mirrors an approved tutor)
  // so the owner's tier PATCH is an UPDATE, not a CREATE (creates
  // are admin-only by design).
  await seed(`/tutors/${TUTOR}`, {
    uid: TUTOR,
    fullName: "Tutor Accept One",
    verificationStatus: "approved",
    isAvailableForNewStudents: true,
    subscriptionTier: "free",
  });

  // 9a. Owner mirrors tier onto their own discovery doc → allowed.
  const tierWrite = await req(
    "PATCH",
    `/tutors/${TUTOR}?updateMask.fieldPaths=subscriptionTier&updateMask.fieldPaths=subscriptionExpiresAt&updateMask.fieldPaths=updatedAt`,
    TUTOR,
    payload({
      subscriptionTier: "pro",
      subscriptionExpiresAt: "2099-01-01T00:00:00Z",
      updatedAt: "2026-08-17T00:00:00Z",
    }),
  );
  check("owner mirrors subscriptionTier onto own discovery doc", tierWrite.status, 200);
  if (tierWrite.status !== 200) console.log("   ", tierWrite.body);

  // 9b. A stranger cannot touch another tutor's tier.
  const strangerTier = await req(
    "PATCH",
    `/tutors/${TUTOR}?updateMask.fieldPaths=subscriptionTier`,
    "student-accept-2",
    payload({ subscriptionTier: "pro" }),
  );
  check("stranger cannot mirror subscriptionTier on someone else's doc", strangerTier.status, 403);

  // 9c. FREE-tier tutor with 5 enrolled can NOT create a 6th roster row.
  {
    await seed(`/users/tutor-free-1/tutorProfile/default`, {
      enrolledCount: 5,
      currentStudents: 5,
      studentCapacity: 6,
      // tier ABSENT → free
    });
    const r = await req("POST", `/enrollments/tutor-free-1/roster`, "tutor-free-1", payload(
      {
        enrollmentId: "enr-free-6",
        tutorUid: "tutor-free-1",
        studentUid: "student-free-6",
        studentName: "Student Six",
        status: "active",
        slotKey: "mon:5-7",
        startDate: "2026-08-17",
        endDate: "2026-12-17",
        subjects: ["Math"],
      },
      ["subjects"],
    ));
    check("free tier at 5 students denies 6th roster row", r.status, 403);
  }

  // 9d. PRO-tier tutor at 5 can still add a 6th (cap raised, not removed).
  {
    await seed(`/users/tutor-pro-1/tutorProfile/default`, {
      enrolledCount: 5,
      currentStudents: 5,
      studentCapacity: 6,
      subscriptionTier: "pro",
    });
    const r = await req("POST", `/enrollments/tutor-pro-1/roster`, "tutor-pro-1", payload(
      {
        enrollmentId: "enr-pro-6",
        tutorUid: "tutor-pro-1",
        studentUid: "student-pro-6",
        studentName: "Student Six",
        status: "active",
        slotKey: "mon:5-7",
        startDate: "2026-08-17",
        endDate: "2026-12-17",
        subjects: ["Math"],
      },
      ["subjects"],
    ));
    check("pro tier at 5 students can add a 6th (cap raised)", r.status, 200);
    if (r.status !== 200) console.log("   ", r.body);
  }
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
