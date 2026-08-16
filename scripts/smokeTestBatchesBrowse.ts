/**
 * Browse-batches query smoke test (against a real Firestore project)
 *
 * Verifies the marketplace browse query
 * `collectionGroup("classes").where("status", "==", "active")` works
 * against the LIVE project as a real signed-in client. This query
 * previously failed with `[firestore/failed-precondition]` — a missing
 * `classes.status` COLLECTION_GROUP index (deployed via
 * `npm run deploy:indexes`). The admin SDK bypasses both rules AND
 * index planning, so this script acts as a signed-in client through
 * the Firestore REST API (same as `smokeTestReviews.ts`):
 *
 *   1. Seeds one ACTIVE batch and one ENDED batch (admin SDK).
 *   2. Mints a client ID token for a throwaway student.
 *   3. Runs the exact browse query; polls up to 3 minutes for
 *      Firestore's asynchronous index build.
 *   4. Asserts the ACTIVE batch comes back and the ENDED one does
 *      not (also pins down the rule's active-only visibility).
 *   5. Cleans up every doc it created, plus the throwaway Auth user.
 *
 * Exit code 0 = all checks passed; 1 = one or more checks failed.
 *
 * Usage (same prereqs as smoke:reviews):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run smoke:batches-browse
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// ─── Helpers (mirrors smokeTestReviews.ts) ──────────────────────────────────

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
  readDotEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") ??
  readDotEnv("FIREBASE_PROJECT_ID") ??
  "edumentx-dev";
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

/** The exact marketplace query: collectionGroup("classes") where status == "active". */
async function runBrowseQuery(idToken: string): Promise<{ status: number; batchIds: string[] }> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "classes", allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "active" },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let batchIds: string[] = [];
  if (res.ok) {
    const docs = JSON.parse(text) as { document?: { name?: string } }[];
    batchIds = docs
      .filter((d) => d.document?.name)
      .map((d) => {
        const name = d.document!.name!;
        return name.slice(name.lastIndexOf("/") + 1);
      });
  }
  return { status: res.status, batchIds };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  initAdmin();
  const db = getFirestore();
  const auth = getAuth(getApps()[0]);

  const stamp = Date.now();
  const TUTOR = `smoke-browse-tutor-${stamp}`;
  const STUDENT = `smoke-browse-student-${stamp}`;
  const ACTIVE_BATCH = "batch-active-1";
  const ENDED_BATCH = "batch-ended-1";

  const cleanupRefs = [db.doc(`batches/${TUTOR}`)];
  const cleanupUsers = [STUDENT];

  // ── 1. Seed one active + one ended batch (admin SDK) ──
  await db.doc(`batches/${TUTOR}/classes/${ACTIVE_BATCH}`).set({
    tutorUid: TUTOR,
    status: "active",
    subject: "Mathematics",
    title: "Active smoke batch",
    memberCount: 1,
  });
  pass("seeded ACTIVE batch", ACTIVE_BATCH);
  await db.doc(`batches/${TUTOR}/classes/${ENDED_BATCH}`).set({
    tutorUid: TUTOR,
    status: "ended",
    subject: "Physics",
    title: "Ended smoke batch",
    memberCount: 0,
  });
  pass("seeded ENDED batch", ENDED_BATCH);

  // ── 2. Act as a real signed-in client ──
  const idToken = await mintIdToken(STUDENT);
  pass("minted client ID token", STUDENT);

  // ── 3. Run the browse query; poll for the async index build ──
  // Index deployment returns before Firestore finishes building the
  // index; the first queries can still hit failed-precondition for a
  // short window. Poll until we get a definitive answer.
  let result: { status: number; batchIds: string[] } | null = null;
  const deadline = Date.now() + 180_000; // 3 minutes max
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    const r = await runBrowseQuery(idToken);
    if (r.status === 200) {
      result = r;
      break;
    }
    // 200 means the index is live. failed-precondition (400) means
    // still building; anything else (401/403) is a rules problem we
    // shouldn't retry through.
    if (r.status !== 400) {
      result = r;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!result) {
    fail("browse query succeeds (index ready)", "still failed-precondition after 3 minutes");
    throw new Error("index not ready after 3 minutes");
  }

  const ok =
    result.status === 200 &&
    result.batchIds.includes(ACTIVE_BATCH) &&
    !result.batchIds.includes(ENDED_BATCH);
  if (!ok) {
    fail(
      "browse query returns only ACTIVE batches",
      `status ${result.status}, ids [${result.batchIds.join(", ")}] (${attempts} attempt(s))`,
    );
  } else {
    pass(
      "browse query returns only ACTIVE batches",
      `[${result.batchIds.join(", ")}] — ended batch excluded, ${attempts} attempt(s)`,
    );
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
  if (allCleaned.every(Boolean)) {
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
