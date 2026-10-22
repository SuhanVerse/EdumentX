import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const implementation = new URL('./verifyLocal.mjs', import.meta.url);
const { runLocalVerification, parseArgs } = existsSync(implementation) ? await import(implementation) : {};

async function fixture(t, options = {}) {
  assert.equal(typeof runLocalVerification, 'function', 'the fixed local runner is implemented');
  const root = await mkdtemp(join(tmpdir(), 'edumentx-verify-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const swiftRepo = join(root, 'native client');
  const cache = join(root, 'emulator-cache');
  await mkdir(join(root, 'node_modules/.bin'), { recursive: true });
  for (const tool of ['tsc', 'eslint', 'firebase']) await writeFile(join(root, 'node_modules/.bin', tool), 'existing fixture tool');
  await mkdir(join(root, 'node_modules/firebase-tools/lib/emulator'), { recursive: true });
  await writeFile(join(root, 'node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json'), JSON.stringify({ firestore: { downloadPathRelativeToCacheDir: 'cloud-firestore-emulator-v1.22.0.jar' } }));
  await mkdir(cache);
  await writeFile(join(cache, 'cloud-firestore-emulator-v1.22.0.jar'), 'cached fixture emulator');
  if (!options.missingSwift) {
    await mkdir(join(swiftRepo, 'scripts'), { recursive: true });
    await writeFile(join(swiftRepo, 'scripts/check.sh'), '# synthetic fixture; never executed\n');
  }
  const calls = [];
  const output = [];
  const execute = async command => {
    calls.push(command);
    if (command.command === 'git') return { exitCode: 0, stdout: command.args[0] === 'status' ? (options.dirty ? ' M synthetic\n' : '') : 'a'.repeat(40) + '\n' };
    return options.execute ? options.execute(command) : { exitCode: 0 };
  };
  const run = () => runLocalVerification({
    root, swiftRepo, execute, log: line => output.push(line),
    env: { PATH: process.env.PATH, FIREBASE_EMULATORS_PATH: cache, ...options.env },
  });
  return { root, swiftRepo, cache, calls, output, run };
}

test('fixed local commands run sequentially and write sanitized local evidence', async t => {
  const f = await fixture(t);
  const result = await f.run();
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.status, 'passed');
  const npmCalls = f.calls.filter(call => call.command === 'npm');
  assert.deepEqual(npmCalls.map(call => call.args), [
    ['run', 'typecheck'], ['run', 'lint'], ['run', 'test:derived'],
    ['run', 'test:lint-rules'], ['run', 'test:discovery'], ['run', 'test:tutor-feed'],
    ['run', 'test:motion'], ['run', 'test:release-config'], ['run', 'test:verify-local'],
    ['run', 'test:auth-recovery'], ['run', 'test:push-lifecycle'], ['run', 'test:push-payload'],
    ['run', 'test:messages-repository'], ['run', 'test:session-isolation'], ['run', 'test:sandbox'],
  ]);
  for (const command of f.calls) assert.equal(command.cwd, command.command === 'bash' ? f.swiftRepo : f.root);
  const report = JSON.parse(await readFile(join(f.root, '.expo/release-check/latest.json'), 'utf8'));
  assert.deepEqual(report, result.report);
  assert.equal(report.revision, 'a'.repeat(40));
  assert.match(report.limit, /native.*live.*store/i);
  assert.deepEqual(Object.keys(report).sort(), ['durationMs', 'limit', 'revision', 'sourceDirty', 'status', 'steps']);
  for (const step of report.steps) {
    assert.deepEqual(Object.keys(step).sort(), ['durationMs', 'exitCode', 'name', 'status']);
    assert.ok(Number.isInteger(step.durationMs) && step.durationMs >= 0);
  }
  assert.equal(report.steps.find(step => step.name === 'native-device-live-store').status, 'pending');
});

test('working-tree evidence distinguishes uncommitted source without recording file paths', async t => {
  const f = await fixture(t, { dirty: true });
  const result = await f.run();
  assert.equal(result.report.sourceDirty, true);
  assert.equal(result.exitCode, 0);
  assert.doesNotMatch(JSON.stringify(result.report), /synthetic/);
});

test('a failed local command remains failed while later independent checks still run', async t => {
  const f = await fixture(t, { execute: command => ({ exitCode: command.args.includes('typecheck') ? 9 : 0, stdout: 'DO_NOT_PRINT_PRIVATE_OUTPUT' }) });
  const result = await f.run();
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.status, 'failed');
  assert.deepEqual(result.report.steps.find(step => step.name === 'typecheck'), {
    name: 'typecheck', status: 'failed', exitCode: 9,
    durationMs: result.report.steps.find(step => step.name === 'typecheck').durationMs,
  });
  assert.ok(f.calls.some(call => call.command === 'bash'));
  assert.doesNotMatch(JSON.stringify(result.report) + f.output.join('\n'), /DO_NOT_PRINT_PRIVATE_OUTPUT/);
});

