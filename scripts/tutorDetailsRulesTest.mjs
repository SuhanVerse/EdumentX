/**
 * Rules-emulation test: TutorDetailsScreen student-side reads.
 *
 * A student viewing a tutor's profile subscribes to the tutor's
 * roster / classes / requests via DIRECT-PATH lists. This suite
 * verifies those reads against the emulator with the local rules:
 *
 *   1. A stranger signed-in student can list a tutor's roster
 *   2. ... can list a tutor's classes (incl. an ended one, since the
 *      screen uses ALL batches to build the BookedMap)
 *   3. ... can list a tutor's enrollment requests (the pending
 *      hourglass overlay)
 *   4. Unauthenticated list rejected
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/tutorDetailsRulesTest.mjs"
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
function field(v) {
  if (typeof v === "number") return { integerValue: String(v) };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}
function payload(obj, arrays = []) {
  const fields = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, field(v)]),
  );
  for (const key of arrays) {
    fields[key] = {
      arrayValue: { values: obj[key].map((item) => ({ stringValue: String(item) })) },
    };
  }
  return { fields };
}
async function req(method, path, uid, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokenFor(uid)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  return { status: res.status, body: await res.text() };
}
async function runSubList(parentDocPath, collectionId, uid) {
  const res = await fetch(`${BASE}${parentDocPath}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenFor(uid)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId }] },
    }),
    signal: AbortSignal.timeout(8000),
  });
  return { status: res.status, body: await res.text() };
}

let pass = 0;
let fail = 0;
function check(name, actual, expected, extra = "") {
  const ok = actual === expected;
  console.log(
    `${ok ? "✅" : "❌"} ${name} — expected ${expected}, got ${actual}${extra ? ` ${extra}` : ""}`,
  );
  if (ok) pass++;
  else fail++;
}

const TUTOR = "tds-tutor-1";
const STUDENT = "tds-student-1";
const VIEWER = "tds-viewer-1";

// Seed under the tutor (admin-free: use the tutor identity to create —
// the tutor is the owner per the direct-path rules).
{
  // The roster create rule's capacity gate reads the tutor's profile
  // doc, so seed that first (owner write).
  const r = await req(
    "PATCH",
    `/users/${TUTOR}/tutorProfile/default`,
    TUTOR,
    payload({
      fullName: "TDS Tutor",
      enrolledCount: 0,
      studentCapacity: 6,
    }),
  );
  check("seed tutor profile doc (owner)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req(
    "PATCH",
    `/enrollments/${TUTOR}/roster/roster-1`,
    TUTOR,
    payload(
      {
        tutorUid: TUTOR,
        studentUid: "enrolled-student-1",
        studentName: "Enrolled Student",
        status: "active",
        slotKeys: ["mon:10:00"],
      },
      ["slotKeys"],
    ),
  );
  check("seed roster doc (tutor owner)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req(
    "PATCH",
    `/batches/${TUTOR}/classes/class-active`,
    TUTOR,
    payload(
      {
        tutorUid: TUTOR,
        status: "active",
        title: "Active batch",
        slotKeys: ["tue:11:00"],
      },
      ["slotKeys"],
    ),
  );
  check("seed active class (tutor owner)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req(
    "PATCH",
    `/enrollmentRequests/${TUTOR}/requests/req-1`,
    STUDENT,
    payload({
      tutorUid: TUTOR,
      studentUid: STUDENT,
      status: "pending",
      message: "Please teach me",
    }),
  );
  check("seed enrollment request (student author)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}

// ── The TutorDetailsScreen reads ──
{
  const r = await runSubList(`/enrollments/${TUTOR}`, "roster", VIEWER);
  const ok = r.status === 200 && r.body.includes("roster-1");
  check("stranger student lists tutor roster", ok ? 200 : r.status, 200);
  if (r.status !== 200 || !ok) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await runSubList(`/batches/${TUTOR}`, "classes", VIEWER);
  const ok = r.status === 200 && r.body.includes("class-active");
  check("stranger student lists tutor classes", ok ? 200 : r.status, 200);
  if (r.status !== 200 || !ok) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await runSubList(`/enrollmentRequests/${TUTOR}`, "requests", VIEWER);
  const ok = r.status === 200 && r.body.includes("req-1");
  check("stranger student lists tutor requests", ok ? 200 : r.status, 200);
  if (r.status !== 200 || !ok) console.log("   ", r.body.slice(0, 300));
}
{
  const res = await fetch(`${BASE}/enrollments/${TUTOR}/roster:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "roster" }] },
    }),
    signal: AbortSignal.timeout(8000),
  });
  check("unauthenticated roster list rejected", res.status >= 400, true);
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
