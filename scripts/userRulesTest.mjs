/**
 * Rules-emulation test: users/{uid} write-lockdown + Pro-tier
 * server-grant enforcement (Aug 24 audit fixes).
 *
 * Locks in three escalations that USED to work and must stay dead:
 *
 *   1. Admin self-promotion — owner patching `role:"admin"` onto their
 *      own users doc (isAdmin() previously trusted that field)
 *   2. Suspended-user self-resurrection — owner writing `status`
 *   3. Free-tier Pro minting — owner writing `subscriptionTier` /
 *      `subscriptionExpiresAt` on `tutors/{uid}` OR the profile subdoc
 *
 * Plus the legitimate flows that must KEEP working:
 *   - first-create of the users doc (auth metadata, optional starter
 *     role student/tutor)
 *   - first-time role write on a doc created before any role existed
 *   - role transitions student↔tutor
 *   - displayName / pushTokens / updatedAt maintenance writes
 *   - the tutor availability-flag carve-out on tutors/{uid}
 *   - the reviewer aggregate carve-out on tutorProfile/default
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/userRulesTest.mjs"
 */
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
// The Firestore emulator has no client path to write `admins/*` or
// `tutors/*` (by design — those are admin-only collections), so this
// suite seeds them through the ADMIN SDK, which emulators:exec
// authorizes against the local emulator via FIRESTORE_EMULATOR_HOST.
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
// firebase-admin v14 splits Firestore into its own entry point.
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT = process.env.RULES_TEST_PROJECT ?? "demo-edumentx";
const HOST = process.env.RULES_TEST_HOST ?? "http://127.0.0.1:8080";
const BASE = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
admin.initializeApp({ projectId: PROJECT });
const adb = getFirestore();

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function tokenFor(uid, claims) {
  // Mirrors scripts/seedAdmin.ts: admin authority = the `admin:true`
  // Firebase Auth custom claim (never users.role).
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: uid, ...(claims ?? {}) })}.`;
}
/** Admin-authenticated request helper (custom-claim token). */
async function reqAsAdmin(method, path, body) {
  return req(method, path, ADMIN, body, { admin: true });
}
function field(v) {
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
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
async function req(method, path, uid, body, claims) {
  // Every PATCH carries an explicit updateMask = RN Firebase
  // setDoc(..., { merge: true }) semantics. (An UNMASKED REST PATCH
  // is a full-document REPLACE — it wipes untouched fields — which
  // both diverges from the app's transport and trips the emulator's
  // diff() no-change quirk.)
  let url = `${BASE}${path}`;
  if (method === "PATCH" && body?.fields) {
    url += "?" + Object.keys(body.fields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${tokenFor(uid, claims)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
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
/** Expect a rules rejection (4xx). */
function checkDenied(name, r) {
  const ok = r.status >= 400 && r.status < 500;
  check(name, ok ? "denied" : `allowed(${r.status})`, "denied");
  if (!ok) console.log("   ", r.body.slice(0, 300));
}

const U1 = "ur-user-1";
const U2 = "ur-user-2";
const REVIEWER = "ur-reviewer-1";
// Disjoint from U1 on purpose: the discovery-doc tests exercise
// /tutors/{uid} where NO sibling users/{uid} doc exists.
const TUT = "ur-tutor-1";
const ADMIN = "ur-admin-1";

// ── 0. Seeds ──────────────────────────────────────────────────────
// Auditable admins/{uid} ledger row (Admin SDK — clients can never
// write this collection).
await adb.collection("admins").doc(ADMIN).set({
  email: "admin@example.com",
  grantedAt: new Date(),
});
// Discovery doc seeded VIA A CLAIMED REST CLIENT (not the Admin
// SDK): the availability carve-out below updates it as the owner,
// and emulator rule evaluation behaves differently against
// SDK-written docs than against client-borne ones.
{
  const r = await reqAsAdmin("PATCH", `/tutors/${TUT}`, payload({
    fullName: "UR Tutor",
    verificationStatus: "approved",
    isAvailableForNewStudents: true,
    rating: 0,
    reviewCount: 0,
  }));
  check("seed discovery doc (claimed admin mirror-write)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}

// ── 1. Create path ──────────────────────────────────────────────
{
  // Auth-metadata create WITHOUT a role key — the RoleSelection shape.
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    uid: U1,
    email: "u1@example.com",
    displayName: "User One",
    createdAt: 1756000000000,
    updatedAt: 1756000000000,
  }));
  check("create users doc without role (RoleSelection shape)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U2}`, U2, payload({
    uid: U2,
    role: "admin",
  }));
  checkDenied("create users doc with role=admin rejected", r);
}
{
  const r = await req("PATCH", `/users/${U2}`, U2, payload({
    uid: U2,
    status: "active",
  }));
  checkDenied("create users doc with privileged `status` key rejected", r);
}
{
  const r = await req("PATCH", `/users/U${U2}`, U2, payload({ uid: U2 }));
  checkDenied("create with uid != path userId rejected", r);
}

