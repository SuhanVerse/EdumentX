/**
 * Backfill: default `isAvailableForNewStudents` on the tutors/{uid} docs
 *
 * The tutor dashboard now has a search-visibility toggle backed by
 * `tutors/{uid}.isAvailableForNewStudents`, and discovery filters on
 * `== true`. Docs that predate the flag would fail that filter and
 * vanish from StudentHome / MapSearch — this script flips them all to
 * `true` (visible) so legacy tutors stay discoverable by default.
 *
 * Idempotent: docs that already carry the flag are left untouched.
 *
 * Usage (same prereqs as seedAdmin):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run backfill:tutor-availability
 *
 * Exit code 0 = all docs processed; 1 = one or more failures.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

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

async function main() {
  initAdmin();
  const db = getFirestore();

  const snap = await db.collection("tutors").get();
  console.log(`Found ${snap.size} tutors/{uid} docs.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const batch = db.batch();
  let ops = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (typeof data.isAvailableForNewStudents === "boolean") {
      skipped += 1;
      continue;
    }
    batch.set(
      docSnap.ref,
      {
        isAvailableForNewStudents: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    updated += 1;
    ops += 1;
    if (ops === 500) {
      await batch.commit();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  console.log(`  updated (flag added): ${updated}`);
  console.log(`  skipped (already set): ${skipped}`);
  if (failed > 0) {
    console.error(`  failed: ${failed}`);
    process.exitCode = 1;
  } else {
    console.log("Backfill complete.");
  }
}

main().catch((err) => {
  console.error("Backfill crashed:", err);
  process.exit(1);
});
