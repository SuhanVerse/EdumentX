/**
 * Admin Seed Script
 *
 * Grants admin access to a list of emails by doing TWO things for
 * each uid:
 *   1. Upserts the auditable `admins/{uid}` ledger doc
 *      ({ email, grantedAt, grantedBy }).
 *   2. Sets the Firebase Auth CUSTOM CLAIM `{ admin: true }` — this
 *      claim is what firestore.rules' `isAdmin()` actually evaluates
 *      (Aug 24 audit: rules no longer trust `users/{uid}.role`, and
 *      claims avoid a per-request Firestore read).
 *
 * The current rules lock the `admins` collection to Admin SDK /
 * Firebase Console writes only — there's no client path that creates
 * an admin document or mints a claim — so this script is the only
 * legitimate way to bootstrap an admin from outside the project.
 *
 * Usage:
 *   # Default: grant admin to every email in ADMIN_EMAILS
 *   npm run seed:admin
 *
 *   # Print which emails already have an admin doc / claim
 *   npm run seed:admin -- --list
 *
 *   # Show this help text
 *   npm run seed:admin -- --help
 *
 * Prerequisite: set GOOGLE_APPLICATION_CREDENTIALS to a service-account
 * key with Firestore + Auth (identitytoolkit) access.
 *
 * What this script does for each email in ADMIN_EMAILS:
 *   1. Looks up `users` for a doc with that email (the user must have
 *      signed in at least once on the device so the auth identity
 *      materializes a `users/{uid}` row).
 *   2. Upserts `admins/{uid}` and sets the `admin: true` custom claim.
 *   3. Skips + warns if no `users` doc is found for that email.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
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
  // Fail fast with a readable reason instead of a raw gRPC
  // UNAUTHENTICATED stack mid-run.
  let saJson: Record<string, unknown>;
  try {
    saJson = JSON.parse(fs.readFileSync(credPath, "utf8"));
  } catch (err) {
    console.error(
      [
        `Cannot read service-account key at: ${credPath}`,
        `(reason: ${(err as Error).message})`,
        "",
        "Re-download a fresh key from:",
        "  Firebase Console → Project Settings → Service Accounts →",
        "    'Generate new private key'",
      ].join("\n"),
    );
    process.exit(1);
  }
  const required = ["client_email", "private_key", "project_id"];
  const missing = required.filter((k) => !saJson[k]);
  if (missing.length > 0) {
    console.error(
      [
        `Service-account key at ${credPath} is missing fields:`,
        `  ${missing.join(", ")}`,
        "It may be corrupted or not a service-account JSON.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.log(`Using service account: ${saJson.client_email} (project ${saJson.project_id})`);
  // `initializeApp()` reads GOOGLE_APPLICATION_CREDENTIALS and pulls
  // projectId from the key file automatically.
  initializeApp({
    credential: cert(saJson as Parameters<typeof cert>[0]),
  });
}

/** Human hint appended when a call fails with auth-shaped errors. */
function authHint(err: unknown): string | null {
  const msg = String((err as { details?: string; message?: string }).details ?? (err as Error).message ?? "");
  const code = (err as { code?: number }).code;
  if (
    msg.includes("UNAUTHENTICATED")
    || msg.includes("Invalid JWT Signature")
    || msg.includes("invalid_grant")
    || code === 16
  ) {
    return [
      "",
      "  HINT: the key's signature was rejected by Google — the",
      "  service-account key at GOOGLE_APPLICATION_CREDENTIALS was",
      "  most likely REVOKED or ROTATED (or the system clock is off).",
      "  Fix: Firebase Console → Project Settings → Service Accounts →",
      "  'Generate new private key', update the file/path, re-run.",
    ].join("\n");
  }
  if (code === 7 || msg.includes("PERMISSION_DENIED")) {
    return [
      "",
      "  HINT: the key authenticated but lacks permission. Make sure",
      "  the service account still holds the Editor (or at minimum",
      "  'Firebase Admin' + 'Cloud Datastore User') roles and that",
      "  Identity Toolkit API is enabled.",
    ].join("\n");
  }
  return null;
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

      // The custom claim is what firestore.rules' isAdmin() evaluates.
      // Claims propagate to tokens on refresh — the user may need to
      // sign out/in once for the new token to carry it.
      await getAuth().setCustomUserClaims(uid, { admin: true });

      console.log(`✓ ${email}  →  admins/${uid} + claim admin:true`);
    } catch (err) {
      console.error(`✗ ${email}  failed:`, (err as Error).message ?? err);
      const hint = authHint(err);
      if (hint) {
        console.error(hint);
        // Auth failures are per-run, not per-email — stop early
        // instead of repeating the same stack for every address.
        process.exit(1);
      }
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
    console.error("listAdmins failed:", err.message ?? err);
    const hint = authHint(err);
    if (hint) console.error(hint);
    process.exit(1);
  });
} else {
  seedAdmins().catch((err) => {
    console.error("Seed script failed:", err.message ?? err);
    const hint = authHint(err);
    if (hint) console.error(hint);
    process.exit(1);
  });
}
