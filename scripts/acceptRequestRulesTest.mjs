/**
 * Rules-emulation test for the acceptRequest transaction write paths.
 *
 * Reproduces the exact 3 writes `FirebaseEnrollmentRepository.acceptRequest`
 * performs, as a tutor, against the LOCAL emulator rules:
 *   1. update `users/{tutor}/tutorProfile/default` (enrolledCount bump)
 *   2. create `enrollments/{tutor}/roster/{id}` (status active)
 *   3. update `enrollmentRequests/{tutor}/requests/{id}` (status accepted)
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
{
  const r = await req("POST", `/enrollments/${TUTOR}/roster`, TUTOR, payload(
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
  ));
  check("tutor creates roster enrollment (capacity gate)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
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

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
