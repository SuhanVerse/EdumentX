import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = filename => {
  try { return JSON.parse(readFileSync(filename, 'utf8')); } catch { return null; }
};

// Read only public client settings; do not expand shell commands or interpolate secrets.
function readClientEnvironment(filename) {
  let source;
  try { source = readFileSync(filename, 'utf8'); } catch { return {}; }
  const result = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(EXPO_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    result[match[1]] = value;
  }
  return result;
}

function supplied(value) {
  return typeof value === 'string' && value.trim().length > 0 && !/^(?:<|your[_ -]|replace[_ -]|changeme)/i.test(value.trim());
}

/** Read-only local checks. No installs, network requests, sign-in, or file writes. */
export function checkSetup({
  root = repository, env = process.env, nodeVersion = process.versions.node,
  npmVersion, android = false, backend = false, run = spawnSync,
} = {}) {
  const checks = [];
  const notes = [];
  const check = (id, ok, message) => checks.push({ id, ok: Boolean(ok), message });
  const manifest = readJson(path.join(root, 'package.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  let expectedNode;
  try { expectedNode = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim(); } catch { expectedNode = ''; }
  const nodeMajor = Number(nodeVersion.split('.')[0]);
  check('node', expectedNode && nodeMajor === Number(expectedNode.split('.')[0]), 'Node matches the major version in .nvmrc; run nvm install && nvm use.');
  const expectedNpm = manifest?.packageManager?.match(/^npm@(\d+)/)?.[1] || '11';
  const actualNpm = npmVersion ?? run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { encoding: 'utf8', timeout: 10_000 }).stdout?.trim();
  check('npm', Number(actualNpm?.split('.')[0]) === Number(expectedNpm), 'npm matches the documented major version; use the npm bundled with the pinned Node release.');
  const lockRoot = lock?.packages?.[''];
  const declarationMatches = field => JSON.stringify(Object.entries(manifest?.[field] || {}).sort()) === JSON.stringify(Object.entries(lockRoot?.[field] || {}).sort());
  check('lockfile', manifest && lock?.lockfileVersion >= 2 && lockRoot && declarationMatches('dependencies') && declarationMatches('devDependencies'), 'package.json and package-lock.json declarations agree; install with npm ci.');
  check('dependencies', existsSync(path.join(root, 'node_modules/expo/package.json')) && existsSync(path.join(root, 'node_modules/typescript/package.json')), 'Local Expo and TypeScript dependencies exist; run npm ci if missing.');
  notes.push('Source checks need no .env, Apple tools, signing files, or cloud credentials. Use --android before a local Android build.');

  if (android) {
    const app = readJson(path.join(root, 'app.json'))?.expo;
    const values = { ...readClientEnvironment(path.join(root, '.env')), ...env };
    const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
    const javaResult = run(java, ['-version'], { encoding: 'utf8', timeout: 10_000 });
    const javaMajor = Number(`${javaResult.stdout || ''}\n${javaResult.stderr || ''}`.match(/version\s+"(\d+)/)?.[1]);
    check('android.java', javaResult.status === 0 && javaMajor >= 17 && javaMajor <= 24, 'JDK 17–24 is available for Gradle 8.14; JDK 21 is recommended and also runs the rules emulator. Set JAVA_HOME accordingly.');
    const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'Android', 'Sdk');
    const compileSdk = app?.plugins?.find(item => Array.isArray(item) && item[0] === 'expo-build-properties')?.[1]?.android?.compileSdkVersion;
    check('android.sdk', Number.isInteger(compileSdk) && existsSync(path.join(sdk, 'platforms', `android-${compileSdk}`, 'android.jar')), 'The Android SDK platform selected by app.json is installed; set ANDROID_HOME and use Android Studio SDK Manager.');
    check('android.adb', existsSync(path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')), 'Android SDK Platform-Tools is installed. Start an emulator or connect an authorized USB device before npm run android.');
    let androidVersions = '';
    try { androidVersions = readFileSync(path.join(root, 'node_modules/react-native/gradle/libs.versions.toml'), 'utf8'); } catch { /* npm ci supplies the catalog. */ }
    const buildTools = androidVersions.match(/^buildTools\s*=\s*"([\d.]+)"/m)?.[1];
    const ndk = androidVersions.match(/^ndkVersion\s*=\s*"([\d.]+)"/m)?.[1];
    check('android.build-tools', buildTools && existsSync(path.join(sdk, 'build-tools', buildTools, 'source.properties')), 'The Build-Tools version selected by the locked React Native package is installed (currently 36.0.0).');
    check('android.ndk', ndk && existsSync(path.join(sdk, 'ndk', ndk, 'source.properties')), 'The NDK version selected by the locked React Native package is installed (currently 27.1.12297006).');
    const firebasePath = env.GOOGLE_SERVICES_JSON || app?.android?.googleServicesFile;
    const firebase = typeof firebasePath === 'string' ? readJson(path.resolve(root, firebasePath)) : null;
    check('android.firebase', supplied(app?.android?.package) && supplied(firebase?.project_info?.project_id) && Array.isArray(firebase?.client) && firebase.client.some(client => client?.client_info?.android_client_info?.package_name === app.android.package), 'Android Firebase config parses and matches app.json package. No Apple Firebase file is required for Android.');
    let supabaseUrl = false;
    try { supabaseUrl = new URL(values.EXPO_PUBLIC_SUPABASE_URL).protocol === 'https:'; } catch { /* Value intentionally hidden. */ }
    check('android.supabase-url', supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL is a valid HTTPS URL (value hidden).');
    check('android.supabase-key', supplied(values.EXPO_PUBLIC_SUPABASE_ANON_KEY), 'EXPO_PUBLIC_SUPABASE_ANON_KEY is supplied (value hidden).');
    check('android.maps', supplied(values.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY), 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is supplied (value hidden); verify Android package/certificate restrictions separately.');
    notes.push('If .env is absent, copy .env.example once without overwriting an existing file. Shell variables take precedence. Values, Java errors, and Firebase contents are never printed.');
    notes.push('Mock mode covers selected repositories; Firebase authentication and some Firestore paths remain live. Use your own or an explicitly authorized development backend.');
    notes.push('A passing configuration check cannot prove OAuth, Maps restrictions, backend access, SDK licenses, or device behavior. No native build was run.');
  }

  if (backend) {
    const functions = readJson(path.join(root, 'functions/package.json'));
    check('backend.dependencies', functions && existsSync(path.join(root, 'functions/node_modules/typescript/package.json')), 'Functions dependencies are installed separately: npm --prefix functions ci.');
    notes.push('The hosted Cloud Functions runtime is defined by functions/package.json and firebase.json (currently Node 20); it is separate from Node 24 used by root tooling. Do not change deployed runtime during client setup.');
    notes.push('Rules emulator tests require JDK 21+ and the local Firebase CLI; use demo-edumentx. Deployment, seeding and live smoke tests need separate authorization and are not part of setup.');
  }
  return { checks, notes, failures: checks.filter(item => !item.ok).length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--android', '--backend', '--help']);
  if (args.some(arg => !allowed.has(arg))) {
    console.error('Unknown option. Usage: npm run setup:check -- [--android] [--backend]');
    process.exitCode = 2;
  } else if (args.includes('--help')) {
    console.log('Usage: npm run setup:check -- [--android] [--backend]\nRead-only local prerequisites; no installs, network requests, or deployments.');
  } else {
    const report = checkSetup({ android: args.includes('--android'), backend: args.includes('--backend') });
    for (const item of report.checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.message}`);
    for (const note of report.notes) console.log(`NOTE ${note}`);
    console.log(`${report.failures} setup failure(s).`);
    process.exitCode = report.failures ? 1 : 0;
  }
}
