/**
 * backfill-has-availability — Aug 25 visibility fix.
 *
 * Sets `hasAvailability` on every `tutors/{uid}` discovery doc:
 *   - true  when the tutor's profile has ≥1 "available" weekly slot
 *   - false otherwise (including missing availability)
 * Also stamps `hasPendingUpdate:false` on legacy mirror docs that are
 * missing the field entirely (Firestore `== false` queries skip
 * docs where the field is absent — the "banner says hidden but
 * actually shown" leak).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   node dist/scripts/backfillHasAvailability.js        # dry run
 *   node dist/scripts/backfillHasAvailability.js --write
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
  process.exit(1);
}
if (getApps().length === 0) {
  initializeApp({
    credential: cert(
      JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")),
    ),
  });
}
const WRITE = process.argv.includes("--write");
const db = getFirestore();

function countAvailable(av: unknown): number {
  if (!av || typeof av !== "object") return 0;
  let n = 0;
  for (const day of Object.values(av as Record<string, unknown>)) {
    if (!day || typeof day !== "object") continue;
    for (const v of Object.values(day as Record<string, unknown>)) {
      if (v === "available") n++;
    }
  }
  return n;
}

async function main() {
  const tutors = await db.collection("tutors").get();
  console.log(`scanning ${tutors.size} discovery docs…`);
  let touched = 0;
  for (const doc of tutors.docs) {
    const uid = doc.id;
    const patch: Record<string, unknown> = {};

    if (doc.get("hasPendingUpdate") === undefined) patch.hasPendingUpdate = false;

    const prof = await db.doc(`users/${uid}/tutorProfile/default`).get();
    const slots = countAvailable(prof.get("availability"));
    const desired = slots > 0;
    if (doc.get("hasAvailability") !== desired) patch.hasAvailability = desired;

    if (Object.keys(patch).length > 0) {
      touched++;
      console.log(
        `${WRITE ? "✏️" : "·"} ${uid}: ${JSON.stringify(patch)} (slots=${slots})`,
      );
      if (WRITE) await doc.ref.set(patch, { merge: true });
    }
  }
  console.log(
    `\n${touched} doc(s) need updates. ${WRITE ? "Written." : "Dry run — re-run with --write."}`,
  );
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