// ── 2. Update path — legitimate flows keep working ──────────────
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    role: "student",
    updatedAt: 1756000100000,
  }));
  check("first-time role write (doc had no role) allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    role: "tutor",
    updatedAt: 1756000200000,
  }));
  check("role transition student→tutor allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    displayName: "Renamed",
    pushTokens: ["ExpoPushToken[xyz]"],
    updatedAt: 1756000300000,
  }, ["pushTokens"]));
  check("displayName+pushTokens maintenance write allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    role: "student", // unchanged value re-written — must stay legal
    updatedAt: 1756000400000,
  }));
  check("unchanged-role rewrite (heal-write shape) allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}

{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    updatedAt: 1756000450000,
  }));
  check("uid-less maintenance patch (EditTeachingDetails shape) allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    uid: "someone-else",
    updatedAt: 1756000460000,
  }));
  checkDenied("uid change inside patch rejected", r);
}

// ── 3. THE ESCALATIONS THAT MUST STAY DEAD ──────────────────────
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    role: "admin",
    updatedAt: 1756000500000,
  }));
  checkDenied("ESCALATION: owner patching role=admin denied", r);
}
{
  const r = await req("PATCH", `/users/${U1}`, U1, payload({
    status: "active",
    updatedAt: 1756000600000,
  }));
  checkDenied("owner writing privileged `status` field denied", r);
}
{
  const r = await req("PATCH", `/admins/${U1}`, U1, payload({
    email: "u1@example.com",
    grantedAt: 1756000000000,
  }));
  checkDenied("client write to admins/{uid} denied", r);
}
{
  const r = await req("GET", `/users/${U2}`, U1, undefined);
  checkDenied("stranger read of another users doc denied", r);
}
{
  const r = await req("GET", `/admins/${ADMIN}`, U1, undefined);
  checkDenied("non-admin read of an admins doc denied", r);
}
// isAdmin() positive path: authority flows from the admin:true
// CUSTOM CLAIM alone now (the users.role clause was removed with the
// Aug 24 fix; the claim is minted by scripts/seedAdmin.ts).
{
  const r = await reqAsAdmin("GET", `/users/${U1}`, undefined);
  check("claimed admin reads another user's doc (custom-claim authority)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  // Targets U1 (exists). On a MISSING doc this would evaluate as a
  // create and be denied by the create rule's key allowlist instead
  // of exercising the admin bypass.
  const r = await reqAsAdmin("PATCH", `/users/${U1}`, payload({
    status: "suspended",
    updatedAt: 1756000950000,
  }));
  check("admin suspension write bypasses owner forbid-list", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}

// ── 4. Pro tier is server-granted only ──────────────────────────
{
  const r = await req("PATCH", `/users/${U1}/tutorProfile/default`, U1, payload({
    fullName: "Pro Wannabe",
    bio: "honest field",
  }));
  check("owner writes ordinary profile fields", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U1}/tutorProfile/default`, U1, payload({
    subscriptionTier: "pro",
    subscriptionExpiresAt: 1956000000000,
  }));
  checkDenied("ESCALATION: owner grants Pro on profile doc denied", r);
}
{
  const r = await req("PATCH", `/tutors/${TUT}`, TUT, payload({
    isAvailableForNewStudents: true,
    updatedAt: 1756000700000,
  }, []));
  check("availability-flag carve-out on tutors/{uid} allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/tutors/${TUT}`, TUT, payload({
    subscriptionTier: "pro",
    subscriptionExpiresAt: 1956000000000,
  }));
  checkDenied("ESCALATION: owner grants Pro on discovery doc denied", r);
}
{
  // Aug 25: hasAvailability gate — owner may flip it (bool only).
  const r = await req("PATCH", `/tutors/${TUT}`, TUT, payload({
    hasAvailability: true,
    updatedAt: 1756001000000,
  }));
  check("owner flips hasAvailability (slot saved)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/tutors/${TUT}`, TUT, payload({
    hasAvailability: "yes",
  }));
  checkDenied("hasAvailability must stay boolean", r);
}
{
  const r = await req("PATCH", `/users/${U1}/tutorProfile/default`, REVIEWER, payload({
    rating: 4.5,
    reviewCount: 2,
    updatedAt: 1756000800000,
  }));
  check("reviewer aggregate carve-out still allowed", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U1}/tutorProfile/default`, REVIEWER, payload({
    rating: 4.9,
    reviewCount: 3,
    monthlyRateNpr: 1,
    updatedAt: 1756000900000,
  }));
  checkDenied(
    "reviewer cannot smuggle non-aggregate fields (rate) past carve-out",
    r,
  );
}

// ── 5. Wildcard CREATE path (Aug 25 prod fix) ───────────────────
// Production throws on resource.data access during CREATE — the old
// single write-statement denied every FIRST-TIME subdoc save (live
// StudentProfileScreen repro). Locks in:
//   * first-time creation of a subdoc (StudentProfile shape)
//   * tier keys may not be smuggled in at creation either
{
  const r = await req("PATCH", `/users/${U1}/studentProfile/default`, U1, payload({
    grade: "12",
    subjects: ["Math"],
    fullName: "Probe Student",
    phone: "9800000000",
    updatedAt: 1756001000000,
  }, ["subjects"]));
  check("owner CREATES fresh subdoc (StudentProfile shape)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body.slice(0, 300));
}
{
  const r = await req("PATCH", `/users/${U2}/studentProfile/default`, U2, payload({
    grade: "11",
    subscriptionTier: "pro",
  }));
  checkDenied("tier key cannot be smuggled at subdoc CREATION", r);
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
