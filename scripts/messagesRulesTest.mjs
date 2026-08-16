/**
 * Rules-emulation test for the 1:1 messaging paths
 * (`match /conversations/{conversationId}` + `messages`).
 *
 * Covers: participant-gated conversation create/read/update, message
 * create with `senderId == auth.uid` + non-empty bounded text, and
 * stranger denials on every path.
 *
 * Run via: firebase emulators:exec --only firestore --project demo-edumentx
 * "node scripts/messagesRulesTest.mjs"
 */
import { Buffer } from "node:buffer";

const PROJECT = process.env.RULES_TEST_PROJECT ?? "demo-edumentx";
const HOST = process.env.RULES_TEST_HOST ?? "http://127.0.0.1:8080";
const BASE = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function tokenFor(uid) {
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: uid })}.`;
}

function field(v) {
  if (typeof v === "number") return { integerValue: String(v) };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}
function payload(obj, arrays = []) {
  const fields = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, field(v)]));
  for (const key of arrays) {
    fields[key] = {
      arrayValue: { values: obj[key].map((item) => ({ stringValue: String(item) })) },
    };
  }
  return { fields };
}

async function req(method, path, uid, body, query = "") {
  const res = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: { Authorization: `Bearer ${tokenFor(uid)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.text()).slice(0, 300) };
}

