import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const compiled = ts.transpileModule(readFileSync(new URL("../src/services/notifications/pushService.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiledAuth = ts.transpileModule(readFileSync(new URL("../src/services/firebase/authService.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function createPush({ tokenRead, writeGate, removeError, channelGate, platform = "android" } = {}) {
  const events = [];
  const auth = { currentUser: { uid: "account-a" } };
  const stored = new Map([["account-a", new Set(["ExpoPushToken[this-phone]", "ExpoPushToken[other-phone]"])]]);
  let foreground, response, rotation, snapshot;
  const timers = new Set();
  const permission = { status: "granted", canAskAgain: true };
  const notifications = {
    AndroidImportance: { DEFAULT: 3 },
    DEFAULT_ACTION_IDENTIFIER: "default",
    setNotificationHandler: (value) => { foreground = value; },
    setNotificationChannelAsync: async () => { if (channelGate) await channelGate.promise; },
    getPermissionsAsync: async () => permission,
    requestPermissionsAsync: async () => permission,
    getExpoPushTokenAsync: async (options) => {
      events.push(["token", options?.devicePushToken?.data ?? "initial"]);
      if (tokenRead) return await tokenRead.promise;
      return { data: options?.devicePushToken ? "ExpoPushToken[rotated]" : "ExpoPushToken[this-phone]", type: "expo" };
    },
    setNotificationCategoryAsync: async () => {},
    addNotificationResponseReceivedListener: (handler) => {
      response = handler;
      return { remove: () => { events.push(["stop-response"]); } };
    },
    addPushTokenListener: (handler) => {
      rotation = handler;
      return { remove: () => { events.push(["stop-rotation"]); } };
    },
    dismissAllNotificationsAsync: async () => { events.push(["dismiss-all"]); },
    clearLastNotificationResponseAsync: async () => { events.push(["clear-response"]); },
    cancelAllScheduledNotificationsAsync: async () => { events.push(["cancel-scheduled"]); },
    scheduleNotificationAsync: async (value) => { events.push(["schedule", value]); return "notice-1"; },
    dismissNotificationAsync: async () => {},
  };
  const transform = (kind) => (...values) => ({ kind, values });
  async function write(ref, data, removing) {
    events.push([removing ? "remove-start" : "write-start", ref.uid]);
    if (removing && removeError) throw removeError;
    if (!removing && writeGate) await writeGate.promise;
    const values = stored.get(ref.uid) ?? new Set();
    for (const value of data.pushTokens.values) {
      if (data.pushTokens.kind === "remove") values.delete(value);
      else values.add(value);
    }
    stored.set(ref.uid, values);
    events.push([removing ? "remove-done" : "write-done", ref.uid]);
  }
  const exports = {};
  runInNewContext(compiled, {
    exports,
    setTimeout: (handler) => { timers.add(handler); return handler; },
    clearTimeout: (handler) => { timers.delete(handler); },
    console: { warn() {} },
    require(name) {
      if (name === "@react-native-firebase/app") return { getApp: () => ({}) };
      if (name === "@react-native-firebase/auth") return { getAuth: () => auth };
      if (name === "@react-native-firebase/firestore") return {
        getFirestore: () => ({}), doc: (_db, _collection, uid) => ({ uid }),
        collection: (_db, _collection, uid) => ({ uid }), where: () => ({}), query: (...args) => args,
        arrayUnion: transform("union"), arrayRemove: transform("remove"),
        setDoc: (ref, data) => write(ref, data, false), updateDoc: (ref, data) => write(ref, data, true),
        onSnapshot: (_query, handler) => { snapshot = handler; return () => { events.push(["stop-inbox"]); }; },
      };
      if (name === "expo-constants") return { __esModule: true, default: { expoConfig: { extra: { eas: { projectId: "project-id" } } } } };
      if (name === "expo-device") return { isDevice: true };
      if (name === "expo-notifications") return notifications;
      if (name === "expo-router") return { router: { push: (route) => events.push(["navigate", route]) } };
      if (name === "react-native") return { AppState: { currentState: "background" }, Platform: { OS: platform } };
      if (name === "@/lib/verification/notifications") return { markNotificationRead: async (uid, id) => { events.push(["read", uid, id]); } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return {
    ...exports, auth, events, stored, permission,
    foreground: (data) => foreground.handleNotification({ request: { content: { data } } }),
    response: (uid, action = "default") => response({ actionIdentifier: action, notification: { request: { content: { data: { recipientUid: uid, notificationId: "notification-1" } } } } }),
    rotate: (token) => rotation({ type: "android", data: token }),
    snapshot: (docs) => snapshot({ docs: docs.map(([id, data]) => ({ id, data: () => data })) }),
    expireTimers: () => { for (const handler of [...timers]) handler(); },
  };
}

function createLogout(push) {
  const exports = {};
  runInNewContext(compiledAuth, {
    exports,
    require(name) {
      if (name === "@react-native-firebase/app") return { getApp: () => ({}) };
      if (name === "@react-native-firebase/auth") return {
        getAuth: () => push.auth,
        signOut: async () => { push.events.push(["signOut"]); push.auth.currentUser = null; },
      };
      if (name === "@react-native-google-signin/google-signin") return { GoogleSignin: { configure() {} } };
      if (name === "@/services/notifications/pushService") return push;
      throw new Error(`Unexpected auth dependency: ${name}`);
    },
  });
  return exports.logout;
}

test("logout invalidates pending token acquisition before it can write and removes its device token", async () => {
  const tokenRead = deferred();
  const push = createPush({ tokenRead });
  push.initPushForUser("account-a");
  await tick();
  assert.equal(typeof push.detachPushForUser, "function", "Explicit logout needs an awaitable token detach");
  const detached = push.detachPushForUser("account-a");
  tokenRead.resolve({ data: "ExpoPushToken[this-phone]", type: "expo" });
  await detached;
  assert.equal(push.events.some(([event]) => event === "write-start"), false);
  assert.deepEqual([...push.stored.get("account-a")], ["ExpoPushToken[other-phone]"]);
});

test("detachment waits for an already-started write before removing only this phone", async () => {
  const writeGate = deferred();
  const push = createPush({ writeGate });
  push.initPushForUser("account-a");
  await tick();
  assert.equal(typeof push.detachPushForUser, "function");
  const detached = push.detachPushForUser("account-a");
  await tick();
  assert.equal(push.events.some(([event]) => event === "remove-start"), false);
  writeGate.resolve();
  await detached;
  assert(push.events.findIndex(([event]) => event === "write-done") < push.events.findIndex(([event]) => event === "remove-start"));
  assert.deepEqual([...push.stored.get("account-a")], ["ExpoPushToken[other-phone]"]);
});

test("token removal failure rejects explicit detachment instead of silently completing", async () => {
  const push = createPush({ removeError: new Error("offline") });
  push.initPushForUser("account-a");
  await tick();
  assert.equal(typeof push.detachPushForUser, "function");
  await assert.rejects(push.detachPushForUser("account-a"));
});

test("web logout without a native token does not write a user document", async () => {
  const push = createPush({ platform: "web" });
  push.initPushForUser("account-a");
  assert.equal(typeof push.detachPushForUser, "function");
  await push.detachPushForUser("account-a");
  assert.equal(push.events.some(([event]) => event === "remove-start"), false);
});

test("rotation uses the native event token without recursively reacquiring it and detaches both local tokens", async () => {
  const push = createPush();
  push.initPushForUser("account-a");
  await tick();
  assert.equal(typeof push.rotate, "function");
  assert.doesNotThrow(() => push.rotate("native-token-2"), "A token rotation listener must be installed");
  await tick();
  assert.equal(push.events.filter(([event]) => event === "token").length, 2);
  assert.deepEqual(push.events.filter(([event]) => event === "token")[1], ["token", "native-token-2"]);
  assert.equal(typeof push.detachPushForUser, "function");
  await push.detachPushForUser("account-a");
  assert.deepEqual([...push.stored.get("account-a")], ["ExpoPushToken[other-phone]"]);
});

test("an account switch prevents old pending registration from writing for either account", async () => {
  const tokenRead = deferred();
  const push = createPush({ tokenRead });
  push.initPushForUser("account-a");
  await tick();
  push.auth.currentUser = { uid: "account-b" };
  push.initPushForUser("account-b");
  tokenRead.resolve({ data: "ExpoPushToken[this-phone]", type: "expo" });
  await tick();
  assert.equal(push.events.some(([event, uid]) => event === "write-start" && uid === "account-a"), false);
});

test("responses and foreground banners reject a different recipient and signed-out sessions", async () => {
  const push = createPush();
  push.initPushForUser("account-a");
  await tick();
  push.response("account-b", "mark_read");
  push.response("account-b");
  const hidden = await push.foreground({ recipientUid: "account-b" });
  assert.equal(hidden.shouldShowBanner, false);
  assert.equal(push.events.some(([event]) => event === "read" || event === "navigate"), false);
  push.response("account-a", "mark_read");
  assert.equal(push.events.some(([event]) => event === "read"), true);
  push.auth.currentUser = null;
  push.response("account-a");
  assert.equal((await push.foreground({ recipientUid: "account-a" })).shouldShowBanner, false);
  assert.equal(push.events.some(([event]) => event === "navigate"), false);
});

test("an old inbox callback cannot schedule a notification after teardown", async () => {
  const push = createPush();
  push.initPushForUser("account-a");
  await tick();
  const oldSnapshot = push.snapshot;
  oldSnapshot([]);
  push.stopInboxSync();
  oldSnapshot([["late", { title: "Private title", body: "Private body" }]]);
  await tick();
  assert.equal(push.events.some(([event]) => event === "schedule"), false);
});

test("a layout re-init cannot restart registration while explicit logout is detaching", async () => {
  const writeGate = deferred();
  const push = createPush({ writeGate });
  push.initPushForUser("account-a");
  await tick();
  const detached = push.detachPushForUser("account-a");
  push.initPushForUser("account-a");
  writeGate.resolve();
  await detached;
  await tick();
  assert.equal(push.events.filter(([event]) => event === "write-start").length, 1);
  assert.deepEqual([...push.stored.get("account-a")], ["ExpoPushToken[other-phone]"]);
});

test("offline pending writes give a retryable detach rejection instead of an unbounded logout", async () => {
  const writeGate = deferred();
  const push = createPush({ writeGate });
  push.initPushForUser("account-a");
  await tick();
  let outcome = "pending";
  const detached = push.detachPushForUser("account-a").then(() => { outcome = "resolved"; }, () => { outcome = "rejected"; });
  push.expireTimers();
  await tick();
  assert.equal(outcome, "rejected");
  assert.equal(push.auth.currentUser.uid, "account-a");
  writeGate.resolve();
  await detached;
});

test("local OS notifications also keep private inbox content inside the authenticated app", async () => {
  const push = createPush();
  push.initPushForUser("account-a");
  await tick();
  push.snapshot([]);
  push.snapshot([["new", { title: "PRIVATE TITLE", body: "PRIVATE MESSAGE" }]]);
  await tick();
  const scheduled = push.events.find(([event]) => event === "schedule");
  assert(scheduled);
  assert.equal(scheduled[1].content.title, "EdumentX");
  assert.doesNotMatch(JSON.stringify(scheduled[1]), /PRIVATE/);
  assert.equal(scheduled[1].content.data.recipientUid, "account-a");
});

test("failed registration followed by denied permission still removes acquired tokens before logout", async () => {
  const writeGate = deferred();
  const push = createPush({ writeGate });
  push.initPushForUser("account-a");
  await tick();
  writeGate.reject(new Error("temporary registration write failure"));
  await tick();
  push.permission.status = "denied";
  push.permission.canAskAgain = false;
  push.initPushForUser("account-a");
  await tick();
  await createLogout(push)();
  assert.deepEqual([...push.stored.get("account-a")], ["ExpoPushToken[other-phone]"]);
  assert.equal(push.events.filter(([event]) => event === "remove-done").length, 1);
  assert(push.events.findIndex(([event]) => event === "remove-done") < push.events.findIndex(([event]) => event === "signOut"));
  assert.equal(push.auth.currentUser, null);
});

test("after failed registration and permission denial, an actual removal failure still blocks logout", async () => {
  const writeGate = deferred();
  const push = createPush({ writeGate, removeError: new Error("cleanup offline") });
  push.initPushForUser("account-a");
  await tick();
  writeGate.reject(new Error("temporary registration write failure"));
  await tick();
  push.permission.status = "denied";
  push.permission.canAskAgain = false;
  push.initPushForUser("account-a");
  await tick();
  await assert.rejects(createLogout(push)());
  assert.equal(push.events.filter(([event]) => event === "remove-start").length, 1, "Known candidates must reach the removal boundary");
  assert.equal(push.events.some(([event]) => event === "signOut"), false);
  assert.equal(push.auth.currentUser.uid, "account-a");
});

test("failure before token acquisition cannot permanently latch logout without current-process token writes", async () => {
  const tokenRead = deferred();
  const push = createPush({ tokenRead });
  push.initPushForUser("account-a");
  await tick();
  tokenRead.reject(new Error("token acquisition unavailable"));
  await tick();
  push.permission.status = "denied";
  push.permission.canAskAgain = false;
  push.initPushForUser("account-a");
  await tick();
  await createLogout(push)();
  assert.equal(push.events.some(([event]) => event === "write-start" || event === "remove-start"), false);
  assert.equal(push.auth.currentUser, null);
});
