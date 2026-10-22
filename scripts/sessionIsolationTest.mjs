import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
const tick = async () => { for (let i = 0; i < 12; i += 1) await new Promise(resolve => setImmediate(resolve)); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function load(relative, imports = {}) {
  const url = new URL(relative, import.meta.url);
  if (!existsSync(url)) return {};
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, fileName: url.pathname,
  });
  // Use this realm: real Zustand checks `instanceof Promise` during hydration.
  // A separate VM realm would falsely treat our store's async reads as sync values.
  const evaluate = vm.runInThisContext(`(function(exports, require, console) {\n${outputText}\n})`, { filename: url.pathname });
  evaluate(exports, name => {
      if (Object.hasOwn(imports, name)) return imports[name];
      if (name === 'zustand' || name === 'zustand/middleware' || name === 'react/jsx-runtime') return require(name);
      throw new Error(`Unexpected runtime import: ${name}`);
    }, { log: () => {}, warn: () => {}, error: () => {} });
  return exports;
}
const { createAuthSessionGuard } = load('../src/lib/auth/sessionIsolation.ts');
const { useAuthStore } = load('../src/store/authStore.ts');

function authFixture() {
  assert.equal(typeof createAuthSessionGuard, 'function', 'real auth session guard exists');
  let uid = 'A';
  useAuthStore.setState({ user: { uid: 'A' }, role: 'admin', hasExistingRole: true, hasAdminProfile: true, tutorVerificationStatus: 'approved', isLoading: false });
  const owners = [];
  const guard = createAuthSessionGuard({
    currentUid: () => uid,
    onOwnerChange: next => {
      owners.push(next);
      useAuthStore.setState({ user: null, role: null, hasExistingRole: false, hasAdminProfile: false, tutorVerificationStatus: null, isLoading: next !== null });
    },
  });
  return { guard, owners, change: next => { uid = next; } };
}

test('UID switches synchronously clear cached role/profile state before delayed reads', async () => {
  const f = authFixture();
  const a = f.guard.begin('A');
  const oldRead = deferred();
  const pending = a.waitFor(oldRead.promise).then(() => useAuthStore.getState().setRole('admin')).catch(() => {});
  useAuthStore.setState({ role: 'admin', hasExistingRole: true, hasAdminProfile: true });
  f.change('B');
  const b = f.guard.begin('B');
  assert.equal(useAuthStore.getState().role, null);
  assert.equal(useAuthStore.getState().hasExistingRole, false);
  assert.equal(useAuthStore.getState().hasAdminProfile, false);
  assert.equal(useAuthStore.getState().tutorVerificationStatus, null);
  useAuthStore.getState().setRole('student');
  oldRead.resolve({ role: 'admin' });
  await pending;
  assert.equal(useAuthStore.getState().role, 'student');
  assert.equal(b.isCurrent(), true);
  assert.deepEqual(plain(f.owners), ['A', 'B']);
});

test('native UID changes invalidate old work even before the next listener callback', async () => {
  const f = authFixture();
  const a = f.guard.begin('A');
  f.change('B');
  assert.equal(a.isCurrent(), false);
  assert.equal(f.guard.begin('A'), null);
  await assert.rejects(a.waitFor(Promise.resolve('late tutor/admin read')));
});

test('same UID re-emits invalidate old reads without clearing a completed owner again', () => {
  const f = authFixture();
  const first = f.guard.begin('A');
  useAuthStore.getState().setRole('tutor');
  const latest = f.guard.begin('A');
  assert.equal(first.isCurrent(), false);
  assert.equal(latest.isCurrent(), true);
  assert.equal(useAuthStore.getState().role, 'tutor');
  assert.deepEqual(plain(f.owners), ['A']);
});

test('a blocked owner stays locally cleared when native signout fails or re-emits', async () => {
  const f = authFixture();
  const a = f.guard.begin('A');
  assert.equal(f.guard.block(a), true);
  assert.equal(a.isCurrent(), false);
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().hasExistingRole, false);
  assert.equal(f.guard.begin('A'), null, 'a failed native signout must not repopulate a blocked account');
  assert.equal(useAuthStore.getState().isLoading, false);
  f.change(null);
  assert.ok(f.guard.begin(null));
  f.change('B');
  assert.equal(f.guard.begin('B').isCurrent(), true);
});

test('disposing the auth subscription invalidates unfinished reads', async () => {
  const f = authFixture();
  const a = f.guard.begin('A');
  f.guard.dispose();
  assert.equal(a.isCurrent(), false);
  assert.equal(f.guard.begin('A'), null);
  await assert.rejects(a.waitFor(Promise.resolve('late')));
});

