/**
 * Rules-emulation test for the `tutors/{uid}` availability carve-out.
 *
 * Runs against the LOCAL Firestore emulator (which enforces the local
 * `firebase/firestore.rules` for client-style REST calls). Verifies:
 *
 *   1. OWNER flips `isAvailableForNewStudents` (+ updatedAt) → allowed
 *   2. OWNER touches any OTHER field (e.g. fullName) → denied
 *   3. STRANGER flips the flag on someone else's doc → denied
 *
 * The emulator derives `request.auth.uid` from the `sub` claim of a
 * JWT; it does not verify the signature locally, so we can mint tokens
 * with `jsonwebtoken`-free base64.
 *
 * Usage:
 *   npx firebase emulators:start --only firestore --project demo-edumentx
 *   node scripts/rulesEmulationTest.mjs
 */

// Matches the project + host the `npm run test:rules` script passes
// to `firebase emulators:exec`. Overridable for other setups.
import { Buffer } from "node:buffer";

const PROJECT = process.env.RULES_TEST_PROJECT ?? "demo-edumentx";
const HOST = process.env.RULES_TEST_HOST ?? "http://127.0.0.1:8080";
const BASE = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function tokenFor(uid) {
  // Header + payload; signature is ignored by the emulator.
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: uid })}.`;
}

async function req(method, path, uid, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokenFor(uid)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.text() };
}

// Firestore REST update payload shape: { fields: { ... } }
// Booleans stay boolean — the rules type-check the availability flag
// (`is bool`), and the real client sends actual booleans.
const field = (v) =>
  typeof v === "boolean" ? { booleanValue: v } : { stringValue: String(v) };
function updatePayload(fields) {
  return { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, field(v)])) };
}

const OWNER = "tutor-owner-1";
const STRANGER = "stranger-9";
const DOC = `/tutors/${OWNER}`;

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? "✅" : "❌"} ${name} — expected ${expected}, got ${actual}`);
}

// ── Seed the doc (admin SDK-style write via emulator REST with no auth is
//    NOT allowed by rules; instead seed through a create with the owner's
//    token is also blocked because create requires isAdmin. The emulator's
//    rules require admin create, so seed via the emulator's REST "bypass"
//    header used by the Admin SDK: Authorization: Bearer owner + the
//    X-Goog-... header. Simplest: use the firebase-admin SDK pointed at the
//    emulator to seed. — fall back to direct emulator admin channel. */

async function seedDoc() {
  // The emulator honors the Admin SDK channel when the request uses the
  // special "owner" auth: set Authorization: Bearer owner.
  const res = await fetch(`${BASE}${DOC}?updateMask.fieldPaths=isAvailableForNewStudents`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer owner", // emulator admin bypass
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatePayload({ isAvailableForNewStudents: true })),
  });
  if (res.status !== 200) {
    console.error("seed failed:", res.status, await res.text());
    process.exit(1);
  }
}

console.log("Seeding tutors/{uid} doc via emulator admin channel…");
await seedDoc();
console.log("  seeded. Running rules checks:\n");  // 1. Owner flips the flag (+ updatedAt) — must be ALLOWED (200/OK)
  {
    const r = await req("PATCH", `${DOC}?updateMask.fieldPaths=isAvailableForNewStudents&updateMask.fieldPaths=updatedAt`, OWNER,
      updatePayload({ isAvailableForNewStudents: false, updatedAt: "2026-08-15T00:00:00Z" }));
    check("owner flips availability flag", r.status, 200);
    if (r.status !== 200) console.log("     ", r.body.slice(0, 200));
  }

// 2. Owner changes another field — must be DENIED (403)
{
  const r = await req("PATCH", `${DOC}?updateMask.fieldPaths=fullName`, OWNER,
    updatePayload({ fullName: "Hacked Name" }));
  check("owner changes fullName (should deny)", r.status, 403);
}

// 3. Stranger flips the flag — must be DENIED (403)
{
  const r = await req("PATCH", `${DOC}?updateMask.fieldPaths=isAvailableForNewStudents`, STRANGER,
    updatePayload({ isAvailableForNewStudents: true }));
  check("stranger flips flag (should deny)", r.status, 403);
}

// 4. Owner flips flag WITHOUT updatedAt — hmm, the carve-out permits
//    ONLY ['isAvailableForNewStudents', 'updatedAt'], so a bare flag
//    write is actually allowed too (affectedKeys ⊆ allowed set). Verify:
{
  const r = await req("PATCH", `${DOC}?updateMask.fieldPaths=isAvailableForNewStudents`, OWNER,
    updatePayload({ isAvailableForNewStudents: true }));
  check("owner flips flag alone (allowed subset)", r.status, 200);
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exitCode = fail > 0 ? 1 : 0;
