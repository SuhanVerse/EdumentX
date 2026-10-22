import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const source = readFileSync(new URL("../src/services/firebase/authService.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function loadAuth({ resetError, detach = async () => {}, googleWebClientId } = {}) {
  const events = [];
  let googleConfiguration;
  const auth = { currentUser: { uid: "account-a" } };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleWebClientId } },
    console: { warn() {} },
    require(name) {
      if (name === "@react-native-firebase/app") return { getApp: () => ({}) };
      if (name === "@react-native-firebase/auth") return {
        getAuth: () => auth,
        sendPasswordResetEmail: async (instance, email) => {
          assert.equal(instance, auth);
          events.push(["reset", email]);
          if (resetError) throw resetError;
        },
        fetchSignInMethodsForEmail() { throw new Error("Recovery must not query account providers"); },
        signOut: async (instance) => {
          assert.equal(instance, auth);
          events.push(["signOut"]);
          auth.currentUser = null;
        },
      };
      if (name === "@react-native-google-signin/google-signin") return {
        GoogleSignin: { configure(configuration) { googleConfiguration = configuration; } },
      };
      if (name === "@/services/notifications/pushService") return {
        detachPushForUser: async (uid) => { events.push(["detach", uid]); await detach(); },
        initPushForUser: (uid) => events.push(["resume", uid]),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { ...exports, auth, events, googleConfiguration };
}

test("a clone can configure its own public Google web client without editing app source", () => {
  const service = loadAuth({ googleWebClientId: "  clone-client.apps.googleusercontent.com  " });
  assert.equal(service.googleConfiguration.webClientId, "clone-client.apps.googleusercontent.com");
});

test("an absent or blank override preserves the original project's Google configuration", () => {
  for (const googleWebClientId of [undefined, "", "   "]) {
    const service = loadAuth({ googleWebClientId });
    assert.equal(service.googleConfiguration.webClientId,
      "343719549266-ue4i8d19kqel7sobu6vqheuqftdogndv.apps.googleusercontent.com");
  }
});

test("password recovery sends the trimmed address without looking up providers", async () => {
  const service = loadAuth();
  assert.equal(typeof service.requestPasswordReset, "function", "A password user needs an email reset API");
  assert.equal(await service.requestPasswordReset("  student@example.test  "), undefined);
  assert.deepEqual(service.events, [["reset", "student@example.test"]]);
});

test("unknown account recovery has the same result as a registered email", async () => {
  const existing = loadAuth();
  const unknown = loadAuth({ resetError: { code: "auth/user-not-found", message: "Private account lookup result" } });
  assert.equal(typeof unknown.requestPasswordReset, "function");
  assert.equal(await unknown.requestPasswordReset("unknown@example.test"), await existing.requestPasswordReset("known@example.test"));
});

test("password recovery gives safe retryable errors and never exposes backend messages", async () => {
  for (const [code, expected] of [
    ["auth/network-request-failed", /connection/i],
    ["auth/too-many-requests", /wait/i],
    ["auth/invalid-email", /email address/i],
    ["unexpected-private-code", /try again/i],
  ]) {
    const service = loadAuth({ resetError: { code, message: "SECRET account/token details" } });
    assert.equal(typeof service.requestPasswordReset, "function");
    await assert.rejects(service.requestPasswordReset("student@example.test"), (error) => {
      assert.match(error.message, expected);
      assert.doesNotMatch(error.message, /SECRET|token details|unexpected-private-code/);
      return true;
    });
  }
});

test("concurrent logout calls share one task and await push detachment before Firebase signout", async () => {
  const cleanup = deferred();
  const service = loadAuth({ detach: () => cleanup.promise });
  const first = service.logout();
  const second = service.logout();
  assert.equal(first, second, "Repeated logout must not race token cleanup");
  assert.deepEqual(service.events, [["detach", "account-a"]]);
  cleanup.resolve();
  await first;
  assert.deepEqual(service.events, [["detach", "account-a"], ["signOut"], ["resume", null]]);
});

test("failed token detachment leaves the original account signed in for retry", async () => {
  const service = loadAuth({ detach: async () => { throw new Error("offline"); } });
  await assert.rejects(service.logout());
  assert.equal(service.auth.currentUser.uid, "account-a");
  assert.equal(service.events.some(([event]) => event === "signOut"), false);
});

test("logout cannot sign out a different account that appeared during cleanup", async () => {
  const cleanup = deferred();
  const service = loadAuth({ detach: () => cleanup.promise });
  const task = service.logout();
  service.auth.currentUser = { uid: "account-b" };
  cleanup.resolve();
  await assert.rejects(task);
  assert.equal(service.auth.currentUser.uid, "account-b");
});

// Exercise the real screen handlers with React/native rendering boundaries
// replaced, so recovery cannot accidentally depend on entering a password.
function loadScreen(resetRequest) {
  const states = [];
  let cursor = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const compiledScreen = ts.transpileModule(readFileSync(new URL("../src/screens/auth/EmailSignUp.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiledScreen, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
        },
        useRef(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = { current: initial };
          return states[index];
        },
      };
      if (name === "react-native") return {
        ActivityIndicator: "ActivityIndicator", Alert: { alert() {} }, KeyboardAvoidingView: "KeyboardAvoidingView",
        Platform: { OS: "android" }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", TextInput: "TextInput", View: "View",
      };
      if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
      if (name === "@/components/motion") return {
        AnimatedPressable: "Pressable", usePressScale: () => ({}),
        FieldShell: (props) => props.children({ onFocus() {}, onBlur() {} }),
      };
      if (name === "@/components/shared/ScreenLayout") return { ScreenLayout: "ScreenLayout" };
      if (name === "@/components/ui/PrimaryButton") return { PrimaryButton: "PrimaryButton" };
      if (name === "@/constants/colors") return { colors: { brand: {}, text: {} } };
      if (name === "@/lib/motion") return { motion: { scale: {} } };
      if (name === "@/services/firebase/authService") return { requestPasswordReset: resetRequest };
      if (name === "@/services/firebase/errors") return { formatFirebaseError: () => "Safe error", authErrorSuggestsModeFlip: () => null };
      if (name === "@/store/authStore") return { useAuthStore: { getState: () => ({}) } };
      throw new Error(`Unexpected screen dependency: ${name}`);
    },
  });
  function expand(node) {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== "object") return node;
    if (typeof node.type === "function") return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props.children) } };
  }
  function render() { cursor = 0; return expand(exports.EmailSignUp()); }
  const text = (node) => Array.isArray(node) ? node.map(text).join("") : typeof node === "string" ? node : node && typeof node === "object" ? text(node.props.children) : "";
  function find(node, predicate) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean) ?? null;
    return predicate(node) ? node : find(node.props.children, predicate);
  }
  return { render, find, text };
}

