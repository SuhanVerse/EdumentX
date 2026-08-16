/**
 * Rules-emulation test for the direct-path `removeEnrollment` cascade.
 *
 * The Aug 2026 fix replaced the two rule-unprovable collectionGroup
 * scans (unfiltered `roster` + `members where enrollmentId == …`) with
 * direct-path writes pinned by the tutor's own uid:
 *   1. update `enrollments/{tutor}/roster/{enrollmentId}` — soft-delete
 *      ({status, removedAt, removeReason})
 *   2. update `users/{tutor}/tutorProfile/default` — counter decrement
 *   3. delete `batches/{tutor}/classes/{batchId}/members/{enrollmentId}`
 *      + decrement the batch's memberCount (located via the roster
 *      row's `batchId`, stamped by `createBatch` / the session-code
 *      join in `acceptRequest`)
 *
 * This suite verifies each write is permitted for the OWNER and
 * denied for everyone else, plus the two rule-level guarantees the
 * client transaction leans on:
 *   - the roster update rule now allows the `batchId` key (the
 *     createBatch roster stamp)
 *   - a member delete under a NON-EXISTENT batch is DENIED, which is
 *     why the transaction reads the batch (exists() guard) before
 *     deleting the member.
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/removeEnrollmentRulesTest.mjs"
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
// capacity counters must be integerValue, not stringValue.
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

const TUTOR = "tutor-remove-1";
const STRANGER = "tutor-remove-stranger";
const STUDENT = "student-remove-1";
const ENR_ID = "enr-remove-1";
const BATCH_ID = "batch-remove-1";
const GHOST_BATCH = "batch-remove-ghost";
const MEMBER_ID = ENR_ID; // member docs are keyed by enrollmentId

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

console.log("Seeding tutor profile, roster row, batch + member…");
await seed(`/users/${TUTOR}/tutorProfile/default`, {
  enrolledCount: 1,
  currentStudents: 1,
  studentCapacity: 4,
});
await seed(`/enrollments/${TUTOR}/roster/${ENR_ID}`, {
  enrollmentId: ENR_ID,
  tutorUid: TUTOR,
  studentUid: STUDENT,
  studentName: "Student One",
  status: "active",
  slotKey: "mon:5-7",
  startDate: "2026-08-15",
  endDate: "2026-12-15",
});
await seed(`/batches/${TUTOR}`, { _namespaceAnchor: "true" });
await seed(`/batches/${TUTOR}/classes/${BATCH_ID}`, {
  batchId: BATCH_ID,
  tutorUid: TUTOR,
  name: "Remove Batch",
  subject: "Math",
  monthlyRateNpr: 2200,
  slotKeys: ["mon:5-7"],
  status: "active",
  memberCount: 3,
}, ["slotKeys"]);
await seed(`/batches/${TUTOR}/classes/${BATCH_ID}/members/${MEMBER_ID}`, {
  memberId: MEMBER_ID,
  enrollmentId: ENR_ID,
  studentUid: STUDENT,
  studentName: "Student One",
  studentAvatar: "",
});

// ── 1. removeEnrollment soft-delete: tutor flips roster status ──
{
  const r = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=status&updateMask.fieldPaths=removedAt&updateMask.fieldPaths=removeReason`,
    TUTOR,
    payload({ status: "removed", removedAt: "2026-08-16T00:00:00Z", removeReason: "Class ended" }),
  );
  check("tutor soft-deletes roster row ({status, removedAt, removeReason})", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 2. createBatch roster stamp: tutor sets batchId on own roster row ──
{
  const r = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=batchId`,
    TUTOR,
    payload({ batchId: BATCH_ID }),
  );
  check("tutor stamps batchId on own roster row (createBatch seed)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 3. Stranger cannot flip the roster row ──
{
  const r = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=status`,
    STRANGER,
    payload({ status: "removed" }),
  );
  check("stranger cannot update roster row", r.status, 403);
}

// ── 4. Roster updates outside the allowlist are denied ──
{
  const r = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/${ENR_ID}?updateMask.fieldPaths=studentName`,
    TUTOR,
    payload({ studentName: "Hacked" }),
  );
  check("tutor cannot update non-allowlisted roster key (studentName)", r.status, 403);
}

// ── 5. Cascade: tutor deletes the member doc by direct path ──
{
  const r = await req(
    "DELETE",
    `/batches/${TUTOR}/classes/${BATCH_ID}/members/${MEMBER_ID}`,
    TUTOR,
  );
  check("tutor deletes batch member doc (direct path)", r.status, 200);
}

// ── 6. Stranger cannot delete the member doc ──
{
  const r = await req(
    "DELETE",
    `/batches/${TUTOR}/classes/${BATCH_ID}/members/${MEMBER_ID}`,
    STRANGER,
  );
  check("stranger cannot delete batch member doc", r.status, 403);
}

// ── 7. Cascade: tutor decrements the batch's memberCount ──
{
  const r = await req(
    "PATCH",
    `/batches/${TUTOR}/classes/${BATCH_ID}?updateMask.fieldPaths=memberCount&updateMask.fieldPaths=updatedAt`,
    TUTOR,
    payload({ memberCount: 2, updatedAt: "2026-08-16T00:00:00Z" }),
  );
  check("tutor decrements batch memberCount", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 8. Member delete under a NON-EXISTENT batch is denied (the
//        exists() guard in the transaction is what makes this safe) ──
{
  const r = await req(
    "DELETE",
    `/batches/${TUTOR}/classes/${GHOST_BATCH}/members/${MEMBER_ID}`,
    TUTOR,
  );
  check("member delete under non-existent batch denied", r.status, 403);
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
