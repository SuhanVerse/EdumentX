/**
 * One-time backfill: enrollment requests created before the identity
 * aggregation shipped (see `FirebaseEnrollmentRepository.writeEnrollmentRequest`)
 * carry a null `studentAvatar` (and often empty `studentName` /
 * `studentGrade`). The request-create path now snapshots the
 * student's profile subdoc, but legacy docs need a one-shot pass.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... npx tsx scripts/backfillRequestAvatars.ts
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
  // Every tutor's request subcollection: enrollmentRequests/{tutorUid}/requests
  const tutorSnaps = await db.collection("enrollmentRequests").listDocuments();
  let updated = 0;
  let skipped = 0;
  for (const tutorRef of tutorSnaps) {
    const requestSnaps = await tutorRef.collection("requests").get();
    for (const r of requestSnaps.docs) {
      const d = r.data() ?? {};
      const studentUid = typeof d.studentUid === "string" ? d.studentUid : "";
      const hasAvatar = typeof d.studentAvatar === "string" && d.studentAvatar.length > 0;
      const hasName = typeof d.studentName === "string" && d.studentName.trim().length > 0;
      const hasGrade = typeof d.studentGrade === "string" && d.studentGrade.trim().length > 0;
      if (hasAvatar && hasName && hasGrade) { skipped++; continue; }
      if (!studentUid) { skipped++; continue; }

      const profileSnap = await db
        .doc(`users/${studentUid}/studentProfile/default`)
        .get();
      const profile = profileSnap.exists ? (profileSnap.data() ?? {}) : {};
      const patch: Record<string, unknown> = {};
      if (!hasAvatar) patch.studentAvatar = typeof profile.photoUrl === "string" ? profile.photoUrl : null;
      if (!hasName) patch.studentName = typeof profile.fullName === "string" ? profile.fullName : "";
      if (!hasGrade) patch.studentGrade = typeof profile.grade === "string" ? profile.grade : "";
      if (Object.keys(patch).length === 0) { skipped++; continue; }
      await r.ref.update(patch);
      console.log(`backfilled request ${r.id} (student ${studentUid})`);
      updated++;
    }
  }
  console.log(`done: ${updated} requests backfilled, ${skipped} skipped`);
}

main().catch((e) => { console.error(e); process.exit(1); });
