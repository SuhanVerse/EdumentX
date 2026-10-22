import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const configure = require('../app.config.js');
const keys = ['EAS_BUILD_PROFILE', 'EXPO_PUBLIC_APP_ENV', 'EXPO_PUBLIC_USE_MOCK_DATA', 'EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS', 'GOOGLE_SERVICES_JSON', 'GOOGLE_SERVICE_INFO_PLIST'];
function withEnv(values, action) {
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key];
  }
  try { return action(); } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
  }
}
const config = { name: 'EdumentX', android: { package: 'example.app', googleServicesFile: './google-services.json' }, ios: { bundleIdentifier: 'example.app', googleServicesFile: './GoogleService-Info.plist' } };
test('development retains the base identifiers and Firebase paths without mutating config', () => withEnv({}, () => {
  const before = JSON.stringify(config);
  assert.deepEqual(configure({ config }), config);
  assert.equal(JSON.stringify(config), before);
}));
test('EAS native file variables override only their corresponding paths', () => withEnv({ GOOGLE_SERVICES_JSON: '/tmp/android.json', GOOGLE_SERVICE_INFO_PLIST: '/tmp/apple.plist' }, () => {
  const result = configure({ config });
  assert.equal(result.android.googleServicesFile, '/tmp/android.json');
  assert.equal(result.ios.googleServicesFile, '/tmp/apple.plist');
  assert.equal(result.android.package, config.android.package);
  assert.equal(result.ios.bundleIdentifier, config.ios.bundleIdentifier);
}));
for (const profile of ['production', 'production-apk']) {
  test(`${profile} rejects missing or enabled mocks`, () => {
    for (const mock of [undefined, 'true', 'FALSE']) withEnv({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_USE_MOCK_DATA: mock }, () => assert.throws(() => configure({ config }), /MOCK_DATA=false/));
  });
}
test('production environment label also guards local non-EAS config resolution', () => withEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_USE_MOCK_DATA: 'true' }, () => assert.throws(() => configure({ config }), /MOCK_DATA=false/)));
test('explicit live production mode resolves successfully', () => withEnv({ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_USE_MOCK_DATA: 'false' }, () => assert.equal(configure({ config }).name, 'EdumentX')));
test('production rejects sandbox opt-in even with live data selected', () => {
  for (const flag of ['true', 'TRUE', '1']) {
    withEnv({ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_USE_MOCK_DATA: 'false', EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS: flag }, () => assert.throws(() => configure({ config }), /SANDBOX_PAYMENTS=false/));
  }
});
test('production permits an explicit disabled sandbox flag', () => withEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_USE_MOCK_DATA: 'false', EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS: 'false' }, () => assert.equal(configure({ config }).name, 'EdumentX')));
