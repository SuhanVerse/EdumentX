#!/usr/bin/env node
// Local source/helper/emulator verification only. No installs, native builds or cloud actions.
import { spawn } from 'node:child_process';
import { stat, mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SWIFT_REPO = join(homedir(), 'Projects', 'EdumentX-iOS');
const USAGE = 'Usage: node scripts/verifyLocal.mjs [--swift-repo <trusted-checkout>]';
const LIMIT = 'Local source/helper/demo-emulator checks only; native compilation, devices, live/deployed state, signing and stores remain unverified.';

// Keep this explicit. Never accept package-script names or commands from the CLI.
export const LOCAL_SCRIPTS = Object.freeze([
  'setup:check', 'test:setup', 'requirements:check', 'test:requirements',
  'typecheck', 'lint', 'test:derived', 'test:lint-rules', 'test:discovery',
  'test:tutor-feed', 'test:motion', 'test:release-config', 'test:verify-local',
  'test:auth-recovery', 'test:push-lifecycle', 'test:push-payload',
  'test:messages-repository', 'test:session-isolation', 'test:sandbox',
]);
const RULE_SUITES = [
  'rulesEmulationTest', 'batchesRulesTest', 'acceptRequestRulesTest', 'messagesRulesTest',
  'reviewsListRulesTest', 'removeEnrollmentRulesTest', 'tutorDetailsRulesTest', 'userRulesTest',
];

export function parseArgs(args) {
  if (args.length === 0) return {};
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length === 2 && args[0] === '--swift-repo' && args[1].trim() && !args[1].startsWith('-') && !args[1].includes('\0')) {
    return { swiftRepo: args[1] };
  }
  throw new Error(USAGE);
}

