import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: npm run release:doctor -- [--profile production|production-apk|preview|development]');
  console.log('Read-only configuration checks. Supply production values through the environment; no login, upload, or deployment occurs.');
  process.exit(0);
}
const profileArg = args.indexOf('--profile');
const profileName = profileArg < 0 ? 'production' : args[profileArg + 1];
const app = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(readFileSync(path.join(root, 'eas.json'), 'utf8'));
const seen = new Set();
function resolveProfile(name) {
  if (seen.has(name)) throw new Error(`Circular EAS profile: ${name}`);
  if (!eas.build[name]) throw new Error(`Unknown EAS profile: ${name}`);
  seen.add(name);
  const item = eas.build[name];
  const base = item.extends ? resolveProfile(item.extends) : {};
  return { ...base, ...item, env: { ...base.env, ...item.env }, android: { ...base.android, ...item.android }, ios: { ...base.ios, ...item.ios } };
}
let failures = 0;
function check(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  if (!ok) failures += 1;
}
function warn(message) { console.log(`NOTE ${message}`); }
let profile;
try { profile = resolveProfile(profileName); }
catch (error) { console.error(error.message); process.exit(1); }
const production = ['production', 'production-apk'].includes(profileName);
const value = name => profile.env[name] ?? process.env[name];
console.log(`EdumentX release configuration check: ${profileName}`);
check(Boolean(app.extra?.eas?.projectId), 'Existing EAS project is linked.');
const buildProperties = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')?.[1];
check(buildProperties?.android?.targetSdkVersion >= 36, 'Android target SDK is at least 36 (requirement checked 2026-10-21).');
check(Boolean(app.android?.package && app.ios?.bundleIdentifier), 'Both native identifiers are configured.');
if (app.android?.package?.startsWith('com.anonymous.') || app.ios?.bundleIdentifier?.startsWith('com.anonymous.')) {
  warn('Identifiers are technically valid but still com.anonymous.*; decide ownership before first store registration.');
}
if (production) {
  check(profile.environment === 'production', 'Profile selects the production EAS environment.');
  check(value('EXPO_PUBLIC_APP_ENV') === 'production' && value('EXPO_PUBLIC_USE_MOCK_DATA') === 'false', 'Production profile labels are set and mocks are disabled.');
  check(process.env.EXPO_PUBLIC_USE_MOCK_DATA === undefined || process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'false', 'Local environment does not contradict production mock settings.');
  check(value('EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS') === 'false', 'Sandbox payment entry points are explicitly disabled.');
  check(process.env.EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS === undefined || process.env.EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS === 'false', 'Local environment does not enable sandbox payments for production.');
  check(profile.android.buildType === (profileName === 'production' ? 'app-bundle' : 'apk'), 'Android artifact type matches the selected profile.');
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY']) {
    check(Boolean(value(name)), `${name} is supplied (value hidden).`);
  }
}
const configs = [
  ['Android Firebase', process.env.GOOGLE_SERVICES_JSON || app.android.googleServicesFile, 'json'],
  ['iOS Firebase', process.env.GOOGLE_SERVICE_INFO_PLIST || app.ios.googleServicesFile, 'plist'],
];
const firebaseProjects = [];
for (const [label, filename, format] of configs) {
  const file = filename && path.resolve(root, filename);
  check(Boolean(file && existsSync(file)), `${label} configuration file exists.`);
  if (!file || !existsSync(file)) continue;
  try {
    const contents = readFileSync(file, 'utf8');
    const parsed = format === 'json' ? JSON.parse(contents) : null;
    const projectId = parsed ? parsed.project_info?.project_id : contents.match(/<key>PROJECT_ID<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
    check(Boolean(projectId), `${label} declares a Firebase project.`);
    if (projectId) firebaseProjects.push(projectId);
    const matchingId = parsed
      ? parsed.client?.some(client => client.client_info?.android_client_info?.package_name === app.android.package)
      : contents.match(/<key>BUNDLE_ID<\/key>\s*<string>([^<]+)<\/string>/)?.[1] === app.ios.bundleIdentifier;
    check(Boolean(matchingId), `${label} registration matches the native application identifier.`);
    if (production) check(Boolean(projectId && !/(^|[-_])(dev|demo|test)([-_]|$)/i.test(projectId)), `${label} does not point to a dev/demo/test-named backend.`);
    else warn(`${label} backend identity must match the intended environment.`);
  } catch { check(false, `${label} configuration can be parsed.`); }
}
if (production) check(firebaseProjects.length === 2 && new Set(firebaseProjects).size === 1, 'Android and iOS Firebase configurations select the same project.');
warn('This is a configuration check, not a security audit or store-readiness certificate. Review PRODUCTION_READINESS.md; deletion, privacy, UGC safety, push ownership and sandbox Pro remain release gates.');
warn('Project naming does not prove environment isolation. Verify Firebase/Supabase ownership, deployed rules, signing, OAuth, native permissions and actual release-device journeys.');
console.log(`${failures} configuration failure(s). No remote operations performed.`);
process.exitCode = failures ? 1 : 0;
