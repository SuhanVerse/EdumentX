/**
 * Messaging smoke test (against a real Firestore project)
 *
 * Verifies the DEPLOYED `conversations` rules end-to-end the way the
 * app actually reads/writes them (see
 * `services/messages/FirebaseMessagesRepository.ts`). The Firebase
 * Admin SDK bypasses security rules, so a plain admin-DB test would
 * prove nothing — this script acts as REAL signed-in clients:
 *
 *   1. Seeds a conversation between two throwaway users (A + B) with
 *      a seeded incoming message for A (admin SDK — seeding only).
 *   2. Mints custom-token ID tokens for A, B, and a stranger C (the
 *      same credential a device would hold).
 *   3. A runs the HUB query (`participantA == A OR participantB ==
 *      A`) — the exact `subscribeConversations` shape that used to
 *      403 on every render — and asserts the thread comes back.
 *   4. A sends a message the way the app does (conv-doc update
 *      bumping `unreadCount.B` + message create) and asserts B's
 *      unread badge is now 1 — the live unread-count signal
 *      `useUnreadCount` reads.
 *   5. A marks the seeded incoming message read (`status`/`readAt`
 *      only) and zeroes their own badge — the receipt + badge-reset
 *      path. Asserts the message flips to `read` and the badge hits 0.
 *   6. A flips their typing flag — the `setTyping` path.
 *   7. B runs the same hub query and sees the thread with their
 *      unread badge intact. C (stranger) gets an empty hub, a 403 on
 *      the doc, and a 403 on the receipt flip.
 *   8. Cleans up every doc it created plus the throwaway Auth users.
 *
 * Exit code 0 = all checks passed; 1 = one or more checks failed.
 *
 * Usage (same prereqs as smoke:reviews):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run smoke:messages
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

// ─── Client transport (real signed-in users, real deployed rules) ───────────

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

/** Convert a JS value to a Firestore REST field value (maps/arrays too). */
function restField(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: String(v) };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map((item) => restField(item)) } };
  }
  const fields: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    fields[k] = restField(val);
  }
  return { mapValue: { fields } };
}

function restFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, restField(v)]));
}

/** PATCH a document as a signed-in client, updating ONLY the masked fields. */
async function patchDoc(
  idToken: string,
  docPath: string,
  fields: Record<string, unknown>,
  masks: string[],
): Promise<{ status: number; text: string }> {
  const qs = masks
    .map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`)
    .join("&");
  const res = await fetch(`${FIRESTORE_BASE}${docPath}?${qs}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields: restFields(fields) }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (res.status >= 400) {
    console.log(`   └ PATCH ${docPath} → ${res.status}: ${text.slice(0, 220)}`);
  }
  return { status: res.status, text };
}

/** POST (auto-id create) a document as a signed-in client. */
async function postDoc(
  idToken: string,
  collectionPath: string,
  fields: Record<string, unknown>,
): Promise<{ status: number; text: string }> {
  const res = await fetch(`${FIRESTORE_BASE}${collectionPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields: restFields(fields) }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (res.status >= 400) {
    console.log(`   └ POST ${collectionPath} → ${res.status}: ${text.slice(0, 220)}`);
  }
  return { status: res.status, text };
}

/** GET a document as a signed-in client; returns parsed JSON on 200. */
async function getDocAs(
  idToken: string,
  docPath: string,
): Promise<{ status: number; json?: any }> {
  const res = await fetch(`${FIRESTORE_BASE}${docPath}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return { status: res.status };
  return { status: res.status, json: await res.json() };
}

/**
 * The app's `subscribeConversations` hub query — an OR composite
 * filter on the sorted SCALAR pair. This exact shape was silently
 * 403'd before the rules/query alignment.
 */
async function runHubQuery(
  idToken: string,
): Promise<{ status: number; convIds: string[] }> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "conversations" }],
        where: {
          compositeFilter: {
            op: "OR",
            filters: [
              { fieldFilter: { field: { fieldPath: "participantA" }, op: "EQUAL", value: { stringValue: uidFor(idToken) } } },
              { fieldFilter: { field: { fieldPath: "participantB" }, op: "EQUAL", value: { stringValue: uidFor(idToken) } } },
            ],
          },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let convIds: string[] = [];
  if (res.ok) {
    const docs = JSON.parse(text) as { document?: { name?: string } }[];
    convIds = docs
      .filter((d) => d.document?.name)
      .map((d) => {
        const name = d.document!.name!;
        return name.slice(name.lastIndexOf("/") + 1);
      });
  }
  return { status: res.status, convIds };
}

