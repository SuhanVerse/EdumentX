/**
 * Reviews aggregate smoke test (against a real Firestore project)
 *
 * Verifies the DEPLOYED `reviews` rules end-to-end the way the app
 * actually reads them: the marketplace overlays live rating/count via
 * a single `collectionGroup("reviews")` query (see
 * `services/tutors/FirebaseTutorRepository.ts`). The Firebase Admin
 * SDK bypasses security rules, so a plain admin-DB test would prove
 * nothing — this script acts as a REAL signed-in client:
 *
 *   1. Seeds two reviews under two different tutors (admin SDK —
 *      allowed, seeding only).
 *   2. Mints a custom token for a throwaway student and exchanges it
 *      for an ID token via the Auth REST API (the same credential a
 *      device would hold).
 *   3. Runs `collectionGroup("reviews")` through the Firestore REST
 *      API as that student and asserts BOTH tutors' reviews come back
 *      — the cross-tutor read is exactly what the old deployed rule
 *      (`studentUid == auth.uid || isAdmin()`) rejected with
 *      permission-denied.
 *   4. Creates a third review AS THE CLIENT (the direct-path create
 *      rule) and re-runs the aggregate to confirm it appears.
 *   5. Confirms an unauthenticated collectionGroup query is still
 *      rejected.
 *   6. Cleans up every doc it created, plus the throwaway Auth user.
 *
 * Exit code 0 = all checks passed; 1 = one or more checks failed.
 *
 * Usage (same prereqs as smoke:enrollments):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run smoke:reviews
 *
 * The web API key is read from `.env` (EXPO_PUBLIC_FIREBASE_API_KEY)
 * — it is a public key (safe to ship in the app), it just scopes the
 * Auth REST call. Override with FIREBASE_WEB_API_KEY if needed.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

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

/** Read a key from the project `.env` file (used for the web API key). */
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

function readProjectId(): string {
  return (
    readDotEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") ??
    readDotEnv("FIREBASE_PROJECT_ID") ??
    "edumentx-dev"
  );
}

let failures = 0;

function pass(name: string, detail?: string) {
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  failures += 1;
  console.error(`  ❌ ${name} — ${detail}`);
}

/** Expect `actual === expected`; returns whether it held. */
function expect(actual: unknown, expected: unknown, what: string): boolean {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    fail(what, `expected ${e}, got ${a}`);
    return false;
  }
  pass(what, String(actual));
  return true;
}

// ─── Client transport (real signed-in user, real deployed rules) ────────────

const PROJECT_ID = readProjectId();
const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
  `/databases/(default)/documents`;

async function mintIdToken(uid: string): Promise<string> {
  const apiKey =
    readDotEnv("EXPO_PUBLIC_FIREBASE_API_KEY") ?? process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw new Error("EXPO_PUBLIC_FIREBASE_API_KEY not found in .env — needed for the Auth REST call");
  }
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