test('spawn failures and thrown executor errors never leak tool errors or become passes', async t => {
  for (const failure of ['missing', 'throw', 'signal']) {
    const f = await fixture(t, { execute: command => {
      if (command.command !== 'npm') return { exitCode: 0 };
      if (failure === 'throw') throw new Error('PRIVATE_ENV_OR_CREDENTIAL');
      return failure === 'missing' ? { exitCode: null, missing: true, stderr: 'PRIVATE_ENV_OR_CREDENTIAL' } : { exitCode: null };
    } });
    const result = await f.run();
    assert.equal(result.exitCode, 1);
    assert.ok(result.report.steps.filter(step => step.name === 'typecheck').every(step => step.status !== 'passed'));
    assert.doesNotMatch(JSON.stringify(result.report) + f.output.join('\n'), /PRIVATE_ENV_OR_CREDENTIAL/);
  }
});

test('rules execution is pinned to local demo data despite inherited production overrides', async t => {
  let emulatorConfig;
  const f = await fixture(t, { env: {
    RULES_TEST_PROJECT: 'production-project', RULES_TEST_HOST: 'https://production.example',
    FIRESTORE_EMULATOR_HOST: 'production.example:443', FIREBASE_TOKEN: 'PRIVATE_TOKEN',
    GOOGLE_APPLICATION_CREDENTIALS: '/private/service-account.json',
    FIRESTORE_EMULATOR_BINARY_PATH: '/unreviewed/override',
  }, execute: async command => {
    if (command.command.endsWith('/node_modules/.bin/firebase')) {
      emulatorConfig = JSON.parse(await readFile(command.args[command.args.indexOf('--config') + 1], 'utf8'));
    }
    return { exitCode: 0 };
  } });
  await f.run();
  const command = f.calls.find(call => call.command.endsWith('/node_modules/.bin/firebase'));
  assert.ok(command, 'the installed local Firebase CLI is selected');
  assert.deepEqual(command.args.slice(0, 6), ['emulators:exec', '--only', 'firestore', '--project', 'demo-edumentx', '--non-interactive']);
  assert.equal(command.env.RULES_TEST_PROJECT, 'demo-edumentx');
  assert.equal(command.env.RULES_TEST_HOST, 'http://127.0.0.1:8080');
  assert.equal(command.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(command.env.FIREBASE_TOKEN, undefined);
  assert.equal(command.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  assert.equal(command.env.FIRESTORE_EMULATOR_BINARY_PATH, join(f.cache, 'cloud-firestore-emulator-v1.22.0.jar'));
  assert.deepEqual(emulatorConfig, {
    firestore: { rules: join(f.root, 'firebase/firestore.rules'), indexes: join(f.root, 'firebase/firestore.indexes.json') },
    emulators: { firestore: { host: '127.0.0.1', port: 8080 }, ui: { enabled: false }, singleProjectMode: true },
  });
  assert.equal(existsSync(command.env.XDG_CONFIG_HOME), false, 'temporary CLI configuration is removed');
  assert.deepEqual(command.args.at(-1).split(' && '), [
    'node scripts/rulesEmulationTest.mjs', 'node scripts/batchesRulesTest.mjs',
    'node scripts/acceptRequestRulesTest.mjs', 'node scripts/messagesRulesTest.mjs',
    'node scripts/reviewsListRulesTest.mjs', 'node scripts/removeEnrollmentRulesTest.mjs',
    'node scripts/tutorDetailsRulesTest.mjs', 'node scripts/userRulesTest.mjs',
  ]);
  assert.ok(f.calls.every(call => !call.args.some(arg => /^(?:deploy(?::.*)?|smoke:.*|seed:.*|backfill(?::.*)?|test:rules(?::deployed)?|eas)$/.test(arg))));
});

test('missing local TypeScript prevents npm helpers from fetching a replacement', async t => {
  const f = await fixture(t);
  await rm(join(f.root, 'node_modules/.bin/tsc'));
  const result = await f.run();
  assert.equal(result.exitCode, 1);
  assert.equal(f.calls.filter(call => call.command === 'npm').length, 0);
  assert.equal(result.report.steps.find(step => step.name === 'typecheck').status, 'notrun');
});

test('a missing cached emulator never launches Firebase or downloads it', async t => {
  const f = await fixture(t);
  await rm(join(f.cache, 'cloud-firestore-emulator-v1.22.0.jar'));
  const result = await f.run();
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.steps.find(step => step.name === 'rules-demo-emulator').status, 'notrun');
  assert.ok(f.calls.every(call => !call.command.endsWith('/node_modules/.bin/firebase')));
});

test('an absent optional Swift checkout is notrun while native evidence stays pending', async t => {
  const f = await fixture(t, { missingSwift: true });
  const result = await f.run();
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.status, 'incomplete');
  assert.equal(result.report.steps.find(step => step.name === 'swift-source-core').status, 'notrun');
  assert.equal(result.report.steps.find(step => step.name === 'native-device-live-store').status, 'pending');
  assert.ok(f.calls.every(call => call.command !== 'bash'));
});

