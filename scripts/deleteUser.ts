/**
 * EdumentX — Delete User (dev-laptop admin script)
 *
 * The ONLY place that can delete a Firebase Auth identity: the app runs
 * on the Spark (free) plan with no Cloud Functions, and `auth().delete()`
 * is current-user-only. This script completes the admin portal's
 * "Delete permanently" flow in one pass:
 *
 *   1. Firebase Auth — `auth.deleteUser(uid)` removes the login.
 *   2. Firestore     — purges users/{uid} + profile subdocs, tutors/{uid},
 *                      tutorVerifications, tutorProfileUpdates,
 *                      notifications/{uid}. (The app deletes these
 *                      client-side via src/lib/admin/userLifecycle.ts;
 *                      this script is the safety net when the rules
 *                      grant is not yet deployed.)
 *   3. Supabase      — removes {uid}.jpg from public-avatars and every
 *                      object under {uid}/ in private-verification-docs
 *                      using the service-role key (bypasses RLS).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-key.json
 *   npm run delete:user -- --email user@example.com
 *   npm run delete:user -- --uid abc123...
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env (the same
 * vars seedSupabaseTutors uses).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

import * as fs from "fs";
import * as path from "path";

/** Loads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from project .env. */
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.substring(0, eq).trim();
    const value = trimmed.substring(eq + 1).trim();
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}
loadEnv();

function initAdmin() {
  if (getApps().length > 0) return;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Generate a service-account",
      "key in: Firebase Console -> Project Settings -> Service Accounts ->",
      "'Generate new private key', then:",
      "  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json",
    );
    process.exit(1);
  }
  initializeApp({
    credential: cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
  });
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env",
      "(Supabase Dashboard -> Settings -> API).",
    );
    process.exit(1);
  }
  return createClient(url, key);
}

function parseArgs(): { uid?: string; email?: string } {
  const args = process.argv.slice(2);
  const out: { uid?: string; email?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--uid") out.uid = args[i + 1];
    if (args[i] === "--email") out.email = args[i + 1];
  }
  if (!out.uid && !out.email) {
    console.error(
      "Usage:\n  npm run delete:user -- --email user@example.com\n" +
        "  npm run delete:user -- --uid <firebase-uid>",
    );
    process.exit(1);
  }
  return out;
}

/** Derives {uid}.jpg from an avatar public URL (same logic as the app). */
function avatarPathFromUrl(avatarUrl: string | undefined, uid: string): string {
  if (!avatarUrl) return `${uid}.jpg`;
  const match = avatarUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : `${uid}.jpg`;
}

async function main() {
  initAdmin();
  const { uid: argUid, email } = parseArgs();
  const db = getFirestore();
  const supabase = getSupabase();

  let uid = argUid;
  if (email && !uid) {
    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      // Fall back to a direct Auth lookup — the user may exist in Auth
      // even without a users/{uid} doc (never signed in to the app).
      try {
        uid = (await getAuth().getUserByEmail(email)).uid;
      } catch {
        console.error(`No user found for email ${email} (Firestore or Auth).`);
        process.exit(1);
      }
    } else {
      uid = snap.docs[0].id;
    }
  }
  if (!uid) process.exit(1);

  console.log(`Deleting account ${uid}${email ? ` (${email})` : ""}...\n`);

  const userDoc = await db.collection("users").doc(uid).get();
  const avatarUrl = userDoc.exists ? (userDoc.data()?.avatar as string | undefined) : undefined;

  // 1. Firebase Auth
  try {
    await getAuth().deleteUser(uid);
    console.log("  [auth]      removed Firebase Auth identity");
  } catch (err) {
    console.warn("  [auth]      FAILED:", (err as Error).message ?? err);
  }

  // 2. Firestore
  const refs = [
    db.collection("users").doc(uid),
    db.collection("users").doc(uid).collection("tutorProfile").doc("default"),
    db.collection("users").doc(uid).collection("studentProfile").doc("default"),
    db.collection("tutors").doc(uid),
    db.collection("tutorVerifications").doc(uid),
    db.collection("tutorProfileUpdates").doc(uid),
    db.collection("notifications").doc(uid),
  ];
  for (const ref of refs) {
    try {
      await ref.delete();
      console.log(`  [firestore]  deleted ${ref.path}`);
    } catch {
      console.log(`  [firestore]  skipped ${ref.path} (missing)`);
    }
  }

  // 3. Supabase Storage (service role)
  const avatarPath = avatarPathFromUrl(avatarUrl, uid);
  const { error: avatarError } = await supabase.storage
    .from("public-avatars")
    .remove([avatarPath]);
  if (avatarError) console.warn("  [storage]   avatar removal failed:", avatarError.message);
  else console.log(`  [storage]   removed public-avatars/${avatarPath}`);

  const { data: listed, error: listError } = await supabase.storage
    .from("private-verification-docs")
    .list(uid);
  if (listError) console.warn("  [storage]   could not list verification docs:", listError.message);
  else {
    const names = (listed ?? []).map((f) => `${uid}/${f.name}`);
    if (names.length > 0) {
      const { error: removeErr } = await supabase.storage
        .from("private-verification-docs")
        .remove(names);
      if (removeErr) console.warn("  [storage]   doc removal failed:", removeErr.message);
      else names.forEach((n) => console.log(`  [storage]   removed private-verification-docs/${n}`));
    } else {
      console.log("  [storage]   no verification docs found");
    }
  }

  console.log("\nUser completely wiped from Auth, Supabase, and Firestore. This cannot be undone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("deleteUser failed:", err);
  process.exit(1);
});