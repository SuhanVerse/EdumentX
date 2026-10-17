/**
 * audit:live-reads — AUDIT-ONLY probe (zero Firestore writes).
 *
 * Replays, against PRODUCTION rules, the exact five read shapes the
 * device logs report as permission-denied on TutorDetailsScreen:
 *   1. GET  users/{tutorUid}/tutorProfile/default   (availability source)
 *   2. list reviews/{tutorUid}/reviews              (direct path)
 *   3. list enrollmentRequests/{tutorUid}/requests  (direct path)
 *   4. list batches/{tutorUid}/classes              (direct path)
 *   5. list enrollments/{tutorUid}/roster           (direct path)
 *
 * Uses a throwaway signed-in identity and a NONEXISTENT tutor uid, so
 * an ALLOWED rule yields 200-empty (list) / 404 (get), while a DENIED
 * rule yields 403 with the server's rule-evaluation trace.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";

function readDotEnv(key) {
  try {
    const line = fs.readFileSync(".env", "utf8")
      .split("\n").find((l) => l.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : undefined;
  } catch { return undefined; }
}

const SERVICE_ACCT = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SERVICE_ACCT) { console.error("GOOGLE_APPLICATION_CREDENTIALS not set"); process.exit(1); }
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(SERVICE_ACCT, "utf8"))) });
}

const PROJECT_ID = readDotEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") ?? "edumentx-dev";
const API_KEY = readDotEnv("EXPO_PUBLIC_FIREBASE_API_KEY") ?? process.env.FIREBASE_WEB_API_KEY;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const uid = `live-audit-${Date.now()}`;
const custom = await getAuth().createCustomToken(uid);
const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
  { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: custom, returnSecureToken: true }) },
);
const body = await res.json();
if (!body.idToken) { console.error("mint failed:", JSON.stringify(body)); process.exit(1); }
const ID = body.idToken;
console.log(`identity minted: ${uid}\n`);

async function runQuery(collectionPath) {
  // Direct-path list = plain GET on the collection documents endpoint
  // (allowed → 200 empty JSON; denied → 403 with rule trace).
  const r = await fetch(`${BASE}/${collectionPath}?pageSize=5`, {
    headers: { Authorization: `Bearer ${ID}` },
  });
  const t = await r.text();
  return `${r.status}${r.ok ? " (allowed)" : " :: " + t.replace(/\s+/g, " ").slice(0, 260)}`;
}
async function getDoc(path) {
  const r = await fetch(`${BASE}/${path}`, { headers: { Authorization: `Bearer ${ID}` } });
  const t = await r.text();
  return `${r.status}${r.ok ? "" : " :: " + t.replace(/\s+/g, " ").slice(0, 300)}`;
}

const TUTOR = "nonexistent-tutor-probe";
console.log("1 availability profile :", await getDoc(`users/${TUTOR}/tutorProfile/default`));
console.log("2 reviews list         :", await runQuery(`reviews/${TUTOR}/reviews`));
console.log("3 requests list        :", await runQuery(`enrollmentRequests/${TUTOR}/requests`));
console.log("4 classes list         :", await runQuery(`batches/${TUTOR}/classes`));
console.log("5 roster list          :", await runQuery(`enrollments/${TUTOR}/roster`));
// cleanup identity
await getAuth().deleteUser(uid);
console.log("\nprobe identity deleted — no data was written.");
