/** Real client-shaped messaging security tests. Local demo emulator only. */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

const PROJECT = process.env.RULES_TEST_PROJECT ?? "demo-edumentx";
const HOST = process.env.RULES_TEST_HOST ?? "http://127.0.0.1:8080";
assert.equal(PROJECT, "demo-edumentx", "Messaging rules tests require demo-edumentx");
assert.match(HOST, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const BASE = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const RUN = randomUUID().replaceAll("-", "");
const A = `ma-${RUN}`;
const B = `mb-${RUN}`;
const C = `mc-${RUN}`;
const CONV = `${A}__${B}`;
const META = { name: "Student", avatar: null };
const OLD = new Date("2026-01-01T00:00:00Z");
const fullName = (path) => `projects/${PROJECT}/databases/(default)/documents/${path}`;
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const token = (uid) => `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: uid })}.`;
function field(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(field) } };
  if (typeof v === "object") return { mapValue: { fields: fields(v) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  throw new Error(`Unsupported test field: ${typeof v}`);
}
function fields(v) { return Object.fromEntries(Object.entries(v).map(([k, v]) => [k, field(v)])); }
function decode(v) {
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decode);
  if ("nullValue" in v) return null;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  return v.stringValue;
}
function decodeFields(v) { return Object.fromEntries(Object.entries(v).map(([k, v]) => [k, decode(v)])); }
async function req(method, path, uid, body) {
  const headers = { "Content-Type": "application/json" };
  if (uid) headers.Authorization = `Bearer ${uid === "owner" ? "owner" : token(uid)}`;
  const response = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, json, text };
}
function restFieldPath(value) {
  return value.split(".").map((part) => /^[a-zA-Z_][a-zA-Z_0-9]*$/.test(part)
    ? part : "`" + part.replaceAll("\\", "\\\\").replaceAll("`", "\\`") + "`").join(".");
}
function write(path, data, mask, times = [], transforms = [], exists) {
  return {
    update: { name: fullName(path), fields: fields(data) },
    ...(mask ? { updateMask: { fieldPaths: mask.map(restFieldPath) } } : {}),
    ...(exists !== undefined ? { currentDocument: { exists } } : {}),
    ...((times.length || transforms.length) ? { updateTransforms: [
      ...times.map((fieldPath) => ({ fieldPath: restFieldPath(fieldPath), setToServerValue: "REQUEST_TIME" })),
      ...transforms.map((t) => ({ ...t, fieldPath: restFieldPath(t.fieldPath) })),
    ] } : {}),
  };
}
const commit = (uid, writes) => req("POST", ":commit", uid, { writes });
const patch = (uid, path, data, mask = Object.keys(data), times = []) => commit(uid, [write(path, data, mask, times)]);
async function seed(path, data) { expectStatus("admin fixture seed", await commit("owner", [write(path, data)]), 200); }
function parent(a = A, b = B) {
  return { participants: [a, b], participantA: a, participantB: b, meta: { [a]: META }, lastMessage: null, createdAt: OLD, updatedAt: OLD };
}
async function create(path = CONV, uid = A, data = parent(), times = ["createdAt", "updatedAt"]) {
  return commit(uid, [write(`conversations/${path}`, data, undefined, times, [], false)]);
}
let passed = 0;
let failed = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${condition ? "" : ` ${detail}`}`);
  if (condition) passed++; else failed++;
}
function expectStatus(name, result, status) { check(name, result.status === status, `expected ${status}, got ${result.status}: ${result.text.slice(0, 220)}`); }
const deny = (name, r) => expectStatus(name, r, 403);
async function get(path, uid = A) { return req("GET", `/${path}`, uid); }
let messageNumber = 0;
function sendWrites(path = CONV, sender = A, peer = B, overrides = {}) {
  const id = `message-${++messageNumber}`;
  const text = overrides.text ?? "Hello from the real send batch";
  const conversationWrite = write(`conversations/${path}`, {
    meta: { [sender]: META }, unreadCount: { [sender]: 0 }, typing: { [sender]: false },
    lastMessage: { messageId: id, senderId: sender, text },
    ...overrides.conversation,
  }, [ `meta.${sender}`, `unreadCount.${sender}`, `typing.${sender}`, "lastMessage", "updatedAt" ], ["lastMessage.sentAt", "updatedAt"], [
    { fieldPath: `unreadCount.${peer}`, increment: { integerValue: "1" } },
  ]);
  const messageWrite = write(`conversations/${path}/messages/${id}`, {
    senderId: sender, text, status: "sent", ...overrides.message,
  }, undefined, ["sentAt"], [], false);
  return { id, writes: [conversationWrite, messageWrite] };
}
async function send(path = CONV, sender = A, peer = B) {
  const value = sendWrites(path, sender, peer);
  expectStatus("atomic sender/preview/unread batch succeeds", await commit(sender, value.writes), 200);
  return value.id;
}
async function freshFixture() {
  const a = `fa-${RUN}-${++messageNumber}`;
  const b = `fb-${RUN}-${messageNumber}`;
  const path = `${a}__${b}`;
  await seed(`conversations/${path}`, { ...parent(a, b), meta: { [a]: META, [b]: META } });
  return { a, b, path };
}

// Each malformed create uses a new absent path. Real typed maps/timestamps.
expectStatus("canonical conversation create succeeds", await create(), 200);
for (const [label, change] of [
  ["path mismatch", (d) => d],
  ["array mismatch", (d) => ({ ...d, participants: [A, C] })],
  ["self thread", (d) => ({ ...d, participantB: A, participants: [A, A] })],
  ["unsorted scalars", (d) => ({ ...d, participantA: B, participantB: A, participants: [B, A] })],
  ["forged peer metadata", (d) => ({ ...d, meta: { [A]: META, [B]: META } })],
  ["unknown create field", (d) => ({ ...d, privileged: true })],
  ["preloaded unread", (d) => ({ ...d, unreadCount: { [B]: 50 } })],
  ["fake preview", (d) => ({ ...d, lastMessage: { senderId: B, text: "fake", sentAt: OLD } })],
]) {
  const suffix = `-${++messageNumber}`;
  const a = `${A}${suffix}`; const b = `${B}${suffix}`;
  let data = change(parent());
  // Remap the original pair in fixture data without changing the intended defect.
  data = JSON.parse(JSON.stringify(data).replaceAll(A, a).replaceAll(B, b));
  data.createdAt = OLD; data.updatedAt = OLD;
  const path = label === "path mismatch" ? `other-${a}__${b}` : `${a}__${b}`;
  expectStatus("malformed-create target is absent", await get(`conversations/${path}`, a), 404);
  deny(`create denies ${label}`, await create(path, a, data));
}
{
  const a = `${A}-outsider`; const b = `${B}-outsider`; const path = `${a}__${b}`;
  deny("stranger cannot create pair", await create(path, C, parent(a, b)));
  deny("unauthenticated cannot create", await create(path, null, parent(a, b)));
}

// Two first-chat initializers cannot replace each other's document.
{
  const a = `${A}-race`; const b = `${B}-race`; const path = `${a}__${b}`;
  const results = await Promise.all([
    create(path, a, parent(a, b)),
    create(path, b, { ...parent(a, b), meta: { [b]: META } }),
  ]);
  check("only one concurrent initializer commits", results.filter((r) => r.status === 200).length === 1);
  check("losing initializer reports conflict", results.some((r) => r.status === 409));
  const winner = decodeFields((await get(`conversations/${path}`, a)).json?.fields ?? {});
  check("initializer preserves winner's self metadata", Object.keys(winner.meta ?? {}).length === 1);
}

const id = await send();
const peerId = await send(CONV, B, A);
for (const uid of [A, B]) {
  expectStatus("participant conversation read", await get(`conversations/${CONV}`, uid), 200);
  expectStatus("participant messages list", await get(`conversations/${CONV}/messages`, uid), 200);
  const query = await req("POST", ":runQuery", uid, { structuredQuery: {
    from: [{ collectionId: "conversations" }], where: { compositeFilter: { op: "OR", filters: ["participantA", "participantB"].map((fieldPath) => ({ fieldFilter: { field: { fieldPath }, op: "EQUAL", value: field(uid) } })) } },
  } });
  expectStatus("scalar OR inbox query succeeds", query, 200);
  check("inbox query actually returns this thread", query.json?.some((row) => row.document?.name === fullName(`conversations/${CONV}`)) === true);
}
for (const uid of [C, null]) {
  deny("outsider conversation read", await get(`conversations/${CONV}`, uid));
  deny("outsider message read", await get(`conversations/${CONV}/messages/${id}`, uid));
  deny("outsider messages list", await get(`conversations/${CONV}/messages`, uid));
  deny("outsider conversation write", await patch(uid, `conversations/${CONV}`, { typing: { [uid ?? "none"]: true } }));
  deny("outsider message receipt", await patch(uid, `conversations/${CONV}/messages/${id}`, { status: "read" }, ["status", "readAt"], ["readAt"]));
}
{
  const r = await req("POST", ":runQuery", C, { structuredQuery: { from: [{ collectionId: "conversations" }], where: { compositeFilter: { op: "OR", filters: ["participantA", "participantB"].map((fieldPath) => ({ fieldFilter: { field: { fieldPath }, op: "EQUAL", value: field(C) } })) } } } });
  expectStatus("stranger own inbox query succeeds", r, 200);
  check("stranger inbox contains no private thread", r.json?.every((row) => !row.document) === true);
}

// Attempts use independent fixtures so an exploit never invalidates later tests.
for (const [label, data, mask] of [
  ["participantA replacement", { participantA: C }], ["participantB replacement", { participantB: C }],
  ["participantA removal", {}, ["participantA"]], ["participants replacement", { participants: [A, C] }],
  ["participants removal", {}, ["participants"]], ["participant type", { participantB: 2 }],
  ["createdAt rewrite", { createdAt: new Date("2020-01-01") }],
  ["peer metadata", { meta: { [B]: META } }, [`meta.${B}`]],
  ["peer metadata deletion", {}, [`meta.${B}`]],
  ["peer typing", { typing: { [B]: true } }, [`typing.${B}`]],
  ["unknown field", { injected: true }], ["non-map meta", { meta: "broken" }],
  ["extra map identity", { typing: { [C]: true } }, [`typing.${C}`]],
  ["negative counter", { unreadCount: { [B]: -1 } }, [`unreadCount.${B}`]],
  ["counter jump", { unreadCount: { [B]: 10 } }, [`unreadCount.${B}`]],
]) {
  const fixture = await freshFixture();
  const str = JSON.stringify(data).replaceAll(A, fixture.a).replaceAll(B, fixture.b);
  const next = JSON.parse(str);
  if (data.createdAt) next.createdAt = data.createdAt;
  deny(`update denies ${label}`, await patch(fixture.a, `conversations/${fixture.path}`, next, mask?.map((v) => v.replaceAll(B, fixture.b))));
  if (label.startsWith("participant")) deny("third party still cannot read after membership attack", await get(`conversations/${fixture.path}`, C));
}
expectStatus("own typing succeeds", await patch(A, `conversations/${CONV}`, { typing: { [A]: true } }, [`typing.${A}`]), 200);
expectStatus("own unread reset succeeds", await patch(A, `conversations/${CONV}`, { unreadCount: { [A]: 0 } }, [`unreadCount.${A}`]), 200);
deny("standalone preview is denied", await patch(A, `conversations/${CONV}`, { lastMessage: { messageId: id, senderId: A, text: "forged", sentAt: OLD } }));
deny("standalone counter increment denied", await commit(A, [write(`conversations/${CONV}`, {}, [], [], [{ fieldPath: `unreadCount.${B}`, increment: { integerValue: "1" } }])]));
for (const [label, override] of [
  ["forged preview sender", { conversation: { lastMessage: { messageId: "different", senderId: B, text: "Hello" } } }],
  ["mismatched message text", { message: { text: "different from preview" } }],
  ["message status read on create", { message: { status: "read" } }],
  ["message extra field", { message: { injected: true } }],
  ["empty message", { text: "" }], ["long message", { text: "x".repeat(2001) }],
  ["forged message sender", { message: { senderId: B } }],
]) {
  const batch = sendWrites(CONV, A, B, override);
  deny(label, await commit(A, batch.writes));
}
deny("message cannot be inserted without send batch", await commit(A, [write(`conversations/${CONV}/messages/standalone`, { senderId: A, text: "alone", status: "sent" }, undefined, ["sentAt"])]));
// A preview bound to an old message must not be replayed to inflate badges.
{
  const batch = sendWrites();
  batch.writes[0].update.fields.lastMessage.mapValue.fields.messageId = field(id);
  deny("old-message preview replay denied", await commit(A, [batch.writes[0]]));
}
{
  const fixture = await freshFixture();
  const batch = sendWrites(fixture.path, fixture.a, fixture.b, { text: "x".repeat(2000) });
  expectStatus("2000-character atomic message succeeds", await commit(fixture.a, batch.writes), 200);
}
// A valid counterpart message does not excuse corrupted conversation state.
for (const [label, mutate] of [
  ["send counter increment must be exactly one", (writes) => { writes[0].updateTransforms.at(-1).increment.integerValue = "2"; }],
  ["send own unread must reset to zero", (writes) => { writes[0].update.fields.unreadCount.mapValue.fields[A] = field(9); }],
  ["send cannot alter peer meta", (writes) => {
    writes[0].update.fields.meta.mapValue.fields[B] = field({ name: "Forged peer", avatar: null });
    writes[0].updateMask.fieldPaths.push(restFieldPath(`meta.${B}`));
  }],
  ["send cannot alter peer typing", (writes) => {
    writes[0].update.fields.typing.mapValue.fields[B] = field(true);
    writes[0].updateMask.fieldPaths.push(restFieldPath(`typing.${B}`));
  }],
  ["send cannot forge updatedAt", (writes) => {
    writes[0].updateTransforms = writes[0].updateTransforms.filter((v) => v.fieldPath !== "updatedAt");
    writes[0].update.fields.updatedAt = field(OLD);
  }],
  ["message sentAt must be server time", (writes) => {
    writes[1].updateTransforms = [];
    writes[1].update.fields.sentAt = field(OLD);
  }],
]) {
  const batch = sendWrites(); mutate(batch.writes);
  deny(label, await commit(A, batch.writes));
}
// Receipt checks cover additions AND masked deletions (changedKeys alone misses both).
for (const [label, uid, data, mask, times] of [
  ["sender cannot read own outgoing", A, { status: "read" }, ["status", "readAt"], ["readAt"]],
  ["invalid status", B, { status: "deleted" }, ["status", "readAt"], ["readAt"]],
  ["string receipt time", B, { status: "read", readAt: "tomorrow" }],
  ["text rewrite", B, { text: "tampered" }], ["sender rewrite", B, { senderId: B }],
  ["timestamp rewrite", B, { sentAt: new Date("2020-01-01") }], ["text deletion", B, {}, ["text"]],
  ["sender deletion", B, {}, ["senderId"]], ["sentAt deletion", B, {}, ["sentAt"]],
  ["extra message field", B, { injected: true }],
]) {
  const caseId = `receipt-case-${++messageNumber}`;
  await seed(`conversations/${CONV}/messages/${caseId}`, { senderId: A, text: "immutable", sentAt: OLD, status: "sent" });
  deny(label, await patch(uid, `conversations/${CONV}/messages/${caseId}`, data, mask, times));
}
expectStatus("recipient read receipt and own badge reset batch succeeds", await commit(B, [
  write(`conversations/${CONV}/messages/${id}`, { status: "read" }, ["status", "readAt"], ["readAt"]),
  write(`conversations/${CONV}`, { unreadCount: { [B]: 0 } }, [`unreadCount.${B}`]),
]), 200);
{
  const result = await get(`conversations/${CONV}/messages/${id}`, B);
  check("receipt status persisted", decodeFields(result.json?.fields ?? {}).status === "read");
  const receipt = decodeFields(result.json?.fields ?? {}).readAt;
  check("receipt is a timestamp", typeof receipt === "string" && Number.isFinite(Date.parse(receipt)));
  expectStatus("idempotent receipt without replacing time succeeds", await patch(B, `conversations/${CONV}/messages/${id}`, { status: "read" }), 200);
  deny("read receipt timestamp cannot be rewritten", await patch(B, `conversations/${CONV}/messages/${id}`, { status: "read" }, ["status", "readAt"], ["readAt"]));
  deny("read cannot regress to sent", await patch(B, `conversations/${CONV}/messages/${id}`, { status: "sent" }));
  deny("readAt cannot be deleted", await patch(B, `conversations/${CONV}/messages/${id}`, {}, ["readAt"]));
}
for (const [path, uid] of [[`conversations/${CONV}`, A], [`conversations/${CONV}/messages/${id}`, A]]) deny("client deletion denied", await req("DELETE", `/${path}`, uid));
// Sparse existing docs: unsorted participants, absent optional maps, old preview.
{
  const a = `la-${RUN}`; const b = `lb-${RUN}`; const path = `${a}__${b}`;
  await seed(`conversations/${path}`, { ...parent(a, b), participants: [b, a], meta: {}, lastMessage: { senderId: b, text: "legacy", sentAt: OLD } });
  expectStatus("legacy typing with missing maps succeeds", await patch(a, `conversations/${path}`, { typing: { [a]: true } }, [`typing.${a}`]), 200);
  expectStatus("legacy unread reset with missing counter succeeds", await patch(a, `conversations/${path}`, { unreadCount: { [a]: 0 } }, [`unreadCount.${a}`]), 200);
  await send(path, a, b);
  const result = await get(`conversations/${path}`, a); const d = decodeFields(result.json?.fields ?? {});
  check("legacy participant order remains immutable", d.participants?.[0] === b && d.participants?.[1] === a);
  check("legacy preview upgraded with messageId", typeof d.lastMessage?.messageId === "string");
}
// Legacy messages lacking status/readAt can receive their first receipt.
await seed(`conversations/${CONV}/messages/legacy-status`, { senderId: A, text: "legacy", sentAt: OLD });
expectStatus("legacy message receives first receipt", await patch(B, `conversations/${CONV}/messages/legacy-status`, { status: "read" }, ["status", "readAt"], ["readAt"]), 200);
// Parent existence is required even when orphan messages survive server deletion.
{
  const missing = `missing-${RUN}`;
  expectStatus("missing conversation returns empty 404", await get(`conversations/${missing}`), 404);
  deny("missing-parent message list fails closed", await get(`conversations/${missing}/messages`));
  await seed(`conversations/${missing}/messages/orphan`, { senderId: A, text: "private orphan", status: "sent", sentAt: OLD });
  for (const uid of [A, C]) {
    deny("orphan message get denied", await get(`conversations/${missing}/messages/orphan`, uid));
    deny("orphan message list denied", await get(`conversations/${missing}/messages`, uid));
  }
}
// Verify transforms really produced timestamps and bounded exact counters.
{
  const r = await get(`conversations/${CONV}`, A); const d = decodeFields(r.json?.fields ?? {});
  check("actual preview is a map", typeof d.lastMessage === "object" && d.lastMessage !== null);
  check("lastMessage timestamp came from server transform", typeof d.lastMessage?.sentAt === "string" && Number.isFinite(Date.parse(d.lastMessage.sentAt)));
  check("peer unread is zero after recipient read", d.unreadCount?.[B] === 0);
  check("own unread reset remains zero", d.unreadCount?.[A] === 0);
  check("typed metadata preserves null avatar", d.meta?.[A]?.avatar === null);
  check("second sender preview remains unchanged by receipts", d.lastMessage?.messageId === peerId);
}
console.log(`\n${passed} passed / ${failed} failed`);
process.exitCode = failed ? 1 : 0;