// Same as `req` but returns the UNTRUNCATED body — for calls that
// need to JSON.parse the response (e.g. listing message auto-ids).
async function reqFull(method, path, uid, body, query = "") {
  const res = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: { Authorization: `Bearer ${tokenFor(uid)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.text() };
}

let pass = 0;
let fail = 0;
function check(name, actual, expected, extra = "") {
  const ok = actual === expected;
  console.log(`${ok ? "✅" : "❌"} ${name} — expected ${expected}, got ${actual}${extra ? ` ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
}

const STUDENT = "msg-student-1";
const TUTOR = "msg-tutor-1";
const STRANGER = "msg-stranger-1";
const CONV = `${[STUDENT, TUTOR].sort().join("__")}`;

// ── 1. Participant creates the conversation (2 participants, self in) ──
{
  const r = await req("PATCH", `/conversations/${CONV}`, STUDENT, payload(
    {
      participants: [STUDENT, TUTOR],
      participantA: STUDENT,
      participantB: TUTOR,
      meta: { [STUDENT]: { name: "Student One", avatar: null } },
      lastMessage: null,
    },
    ["participants"],
  ));
  check("participant creates conversation (deterministic id)", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 1b. Hub list query (messages inbox). The client's
//        `subscribeConversations` filters on the SORTED SCALAR pair
//        (`participantA == uid OR participantB == uid`) — matching
//        the scalar-only rules. A list query with an OR composite
//        filter on those two fields must be permitted; the old
//        `array-contains`-on-`participants` shape was NOT provable
//        against the rules and 403'd on every render.
//
//        REST shape: for a TOP-LEVEL collection query the parent is
//        `documents` itself and `from.collectionId` names the
//        collection (`documents/conversations:runQuery` trips an
//        emulator parser bug — the same one the reviews list test
//        documents).
async function runHubQuery(uid) {
  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenFor(uid)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "conversations" }],
        where: {
          compositeFilter: {
            op: "OR",
            filters: [
              { fieldFilter: { field: { fieldPath: "participantA" }, op: "EQUAL", value: { stringValue: uid } } },
              { fieldFilter: { field: { fieldPath: "participantB" }, op: "EQUAL", value: { stringValue: uid } } },
            ],
          },
        },
      },
    }),
  });
  return { status: res.status, body: await res.text() };
}
{
  const r = await runHubQuery(STUDENT);
  const ok = r.status === 200 && r.body.includes(`"name"`) && r.body.includes(CONV);
  check("participant hub query (OR on scalars) returns their thread", ok ? 200 : r.status, 200);
  if (r.status !== 200 || !ok) console.log("   ", r.body.slice(0, 200));

  const denied = await runHubQuery(STRANGER);
  const empty = denied.status === 200 && !denied.body.includes(CONV);
  check("stranger hub query returns no rows (not an error)", empty ? 200 : denied.status, 200);
  if (!empty) console.log("   ", denied.body.slice(0, 200));
}

// ── 2. Stranger tries to create a conversation they're not in ──
{
  const r = await req("PATCH", `/conversations/${CONV}`, STRANGER, payload(
    {
      participants: [STUDENT, TUTOR],
      participantA: STUDENT,
      participantB: TUTOR,
      meta: {},
      lastMessage: null,
    },
    ["participants"],
  ));
  check("stranger cannot create a conversation they're not in", r.status, 403);
}

// ── 3. Participant reads / stranger read denied ──
{
  const ok = await req("GET", `/conversations/${CONV}`, STUDENT);
  check("participant reads conversation", ok.status, 200);
  const denied = await req("GET", `/conversations/${CONV}`, STRANGER);
  check("stranger cannot read conversation", denied.status, 403);
}

// ── 3b. Missing conversation (chat opened before first message) ──
// The read rule now allows nonexistent docs (the client subscribes
// before the first message). A 404 (not 403) proves rules permitted
// the read and the doc simply doesn't exist — the SDK sees an empty
// snapshot instead of permission-denied.
{
  const MISSING = "missing-conv-a__missing-conv-b";
  const ok = await req("GET", `/conversations/${MISSING}`, "missing-conv-a");
  check("read of NOT-YET-EXISTING conversation is permitted (404, not 403)", ok.status, 404);
  const msgs = await req("GET", `/conversations/${MISSING}/messages`, "missing-conv-a");
  check("messages list on NOT-YET-EXISTING conversation is permitted (200 empty)", msgs.status, 200);
}

// ── 4. Participant sends a message (senderId == auth.uid, non-empty) ──
{
  const r = await req("POST", `/conversations/${CONV}/messages`, STUDENT, payload({
    senderId: STUDENT,
    text: "Hello! When can we start?",
  }));
  check("participant sends a message", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 5. Message forged with a different senderId ──
{
  const r = await req("POST", `/conversations/${CONV}/messages`, STUDENT, payload({
    senderId: TUTOR,
    text: "Forged as the tutor",
  }));
  check("senderId must equal auth.uid (forgery denied)", r.status, 403);
}

// ── 6. Empty / over-long text ──
{
  const empty = await req("POST", `/conversations/${CONV}/messages`, STUDENT, payload({
    senderId: STUDENT,
    text: "",
  }));
  check("empty message text denied", empty.status, 403);
  const long = await req("POST", `/conversations/${CONV}/messages`, STUDENT, payload({
    senderId: STUDENT,
    text: "x".repeat(2001),
  }));
  check(">2000-char message text denied", long.status, 403);
}

// ── 7. Non-participant message create ──
{
  const r = await req("POST", `/conversations/${CONV}/messages`, STRANGER, payload({
    senderId: STRANGER,
    text: "Sneaking in",
  }));
  check("non-participant cannot send a message", r.status, 403);
}

// ── 7b. Read receipts — a participant flips an incoming message to
//        `status: "read"` (markMessagesRead). Stranger flip denied.
{
  // Fetch the message id created in step 4 (auto-id). Uses the
  // full (untruncated) body — `req` slices to 300 chars for display,
  // which would truncate the JSON mid-string and break the parse.
  const list = await reqFull("GET", `/conversations/${CONV}/messages`, STUDENT);
  const m = JSON.parse(list.body);
  const msgId = m.documents?.[0]?.name?.split("/").pop();
  if (msgId) {
    const ok = await req(
      "PATCH",
      `/conversations/${CONV}/messages/${msgId}?updateMask.fieldPaths=status&updateMask.fieldPaths=readAt`,
      TUTOR,
      payload({ status: "read", readAt: "2026-08-16T00:00:00Z" }),
    );
    check("participant marks incoming message read (receipt)", ok.status, 200);
    if (ok.status !== 200) console.log("   ", ok.body);

    const tamper = await req(
      "PATCH",
      `/conversations/${CONV}/messages/${msgId}?updateMask.fieldPaths=text`,
      TUTOR,
      payload({ text: "Edited!" }),
    );
    check("participant cannot rewrite message text (receipt-only carve-out)", tamper.status, 403);

    const denied = await req(
      "PATCH",
      `/conversations/${CONV}/messages/${msgId}?updateMask.fieldPaths=status&updateMask.fieldPaths=readAt`,
      STRANGER,
      payload({ status: "read", readAt: "2026-08-16T00:00:00Z" }),
    );
    check("stranger cannot flip message status", denied.status, 403);
  }
}

// ── 8. Participant bumps lastMessage (update allowed) ──
{
  const r = await req(
    "PATCH",
    `/conversations/${CONV}?updateMask.fieldPaths=lastMessage&updateMask.fieldPaths=updatedAt`,
    TUTOR,
    payload({
      lastMessage: { senderId: TUTOR, text: "Reply!", sentAt: "2026-08-15T00:00:00Z" },
      updatedAt: "2026-08-15T00:00:01Z",
    }),
  );
  check("participant updates lastMessage", r.status, 200);
  if (r.status !== 200) console.log("   ", r.body);
}

// ── 9. Non-participant update denied ──
{
  const r = await req(
    "PATCH",
    `/conversations/${CONV}?updateMask.fieldPaths=lastMessage&updateMask.fieldPaths=updatedAt`,
    STRANGER,
    payload({
      lastMessage: { senderId: STRANGER, text: "Hijack", sentAt: "2026-08-15T00:00:00Z" },
      updatedAt: "2026-08-15T00:00:01Z",
    }),
  );
  check("non-participant cannot update conversation", r.status, 403);
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
