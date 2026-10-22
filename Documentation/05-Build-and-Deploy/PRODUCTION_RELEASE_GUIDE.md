# EdumentX production release guide

Checked against the repository and official documentation on **21 October 2026**. This guide takes you from Ubuntu to an Android APK, a Google Play AAB, or an iOS build uploaded to App Store Connect. It does not claim that the current app has passed store review.

Start with [production readiness](./PRODUCTION_READINESS.md) for the remaining product work and [iOS on Linux and xtool](./IOS_ON_LINUX_XTOOL.md) for the distinction between Swift cross-compilation and this React Native app. Backend publication details remain in the [operations runbook](./DEPLOYMENT_GUIDE.md).

## 1. Choose the artifact and build machine

| Goal | Artifact / profile | Build machine | Installation |
| --- | --- | --- | --- |
| Develop native features | `development` | Ubuntu for Android; EAS Mac for iOS | Native development client, then Metro |
| Share an Android test build | APK / `preview` | Ubuntu or EAS | Install directly with Android package installer or `adb` |
| Test release configuration directly | APK / `production-apk` | Ubuntu or EAS | Install directly; internal distribution |
| Publish on Google Play | AAB / `production` | Ubuntu or EAS | Google Play produces device-specific APKs |
| Test/release on iPhone | Store-signed IPA / `production` | EAS Mac, initiated from Ubuntu | TestFlight, then App Store review |

An APK cannot become an iOS app. Both binaries are built from the shared EdumentX source, with their own native dependencies, signing, permissions, and platform testing. A development/ad hoc iOS IPA is not an App Store submission artifact.

EAS cloud builds consume the account's plan allowance; verify [current EAS pricing](https://expo.dev/pricing). Apple Developer Program and Google Play registration have separate fees and verification requirements. Free backend quotas do not remove store-account fees or guarantee production usage will cost nothing.

## 2. Freeze a release without losing local work