test("login recovery sends with an empty password, guards duplicate taps and returns to login", async () => {
  const request = deferred();
  const addresses = [];
  const screen = loadScreen((email) => { addresses.push(email); return request.promise; });
  let tree = screen.render();
  screen.find(tree, (node) => node.type === "Pressable" && screen.text(node) === "Log in").props.onPress();
  tree = screen.render();
  const recovery = screen.find(tree, (node) => node.type === "Pressable" && screen.text(node) === "Forgot password?");
  assert(recovery, "The login screen must expose password recovery");
  recovery.props.onPress();
  tree = screen.render();
  assert.equal(screen.find(tree, (node) => node.type === "TextInput" && node.props.secureTextEntry), null);
  screen.find(tree, (node) => node.type === "TextInput").props.onChangeText(" student@example.test ");
  tree = screen.render();
  const send = screen.find(tree, (node) => node.type === "PrimaryButton");
  assert.equal(send.props.disabled, false, "Recovery must not depend on the forgotten password");
  const first = send.props.onPress();
  const second = send.props.onPress();
  assert.equal(addresses.length, 1);
  request.resolve();
  await Promise.all([first, second]);
  tree = screen.render();
  assert.match(screen.text(tree), /If an account/i);
  assert.doesNotMatch(screen.text(tree), /account (exists|not found)/i);
  screen.find(tree, (node) => node.type === "Pressable" && screen.text(node) === "Back to log in").props.onPress();
  assert(screen.find(screen.render(), (node) => node.type === "PrimaryButton" && node.props.label === "Log in"));
});
