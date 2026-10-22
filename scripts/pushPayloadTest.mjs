import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const compiled = ts.transpileModule(readFileSync(new URL("../functions/src/index.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadTriggers({ tickets = [{ status: "ok", id: "ticket-1" }] } = {}) {
  const sent = [], logs = [];
  const builder = {
    region() { return this; }, runWith() { return this; },
    firestore: { document() { return { onCreate: (fn) => fn, onUpdate: (fn) => fn, onDelete: (fn) => fn }; } },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    fetch: async (_url, options) => {
      sent.push(...JSON.parse(options.body));
      return { ok: true, json: async () => ({ data: tickets }) };
    },
    require(name) {
      if (name === "firebase-functions/v1") return builder;
      if (name === "firebase-functions/logger") return {
        info: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args),
      };
      if (name === "firebase-admin/app") return { initializeApp() {} };
      if (name === "firebase-admin/firestore") return {
        getFirestore: () => ({ doc: (path) => ({ get: async () => ({
          get: (key) => key === "pushTokens" ? ["ExpoPushToken[phone]"] : "PRIVATE TUTOR NAME",
          data: () => path.startsWith("conversations/") ? {
            participantA: "sender-a", participantB: "recipient-b", meta: { "sender-a": { name: "PRIVATE SENDER NAME" } },
          } : {},
        }) }) }),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { ...exports, sent, logs };
}

test("all remote notifications keep private message, identity and scheduling content out of OS payloads", async () => {
  const triggers = loadTriggers();
  await triggers.onNewChatMessage({ exists: true, data: () => ({ senderId: "sender-a", text: "PRIVATE MESSAGE CONTENT", status: "sent" }) }, {
    params: { conversationId: "conversation-1", messageId: "message-1" },
  });
  await triggers.onEnrollmentRequestCreated({ data: () => ({ studentUid: "student-c", studentName: "PRIVATE STUDENT NAME", pickedSlotKeys: ["tue:7-9"] }) }, {
    params: { tutorUid: "recipient-tutor", requestId: "request-1" },
  });
  await triggers.onEnrollmentRequestDecided({ before: { data: () => ({ status: "pending" }) }, after: { data: () => ({ status: "accepted", studentUid: "student-c", slotKey: "tue:7-9" }) } }, {
    params: { tutorUid: "recipient-tutor", requestId: "request-1" },
  });
  await triggers.onEnrollmentRequestDeleted({ data: () => ({ studentUid: "student-c", studentName: "PRIVATE STUDENT NAME", status: "pending" }) }, {
    params: { tutorUid: "recipient-tutor", requestId: "request-1" },
  });
  assert.equal(triggers.sent.length, 4);
  assert.deepEqual(triggers.sent.map((payload) => payload.data.recipientUid), ["recipient-b", "recipient-tutor", "student-c", "student-c"]);
  for (const payload of triggers.sent) {
    assert.equal(payload.title, "EdumentX");
    assert.match(payload.body, /Open EdumentX/i);
    assert.doesNotMatch(JSON.stringify(payload), /PRIVATE|7.9|Tue/i);
    assert.equal(payload.channelId, "inbox");
  }
});

test("a missing Expo ticket response cannot be reported as accepted", async () => {
  const triggers = loadTriggers({ tickets: null });
  await triggers.onEnrollmentRequestCreated({ data: () => ({ studentUid: "student-c" }) }, {
    params: { tutorUid: "recipient-tutor", requestId: "request-1" },
  });
  assert.equal(triggers.sent.length, 1);
  assert.equal(triggers.logs.some(([message]) => /tickets accepted/.test(message)), false);
});