The current working tree has changes, and ignored `android/` and `ios/` folders can contain native customizations. Do not run `git reset --hard`, delete native folders, or use `expo prebuild --clean` here as a release shortcut.

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
git status --short
git diff --stat
git rev-parse HEAD
node --version
npm --version
```

Review and commit the exact release changes when ready. A fresh clone copies committed history, not uncommitted edits or ignored native configuration. Before committing, decide whether native edits must become config plugins or reviewed source files. Save a separate local backup of any native work that has not been reproduced.

After that review, make a disposable build checkout on the Ubuntu filesystem:

```bash
EDUMENTX_SOURCE=/media/xlegion/Win/PROJECTS/EdumentX
EDUMENTX_RELEASE_REF='REPLACE_WITH_REVIEWED_COMMIT_SHA'
EDUMENTX_RELEASE_DIR="$HOME/Projects/EdumentX-release-$(date +%Y%m%d-%H%M%S)"
git clone --no-hardlinks "$EDUMENTX_SOURCE" "$EDUMENTX_RELEASE_DIR"
cd "$EDUMENTX_RELEASE_DIR"
git checkout --detach "$EDUMENTX_RELEASE_REF"
git status --short
```

Replace the commit placeholder before running. Copy only the intended client/native configuration into this checkout. Do not copy the entire original `.env`, admin keys, signing directories, or `node_modules`.

The commands below assume this release checkout unless stated otherwise. Keep the original working directory intact. EAS normally excludes the generated native directories through `.gitignore`; inspect the actual build archive before assuming a local native edit will reach the cloud build.

## 3. Prepare Ubuntu and a reproducible CLI

Use the Node version pinned by `.nvmrc`, currently 24:

```bash
nvm install
nvm use
npm ci
npx expo --version
```

If `nvm` is not installed, follow its [maintainer installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating), open a new shell, and return here. Do not replace Ubuntu's system Node just to match the project.

The inspected global EAS CLI is **22.6.0**. Current official docs use `env:set`; older installed versions may expose `env:create` instead. This guide uses a separate pinned CLI invocation so the global installation does not have to change:

```bash
EDUMENTX_EAS_VERSION=25.3.0
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" --version
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --help
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build --help
```

EAS 25.3.0 runs on this Ubuntu system; its `env:set`, `build`, `build:inspect`, and `submit` help were checked during this audit. Build, login, upload, and release operations were not run. Check the available release before changing this pin and prefer one verified CLI version throughout a release. [Current CLI reference](https://docs.expo.dev/eas/cli/).

For local Android builds, install Android Studio and its SDK Manager from the [official Linux setup instructions](https://developer.android.com/studio/install). Install the SDK command-line tools, platform-tools, API 36 platform, Build Tools 36.0.0, and the NDK needed by SDK 54, currently 27.1.12297006.

```bash
sudo apt update
sudo apt install openjdk-17-jdk unzip zip curl
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
java -version
sdkmanager --list_installed
sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006'
sdkmanager --licenses
adb version
```

`JAVA_HOME` above is for Ubuntu amd64; use the actual installed path on another architecture. If `sdkmanager` is missing, install Android SDK Command-line Tools in Android Studio first and confirm its location. Persist these exports in your shell configuration only after checking existing Android/Java settings. Firebase emulator tests use Java 21 in CI; select that JDK for those tests if the installed Firebase tools require it.

Local EAS builds use your installed tools. Cloud `image`, Node, NDK, and CocoaPods version fields do not install those tools locally; secret-visibility EAS variables are also unavailable there. [Local build limitations](https://docs.expo.dev/build-reference/local-builds/).

## 4. Decide production identity and backend targets

The inspected app uses `com.anonymous.edumentx` for Android and iOS and native Firebase files targeting **`edumentx-dev`**. These are current values, not new production identifiers chosen by this guide.

Before the first store registration, decide whether to retain those identifiers or adopt owned, stable identifiers such as `com.YOUR_ORGANIZATION.edumentx`. Do not rename a published application casually. Package name, bundle identifier, Firebase registration, Google OAuth clients, Maps restrictions, signing credentials, and store records must agree.

Record the decision in your release notes:

| Item | Required value |
| --- | --- |
| Android package | Final stable package name |
| iOS bundle identifier | Final stable bundle identifier |
| Firebase project | Explicit production project; not an accidental `edumentx-dev` default |
| Supabase project | Explicit production URL/project reference |
| EAS project | Existing project ID, or a deliberately provisioned replacement |
| Google OAuth web client | From the chosen Firebase/Google Cloud project |
| Support / privacy / deletion URLs | Public, accessible, owned URLs |

Create production backend resources through a reviewed owner-operated process. Port rules, indexes, reviewed SQL migrations, functions, bucket policies, and approved tutor data deliberately. Firestore discovery and Supabase AI search use different data paths; verify both. Do not blindly copy development users, verification scans, or sandbox entitlements.

An EAS profile named `production` only selects build settings/environment. It does not create a Firebase project, change a hardcoded OAuth client, or migrate Supabase data. Native Firebase initializes from the native files; adding web Firebase variables to `.env` does not override those files.

The zero-cost demo policy remains in [architecture §0](../01-Architecture/ARCHITECTURE.md): free-quota usage, restricted keys, monitored budgets, controlled function concurrency, and sandbox-only eSewa. A budget alert notifies; it is not a universal hard spending cap.

## 5. Configure native Firebase, OAuth, Maps, and push

### Firebase and Google sign-in

1. Register the final Android package and iOS bundle ID in the intended Firebase project.
2. Download that project's `google-services.json` and `GoogleService-Info.plist` into the release checkout, replacing only the intended release copies.
3. Enable email/password and Google authentication; check authorized domains and email templates/action links.
4. Review `src/services/firebase/authService.ts`: its Google **web OAuth client ID is hardcoded**. Set it to the matching production web client through a reviewed source/config change. This is a public identifier, not a secret.
5. Register the Android signing SHA-1/SHA-256 fingerprints used by development, direct release APKs, and Google Play App Signing as appropriate. The Play app-signing certificate differs from the upload key.
6. For iOS, verify the plist `CLIENT_ID`, `REVERSED_CLIENT_ID`, bundle ID, generated URL scheme, and Google config plugin. Do not add another guessed iOS client ID to silence an error.

Use the [Expo Google sign-in setup](https://react-native-google-signin.github.io/docs/setting-up/expo) and [Firebase Android setup](https://firebase.google.com/docs/android/setup). Redownload native config after relevant Firebase OAuth/certificate changes and rebuild. Test Google sign-in on the artifact installed **from Play**, not only an APK signed with your upload/development key.

For an existing APK certificate:

```bash
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs ./artifacts/edumentx-release.apk
```

### Maps and permission declarations

Android uses the native Maps SDK through `plugins/withGoogleMapsApiKey.js`; it reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Enable the intended Maps SDK and restrict its key to the final Android package and actual signing certificate. Add the Play app-signing fingerprint restriction for store-installed builds. Keep development and production restrictions clear.

iOS uses Apple Maps. Test permission granted, denied, approximate location, manual location entry, and a blank/unavailable map. Review generated location usage strings: nearby search usually needs foreground location, so do not request background/always access without an implemented reason. Photo/camera permission copy must match verification/avatar usage.

### Push notifications

The app registers Expo push tokens under `users/{uid}.pushTokens`; server functions send notifications through Expo. Configure Android **FCM v1** and iOS **APNs** delivery credentials using EAS credentials, then rebuild if native configuration changed:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" credentials --platform android
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" credentials --platform ios
```

