import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkSetup } from './checkSetup.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'edumentx-setup-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (name, content) => {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), typeof content === 'string' ? content : JSON.stringify(content));
  };
  write('.nvmrc', '24.16.0\n');
  write('package.json', { dependencies: { expo: '~54.0.36' }, packageManager: 'npm@11.21.0' });
  write('package-lock.json', { lockfileVersion: 3, packages: { '': { dependencies: { expo: '~54.0.36' } } } });
  write('app.json', { expo: { android: { package: 'com.example.edumentx', googleServicesFile: './google-services.json' }, plugins: [['expo-build-properties', { android: { compileSdkVersion: 36 } }]] } });
  write('node_modules/expo/package.json', { version: '54.0.36' });
  write('node_modules/typescript/package.json', { version: '5.9.3' });
  write('node_modules/react-native/gradle/libs.versions.toml', '[versions]\nbuildTools = "36.0.0"\nndkVersion = "27.1.12297006"\n');
  return { root, write, options: { root, env: {}, nodeVersion: '24.16.0', npmVersion: '11.21.0' } };
}

test('source checks work without environment, Android SDK, or Apple configuration', t => {
  const { options } = fixture(t);
  const report = checkSetup(options);
  assert.equal(report.failures, 0);
  assert.equal(report.checks.some(item => item.id.startsWith('android.')), false);
});

test('missing installs and stale lock declarations fail source checks', t => {
  const { root, write, options } = fixture(t);
  rmSync(path.join(root, 'node_modules'), { recursive: true });
  write('package-lock.json', { lockfileVersion: 3, packages: { '': { dependencies: { expo: '~53.0.0' } } } });
  const failed = checkSetup(options).checks.filter(item => !item.ok).map(item => item.id);
  assert.ok(failed.includes('dependencies'));
  assert.ok(failed.includes('lockfile'));
});

test('wrong Node and npm majors are diagnosed before native setup', t => {
  const { options } = fixture(t);
  const failed = checkSetup({ ...options, nodeVersion: '20.19.4', npmVersion: '10.8.0' }).checks.filter(item => !item.ok).map(item => item.id);
  assert.deepEqual(failed, ['node', 'npm']);
});

test('Android configuration fails closed without printing supplied secret values', t => {
  const { write, options } = fixture(t);
  const secret = 'do-not-print-secret-value';
  write('.env', `EXPO_PUBLIC_SUPABASE_ANON_KEY=${secret}\nEXPO_PUBLIC_GOOGLE_MAPS_API_KEY=${secret}\nEXPO_PUBLIC_SUPABASE_URL=${secret}\n`);
  write('google-services.json', `{invalid ${secret}`);
  const report = checkSetup({ ...options, android: true, run: () => ({ status: 1, stdout: '', stderr: secret }) });
  assert.ok(report.failures > 0);
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.ok(report.checks.some(item => item.id === 'android.firebase' && !item.ok));
  assert.ok(report.checks.some(item => item.id === 'android.supabase-url' && !item.ok));
});

test('Android SDK and Firebase package matching are checked without requiring iOS files', t => {
  const { root, write, options } = fixture(t);
  write('sdk/platforms/android-36/android.jar', '');
  write('sdk/platform-tools/adb', '');
  write('sdk/build-tools/36.0.0/source.properties', '');
  write('sdk/ndk/27.1.12297006/source.properties', '');
  write('google-services.json', { project_info: { project_id: 'example-development' }, client: [{ client_info: { android_client_info: { package_name: 'com.example.edumentx' } } }] });
  write('.env', 'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co\nEXPO_PUBLIC_SUPABASE_ANON_KEY=public-client-key\nEXPO_PUBLIC_GOOGLE_MAPS_API_KEY=restricted-map-key\n');
  const report = checkSetup({ ...options, android: true, env: { ANDROID_HOME: path.join(root, 'sdk') }, run: () => ({ status: 0, stdout: '', stderr: 'openjdk version "17.0.13"' }) });
  assert.equal(report.failures, 0);
  write('google-services.json', { client: [{ client_info: { android_client_info: { package_name: 'com.other.app' } } }] });
  assert.ok(checkSetup({ ...options, android: true }).checks.some(item => item.id === 'android.firebase' && !item.ok));
});

test('native setup catches missing build tools and NDK instead of reporting SDK platform alone as ready', t => {
  const { root, write, options } = fixture(t);
  write('sdk/platforms/android-36/android.jar', '');
  const report = checkSetup({ ...options, android: true, env: { ANDROID_HOME: path.join(root, 'sdk') }, run: () => ({ status: 0, stderr: 'openjdk version "21.0.11"' }) });
  const failed = report.checks.filter(item => !item.ok).map(item => item.id);
  assert.ok(failed.includes('android.build-tools'));
  assert.ok(failed.includes('android.ndk'));
});

test('native setup rejects Java 25 unsupported by this Gradle wrapper', t => {
  const { options } = fixture(t);
  const report = checkSetup({ ...options, android: true, run: () => ({ status: 0, stderr: 'openjdk version "25.0.4"' }) });
  assert.ok(report.checks.some(item => item.id === 'android.java' && !item.ok));
});

test('shell environment takes precedence over local dotenv values', t => {
  const { write, options } = fixture(t);
  write('.env', 'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co\n');
  const report = checkSetup({ ...options, android: true, env: { EXPO_PUBLIC_SUPABASE_URL: '' }, run: () => ({ status: 1 }) });
  assert.ok(report.checks.some(item => item.id === 'android.supabase-url' && !item.ok));
});

test('checks never overwrite an existing local environment file', t => {
  const { root, write, options } = fixture(t);
  const original = 'EXPO_PUBLIC_SUPABASE_ANON_KEY=keep-my-value\n';
  write('.env', original);
  checkSetup({ ...options, android: true, run: () => ({ status: 1 }) });
  assert.equal(readFileSync(path.join(root, '.env'), 'utf8'), original);
});

test('backend dependency check is opt in and keeps deployed runtime separate from host Node', t => {
  const { write, options } = fixture(t);
  assert.equal(checkSetup(options).checks.some(item => item.id === 'backend.dependencies'), false);
  assert.ok(checkSetup({ ...options, backend: true }).checks.some(item => item.id === 'backend.dependencies' && !item.ok));
  write('functions/package.json', { engines: { node: '20' } });
  write('functions/node_modules/typescript/package.json', { version: '6.0.0' });
  assert.equal(checkSetup({ ...options, backend: true }).failures, 0);
});
