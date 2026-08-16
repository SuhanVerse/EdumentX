/**
 * Diagnostic: TutorDetailsScreen read paths vs deployed rules.
 *
 * Mints a REAL client token and runs the EXACT query shapes the app's
 * TutorDetailsScreen subscribes to:
 *   - users/{tutorUid}/tutorProfile/default   (doc get — availability)
 *   - reviews/{tutorUid}/reviews              (list)
 *   - enrollments/{tutorUid}/roster           (list)
 *   - batches/{tutorUid}/classes              (list)
 *   - enrollmentRequests/{tutorUid}/requests  (list)
 *   - users/{tutorUid}/tutorProfileUpdate...  (n/a)
 *
 * If all pass with a fresh token, the app's on-device permission
 * denials are an AUTH-TOKEN problem, not a rules problem.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

function initAdmin() {
  if (getApps().length > 0) return;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
    process.exit(1);
  }
  initializeApp({
    credential: cert(
      JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, "utf8")),
    ),
  });
}

function readDotEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const p = path.resolve(process.cwd(), ".env");
    const line = fs
      .readFileSync(p, "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith(`${key}=`));
    if (!line) return undefined;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

const PROJECT_ID =
  readDotEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") ?? "edumentx-dev";
const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
  `/databases/(default)/documents`;

let failures = 0;
function pass(name: string, detail?: string) {
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail: string) {
  failures += 1;
  console.error(`  ❌ ${name} — ${detail}`);
}

async function mintIdToken(uid: string): Promise<string> {
  const apiKey =
    readDotEnv("EXPO_PUBLIC_FIREBASE_API_KEY") ?? process.env.FIREBASE_WEB_API_KEY;
  const app = getApps()[0];
  const token = await getAuth(app).createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, returnSecureToken: true }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const body = (await res.json()) as { idToken?: string; error?: { message?: string } };
  if (!res.ok || !body.idToken) {
    throw new Error(`signInWithCustomToken failed: ${body.error?.message ?? res.status}`);
  }
  return body.idToken;
}

async function runQuery(
  idToken: string,
  parentPath: string,
  structuredQuery: unknown,
): Promise<{ status: number; body: string }> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ parent: parentPath, structuredQuery }),
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, body: await res.text() };
}

function listQuery(collectionId: string) {
  return { from: [{ collectionId }] };
}

function docPath(...segments: string[]) {
  // runQuery `parent` must be a DOCUMENT path (or root); the
  // subcollection is named via `from.collectionId`. Same shape the
  // emulator tests use.
  return `${FIRESTORE_BASE}/${segments.join("/")}`;
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const stamp = Date.now();
  const TUTOR = `smoke-tds-tutor-${stamp}`;
  const STUDENT = `smoke-tds-student-${stamp}`;
  const cleanupRefs = [
    db.doc(`reviews/${TUTOR}`),
    db.doc(`enrollments/${TUTOR}`),
    db.doc(`batches/${TUTOR}`),
    db.doc(`enrollmentRequests/${TUTOR}`),
    db.doc(`users/${TUTOR}/tutorProfile/default`),
  ];

  // Seed a tutor profile doc so the availability read has a target.
  await db.doc(`users/${TUTOR}/tutorProfile/default`).set({
    fullName: "Smoke TDS Tutor",
    availability: null,
  });
  await db.doc(`reviews/${TUTOR}/reviews/seed-1`).set({
    tutorUid: TUTOR,
    studentUid: "real-student-1",
    status: "active",
    score: 5,
    comment: "seed",
  });
  await db.doc(`enrollments/${TUTOR}/roster/seed-1`).set({
    tutorUid: TUTOR,
    studentUid: "real-student-1",
    status: "active",
  });
  await db.doc(`batches/${TUTOR}/classes/seed-1`).set({
    tutorUid: TUTOR,
    status: "active",
    slotKeys: ["mon:10:00"],
  });
  await db.doc(`enrollmentRequests/${TUTOR}/requests/seed-1`).set({
    tutorUid: TUTOR,
    studentUid: "real-student-1",
    status: "pending",
  });

  const idToken = await mintIdToken(STUDENT);
  pass("minted client token", STUDENT);

  // 1. Doc GET — users/{tutor}/tutorProfile/default (availability listener)
  const profRes = await fetch(
    `${FIRESTORE_BASE}/users/${TUTOR}/tutorProfile/default`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (profRes.status === 200) pass("doc get: users/{tutor}/tutorProfile/default");
  else fail("doc get: users/{tutor}/tutorProfile/default", `HTTP ${profRes.status}`);

  // 2. List — reviews/{tutor}/reviews (parent = the tutor doc)
  const rev = await runQuery(idToken, docPath("reviews", TUTOR), listQuery("reviews"));
  if (rev.status === 200) pass("list: reviews/{tutor}/reviews");
  else fail("list: reviews/{tutor}/reviews", `HTTP ${rev.status}: ${rev.body.slice(0, 200)}`);

  // 3. List — enrollments/{tutor}/roster (parent = the tutor doc)
  const enr = await runQuery(idToken, docPath("enrollments", TUTOR), listQuery("roster"));
  if (enr.status === 200) pass("list: enrollments/{tutor}/roster");
  else fail("list: enrollments/{tutor}/roster", `HTTP ${enr.status}: ${enr.body.slice(0, 200)}`);

  // 4. List — batches/{tutor}/classes (parent = the tutor doc)
  const bat = await runQuery(idToken, docPath("batches", TUTOR), listQuery("classes"));
  if (bat.status === 200) pass("list: batches/{tutor}/classes");
  else fail("list: batches/{tutor}/classes", `HTTP ${bat.status}: ${bat.body.slice(0, 200)}`);

  // 5. List — enrollmentRequests/{tutor}/requests (parent = the tutor doc)
  const req = await runQuery(idToken, docPath("enrollmentRequests", TUTOR), listQuery("requests"));
  if (req.status === 200) pass("list: enrollmentRequests/{tutor}/requests");
  else fail("list: enrollmentRequests/{tutor}/requests", `HTTP ${req.status}: ${req.body.slice(0, 200)}`);

  // Cleanup — recursiveDelete on each parent (NOT a plain
  // `delete()`): the seeded docs live in SUBcollections
  // (`classes/seed-1`, `roster/seed-1`, `reviews/seed-1`, …), and a
  // parent-only delete leaves them behind — which is exactly how
  // the marketplace kept accumulating `seed-1` classes across runs
  // (the BrowseBatchesScreen duplicate-key crash, Aug 2026).
  const cleanResults = await Promise.allSettled(
    cleanupRefs.map((ref) => db.recursiveDelete(ref)),
  );
  cleanResults.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        `  ⚠️  cleanup of ${cleanupRefs[i].path} failed: ${String(r.reason)}`,
      );
    }
  });
  try {
    await getAuth(getApps()[0]).deleteUser(STUDENT);
  } catch {
    /* ignore */
  }

  console.log(failures === 0 ? "\n── ALL PASSED ──" : `\n── ${failures} FAILED ──`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