const message = text => ({ id: text, role: 'user', text, createdAt: new Date().toISOString() });
const key = uid => `edumentx-ai-chat:v2:${encodeURIComponent(uid)}`;
const cached = (uid, text, lastActivity = Date.now()) => JSON.stringify({ version: 2, state: {
  ownerUid: uid, messages: [message(text)], sessionId: `session-${uid}`, constraints: { subject: 'Maths' }, removedConstraints: ['gender'], lastActivity,
} });
function chatFixture({ delayedReads = false, entries = [] } = {}) {
  let uid = null;
  const data = new Map(entries);
  const reads = [];
  const requests = [];
  const writes = [];
  const removals = [];
  const storage = {
    getItem: name => {
      const pending = deferred();
      reads.push({ name, ...pending });
      return delayedReads ? pending.promise : Promise.resolve(data.get(name) ?? null);
    },
    setItem: async (name, value) => { writes.push([name, value]); data.set(name, value); },
    removeItem: async name => { removals.push(name); data.delete(name); },
  };
  const { useAiChatStore } = load('../src/store/aiChatStore.ts', {
    '@react-native-async-storage/async-storage': { default: storage },
    '@react-native-firebase/app': { getApp: () => ({}) },
    '@react-native-firebase/auth': { getAuth: () => ({ currentUser: uid === null ? null : { uid } }) },
    '@/services/ai/chatService': {
      sendChatMessage: (...args) => { const pending = deferred(); requests.push({ args, ...pending }); return pending.promise; },
      generateSessionId: () => 'fresh-session', ChatServiceError: class extends Error {},
    },
  });
  assert.equal(typeof useAiChatStore.getState().setOwnerUid, 'function', 'the real AI store binds explicit authenticated owners');
  return { store: useAiChatStore, data, reads, writes, removals, requests, change: next => { uid = next; } };
}

test('AI never auto-restores legacy unscoped history or sends while signed out', async () => {
  const f = chatFixture({ entries: [['edumentx-ai-chat', cached('A', 'legacy-private')]] });
  await tick();
  assert.equal(f.store.getState().messages.length, 0);
  assert.equal(f.reads.length, 0, 'no persisted conversation is read before its authenticated owner is known');
  f.store.getState().setOwnerUid(null);
  await f.store.getState().sendMessage('signed out');
  await tick();
  assert.equal(f.requests.length, 0);
  assert.equal(f.store.getState().messages.length, 0);
  assert.ok(f.removals.includes('edumentx-ai-chat'));
});

test('matching owner history resumes, while mismatched and expired cache is discarded', async () => {
  for (const [storedOwner, age, expected] of [['A', 0, ['private-A']], ['B', 0, []], ['A', 31 * 60 * 1000, []]]) {
    const f = chatFixture({ entries: [[key('A'), cached(storedOwner, 'private-A', Date.now() - age)]] });
    f.change('A');
    f.store.getState().setOwnerUid('A');
    await tick();
    assert.deepEqual(plain(f.store.getState().messages.map(item => item.text)), expected);
    assert.equal(f.store.getState().ownerUid, 'A');
    assert.equal(f.store.getState().hasHydrated, true);
  }
});

test('late A hydration cannot replace B history or mark a pending B hydration finished', async () => {
  const f = chatFixture({ delayedReads: true });
  f.change('A'); f.store.getState().setOwnerUid('A');
  f.change('B'); f.store.getState().setOwnerUid('B');
  assert.equal(f.store.getState().messages.length, 0);
  f.reads.find(read => read.name === key('A')).resolve(cached('A', 'private-A'));
  await tick();
  assert.equal(f.store.getState().hasHydrated, false);
  f.reads.find(read => read.name === key('B')).resolve(cached('B', 'private-B'));
  await tick();
  assert.deepEqual(plain(f.store.getState().messages.map(item => item.text)), ['private-B']);
  assert.ok(f.writes.every(([name, raw]) => JSON.parse(raw).state.ownerUid === (name === key('B') ? 'B' : 'A')));
});

test('reset during hydration cannot resurrect a previous conversation', async () => {
  const f = chatFixture({ delayedReads: true });
  f.change('A'); f.store.getState().setOwnerUid('A');
  f.store.getState().resetSession();
  f.reads[0].resolve(cached('A', 'discarded-before-reset'));
  await tick();
  assert.equal(f.store.getState().messages.length, 0);
  assert.equal(f.store.getState().sessionId, null);
  assert.equal(f.store.getState().hasHydrated, true);
});

