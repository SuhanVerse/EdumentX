/** Repository boundary tests; native Firestore SDK replaced at its I/O boundary. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function compile(path, imports = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(source, { module, exports: module.exports, require: (id) => {
    if (id in imports) return imports[id];
    throw new Error(`Unexpected native import ${id}`);
  }, console, Date, Map, Set });
  return module.exports;
}
function harness(options = {}) {
  const listeners = [];
  const writes = [];
  const clock = { kind: "server-time" };
  let initialized = false;
  let transactionRuns = 0;
  const sdk = {
    getFirestore: () => ({}),
    doc: (...parts) => ({ path: (parts[0]?.kind === "collection" ? `${parts[0].path}/new-id` : parts.slice(1).join("/")), kind: "document", id: "new-id" }),
    collection: (_, ...parts) => ({ path: parts.join("/"), kind: "collection" }),
    query: (ref) => ({ ...ref, kind: "query" }), orderBy: () => ({}),
    onSnapshot: (ref, data, error) => {
      const record = { ref, data, error, active: true };
      listeners.push(record);
      return () => { record.active = false; };
    },
    getDoc: async () => ({ exists: () => false }),
    setDoc: async (ref, value) => { writes.push([ref, value]); },
    serverTimestamp: () => clock, increment: (by) => ({ kind: "increment", by }),
    runTransaction: async (_, callback) => {
      transactionRuns++;
      // Emulate retry after a concurrent creator wins: the callback reruns
      // with the peer-created document and must not replace it.
      const attempts = [false, true];
      for (const exists of attempts) {
        const pending = [];
        await callback({
          get: async (ref) => options.receiptRetry ? {
            exists: () => true,
            data: () => ({ senderId: ref.path.endsWith("/outgoing") ? "viewer" : "peer", status: exists ? "read" : "sent" }),
          } : ({ exists: () => exists }),
          set: (ref, value) => pending.push([ref, value]),
          update: (ref, value) => pending.push([ref, value]),
        });
        if (exists) { writes.push(...pending); initialized = true; }
      }
    },
    writeBatch: () => ({ update: (ref, value) => writes.push([ref, value]), set: (ref, value) => writes.push([ref, value]), commit: async () => {} }),
  };
  const types = compile("../src/services/messages/types.ts");
  const { FirebaseMessagesRepository: repo } = compile("../src/services/messages/FirebaseMessagesRepository.ts", {
    "@react-native-firebase/app": { getApp: () => ({}) }, "@react-native-firebase/firestore": sdk, "./types": types,
  });
  return { repo, listeners, writes, clock, get transactionRuns() { return transactionRuns; }, get initialized() { return initialized; } };
}
const snapshot = (exists, data = {}) => ({ exists: () => exists, id: "a__b", data: () => data });
test("messages wait for parent, clear on deletion, ignore late snapshots and unsubscribe", () => {
  const h = harness(); const emitted = [];
  const stop = h.repo.subscribeMessages("a__b", (list) => emitted.push(list));
  assert.equal(h.listeners.length, 1);
  assert.equal(h.listeners[0].ref.kind, "document", "first listener must authorize the parent");
  h.listeners[0].data(snapshot(false));
  assert.equal(emitted.at(-1).length, 0);
  assert.equal(h.listeners.length, 1, "no orphan query for absent parent");
  h.listeners[0].data(snapshot(true));
  const messages = h.listeners[1];
  assert.equal(messages.ref.kind, "query");
  messages.data({ docs: [{ id: "one", data: () => ({ senderId: "a", text: "private", sentAt: new Date(), status: "sent" }) }] });
  assert.equal(emitted.at(-1)[0].text, "private");
  h.listeners[0].data(snapshot(false));
  assert.equal(messages.active, false);
  assert.equal(emitted.at(-1).length, 0);
  messages.data({ docs: [{ id: "one", data: () => ({ senderId: "a", text: "stale" }) }] });
  assert.equal(emitted.at(-1).length, 0, "late message snapshot cannot restore deleted-parent content");
  h.listeners[0].data(snapshot(true));
  assert.equal(h.listeners.length, 3, "parent recreation starts one fresh query");
  h.listeners[0].data(snapshot(true));
  assert.equal(h.listeners.length, 3, "ordinary parent updates do not duplicate message listeners");
  stop();
  assert.equal(h.listeners.every((v) => !v.active), true);
  h.listeners[0].data(snapshot(true));
  assert.equal(h.listeners.length, 3, "late parent callback after unsubscribe is ignored");
});
test("parent authorization error clears message content and stops the child listener", () => {
  const h = harness(); const emitted = []; const errors = [];
  h.repo.subscribeMessages("a__b", (v) => emitted.push(v), (e) => errors.push(e));
  assert.equal(h.listeners[0].ref.kind, "document");
  h.listeners[0].data(snapshot(true));
  const child = h.listeners[1];
  child.data({ docs: [] });
  h.listeners[0].error(new Error("permission denied"));
  assert.equal(child.active, false);
  assert.equal(emitted.at(-1).length, 0);
  assert.equal(errors.length, 1);
});
test("send retries concurrent conversation initialization without replacing peer data and binds preview id", async () => {
  const h = harness();
  await h.repo.sendMessage({ conversationId: "a__b", senderId: "b", peerUid: "a", text: " hello " });
  assert.equal(h.transactionRuns, 1);
  assert.equal(h.initialized, true);
  assert.equal(h.writes.length, 2, "retry must not persist the stale empty-parent initializer");
  const [conversation, message] = h.writes;
  assert.equal(conversation[1].lastMessage.messageId, message[0].id);
  assert.equal(message[1].text, "hello");
  assert.equal(conversation[1].lastMessage.text, message[1].text);
  assert.equal(conversation[1].lastMessage.sentAt, h.clock);
  assert.equal(message[1].sentAt, h.clock);
  assert.equal(conversation[1]["unreadCount.a"].by, 1);
  assert.equal(conversation[1]["unreadCount.b"], 0);
});

test("receipt retry skips already-read and outgoing messages while clearing only viewer badge", async () => {
  const h = harness({ receiptRetry: true });
  await h.repo.markMessagesRead({ conversationId: "peer__viewer", viewerUid: "viewer", messageIds: ["incoming", "incoming", "outgoing"] });
  assert.equal(h.writes.length, 1, "retry does not rewrite a peer's first readAt");
  assert.equal(h.writes[0][0].path, "conversations/peer__viewer");
  assert.equal(h.writes[0][1]["unreadCount.viewer"], 0);
  assert.equal(Object.keys(h.writes[0][1]).length, 1);
});
