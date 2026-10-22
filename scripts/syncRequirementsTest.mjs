import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { syncRequirements } from './syncRequirements.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'edumentx-requirements-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), typeof value === 'string' ? value : JSON.stringify(value));
  };
  const app = { engines: { node: '>=24 <25', npm: '>=11 <12' }, packageManager: 'npm@11.21.0', dependencies: { expo: '~54.0.36', 'react-native': '0.81.5' }, devDependencies: { typescript: '~5.9.2' } };
  const backend = { engines: { node: '20' }, dependencies: { 'firebase-admin': '^13.6.0' } };
  const lockFor = (manifest, versions) => ({ lockfileVersion: 3, packages: { '': manifest, ...Object.fromEntries(Object.entries(versions).map(([name, version]) => [`node_modules/${name}`, { version }])) } });
  const appLock = lockFor(app, { expo: '54.0.36', 'react-native': '0.81.5', typescript: '5.9.3' });
  const backendLock = lockFor(backend, { 'firebase-admin': '13.10.0' });
  write('.nvmrc', '24.16.0\n');
  write('app.json', { expo: { plugins: [['expo-build-properties', { android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 24 } }]] } });
  write('package.json', app);
  write('package-lock.json', appLock);
  write('functions/package.json', backend);
  write('functions/package-lock.json', backendLock);
  return { root, write, app, appLock, backendLock };
}

test('inventory contains exact locked versions and no pip installable entries', t => {
  const { root } = fixture(t);
  assert.equal(syncRequirements({ root }).ok, true);
  const contents = readFileSync(path.join(root, 'requirements.txt'), 'utf8');
  assert.match(contents, /^# typescript@5\.9\.3$/m);
  assert.match(contents, /^# firebase-admin@13\.10\.0$/m);
  assert.doesNotMatch(contents, /typescript@~/);
  assert.ok(contents.split('\n').every(line => line.trim() === '' || line.startsWith('#')));
  assert.equal(syncRequirements({ root, check: true }).ok, true);
});

test('check detects stale inventory without rewriting it', t => {
  const { root, write } = fixture(t);
  write('requirements.txt', '# stale\n');
  assert.equal(syncRequirements({ root, check: true }).ok, false);
  assert.equal(readFileSync(path.join(root, 'requirements.txt'), 'utf8'), '# stale\n');
});

test('check detects missing inventory without creating a file', t => {
  const { root } = fixture(t);
  assert.equal(syncRequirements({ root, check: true }).ok, false);
  assert.throws(() => readFileSync(path.join(root, 'requirements.txt')), { code: 'ENOENT' });
});

test('manifest and lock declaration mismatch fails instead of fabricating versions', t => {
  const { root, write, appLock } = fixture(t);
  appLock.packages[''].dependencies = { expo: '~53.0.0' };
  write('package-lock.json', appLock);
  assert.throws(() => syncRequirements({ root }), /declarations differ/);
  assert.throws(() => readFileSync(path.join(root, 'requirements.txt')), { code: 'ENOENT' });
});

test('missing direct dependency version fails rather than silently omitting a package', t => {
  const { root, write, appLock } = fixture(t);
  delete appLock.packages['node_modules/expo'];
  write('package-lock.json', appLock);
  assert.throws(() => syncRequirements({ root, check: true }), /expo.*missing or invalid/);
});

test('an exact resolved version outside the declared range fails', t => {
  const { root, write, appLock } = fixture(t);
  appLock.packages['node_modules/expo'].version = '55.0.0';
  write('package-lock.json', appLock);
  assert.throws(() => syncRequirements({ root }), /expo.*does not satisfy/);
});

test('missing backend lockfile cannot produce an apparently complete inventory', t => {
  const { root } = fixture(t);
  rmSync(path.join(root, 'functions/package-lock.json'));
  assert.throws(() => syncRequirements({ root }), /functions\/package-lock.json/);
});

test('an incompatible caret range below version one fails closed', t => {
  const { root, write, app, appLock } = fixture(t);
  app.dependencies.expo = '^0.2.3';
  appLock.packages[''].dependencies.expo = '^0.2.3';
  appLock.packages['node_modules/expo'].version = '0.3.0';
  write('package.json', app);
  write('package-lock.json', appLock);
  assert.throws(() => syncRequirements({ root }), /expo.*does not satisfy/);
});

test('range-shaped resolved versions cannot masquerade as exact pins', t => {
  const { root, write, appLock } = fixture(t);
  appLock.packages['node_modules/expo'].version = '~54.0.36';
  write('package-lock.json', appLock);
  assert.throws(() => syncRequirements({ root }), /expo.*missing or invalid/);
});

test('CLI check returns failure on drift without changing the inventory', t => {
  const { root, write } = fixture(t);
  write('requirements.txt', '# stale\n');
  mkdirSync(path.join(root, 'scripts'));
  copyFileSync(new URL('./syncRequirements.mjs', import.meta.url), path.join(root, 'scripts/syncRequirements.mjs'));
  const result = spawnSync(process.execPath, ['scripts/syncRequirements.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(readFileSync(path.join(root, 'requirements.txt'), 'utf8'), '# stale\n');
});

test('unrecognized lockfile format cannot pass as a verified dependency inventory', t => {
  const { root, write, appLock } = fixture(t);
  delete appLock.lockfileVersion;
  write('package-lock.json', appLock);
  assert.throws(() => syncRequirements({ root }), /lockfile version/);
});
