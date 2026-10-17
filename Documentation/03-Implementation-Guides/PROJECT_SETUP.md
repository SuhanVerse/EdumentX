# Project setup

This page describes the repository as inspected on 17 October 2026. It does not provision a new cloud project or deploy backend changes.

## Prerequisites

| Tool or configuration | Why it is needed |
| --- | --- |
| Node from `.nvmrc` (currently 24) and npm | Matches the root tools and CI |
| Android Studio/SDK and an emulator or USB device | Native Android development |
| macOS, compatible Xcode, and CocoaPods | Local iOS development |
| Project-owner Firebase and Supabase configuration | Existing backend resources |
| A native development build | Firebase, Google Sign-In, and native maps do not run in Expo Go |

The app uses Expo SDK 54, React Native 0.81, React 19, and NativeWind 4. Check [package.json](../../package.json) and the lockfile for exact versions. Do not upgrade frameworks while following a setup guide.

## 1. Check your working copy

From the repository root:

```bash
git status --short
node --version
npm --version
nvm use
npm ci
```

`npm ci` recreates installed dependencies using the lockfile. Do not share one `node_modules` directory between Windows and Linux.

If the repository volume is mounted read-only, use a writable checkout or fix the mount through the operating system before installing or editing. `chmod` cannot fix a read-only mount.

## 2. Configure the client

If `.env` does not already exist, copy [.env.example](../../.env.example) to `.env`. Preserve existing values when updating an established checkout.

| Configuration | Where it belongs |
| --- | --- |
| Supabase URL and public anon key | Client `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Android native Maps key | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; package/certificate restrictions must match the installed build |
| Firebase native app configuration | Root `google-services.json` and `GoogleService-Info.plist`, referenced by `app.json` |
| Mock selector and environment label | `EXPO_PUBLIC_USE_MOCK_DATA`, `EXPO_PUBLIC_APP_ENV` |
| Service-account credentials | Trusted operator/server environment, outside Git and the mobile bundle |
| Supabase service-role/storage signing, LLM, and payment secrets | Trusted backend environments; never `EXPO_PUBLIC_*` |

The template contains older comments and server-tool placeholders. Their presence does not mean the app needs privileged credentials. Native Firebase initialization uses `getApp()` and the native configuration files; do not invent a second web Firebase initialization to satisfy template variables.

Verify the Google web OAuth client configured in [authService.ts](../../src/services/firebase/authService.ts) against the owner's project. Changing a package name, bundle identifier, or signing certificate can break Google login and Maps even when TypeScript passes.

Never paste `.env` contents, service credentials, access tokens, or private documents into public issue reports.

## 3. Choose a data mode

`EXPO_PUBLIC_USE_MOCK_DATA=true` selects mock repositories in participating domains and the AI chat service. Native authentication and direct Firestore call sites remain live; the flag does not make the complete app offline.

Use only an authorized development backend for real-data work. Ensure all account roles, deployed rules, storage policies, and required AI search data exist there.

The discovery feed is backed by Firestore while AI search also uses Supabase SQL data. An empty AI search does not necessarily mean the Firestore feed is empty. A universal automatic synchronization path has not been established by this documentation review.

Restart Metro after changing environment values.

## 4. Build and launch

For Android:

```bash
npm run android
```

On a Mac configured for iOS:

```bash
npm run ios
```

If the device already has a compatible development client:

```bash
npx expo start --dev-client
```

Native dependency or plugin changes require rebuilding the client. A JavaScript reload cannot add a missing native module.

Inspect existing `android/` and `ios/` customizations before regenerating them. Do not delete native folders or run `prebuild --clean` as a routine fix.

See [installation](../05-Build-and-Deploy/install-guide.md) for device/signing details.

## 5. Run local checks

```bash
npm run typecheck
npm run lint
npm run test:derived
npm run test:lint-rules
```

These checks do not prove Google Sign-In, map rendering, uploads, push delivery, or native keyboard behavior. Test those in the relevant development build.

### Local Firestore rules tests

The `test:rules` package script first checks deployed rules, which needs credentials. To run the eight emulator suites without that cloud step, use the CI command from the repository root:

```bash
npx firebase emulators:exec --only firestore --project demo-edumentx "node scripts/rulesEmulationTest.mjs && node scripts/batchesRulesTest.mjs && node scripts/acceptRequestRulesTest.mjs && node scripts/messagesRulesTest.mjs && node scripts/reviewsListRulesTest.mjs && node scripts/removeEnrollmentRulesTest.mjs && node scripts/tutorDetailsRulesTest.mjs && node scripts/userRulesTest.mjs"
```

Use a Java version compatible with the installed Firebase CLI; CI configures Java 21. The explicit `demo-edumentx` project is intentional. Do not substitute a production project into a local test recipe.

The `smoke:*`, `seed:*`, `backfill:*`, `delete:user`, and `deploy:*` commands can mutate real services. Read their implementations and obtain the relevant authorization before using them. They are not part of beginner setup.

## Next step

Open the [learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md), follow its source-reading order, and complete a small UI or pure-helper exercise before changing authentication or security rules.