// The REST runQuery needs the real uid in the filter VALUES — the
// minted token's uid is tracked by the caller (see `main`), so we
// wire it through a module-level map.
const UID_BY_TOKEN = new Map<string, string>();
function uidFor(idToken: string): string {
  return UID_BY_TOKEN.get(idToken) ?? "unknown-uid";
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  initAdmin();
  const db = getFirestore();
  const auth = getAuth(getApps()[0]);

  const stamp = Date.now();
  const USER_A = `smoke-msg-a-${stamp}`;
  const USER_B = `smoke-msg-b-${stamp}`;
  const STRANGER = `smoke-msg-c-${stamp}`;
  const CONV = [USER_A, USER_B].sort().join("__");
  const SEED_MSG = "seed-msg-1";

  const cleanupRefs = [db.doc(`conversations/${CONV}`)];
  const cleanupUsers = [USER_A, USER_B, STRANGER];

  // ── 1. Seed the conversation + an incoming message for A (admin) ──
  await db.doc(`conversations/${CONV}`).set({
    participants: [USER_A, USER_B],
    participantA: [USER_A, USER_B].sort()[0],
    participantB: [USER_A, USER_B].sort()[1],
    meta: {
      [USER_A]: { name: "Smoke Student A", avatar: null },
      [USER_B]: { name: "Smoke Tutor B", avatar: null },
    },
    unreadCount: { [USER_A]: 0, [USER_B]: 0 },
    typing: {},
    lastMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.doc(`conversations/${CONV}/messages/${SEED_MSG}`).set({
    senderId: USER_B,
    text: "Welcome! Ready to start?",
    sentAt: new Date(),
    status: "sent",
  });
  pass("seeded conversation + incoming message (admin)", `${CONV} / ${SEED_MSG}`);

  // ── 2. Mint real client tokens ──
  const idA = await mintIdToken(USER_A);
  UID_BY_TOKEN.set(idA, USER_A);
  const idB = await mintIdToken(USER_B);
  UID_BY_TOKEN.set(idB, USER_B);
  const idC = await mintIdToken(STRANGER);
  UID_BY_TOKEN.set(idC, STRANGER);
  pass("minted client ID tokens for A, B, stranger C");

  // ── 3. A runs the hub query — the previously-403'd path ──
  {
    const r = await runHubQuery(idA);
    const ok = r.status === 200 && r.convIds.includes(CONV);
    if (!ok) {
      fail("participant hub query (OR on scalars) returns their thread", `status ${r.status}, ids [${r.convIds.join(", ")}]`);
    } else {
      pass("participant hub query (OR on scalars) returns their thread", `${r.convIds.length} conversation(s)`);
    }
  }

  // ── 4. A reads the conversation doc (participant read) ──
  {
    const r = await getDocAs(idA, `/conversations/${CONV}`);
    expect(r.status, 200, "participant reads conversation doc");
  }

  // ── 5. A sends a message — unreadCount.B must bump to 1 ──
  {
    const sentAt = new Date();
    // Mirror sendMessage: conv update (meta/unreadCount/typing/lastMessage)
    // + message create in the same shape the app's writeBatch does.
    const upd = await patchDoc(
      idA,
      `/conversations/${CONV}`,
      {
        meta: { [USER_A]: { name: "Smoke Student A", avatar: null } },
        unreadCount: { [USER_B]: 1, [USER_A]: 0 },
        typing: { [USER_A]: false },
        lastMessage: { senderId: USER_A, text: "Hi! I'd like to enroll.", sentAt },
        updatedAt: sentAt,
      },
      [
        // Uid segments must be backtick-quoted in REST updateMask
        // field paths (uids contain dashes); the native SDK quotes
        // automatically, so this mirrors what the app actually sends.
        `meta.\`${USER_A}\``,
        `unreadCount.\`${USER_B}\``,
        `unreadCount.\`${USER_A}\``,
        `typing.\`${USER_A}\``,
        "lastMessage",
        "updatedAt",
      ],
    );
    expect(upd.status, 200, "participant sends message (conv-doc update)");

    const msg = await postDoc(idA, `/conversations/${CONV}/messages`, {
      senderId: USER_A,
      text: "Hi! I'd like to enroll.",
      sentAt,
      status: "sent",
    });
    expect(msg.status, 200, "participant creates message (senderId == auth.uid)");

    // The badge the recipient sees — re-read the doc as A.
    const check = await getDocAs(idA, `/conversations/${CONV}`);
    const bCount =
      check.json?.fields?.unreadCount?.mapValue?.fields?.[USER_B]?.integerValue;
    expect(bCount, "1", "unread badge bumped for the peer (unreadCount.B == 1)");
  }

  // ── 6. B sees the thread with their unread badge intact ──
  {
    const r = await runHubQuery(idB);
    const ok = r.status === 200 && r.convIds.includes(CONV);
    if (!ok) {
      fail("other participant hub query returns the same thread", `status ${r.status}`);
    } else {
      pass("other participant hub query returns the same thread");
    }
    const check = await getDocAs(idB, `/conversations/${CONV}`);
    const bCount =
      check.json?.fields?.unreadCount?.mapValue?.fields?.[USER_B]?.integerValue;
    expect(bCount, "1", "recipient's unread badge visible on the doc");
  }

  // ── 7. A marks the seeded message read + zeroes their badge ──
  {
    const flip = await patchDoc(
      idA,
      `/conversations/${CONV}/messages/${SEED_MSG}`,
      { status: "read", readAt: new Date() },
      ["status", "readAt"],
    );
    expect(flip.status, 200, "participant marks incoming message read (receipt)");

    const zero = await patchDoc(
      idA,
      `/conversations/${CONV}`,
      { unreadCount: { [USER_A]: 0 } },
      [`unreadCount.\`${USER_A}\``],
    );
    expect(zero.status, 200, "participant zeroes their own unread badge");

    const msgCheck = await getDocAs(idA, `/conversations/${CONV}/messages/${SEED_MSG}`);
    const status = msgCheck.json?.fields?.status?.stringValue;
    expect(status, "read", "seeded message now reads as 'read' (double-checkmark data)");

    const convCheck = await getDocAs(idA, `/conversations/${CONV}`);
    const aCount =
      convCheck.json?.fields?.unreadCount?.mapValue?.fields?.[USER_A]?.integerValue;
    expect(aCount, "0", "sender's unread badge zeroed after reading");
  }

  // ── 8. A flips their typing flag (setTyping path) ──
  {
    const r = await patchDoc(
      idA,
      `/conversations/${CONV}`,
      { typing: { [USER_A]: true } },
      [`typing.\`${USER_A}\``],
    );
    expect(r.status, 200, "participant sets typing indicator");
  }

  // ── 9. Stranger C — empty hub, denied doc read, denied receipt flip ──
  {
    const r = await runHubQuery(idC);
    const empty = r.status === 200 && !r.convIds.includes(CONV);
    if (!empty) {
      fail("stranger hub query returns no rows", `status ${r.status}, ids [${r.convIds.join(", ")}]`);
    } else {
      pass("stranger hub query returns no rows");
    }

    const read = await getDocAs(idC, `/conversations/${CONV}`);
    expect(read.status >= 400, true, "stranger cannot read the conversation");

    const flip = await patchDoc(
      idC,
      `/conversations/${CONV}/messages/${SEED_MSG}`,
      { status: "read", readAt: new Date() },
      ["status", "readAt"],
    );
    expect(flip.status >= 400, true, "stranger cannot flip message status");
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