Use the [official Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/). A Firebase admin/service-account credential for push is not `google-services.json`. Keep it out of the mobile app and Git. Ensure the Apple App ID has push capability and the provisioning profile includes it.

Test two physical devices: permission granted/denied, foreground/background/closed app, message and enrollment notifications, tap routing, logout, and account switching. Verify recipient isolation and remove invalid tokens based on delivery receipts. An Expo API ticket alone does not prove the phone received the message.

## 6. Set EAS environment values safely

`EXPO_PUBLIC_*` values are embedded in app code and are extractable from the binary. EAS “sensitive” visibility reduces dashboard/log exposure; it does not make a value in the shipped app secret. [Environment usage](https://docs.expo.dev/eas/environment-variables/usage/).

| Goes into the client/build environment | Stays on trusted servers/operator systems |
| --- | --- |
| Supabase public URL and anon/publishable client key | Supabase service role / `STORAGE_SERVICE_JWT` |
| Restricted Maps key; Firebase public app identifiers | Firebase admin private key/service-account JSON |
| App environment label; mock selector | Groq/HuggingFace provider secrets |
| Native Firebase app config files | eSewa signing secret, Apple private signing/API keys |

Do not run `env:push` against the existing mixed-use `.env`. Set only reviewed client values. The following commands upload environment values to EAS; run them yourself after the intended project and configuration have been confirmed.

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" whoami
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" login
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" project:info
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name EXPO_PUBLIC_APP_ENV --value production --visibility plaintext
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name EXPO_PUBLIC_USE_MOCK_DATA --value false --visibility plaintext
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name EXPO_PUBLIC_SUPABASE_URL --value 'REPLACE_WITH_PRODUCTION_SUPABASE_URL' --visibility plaintext
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --visibility sensitive
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --visibility sensitive
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:list --environment production
```

Omitting `--value` allows an interactive prompt. Check the command's help for the pinned CLI. Replace the URL placeholder; do not submit it literally. `EXPO_PUBLIC_USE_MOCK_DATA=false` is necessary for production repositories but does not disable the eSewa demo screen or prove backend isolation.

### Native Firebase file variables and the production guard

The existing `app.config.js` preserves `app.json` and already supports environment-specific native file paths:

| Build variable | Existing behavior |
| --- | --- |
| `GOOGLE_SERVICES_JSON` | Selects the Android native Firebase file; falls back to `app.json`'s `./google-services.json`. |
| `GOOGLE_SERVICE_INFO_PLIST` | Selects the iOS native Firebase file; falls back to `app.json`'s `./GoogleService-Info.plist`. |

Keep this implementation; do not replace it with a second config example. It also stops configuration resolution if a production environment or `production`/`production-apk` profile is selected without **exactly** `EXPO_PUBLIC_USE_MOCK_DATA=false`. Missing values and `true` are rejected. The guard prevents a mock-mode configuration mistake; it does not verify backend ownership, remove the sandbox Pro route, or prove the app is store-ready.

Download matching production Firebase files, verify their app/project registrations, then upload them using the current [file-variable workflow](https://docs.expo.dev/eas/environment-variables/manage/):

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name GOOGLE_SERVICES_JSON --type file --visibility secret --value ./google-services.json
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:set --environment production --name GOOGLE_SERVICE_INFO_PLIST --type file --visibility secret --value ./GoogleService-Info.plist
```

These native Firebase configuration files contain public project/app configuration, not Admin SDK keys. Audit their intended project before upload. Secret file values are not downloadable through `env:pull`; keep authorized local copies for local builds. For a local build, export the paths to those copies in the build shell, for example:

```bash
export GOOGLE_SERVICES_JSON='/ABSOLUTE/PATH/TO/PRODUCTION/google-services.json'
export GOOGLE_SERVICE_INFO_PLIST='/ABSOLUTE/PATH/TO/PRODUCTION/GoogleService-Info.plist'
export EXPO_PUBLIC_APP_ENV=production
export EXPO_PUBLIC_USE_MOCK_DATA=false
```

Replace these paths with files you verified. Never point a client file variable at an Admin SDK JSON key. Cloud builds receive the EAS file-variable paths on the builder; local builds use your exported paths or the existing app-config fallbacks.

These exports remain active in this shell, including production Firebase file paths and any public values entered later. Switching to `--profile preview` does not clear them or select an isolated test backend. Use a fresh shell and a separately configured preview checkout/environment for preview builds; select its matching native Firebase files, public Supabase/Maps values, and intended mock mode. Reusing this production checkout's `.env.production.local` can also preserve production values even in a new shell.

For local builds, create a client-only `.env.production.local` in the disposable checkout or pull nonsecret EAS values there:

```bash
umask 077
if [ ! -e .env.production.local ]; then
  npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" env:pull --environment production --path .env.production.local
else
  printf '%s\n' '.env.production.local already exists; review it before replacing it.'
fi
```

Review that file without printing it to shared logs. Expo production bundling loads matching `.env` files; existing shell variables can override values, so inspect the variable **names and intended targets** in the build shell. Do not rely on a profile label to override a stale `.env`. For native secret file variables needed locally, set their file paths in that shell yourself.

## 7. Understand the release profiles and version numbers

The current `eas.json` profiles for this repository are:

```json
{
  "cli": { "version": ">= 19.0.6", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": { "buildType": "apk" }
    },
    "production": {
      "distribution": "store",
      "environment": "production",
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_APP_ENV": "production",
        "EXPO_PUBLIC_USE_MOCK_DATA": "false"
      },
      "android": { "buildType": "app-bundle" },
      "ios": { "image": "sdk-54" }
    },
    "production-apk": {
      "extends": "production",
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  },
  "submit": { "production": {} }
}
```

Compare this with the actual file before building. Production profiles also pin the environment label and mock selector directly in `env`; retain those values. `production-apk` inherits production configuration and auto-increment, so it consumes a new Android version code. Use it for Android only. Its distribution is internal: it is not a Google Play artifact.

Google Play new/update submissions require **target API 36** from August 31, 2026. Keep both the config and generated artifact compliant; `compileSdkVersion:36` alone is insufficient. [Google requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

Apple uploads require **iOS/iPadOS 26 SDK or later** from April 28, 2026. At this audit, EAS `sdk-54` maps to Xcode 26.0; inspect the build log because image aliases can change. The build SDK requirement is separate from the app's minimum supported iOS version. [Apple requirement](https://developer.apple.com/news/?id=ueeok6yw), [EAS images](https://docs.expo.dev/build-reference/infrastructure/).

Update the user-visible `expo.version` deliberately for each product release. EAS remote state supplies Android `versionCode` and iOS `buildNumber`; auto-increment prevents reusing build numbers but does not replace a release naming policy.

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build:version:get --platform android
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build:version:get --platform ios
```

For a first migration to remote numbering, use `build:version:set --platform android` or `--platform ios` interactively and start above any number already uploaded. Do not reset counters for an existing store app. Record artifact hashes, build IDs, source commit, public version, native build numbers, backend targets, and CLI/image versions together.

## 8. Run checks and inspect the build input

Run the local configuration preflight before requesting a paid/quota-consuming build:

```bash
npm run release:doctor -- --help
npm run release:doctor
```

`release:doctor` is a read-only Node script: it parses local app/EAS profiles and native Firebase files, checks required production environment values and matching native registrations/Firebase project identities, and reports PASS/FAIL without printing credential values. It does not log in, contact cloud services, compile the app, or change a store listing. Production is the default profile; choose `npm run release:doctor -- --profile production-apk` to check the direct-release APK profile. Run it explicitly; the npm script is not automatically a build or CI gate.

**The unchanged development snapshot is expected to fail this production check.** Tracked Firebase files currently point to `edumentx-dev`; the production Supabase URL/public key and Maps key must be supplied explicitly. Do not rename a development project string or add dummy values to make the output green. Use the verified production native file paths above and provide the three public configuration values through your shell or an approved environment runner, then run the check again.

The doctor does not load `.env` files or fetch EAS-hosted variables automatically. Its effective values come from the selected profile's `env` plus your process environment; a nonsecret value stored only in EAS is not evidence available to this local check. It also flags a local mock setting that contradicts production. For the local public values, prompts avoid placing the key in shell history:

```bash
read -r -p 'Production Supabase URL: ' EXPO_PUBLIC_SUPABASE_URL
read -r -s -p 'Production Supabase public client key: ' EXPO_PUBLIC_SUPABASE_ANON_KEY
printf '\n'
read -r -s -p 'Restricted Android Maps key: ' EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
printf '\n'
export EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
npm run release:doctor
```

The check rejects dev/demo/test-named Firebase projects as a useful local signal. A different project name or a nonempty URL is not proof of isolation or correct access rules. Even a passing doctor result leaves the privacy, account lifecycle, UGC, payment, signing, deployed-state and device checks open.

Then run the source checks:

```bash
npm run typecheck
npm run lint
npm run test:derived
npm run test:lint-rules
npm run test:discovery
npm run test:tutor-feed
npm run test:motion
npm run test:release-config
npx expo-doctor
npx expo install --check
```

Address findings without automatically upgrading the framework in the release branch. Run the eight local Firestore emulator suites from [project setup](../03-Implementation-Guides/PROJECT_SETUP.md). `npm run test:rules` also checks deployed rules and needs credentials; live smoke/seed/backfill scripts can write to real services and are separate owner-operated work.

Inspect EAS's uploaded input, using a new output directory:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build:inspect --platform android --profile production --stage archive --output ./build-input-android
```

Check that source, assets, native Firebase configuration, and plugins are present and no admin/service-role secrets are included. Do not commit the archive. If native directories are excluded, confirm that config plugins reproduce the intended changes. Native prebuild experiments belong in the disposable checkout after its native-state review, not the original working tree.

## 9. Build Android APKs and the Play AAB

### Local Ubuntu builds

Use one command at a time so failures are visible. EAS local builds can still contact Expo for project validation and signing credentials. They are not a guarantee of an entirely offline build.

The optional preview command below assumes that separately configured preview environment. If you continued in the production shell from §6, its exported native file paths and client values can still select production services; `preview` is a distribution/build profile, not a backend-isolation mechanism. For a direct-install artifact that intentionally uses the production configuration, skip preview and use `production-apk` instead.

```bash
mkdir -p artifacts
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build --platform android --profile preview --local --output ./artifacts/edumentx-preview.apk
```

For production client configuration and a direct-install APK:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build --platform android --profile production-apk --local --output ./artifacts/edumentx-release.apk
adb devices
adb install -r ./artifacts/edumentx-release.apk
```

Do not uninstall an existing app to resolve a signature mismatch before considering its local data. Different signing identities cannot update one another under the same package name. Google Play's app-signing key may differ from the direct APK's key.

For the Play artifact:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build --platform android --profile production --local --output ./artifacts/edumentx-release.aab
sha256sum ./artifacts/edumentx-release.aab
```

### Cloud Android alternative

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build --platform android --profile production
```

The first signing setup prompts you to use existing credentials or create a keystore. Reuse the existing upload key for an existing application. Download a protected backup through `eas credentials`; keep the key, passwords, and recovery instructions outside Git. Play App Signing protects the distribution key; your upload key still matters. [Signing credentials](https://docs.expo.dev/app-signing/app-credentials/).

Inspect release manifest/package/SDK and certificate information, then test on a physical Android device. For an APK, available Android SDK tools include:

```bash
"$ANDROID_HOME/cmdline-tools/latest/bin/apkanalyzer" manifest application-id ./artifacts/edumentx-release.apk
"$ANDROID_HOME/cmdline-tools/latest/bin/apkanalyzer" manifest target-sdk ./artifacts/edumentx-release.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs ./artifacts/edumentx-release.apk
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 -v 4 ./artifacts/edumentx-release.apk
```

ZIP alignment alone does not prove every native library has correct ELF alignment or runtime behavior. Inspect the final Play AAB in App Bundle Explorer and test a 16 KB emulator/device. Current Android guidance requires 16 KB support for API 35+ apps and states update enforcement from February 1, 2027. [Native-library checks](https://developer.android.com/guide/practices/page-sizes).

## 10. Build iOS from Ubuntu through EAS

Have an active Apple Developer Program membership, access to the intended team, an available bundle ID, and an App Store Connect app record. Use the same final bundle ID in Firebase and app configuration. Apple may require account agreements/identity verification before signing or distribution.

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" credentials --platform ios
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build --platform ios --profile production
```

These run on Ubuntu but compile on an EAS macOS builder with Xcode. Do not add `--local` for an iOS build on Ubuntu: installing xtool does not turn CocoaPods/Xcode React Native builds into Linux-native builds. See the [xtool guide](./IOS_ON_LINUX_XTOOL.md).

Let EAS manage an Apple distribution certificate and App Store provisioning profile, or provide your team's reviewed existing credentials. Confirm the team and bundle ID before accepting prompts; signing for another team does not fix an ownership mismatch. Configure APNs separately as described earlier.

Verify the completed build log reports the intended Xcode/iOS SDK, Firebase file, release scheme, version, and build number. Test the processed TestFlight build on a real iPhone. With `supportsTablet:true`, include iPad layouts and screenshots. A successful JavaScript export is not native-build or device-test evidence.

## 11. Select exact artifacts and submit to internal testing

Avoid `--latest` when multiple builds exist. Copy the build ID from the successful build and verify platform, profile, commit, version, and distribution before submission.

```bash
EDUMENTX_ANDROID_BUILD_ID='REPLACE_WITH_EXACT_ANDROID_BUILD_ID'
EDUMENTX_IOS_BUILD_ID='REPLACE_WITH_EXACT_IOS_BUILD_ID'
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build:view "$EDUMENTX_ANDROID_BUILD_ID" --json > ./artifacts/android-build.json
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" build:view "$EDUMENTX_IOS_BUILD_ID" --json > ./artifacts/ios-build.json
```

For a cloud artifact, download the URL from the inspected build JSON; fail if no artifact exists:

```bash
EDUMENTX_ANDROID_URL=$(python3 -c 'import json; d=json.load(open("artifacts/android-build.json")); print(d["artifacts"]["buildUrl"])')
curl --fail --location "$EDUMENTX_ANDROID_URL" --output ./artifacts/edumentx-play.aab
sha256sum ./artifacts/edumentx-play.aab
EDUMENTX_IOS_URL=$(python3 -c 'import json; d=json.load(open("artifacts/ios-build.json")); print(d["artifacts"]["buildUrl"])')
curl --fail --location "$EDUMENTX_IOS_URL" --output ./artifacts/edumentx-app-store.ipa
sha256sum ./artifacts/edumentx-app-store.ipa
```

Build URLs can expire or grant download access; keep them out of public issues. Check that the Android selected build is an AAB before choosing the `.aab` filename. For local builds, use the explicit local artifact instead of inventing an EAS cloud build ID.

Add your real submission details to a reviewed `eas.json` configuration. Example fields to merge into its existing `submit.production` object:

```json
{
  "android": {
    "serviceAccountKeyPath": "/ABSOLUTE/PRIVATE/PATH/play-submit.json",
    "track": "internal",
    "releaseStatus": "draft"
  },
  "ios": {
    "ascAppId": "REPLACE_WITH_NUMERIC_APP_STORE_CONNECT_APP_ID"
  }
}
```

The Play service account needs the correct app-scoped release permissions; do not use an unrelated Firebase Admin key. Keep its JSON outside Git. For iOS, `ascAppId` is the numeric App Store Connect record ID, not the bundle ID or Apple team ID. Configure the App Store Connect API key through `eas credentials --platform ios`, or supply reviewed `ascApiKeyPath`, `ascApiKeyIssuerId`, and `ascApiKeyId` fields. API upload credentials are separate from signing credentials.

Submit **one selected artifact** using either an exact build ID or a local file:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" submit --platform android --profile production --id "$EDUMENTX_ANDROID_BUILD_ID"
```

Or, for the local AAB:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" submit --platform android --profile production --path ./artifacts/edumentx-release.aab
```

For iOS:

```bash
npx --yes "eas-cli@$EDUMENTX_EAS_VERSION" submit --platform ios --profile production --id "$EDUMENTX_IOS_BUILD_ID"
```

Use `--path ./artifacts/edumentx-app-store.ipa` instead of `--id` if uploading a specifically downloaded IPA. Do not run both choices for the same upload.

Current [Expo Android submission docs](https://docs.expo.dev/submit/android/) allow EAS Submit to create the **first internal release**; a manual first upload is optional, not mandatory. Create the app record and configure credentials first. With `releaseStatus:"draft"`, finish/roll out the draft in Play Console. The manual alternative is Play Console → Internal testing → Create release → upload the AAB → review and save/publish to testers.

[EAS iOS submission](https://docs.expo.dev/submit/ios/) works from Linux and uploads to App Store Connect. Wait for Apple processing, complete export-compliance information, and select internal TestFlight testers. External TestFlight groups may require beta review. Upload success does not mean tester availability, App Review approval, or public release.

## 12. Complete store review requirements before production

The current product has release blockers beyond build settings. Treat these as implementation/verification work, not checkboxes satisfied by this guide.

| Gate | Required EdumentX work |
| --- | --- |
| Account deletion | Provide an accessible authenticated in-app deletion/request flow and a public external request URL; delete associated data under a documented retention policy. Admin soft-delete/CLI-only deletion is insufficient. |
| Privacy | Publish an owned privacy URL and link it in-app. Declare actual location, account, chat, avatar, identity-document, push, and AI-provider data handling in both stores. |
| Google login on iOS | Evaluate Apple §4.8 and implement an equivalent privacy-preserving login, normally Sign in with Apple, unless a real exception applies. General tutoring accounts are not existing-school-account login. |
| User content | Implement report/block controls, moderation/response handling, and published support contact for chat, reviews, profiles, and uploaded content. |
| Digital Pro features | Remove/disable the eSewa demo purchase entry points in production or implement reviewed store billing. Do not enable real eSewa merchant keys for digital app upgrades. |
| Permissions / minors | Request only implemented permissions; decide and disclose the actual audience and parental/age handling. Do not market a general app as a Kids Category app by accident. |
| Review access | Provide working reviewer accounts/instructions for student and tutor flows, realistic data, and reachable production services without exposing admin access or real PII. |

Sources: [Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en), [Apple review §§1.2, 4.8, 5.1.1](https://developer.apple.com/app-store/review/guidelines/), [Play payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en). Digital app upgrades and real-world/one-to-one tutoring payments require separate policy analysis; do not assume an exemption for one covers the other. Storefront/program-specific billing exceptions must be evaluated explicitly rather than applied globally.

Complete Play's Data safety, app access, content rating, target-audience, ads, permissions, privacy, deletion URL, listing, countries, and pricing forms. New personal accounts created after November 13, 2023 need at least **12 continuously opted-in closed testers for 14 days**, followed by a production-access application. Internal testing alone does not satisfy that condition. [Google testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB).

Complete App Store Connect screenshots, description, support/privacy URLs, age rating, App Privacy details, export-compliance answers, review notes, and the selected processed build. Check third-party privacy manifests/signatures in the native archive and ensure declarations match Firebase/Google and other included SDKs. [Apple SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/). Screenshot every supported device family using test data; do not use concept artwork as evidence of shipped screens.

## 13. Test the candidate and roll out gradually

Install the actual Play internal/TestFlight candidate and record results on Android and iPhone: clean install, upgrade preserving data, email verification/login, Google and any Apple login, both profile flows, location denied/manual fallback, tutor discovery and saved tutors, enrollment accept/decline, availability conflicts, groups, messaging, push, document upload/privacy, logout, and account deletion.

Include slow/offline service failures, retries without duplicate writes, keyboard/safe-area behavior, large text, screen reader labels, reduced motion, dark/light appearance, low-memory device behavior, and denied permissions. Test iPad if support remains enabled. Confirm the release displays real backend content and exposes no sample Pro grants or payment demo controls.

Keep backend changes backward-compatible with installed clients. Have a reviewed data migration/backout plan before deploying schema/rules changes. Seed or migrate production only with explicit target checks; build commands must not implicitly run demo seeds or admin provisioning.

For Google Play, progress from internal testing through any required closed testing, review pre-launch reports, and promote the **tested AAB/version code** to production. Use staged rollout percentages when Play offers them; first-release availability can differ. Monitor crash/ANR reports and support cases before expanding rollout.

For Apple, submit the tested build for App Review, resolve findings, and select manual or automatic release deliberately. Phased release applies to eligible app updates rather than guaranteeing a phased first launch. Verify the listing's actual countries and availability after approval. A queued upload is not a deployed release.

## 14. Recovery and the next release

1. Halt a problematic staged Play rollout or pause the eligible Apple phased release. This does not uninstall a bad build from phones that already received it.
2. Identify the exact build, source commit, backend target, and failure. Inspect logs without collecting private user content unnecessarily.
3. Produce a fixed binary with a **higher** Android version code/iOS build number. You may rebuild known-good source, but cannot reuse an already-uploaded build number.
4. Test the fix against existing installed clients and production data before resubmission. Reverting server rules/schema blindly can break older clients or data access.
5. Communicate through the project's support process and document the release result, not just the command exit status.

This project currently has no `expo-updates` dependency or update URL/runtime setup. **EAS Update is not an available emergency hotfix path here.** Native changes always require a new compatible binary; adding OTA updates is separate configuration and release work.

Keep the release record small but complete: commit, version/build numbers, EAS build/submission IDs, CLI and image, backend project identifiers, artifact hashes, device-test results, store track/status, known issues, and person responsible for release. Store private keys and account recovery separately. Recheck the cited platform requirements before the next release because SDK, billing, and review rules change.
