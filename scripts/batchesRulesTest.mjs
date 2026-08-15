/**
 * Rules-emulation test for the batches collections.
 *
 * Verifies against the LOCAL Firestore emulator (which enforces the
 * local `firebase/firestore.rules` for client-style REST calls):
 *   1. OWNER creates a batch in `batches/{tutorUid}/classes` → allowed
 *   2. OWNER adds a member to their batch → allowed
 *   3. STRANGER adds a member to someone else's batch → denied
 *   4. OWNER removes a member → allowed
 *   5. STRANGER removes a member → denied
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/batchesRulesTest.mjs"
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

// Firestore REST payload shape: { fields: { key: { stringValue } } }
// (`slotKeys` is a list — send it as arrayValue so the rules see a list.)
function field(v) {
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
    headers: {
      Authorization: `Bearer ${tokenFor(uid)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
}

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? "✅" : "❌"} ${name} — expected ${expected}, got ${actual}`);
  if (ok) pass++;
  else fail++;
}

const OWNER = "tutor-owner-1";
const STRANGER = "tutor-stranger-1";
const BATCH_ID = "batch-abc";
const MEMBER_ID = "mem-xyz";

// Seed the parent chain via the emulator admin channel ("Bearer owner").
async function seed(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify(payload(data)),
  });
  if (res.status !== 200) {
    console.error("seed failed:", path, res.status, await res.text());
    process.exit(1);
  }
}

console.log("Seeding batch parent chain via emulator admin channel…");
await seed(`/batches/${OWNER}`, { _namespaceAnchor: "true" });
await seed(`/batches/${OWNER}/classes/${BATCH_ID}`, {
  batchId: BATCH_ID,
  tutorUid: OWNER,
  name: "Batch A",
  subject: "Math",
  monthlyRateNpr: "2200",
  slotKeys: "mon:5-7",
  status: "active",
});

// 1. Owner creates a batch (create rule: tutorUid matches auth).
const created = await req("POST", `/batches/${OWNER}/classes`, OWNER, payload({
  batchId: "batch-new",
  tutorUid: OWNER,
  name: "Batch B",
  subject: "Science",
  monthlyRateNpr: "1500",
  slotKeys: ["tue:5-7"],
  status: "active",
}, ["slotKeys"]));
check("owner creates batch", created, 200);

// 2. Owner adds a member (member create rule reads parent doc tutorUid).
const added = await req("POST", `/batches/${OWNER}/classes/${BATCH_ID}/members`, OWNER, payload({
  memberId: MEMBER_ID,
  enrollmentId: "enr-1",
  studentUid: "student-1",
  studentName: "Student One",
  studentAvatar: "",
}));
check("owner adds member", added, 200);

// 3. Stranger adds a member to owner's batch → denied.
const strangerAdd = await req("POST", `/batches/${OWNER}/classes/${BATCH_ID}/members`, STRANGER, payload({
  memberId: "mem-nope",
  enrollmentId: "enr-2",
  studentUid: "student-2",
  studentName: "Student Two",
}));
check("stranger adds member", strangerAdd, 403);

// 4. Owner removes a member.
const removed = await req(
  "DELETE",
  `/batches/${OWNER}/classes/${BATCH_ID}/members/${MEMBER_ID}`,
  OWNER,
);
check("owner removes member", removed, 200);

// 5. Stranger removes a member → denied.
const strangerRemove = await req(
  "DELETE",
  `/batches/${OWNER}/classes/${BATCH_ID}/members/${MEMBER_ID}`,
  STRANGER,
);
check("stranger removes member", strangerRemove, 403);

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