/** Run a collectionGroup query as a client — the exact aggregate shape. */
async function runReviewsGroupQuery(
  idToken: string | null,
): Promise<{ status: number; reviewIds: string[] }> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "reviews", allDescendants: true }],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let reviewIds: string[] = [];
  if (res.ok) {
    const docs = JSON.parse(text) as { document?: { name?: string } }[];
    reviewIds = docs
      .filter((d) => d.document?.name)
      .map((d) => {
        const name = d.document!.name!;
        return name.slice(name.lastIndexOf("/") + 1);
      });
  }
  return { status: res.status, reviewIds };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  initAdmin();
  const db = getFirestore();
  const auth = getAuth(getApps()[0]);

  const stamp = Date.now();
  const TUTOR_A = `smoke-rev-tutor-a-${stamp}`;
  const TUTOR_B = `smoke-rev-tutor-b-${stamp}`;
  const STUDENT = `smoke-rev-student-${stamp}`;
  const REV_A1 = "review-seeded-a1";
  const REV_B1 = "review-seeded-b1";
  const REV_A2 = "review-client-a2";

  // Subtrees + the throwaway Auth user to wipe in cleanup.
  // (The tutor-A profile doc is seeded for the aggregate update.)
  const cleanupRefs = [
    db.doc(`reviews/${TUTOR_A}`),
    db.doc(`reviews/${TUTOR_B}`),
    db.doc(`users/${TUTOR_A}/tutorProfile/default`),
  ];
  const cleanupUsers = [STUDENT];

  const reviewFields = (tutorUid: string, studentUid: string, score: number, comment: string) => ({
    tutorUid,
    studentUid,
    studentName: "Smoke Review Student",
    status: "active",
    score,
    comment,
    createdAt: new Date(),
  });

  // ── 1. Seed two reviews under two different tutors (admin SDK) ──
  // The real `submitReview` transaction also updates the tutor's
  // profile aggregates, so tutor A needs a profile doc for the
  // update to land on (a PATCH on a missing doc is a 404).
  await db
    .doc(`users/${TUTOR_A}/tutorProfile/default`)
    .set({ fullName: "Smoke Tutor A", rating: 0, reviewCount: 0 });
  pass("seeded tutor A profile (admin)", TUTOR_A);
  await db
    .doc(`reviews/${TUTOR_A}/reviews/${REV_A1}`)
    .set(reviewFields(TUTOR_A, "real-student-1", 5, "Seeded review under tutor A"));
  pass("seeded review under tutor A (admin)", REV_A1);
  await db
    .doc(`reviews/${TUTOR_B}/reviews/${REV_B1}`)
    .set(reviewFields(TUTOR_B, "real-student-2", 4, "Seeded review under tutor B"));
  pass("seeded review under tutor B (admin)", REV_B1);

  // ── 2. Act as a real signed-in client ──
  let idToken: string;
  try {
    idToken = await mintIdToken(STUDENT);
    pass("minted client ID token for throwaway student", STUDENT);
  } catch (err) {
    fail("mint client ID token", err instanceof Error ? err.message : String(err));
    throw err;
  }

  // ── 3. collectionGroup read — both tutors' reviews must come back ──
  {
    const r = await runReviewsGroupQuery(idToken);
    const ok = r.status === 200 && r.reviewIds.includes(REV_A1) && r.reviewIds.includes(REV_B1);
    if (!ok) {
      fail(
        "signed-in client reads ALL tutors' reviews via collectionGroup",
        `status ${r.status}, ids [${r.reviewIds.join(", ")}] — expected 200 with ${REV_A1} + ${REV_B1}`,
      );
    } else {
      pass(
        "signed-in client reads ALL tutors' reviews via collectionGroup",
        `${r.reviewIds.length} review(s), incl. cross-tutor ${REV_B1}`,
      );
    }
  }

  // ── 4. Client creates its own review (direct-path create rule) ──
  {
    const body = {
      fields: Object.fromEntries(
        Object.entries(reviewFields(TUTOR_A, STUDENT, 5, "Created by the smoke client")).map(
          ([k, v]) => [
            k,
            typeof v === "number"
              ? { integerValue: String(v) }
              : { stringValue: String(v) },
          ],
        ),
      ),
    };
    const res = await fetch(
      `${FIRESTORE_BASE}/reviews/${TUTOR_A}/reviews/${REV_A2}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      },
    );
    expect(res.status, 200, "client creates an active review (studentUid == auth.uid)");

    // The app's `submitReview` writes the review AND the tutor's
    // profile aggregates in one transaction — the aggregate update
    // must be allowed or the whole transaction rolls back with
    // permission-denied (the Aug 16 submitReview bug, which the old
    // smoke never caught because it skipped this second write).
    {
      const aggRes = await fetch(
        `${FIRESTORE_BASE}/users/${TUTOR_A}/tutorProfile/default` +
          `?updateMask.fieldPaths=rating&updateMask.fieldPaths=reviewCount` +
          `&updateMask.fieldPaths=updatedAt`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            fields: {
              rating: { doubleValue: 5 },
              reviewCount: { integerValue: "1" },
              updatedAt: { stringValue: new Date().toISOString() },
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      expect(
        aggRes.status,
        200,
        "reviewer updates tutor profile aggregates (submitReview transaction)",
      );
    }

    // Re-run the aggregate — the new review must now be visible.
    const r = await runReviewsGroupQuery(idToken);
    const ok = r.status === 200 && r.reviewIds.includes(REV_A2);
    if (!ok) {
      fail(
        "client-created review appears in the aggregate",
        `status ${r.status}, has ${REV_A2}: ${r.reviewIds.includes(REV_A2)}`,
      );
    } else {
      pass("client-created review appears in the aggregate", REV_A2);
    }
  }

  // ── 5. Unauthenticated collectionGroup read still rejected ──
  {
    const r = await runReviewsGroupQuery(null);
    expect(r.status >= 400, true, "unauthenticated collectionGroup read rejected");
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  console.log("\nCleaning up smoke-test data…");
  const results = await Promise.allSettled(
    cleanupRefs.map((ref) => db.recursiveDelete(ref)),
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`  ⚠️  cleanup of ${cleanupRefs[i].path} failed: ${String(r.reason)}`);
    }
  });
  const authResults = await Promise.allSettled(
    cleanupUsers.map((uid) => auth.deleteUser(uid)),
  );
  authResults.forEach((r, i) => {
    if (r.status === "rejected") {
      const reason = String(r.reason);
      // Auth user may not exist on repeated runs — that's fine.
      if (!reason.includes("auth/user-not-found")) {
        console.error(`  ⚠️  cleanup of Auth user ${cleanupUsers[i]} failed: ${reason}`);
      }
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
