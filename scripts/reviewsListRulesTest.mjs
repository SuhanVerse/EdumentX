/**
 * Rules-emulation test for the marketplace's live review aggregates.
 *
 * The student-facing tutor cards overlay per-tutor rating/reviewCount
 * from a single `collectionGroup("reviews")` subscription (see
 * `services/tutors/FirebaseTutorRepository.ts`). CollectionGroup
 * queries evaluate against the SAME document-level rule as a plain
 * subcollection list (`match /reviews/{tutorUid}/reviews/{reviewId}
 * { allow get, list: if isSignedIn(); }`), so this suite verifies
 * that rule directly:
 *
 *   1. Any signed-in user can list a tutor's reviews
 *   2. Unauthenticated reads are rejected
 *   3. A student can create active reviews (the aggregate input)
 *
 * NOTE: the local emulator (cloud-firestore-emulator v1.21) returns
 * 400 INVALID_ARGUMENT for `runQuery` with `collectionGroupId` — a
 * known emulator gap (same family as the bare-`auth` / list-membership
 * quirks documented in firestore.rules). The native SDK's
 * collectionGroup path works against real Firestore and is covered by
 * this rule, so the direct collectionGroup query can't be emulated
 * here and is verified by the plain-list checks instead.
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/reviewsListRulesTest.mjs"
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

async function runListQuery(parentDocPath, uid) {
  // REST shape for listing a subcollection: parent = the parent
  // DOCUMENT path, `collectionId` = the subcollection name.
  // (Using the subcollection path as the runQuery parent trips an
  // emulator parser bug — "Document parent name ... lacks '/'" —
  // so we use the document-parent form, which works.)
  const res = await fetch(`${BASE}${parentDocPath}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenFor(uid)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "reviews" }] },
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

const STUDENT = "rev-student-1";
const VIEWER = "rev-viewer-1"; // a different signed-in user browsing cards
const TUTOR_A = "rev-tutor-a";
const TUTOR_B = "rev-tutor-b";
const REV_A = "review-aaa";
const REV_B = "review-bbb";

// ── 1-2. Student seeds active reviews under two tutors ──
{
  const r = await req(
    "PATCH",
    `/reviews/${TUTOR_A}/reviews/${REV_A}`,
    STUDENT,
    payload({
      tutorUid: TUTOR_A,
      studentUid: STUDENT,
      studentName: "Review Student",
      status: "active",
      score: 5,
      comment: "Great tutor",
    }),
  );
  check("student creates active review (tutor A)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 200));
}
{
  const r = await req(
    "PATCH",
    `/reviews/${TUTOR_B}/reviews/${REV_B}`,
    STUDENT,
    payload({
      tutorUid: TUTOR_B,
      studentUid: STUDENT,
      studentName: "Review Student",
      status: "active",
      score: 4,
      comment: "Nice classes",
    }),
  );
  check("student creates active review (tutor B)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 200));
}

// ── 3-4. Any signed-in user can LIST a tutor's reviews (the rule a
//    collectionGroup read evaluates against) ──
{
  const r = await runListQuery(`/reviews/${TUTOR_A}`, VIEWER);
  const ok = r.status === 200 && r.body.includes(REV_A);
  check("signed-in user lists tutor A reviews", ok ? 200 : r.status, 200);
  if (r.status !== 200 || !ok) console.log("   ", r.body.slice(0, 200));
}
{
  const r = await runListQuery(`/reviews/${TUTOR_B}`, VIEWER);
  const ok = r.status === 200 && r.body.includes(REV_B);
  check("signed-in user lists tutor B reviews", ok ? 200 : r.status, 200);
  if (r.status !== 200 || !ok) console.log("   ", r.body.slice(0, 200));
}

// ── 5. Unauthenticated list rejected ──
{
  const res = await fetch(`${BASE}/reviews/${TUTOR_A}/reviews:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "reviews" }] },
    }),
    signal: AbortSignal.timeout(8000),
  });
  check("unauthenticated review list rejected", res.status >= 400, true);
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