test('Swift invokes only its Linux check script and a failing source check fails the runner', async t => {
  const f = await fixture(t, { execute: command => ({ exitCode: command.command === 'bash' ? 4 : 0 }) });
  const result = await f.run();
  const command = f.calls.find(call => call.command === 'bash');
  assert.deepEqual(command.args, [join(f.swiftRepo, 'scripts/check.sh')]);
  assert.equal(result.report.steps.find(step => step.name === 'swift-source-core').exitCode, 4);
  assert.equal(result.exitCode, 1);
  assert.ok(f.calls.every(call => !call.args.includes('build-ios.sh') && !call.args.includes('sdk') && !call.args.includes('--release')));
});

test('untrusted revision output is discarded rather than written into evidence', async t => {
  const f = await fixture(t);
  const result = await runLocalVerification({
    root: f.root, swiftRepo: f.swiftRepo, env: { FIREBASE_EMULATORS_PATH: f.cache }, log: () => {},
    execute: async command => command.command === 'git' ? { exitCode: 0, stdout: 'PRIVATE_BRANCH_OR_ENV' } : { exitCode: 0 },
  });
  assert.equal(result.report.revision, null);
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.status, 'incomplete');
  assert.equal(result.report.steps.find(step => step.name === 'source-revision').status, 'notrun');
  assert.doesNotMatch(JSON.stringify(result.report), /PRIVATE_BRANCH_OR_ENV/);
});

test('verification subprocesses are awaited so suites never overlap', async t => {
  let active = 0;
  let maxActive = 0;
  const f = await fixture(t, { execute: async () => {
    active += 1;
    maxActive = Math.max(active, maxActive);
    await new Promise(resolve => setImmediate(resolve));
    active -= 1;
    return { exitCode: 0 };
  } });
  assert.equal((await f.run()).exitCode, 0);
  assert.equal(maxActive, 1);
});

test('CLI accepts only help and one explicit trusted Swift checkout path', () => {
  assert.equal(typeof parseArgs, 'function', 'the fixed CLI parser is implemented');
  assert.deepEqual(parseArgs([]), {});
  assert.deepEqual(parseArgs(['--help']), { help: true });
  assert.deepEqual(parseArgs(['--swift-repo', '/trusted/native client']), { swiftRepo: '/trusted/native client' });
  for (const args of [ ['--command', 'curl'], ['typecheck'], ['--swift-repo'], ['--swift-repo', '--help'], ['--swift-repo', 'a', '--swift-repo', 'b'], ['--help', 'anything'] ]) {
    assert.throws(() => parseArgs(args), /Usage:/);
  }
});