test('reset after a storage read resolves still rejects the older middleware merge', async () => {
  const f = chatFixture({ delayedReads: true });
  f.change('A'); f.store.getState().setOwnerUid('A');
  f.reads[0].resolve(cached('A', 'discarded-in-continuation-gap'));
  let clearedAtReset = false;
  queueMicrotask(() => {
    f.store.getState().resetSession();
    clearedAtReset = f.store.getState().messages.length === 0;
  });
  await tick();
  assert.equal(clearedAtReset, true);
  assert.deepEqual(plain(f.store.getState().messages), []);
  assert.equal(f.store.getState().sessionId, null);
  assert.deepEqual(plain(f.store.getState().constraints), {});
  assert.deepEqual(plain(f.store.getState().removedConstraints), []);
  assert.equal(f.store.getState().hasHydrated, true);
  const saved = JSON.parse(f.data.get(key('A'))).state;
  assert.deepEqual(saved.messages, []);
  assert.equal(saved.sessionId, null);
  assert.deepEqual(saved.constraints, {});
  assert.deepEqual(saved.removedConstraints, []);
});

test('late assistant success or error cannot populate reset, signed-out or different-owner state', async () => {
  for (const transition of ['reset', 'signout', 'switch', 'native-only-switch']) {
    for (const fails of [false, true]) {
      const f = chatFixture();
      f.change('A'); f.store.getState().setOwnerUid('A'); await tick();
      const pending = f.store.getState().sendMessage('private-A');
      assert.equal(f.requests.length, 1);
      if (transition === 'reset') f.store.getState().resetSession();
      else if (transition === 'signout') { f.change(null); f.store.getState().setOwnerUid(null); }
      else if (transition === 'switch') { f.change('B'); f.store.getState().setOwnerUid('B'); await tick(); }
      else f.change('B');
      const before = plain(f.store.getState().messages);
      if (fails) f.requests[0].reject(new Error('late-private-A-error'));
      else f.requests[0].resolve({ content: 'late-private-A-response', session_id: 'private-A-session', state: { constraints: { subject: 'private-A' } } });
      await pending;
      assert.deepEqual(plain(f.store.getState().messages), before);
      assert.equal(f.store.getState().error, null);
    }
  }
});

test('current owner AI sends keep context bounded and reconcile legitimate responses', async () => {
  const f = chatFixture();
  f.change('A'); f.store.getState().setOwnerUid('A'); await tick();
  f.store.setState({ messages: Array.from({ length: 8 }, (_, i) => message(`earlier-${i}`)) });
  const pending = f.store.getState().sendMessage('current');
  assert.deepEqual(plain(f.requests[0].args[3].recent_messages.map(item => item.text)), ['earlier-2', 'earlier-3', 'earlier-4', 'earlier-5', 'earlier-6', 'earlier-7']);
  f.requests[0].resolve({ content: 'current answer', session_id: 'current-session', state: { constraints: { subject: 'Maths' } } });
  await pending; await tick();
  assert.equal(f.store.getState().messages.at(-1).text, 'current answer');
  assert.equal(f.store.getState().sessionId, 'current-session');
  assert.equal(f.store.getState().isLoading, false);
  assert.equal(JSON.parse(f.data.get(key('A'))).state.messages.length, 6);
});

function rootFixture(t, { signout } = {}) {
  const chat = chatFixture();
  const auth = { currentUser: null };
  const reads = [];
  const effects = [];
  const cleanups = [];
  let listener;
  const notices = [];
  useAuthStore.getState().reset();
  const selectAuth = selector => selector(useAuthStore.getState());
  selectAuth.getState = useAuthStore.getState;
  selectAuth.setState = useAuthStore.setState;
  const { default: RootLayout } = load('../src/app/_layout.tsx', {
    '../../global.css': {},
    '@react-native-firebase/app': { getApp: () => ({}) },
    '@react-native-firebase/auth': {
      getAuth: () => auth,
      onAuthStateChanged: (_auth, next) => { listener = next; return () => {}; },
      signOut: signout ?? (async () => { throw new Error('synthetic native signout failure'); }),
    },
    '@react-native-firebase/firestore': {
      getFirestore: () => ({}), doc: (_db, ...path) => path.join('/'),
      getDoc: path => { const pending = deferred(); reads.push({ path, ...pending }); return pending.promise; },
      setDoc: async () => {}, serverTimestamp: () => 'synthetic-time',
    },
    '@/constants/colors': { colors: { text: { primary: 'token' } } },
    'expo-splash-screen': { preventAutoHideAsync: async () => {}, hideAsync: async () => {} },
    'expo-router': { Stack: Object.assign('Stack', { Screen: 'Screen' }), useRouter: () => ({ replace: () => {} }), useSegments: () => [], useRootNavigationState: () => ({ key: 'mounted' }) },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    react: { useCallback: callback => callback, useRef: value => ({ current: value }), useEffect: callback => effects.push(callback) },
    'react-native': { ActivityIndicator: 'ActivityIndicator', View: 'View', StatusBar: 'NativeStatusBar', Alert: { alert: (...args) => notices.push(args) } },
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureHandlerRootView' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    '@/components/notifications/InAppNotificationBar': { InAppNotificationBar: 'InAppNotificationBar' },
    '@/constants/theme': { theme: { colors: { background: 'token' } } },
    '@/services/notifications/pushService': { initPushForUser: () => {}, stopInboxSync: () => {} },
    '@/store/authStore': { useAuthStore: selectAuth },
    '@/store/aiChatStore': { useAiChatStore: chat.store },
    '@/lib/auth/sessionIsolation': { createAuthSessionGuard },
  });
  RootLayout();
  for (const effect of effects) { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup); }
  t.after(() => { for (const cleanup of cleanups) cleanup(); });
  const snapshot = value => ({ exists: () => value !== null, data: () => value ?? undefined });
  return {
    chat, reads, notices,
    emit: uid => {
      auth.currentUser = uid === null ? null : { uid, email: `${uid}@example.invalid`, emailVerified: true, providerData: [] };
      chat.change(uid);
      return listener(auth.currentUser);
    },
    resolve: (path, value) => { const read = reads.find(item => item.path === path && !item.done); assert.ok(read, `missing read ${path}`); read.done = true; read.resolve(snapshot(value)); },
    reject: path => { const read = reads.find(item => item.path === path && !item.done); assert.ok(read, `missing read ${path}`); read.done = true; read.reject(new Error('late synthetic profile failure')); },
  };
}
async function finishStudent(f, uid) {
  f.resolve(`users/${uid}`, { uid, role: 'student' }); await tick();
  f.resolve(`admins/${uid}`, null); await tick();
}