async function isFile(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

// Child output is discarded. Only the fixed git revision probe captures a bounded value.
function executeLocal({ command, args, cwd, env, capture = false }) {
  return new Promise(resolveResult => {
    let stdout = '';
    const child = spawn(command, args, { cwd, env, shell: false, timeout: 15 * 60 * 1000, stdio: ['ignore', capture ? 'pipe' : 'ignore', 'ignore'] });
    child.stdout?.on('data', data => { if (stdout.length < 128) stdout += data.toString().slice(0, 128 - stdout.length); });
    child.once('error', error => resolveResult({ exitCode: null, missing: error.code === 'ENOENT' }));
    child.once('close', exitCode => resolveResult({ exitCode, stdout }));
  });
}

async function cachedFirestore(root, env) {
  try {
    // Read the installed CLI's artifact name so a missing jar never triggers its auto-download.
    const metadata = JSON.parse(await readFile(join(root, 'node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json'), 'utf8'));
    const name = metadata.firestore?.downloadPathRelativeToCacheDir;
    if (typeof name !== 'string' || basename(name) !== name || !/^cloud-firestore-emulator-v[\d.]+\.jar$/.test(name)) return null;
    const cache = env.FIREBASE_EMULATORS_PATH || join(homedir(), '.cache/firebase/emulators');
    const jar = resolve(cache, name);
    return await isFile(jar) ? jar : null;
  } catch { return null; }
}

export async function runLocalVerification({
  root = ROOT, swiftRepo = DEFAULT_SWIFT_REPO, execute = executeLocal,
  env = process.env, log = console.log,
} = {}) {
  root = resolve(root);
  swiftRepo = resolve(swiftRepo);
  const started = performance.now();
  const steps = [];
  let requiredFailure = false;
  const elapsed = start => Math.max(0, Math.round(performance.now() - start));
  const record = (name, status, exitCode = null, durationMs = 0) => {
    steps.push({ name, status, exitCode, durationMs });
    log(`${name}: ${status}${exitCode === null ? '' : ` (exit ${exitCode})`} [${durationMs}ms]`);
  };
  async function invoke(command) {
    try { return await execute(command); } catch { return { exitCode: null }; }
  }
  async function runStep(name, command) {
    const start = performance.now();
    const result = await invoke(command);
    const exitCode = Number.isInteger(result?.exitCode) && result.exitCode >= 0 ? result.exitCode : null;
    const status = result?.missing ? 'notrun' : exitCode === 0 ? 'passed' : 'failed';
    if (status !== 'passed') requiredFailure = true;
    record(name, status, exitCode, elapsed(start));
  }

  const revisionStarted = performance.now();
  const revisionResult = await invoke({ command: 'git', args: ['rev-parse', '--verify', 'HEAD'], cwd: root, env, capture: true });
  const candidate = typeof revisionResult?.stdout === 'string' ? revisionResult.stdout.trim() : '';
  const revision = revisionResult?.exitCode === 0 && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(candidate) ? candidate : null;
  if (!revision) requiredFailure = true;
  record('source-revision', revision ? 'passed' : 'notrun', Number.isInteger(revisionResult?.exitCode) && revisionResult.exitCode >= 0 ? revisionResult.exitCode : null, elapsed(revisionStarted));
  const worktreeStarted = performance.now();
  const worktree = await invoke({ command: 'git', args: ['status', '--porcelain=v1', '--untracked-files=normal'], cwd: root, env, capture: true });
  const sourceDirty = worktree?.exitCode === 0 && typeof worktree?.stdout === 'string' ? worktree.stdout.length > 0 : null;
  if (sourceDirty === null) requiredFailure = true;
  record('source-worktree', sourceDirty === null ? 'notrun' : 'passed', Number.isInteger(worktree?.exitCode) ? worktree.exitCode : null, elapsed(worktreeStarted));
  // Existing helper package scripts invoke npx tsc. Require installed tools first to avoid installs.
  const localTools = await isFile(join(root, 'node_modules/.bin/tsc')) && await isFile(join(root, 'node_modules/.bin/eslint'));
  const localEnv = { ...env, CI: '1', npm_config_offline: 'true', npm_config_yes: 'false', npm_config_update_notifier: 'false' };
  if (!localTools) {
    requiredFailure = true;
    log('Existing local TypeScript/ESLint tools are required; no dependency installation was attempted.');
  }
  for (const name of LOCAL_SCRIPTS) {
    if (localTools) await runStep(name, { command: 'npm', args: ['run', name], cwd: root, env: localEnv });
    else record(name, 'notrun');
  }

  const firebase = join(root, 'node_modules/.bin/firebase');
  const jar = await cachedFirestore(root, env);
  if (!await isFile(firebase) || !jar) {
    requiredFailure = true;
    log('Existing local Firebase CLI and its cached Firestore emulator are required; no download was attempted.');
    record('rules-demo-emulator', 'notrun');
  } else {
    const scratch = await mkdtemp(join(tmpdir(), 'edumentx-local-rules-'));
    try {
      const config = join(scratch, 'firebase.json');
      await writeFile(config, JSON.stringify({
        firestore: { rules: join(root, 'firebase/firestore.rules'), indexes: join(root, 'firebase/firestore.indexes.json') },
        emulators: { firestore: { host: '127.0.0.1', port: 8080 }, ui: { enabled: false }, singleProjectMode: true },
      }));
      // Isolate CLI account/usage configuration. Never inherit a production host/project or auth file.
      const rulesEnv = {
        ...localEnv, XDG_CONFIG_HOME: join(scratch, 'config'),
        RULES_TEST_PROJECT: 'demo-edumentx', RULES_TEST_HOST: 'http://127.0.0.1:8080',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        GCLOUD_PROJECT: 'demo-edumentx', GOOGLE_CLOUD_PROJECT: 'demo-edumentx',
        FIRESTORE_EMULATOR_BINARY_PATH: jar,
      };
      for (const key of ['FIREBASE_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE', 'FIREBASE_CONFIG']) delete rulesEnv[key];
      await runStep('rules-demo-emulator', {
        command: firebase,
        args: [
          'emulators:exec', '--only', 'firestore', '--project', 'demo-edumentx', '--non-interactive',
          '--config', config, RULE_SUITES.map(name => `node scripts/${name}.mjs`).join(' && '),
        ],
        cwd: root, env: rulesEnv,
      });
    } finally { await rm(scratch, { recursive: true, force: true }); }
  }

  const swiftCheck = join(swiftRepo, 'scripts/check.sh');
  if (await isFile(swiftCheck)) {
    await runStep('swift-source-core', { command: 'bash', args: [swiftCheck], cwd: swiftRepo, env: localEnv });
  } else {
    log('Optional trusted Swift checkout was not found; its checks were not run.');
    record('swift-source-core', 'notrun');
  }
  // Do not probe/download an Apple SDK or confuse its absence with failing Linux source tests.
  record('native-device-live-store', 'pending');
  const report = {
    revision, sourceDirty, limit: LIMIT,
    status: steps.some(step => step.status === 'failed') ? 'failed' : steps.some(step => step.status === 'notrun') ? 'incomplete' : 'passed',
    durationMs: elapsed(started), steps,
  };
  const directory = join(root, '.expo/release-check');
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, 'latest.json.tmp');
  await writeFile(temporary, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, join(directory, 'latest.json'));
  log(`Local verification: ${report.status}. ${LIMIT}`);
  log('Sanitized evidence: .expo/release-check/latest.json');
  return { exitCode: requiredFailure ? 1 : 0, report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log(`${USAGE}\nRuns fixed local checks using installed tools. The optional Swift checkout must be trusted. No native build or release readiness claim.`);
    else process.exitCode = (await runLocalVerification(options)).exitCode;
  } catch {
    console.error(`${USAGE}\nLocal verification could not complete; no readiness result is established.`);
    process.exitCode = 1;
  }
}
