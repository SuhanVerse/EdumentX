import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../src/components/motion/useMotionPreference.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

// Run the actual preference store with React/native boundaries replaced. This
// checks subscription/race behavior without importing the mobile native runtime.
function createStore() {
  const reads = [];
  const handlers = [];
  let added = 0;
  let removed = 0;
  const AccessibilityInfo = {
    addEventListener(name, handler) {
      assert.equal(name, "reduceMotionChanged");
      added += 1;
      handlers.push(handler);
      return { remove() { removed += 1; } };
    },
    isReduceMotionEnabled() {
      return new Promise((resolve, reject) => reads.push({ resolve, reject }));
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "react") {
        return {
          useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) =>
            ({ subscribe, getSnapshot, getServerSnapshot }),
        };
      }
      if (name === "react-native") return { AccessibilityInfo };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return {
    ...exports.useMotionPreference(),
    reads,
    handlers,
    get added() { return added; },
    get removed() { return removed; },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test("waits for the initial preference and shares one native listener", async () => {
  const store = createStore();
  assert.equal(store.getSnapshot(), true);
  assert.equal(store.getServerSnapshot(), true);
  let updates = 0;
  const stopA = store.subscribe(() => updates++);
  const stopB = store.subscribe(() => updates++);
  assert.equal(store.added, 1);
  assert.equal(store.reads.length, 1);
  store.reads[0].resolve(false);
  await flush();
  assert.equal(store.getSnapshot(), false);
  assert.equal(updates, 2);
  stopA();
  assert.equal(store.removed, 0);
  stopB();
  assert.equal(store.removed, 1);
});

test("responds to live preference changes in both directions without duplicate updates", async () => {
  const store = createStore();
  let updates = 0;
  const stop = store.subscribe(() => updates++);
  store.reads[0].resolve(true);
  await flush();
  store.handlers[0](false);
  assert.equal(store.getSnapshot(), false);
  store.handlers[0](true);
  assert.equal(store.getSnapshot(), true);
  store.handlers[0](false);
  assert.equal(store.getSnapshot(), false, "motion can be re-enabled without restarting");
  store.handlers[0](false);
  assert.equal(updates, 3);
  stop();
});

test("a late initial read cannot overwrite a newer native event", async () => {
  const store = createStore();
  const stop = store.subscribe(() => {});
  store.handlers[0](true);
  store.reads[0].resolve(false);
  await flush();
  assert.equal(store.getSnapshot(), true);
  stop();
});

test("an initial read from a removed subscription cannot affect the next one", async () => {
  const store = createStore();
  store.subscribe(() => {})();
  const stop = store.subscribe(() => {});
  store.reads[0].resolve(false);
  await flush();
  assert.equal(store.getSnapshot(), true);
  store.reads[1].resolve(false);
  await flush();
  assert.equal(store.getSnapshot(), false);
  stop();
  assert.equal(store.added, 2);
  assert.equal(store.removed, 2);
});

test("a queued callback from a removed listener cannot publish into a new subscription", async () => {
  const store = createStore();
  store.subscribe(() => {})();
  const stop = store.subscribe(() => {});
  store.reads[1].resolve(false);
  await flush();
  store.handlers[0](true);
  assert.equal(store.getSnapshot(), false);
  stop();
});

test("remounting waits for a fresh preference after all consumers detach", async () => {
  const store = createStore();
  const stop = store.subscribe(() => {});
  store.reads[0].resolve(false);
  await flush();
  assert.equal(store.getSnapshot(), false);
  stop();
  assert.equal(store.getSnapshot(), true, "detached state does not retain permission to animate");
  const stopAgain = store.subscribe(() => {});
  assert.equal(store.getSnapshot(), true, "remain still before the new read settles");
  store.reads[1].resolve(true);
  await flush();
  assert.equal(store.getSnapshot(), true);
  stopAgain();
});

test("a failed native read keeps the conservative preference and still accepts events", async () => {
  const store = createStore();
  const stop = store.subscribe(() => {});
  store.reads[0].reject(new Error("Native preference unavailable"));
  await flush();
  assert.equal(store.getSnapshot(), true);
  store.handlers[0](false);
  assert.equal(store.getSnapshot(), false);
  stop();
});