test('the real root listener checks again when UID switches between await continuations', async t => {
  const f = rootFixture(t);
  const old = f.emit('A');
  f.resolve('users/A', { uid: 'A', role: 'admin' });
  let latest;
  queueMicrotask(() => { latest = f.emit('B'); });
  await tick();
  assert.equal(useAuthStore.getState().user.uid, 'B');
  assert.equal(useAuthStore.getState().role, null);
  assert.equal(f.reads.some(read => read.path === 'admins/A'), false);
  await finishStudent(f, 'B'); await Promise.all([old, latest]);
  assert.equal(useAuthStore.getState().role, 'student');
});

test('the real root admin profile helper cannot grant A flags to B', async t => {
  const f = rootFixture(t);
  const old = f.emit('A');
  f.resolve('users/A', { uid: 'A', role: 'student' }); await tick();
  f.resolve('admins/A', { uid: 'A' }); await tick();
  assert.ok(f.reads.some(read => read.path === 'users/A/adminProfile/default'));
  const latest = f.emit('B');
  assert.equal(useAuthStore.getState().hasAdminProfile, false);
  assert.equal(f.chat.store.getState().ownerUid, 'B');
  await finishStudent(f, 'B');
  f.resolve('users/A/adminProfile/default', { fullName: 'Private administrator A' });
  await Promise.all([old, latest]);
  assert.equal(useAuthStore.getState().user.uid, 'B');
  assert.equal(useAuthStore.getState().role, 'student');
  assert.equal(useAuthStore.getState().hasAdminProfile, false);
});

test('the real root tutor helper ignores old successful and failed reads after B finishes', async t => {
  for (const fails of [false, true]) {
    const f = rootFixture(t);
    const old = f.emit('A');
    f.resolve('users/A', { uid: 'A', role: 'tutor' }); await tick();
    f.resolve('admins/A', null); await tick();
    const latest = f.emit('B');
    f.resolve('users/B', { uid: 'B', role: 'tutor' }); await tick();
    f.resolve('admins/B', null); await tick();
    f.resolve('users/B/tutorProfile/default', { verificationStatus: 'approved', isVerifiedProfessional: true, hasPendingUpdate: false, rejectionReason: null });
    await latest;
    if (fails) f.reject('users/A/tutorProfile/default');
    else f.resolve('users/A/tutorProfile/default', { verificationStatus: 'pending' });
    await old;
    assert.equal(useAuthStore.getState().user.uid, 'B');
    assert.equal(useAuthStore.getState().tutorVerificationStatus, 'approved');
    assert.equal(useAuthStore.getState().isLoading, false);
  }
});

test('the real root keeps a suspended owner locked when native signout rejects', async t => {
  const f = rootFixture(t);
  const blocked = f.emit('A');
  f.resolve('users/A', { uid: 'A', role: 'admin', status: 'suspended' });
  await blocked;
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().role, null);
  assert.equal(useAuthStore.getState().hasExistingRole, false);
  assert.equal(f.chat.store.getState().ownerUid, null);
  assert.equal(f.chat.store.getState().messages.length, 0);
  await f.emit('A');
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(f.reads.filter(read => read.path === 'users/A').length, 1);
  const next = f.emit('B'); await finishStudent(f, 'B'); await next;
  assert.equal(useAuthStore.getState().user.uid, 'B');
  assert.equal(useAuthStore.getState().role, 'student');
});
