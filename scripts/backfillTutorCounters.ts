/**
 * One-time backfill: add the denormalized capacity counters
 * (`enrolledCount` / `currentStudents` / `studentCapacity`) to tutor
 * profiles created before the enrollment feature shipped. The
 * roster-create rule now handles missing fields (defaults 0/6), but
 * this keeps the data model consistent for the capacity screen.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... npx tsx scripts/backfillTutorCounters.ts
 * (runs via tsc like the other seed scripts)
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS not set.");
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, "utf8"));
if (!getApps().length) initializeApp({ credential: cert(creds) });
const db = getFirestore();

async function main() {
  const tutors = await db.collection("tutors").get();
  let updated = 0;
  let skipped = 0;
  for (const t of tutors.docs) {
    const uid = t.id;
    const ref = db.doc(`users/${uid}/tutorProfile/default`);
    const snap = await ref.get();
    if (!snap.exists) { console.log(`skip ${uid}: no tutorProfile`); skipped++; continue; }
    const d = snap.data() ?? {};
    if (typeof d.enrolledCount === "number" && typeof d.studentCapacity === "number") {
      console.log(`skip ${uid}: counters already present`); skipped++; continue;
    }
    await ref.update({
      enrolledCount: typeof d.enrolledCount === "number" ? d.enrolledCount : 0,
      currentStudents: typeof d.currentStudents === "number" ? d.currentStudents : 0,
      studentCapacity: typeof d.studentCapacity === "number" ? d.studentCapacity : 6,
      updatedAt: new Date(),
    });
    console.log(`backfilled ${uid}`);
    updated++;
  }
  console.log(`done: ${updated} backfilled, ${skipped} skipped`);
}

main().catch((e) => { console.error(e); process.exit(1); });
