import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative, imports = {}, globals = {}) {
  const file = new URL(relative, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: file.pathname,
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, URL, process: { env: {} }, require: name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import ${name}`);
    return imports[name];
  }, ...globals }, { filename: file.pathname });
  return exports;
}

const clientPath = '../src/lib/releasePolicy.ts';
const serverPath = '../supabase/functions/_shared/sandbox-policy.ts';

test('sandbox client is off for production, unknown environments, and absent or malformed flags', () => {
  const { isSandboxUpgradeAllowed } = load(clientPath);
  for (const appEnv of [undefined, '', 'production', 'preview', 'Development']) {
    assert.equal(isSandboxUpgradeAllowed({ appEnv, enabled: 'true' }), false);
  }
  for (const enabled of [undefined, '', 'false', 'TRUE', '1']) {
    assert.equal(isSandboxUpgradeAllowed({ appEnv: 'development', enabled }), false);
  }
  assert.equal(isSandboxUpgradeAllowed({ appEnv: 'development', enabled: 'true' }), true);
});

test('server permits sandbox only with explicit development opt-in and development auth project', () => {
  const { isSandboxServerEnabled } = load(serverPath);
  const valid = { enabled: 'true', environment: 'development', projectId: 'edumentx-dev' };
  assert.equal(isSandboxServerEnabled(valid), true);
  for (const key of Object.keys(valid)) {
    assert.equal(isSandboxServerEnabled({ ...valid, [key]: undefined }), false);
  }
  for (const patch of [{ enabled: 'TRUE' }, { environment: 'production' }, { projectId: 'edumentx-prod' }]) {
    assert.equal(isSandboxServerEnabled({ ...valid, ...patch }), false);
  }
});

test('server sandbox configuration rejects live hosts, credentials-in-URL and non-test product codes', () => {
  const { isSandboxEsewaConfig } = load(serverPath);
  const valid = { formUrl: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form', statusUrl: 'https://rc.esewa.com.np/api/epay/transaction/status/', productCode: 'EPAYTEST' };
  assert.equal(isSandboxEsewaConfig(valid), true);
  assert.equal(isSandboxEsewaConfig({ ...valid, statusUrl: valid.statusUrl.replace('rc.esewa', 'uat.esewa') }), true);
  for (const patch of [
    { productCode: 'LIVE' }, { formUrl: valid.formUrl.replace('rc-epay', 'epay') },
    { statusUrl: valid.statusUrl.replace('rc.esewa', 'esewa') },
    { formUrl: `https://user:secret@rc-epay.esewa.com.np/api/epay/main/v2/form` },
    { statusUrl: `${valid.statusUrl}?redirect=https://example.invalid` },
    { formUrl: `${valid.formUrl}#ignored` }, { formUrl: 'not-a-url' },
  ]) assert.equal(isSandboxEsewaConfig({ ...valid, ...patch }), false);
});

test('disabled upgrade and success screens redirect before native hooks or repository subscriptions', () => {
  const redirect = Symbol('Redirect');
  const forbidden = () => { throw new Error('Disabled route executed a native hook'); };
  const imports = {
    'react/jsx-runtime': { jsx: (component, props) => ({ component, props }), jsxs: (component, props) => ({ component, props }) },
    'react': { useState: forbidden, useEffect: forbidden },
    'expo-router': { Redirect: redirect, useRouter: forbidden, useLocalSearchParams: forbidden },
    'react-native': { Platform: { select: () => '' } },
    '@expo/vector-icons': {}, 'react-native-safe-area-context': {}, 'react-native-webview': {},
    '@/components/shared/ScreenLayout': {}, '@/components/ui/PrimaryButton': {},
    '@/constants/colors': {}, '@/constants/theme': {}, '@/store/authStore': {},
    '@/services/subscription/dataSource': { getSubscriptionRepository: forbidden },
    '@/services/subscription/MockSubscriptionRepository': {}, '@/services/subscription/types': {},
    '@/lib/releasePolicy': load(clientPath),
  };
  for (const [path, name] of [['../src/screens/tutor/ProUpgradeScreen.tsx', 'ProUpgradeScreen'], ['../src/app/pro-success.tsx', 'default']]) {
    const result = load(path, imports)[name]();
    assert.equal(result.component, redirect);
    assert.equal(result.props.href, '/tutor_edit_profile');
  }
});

test('disabled mock purchase and direct demo grants cannot change the tier', async () => {
  const module = load('../src/services/subscription/MockSubscriptionRepository.ts', {
    '@/services/subscription/types': {}, '@/lib/releasePolicy': load(clientPath),
  });
  await assert.rejects(module.MockSubscriptionRepository.createEsewaOrder('monthly'), /Sandbox payments are disabled/);
  await assert.rejects(module.MockSubscriptionRepository.verifyEsewaCallback('synthetic'), /Sandbox payments are disabled/);
  await assert.rejects(module.applyDemoProGrant('sample', 1), /Sandbox payments are disabled/);
  assert.equal(await module.MockSubscriptionRepository.readTier('sample'), 'free');
});

test('disabled payment endpoint rejects order and verification before auth, provider requests or grants', async () => {
  let handler;
  const calls = [];
  const imports = {
    'jsr:@supabase/functions-js/edge-runtime.d.ts': {},
    '../_shared/esewa.ts': {},
    '../_shared/firebase-auth.ts': { verifyFirebaseJwt: () => calls.push('auth'), AuthError: class extends Error {} },
    '../_shared/firestore-rest.ts': {},
    '../../ai/utils/supabaseClient.ts': {},
    '../_shared/sandbox-policy.ts': load(serverPath),
  };
  load('../supabase/functions/create-esewa-order/index.ts', imports, {
    Deno: { serve: callback => { handler = callback; }, env: { get: () => undefined } },
    Response, Request, console: { error() {}, warn() {} },
  });
  for (const body of [{ plan: 'monthly' }, { verify: 'synthetic-callback' }]) {
    const response = await handler(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify(body) }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'Sandbox payments are disabled.');
  }
  assert.deepEqual(calls, []);
});

test('live subscription purchase methods stop before native auth or network while disabled', async () => {
  const calls = [];
  const repo = load('../src/services/subscription/FirebaseSubscriptionRepository.ts', {
    '@react-native-firebase/app': { getApp: () => calls.push('app') },
    '@react-native-firebase/auth': { getAuth: () => calls.push('auth') },
    '@react-native-firebase/firestore': {},
    '@/services/supabase/client': { getSupabase: () => calls.push('network') },
    '@/lib/releasePolicy': load(clientPath),
  }).FirebaseSubscriptionRepository;
  await assert.rejects(repo.createEsewaOrder('monthly'), /Sandbox payments are disabled/);
  await assert.rejects(repo.verifyEsewaCallback('synthetic'), /Sandbox payments are disabled/);
  assert.deepEqual(calls, []);
});
