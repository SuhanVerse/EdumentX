/**
 * Admin Seed Script
 *
 * Grants admin access to a list of emails by writing `admins/{uid}`
 * docs in Firestore. The current rules lock the `admins` collection
 * to Admin SDK / Firebase Console writes only — there's no client
 * path that creates an admin document — so this script is the only
 * legitimate way to bootstrap an admin from outside the project.
 *
 * Usage:
 *   # Default: grant admin to every email in ADMIN_EMAILS
 *   npm run seed:admin
 *
 *   # Print which emails already have an admin doc
 *   npm run seed:admin -- --list
 *
 *   # Show this help text
 *   npm run seed:admin -- --help
 *
 * Prerequisite: set GOOGLE_APPLICATION_CREDENTIALS to a service-account
 * key file with Firestore write access. The service account can be
 * created in:
 *   Firebase Console → Project Settings → Service Accounts →
 *     "Generate new private key"
 *
 * Then, from the project root:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run seed:admin
 *
 * What this script does for each email in ADMIN_EMAILS:
 *   1. Looks up `users` for a doc with that email (the user must have
 *      signed in at least once on the device so the auth identity
 *      materializes a `users/{uid}` row).
 *   2. Upserts `admins/{uid}` with { email, grantedAt, grantedBy }.
 *   3. Skips + warns if no `users` doc is found for that email.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

const ADMIN_EMAILS = ["asimdkt63@gmail.com","khsuhan100@gmail.com"];
const GRANTED_BY = "seed-script";

function printHelp() {
  console.log(
    [
      "seedAdmin — grant admin access via Firebase Admin SDK",
      "",
      "Usage:",
      "  npm run seed:admin              grant admin to every email in ADMIN_EMAILS",
      "  npm run seed:admin -- --list    show which emails already have an admin doc",
      "  npm run seed:admin -- --help    show this help",
      "",
      "Requires the GOOGLE_APPLICATION_CREDENTIALS env var to point at a",
      "service-account key with Firestore write access.",
    ].join("\n"),
  );
}

function initAdmin() {
  if (getApps().length > 0) {
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      [
        "GOOGLE_APPLICATION_CREDENTIALS is not set.",
        "",
        "Generate a service-account key in:",
        "  Firebase Console → Project Settings → Service Accounts →",
        "    'Generate new private key'",
        "",
        "Then export it before running this script:",
        "  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json",
        "  npm run seed:admin",
      ].join("\n"),
    );
    process.exit(1);
  }
  // `initializeApp()` reads GOOGLE_APPLICATION_CREDENTIALS and pulls
  // projectId from the key file automatically.
  initializeApp({
    credential: cert(
      JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, "utf8")),
    ),
  });
}

async function findUidForEmail(db: ReturnType<typeof getFirestore>, email: string): Promise<string | null> {
  const snap = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function listAdmins() {
  initAdmin();
  const db = getFirestore();
  for (const email of ADMIN_EMAILS) {
    const uid = await findUidForEmail(db, email);
    if (!uid) {
      console.log(`  ✗ ${email}  (no users/{uid} doc — sign in on the device first)`);
      continue;
    }
    const adminSnap = await db.collection("admins").doc(uid).get();
    if (adminSnap.exists) {
      const data = adminSnap.data();
      console.log(
        `  ✓ ${email}  admins/${uid}  (grantedAt=${data?.grantedAt?.toDate?.()?.toISOString() ?? "?"})`,
      );
    } else {
      console.log(`  – ${email}  admins/${uid}  (not yet an admin)`);
    }
  }
}

async function seedAdmins() {
  initAdmin();
  const db = getFirestore();

  console.log("Seeding admin users...\n");

  for (const email of ADMIN_EMAILS) {
    try {
      const uid = await findUidForEmail(db, email);
      if (!uid) {
        console.warn(
          `✗ ${email}  no users/{uid} doc found. Have they signed in on the device? ` +
            "The user must sign in once so the auth identity materializes a " +
            "`users/{uid}` row, then re-run this script.",
        );
        continue;
      }

      const adminRef = db.collection("admins").doc(uid);
      await adminRef.set(
        {
          email,
          grantedAt: FieldValue.serverTimestamp(),
          grantedBy: GRANTED_BY,
        },
        { merge: true },
      );

      console.log(`✓ ${email}  →  admins/${uid}`);
    } catch (err) {
      console.error(`✗ ${email}  failed:`, err);
    }
  }

  console.log("\nDone. The next time the user signs in on the device, the");
  console.log("auth guard will see admins/{uid} and route them to /admin-home.");
  process.exit(0);
}

const arg = process.argv[2];
if (arg === "--help" || arg === "-h") {
  printHelp();
  process.exit(0);
} else if (arg === "--list") {
  listAdmins().then(() => process.exit(0)).catch((err) => {
    console.error("listAdmins failed:", err);
    process.exit(1);
  });
} else {
  seedAdmins().catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
}
