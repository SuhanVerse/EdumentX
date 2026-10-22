# Set up EdumentX Android

Start with the source checks, then configure a development backend and an Android device. The Android app is the original minor project. The separate [SwiftUI iOS project](https://github.com/SuhanVerse/EdumentX-iOS) has its own setup and is still a development trial.

## 1. Install the JavaScript dependencies

Use the Node version in [.nvmrc](../../.nvmrc) and the npm version recorded in [package.json](../../package.json). With [nvm](https://github.com/nvm-sh/nvm) already installed:

```bash
git clone https://github.com/SuhanVerse/EdumentX-Android.git
cd EdumentX-Android
nvm install
nvm use
npm ci
npm run setup:check
npm run typecheck
npm run lint
npm run test:derived
```

These commands need no `.env`, cloud login, Android SDK, or Apple tools. `npm ci` installs the exact dependency graph in `package-lock.json`. [requirements.txt](../../requirements.txt) is a readable inventory; npm remains the installer. Do not use `pip` to install the mobile dependencies.

Use a writable checkout and separate `node_modules` directories for Windows and Linux. A read-only drive must be fixed through the operating system; `chmod` cannot fix its mount mode.

## 2. Configure development services

Copy the template only when `.env` is absent:

```bash
if [ ! -e .env ] && [ ! -L .env ]; then cp .env.example .env; fi
```

Edit `.env` locally using values from your own or an explicitly authorized development project:

| Setting | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL for storage and Edge Functions |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public client key; privileged service-role keys belong on the server |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps SDK for Android key, restricted to the app's package and signing certificate |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google web OAuth client ID for your Firebase project; leave unset only when authorized to use the existing project |
| `EXPO_PUBLIC_APP_ENV=development` | Development environment label |
| `EXPO_PUBLIC_USE_MOCK_DATA=true` | Sample data in domains that have mock repositories |
| `EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS=false` | Keep the payment demonstration off during normal setup |

`EXPO_PUBLIC_*` values become part of the app bundle. Never put service-account, service-role, LLM, signing, or payment secrets there. Restart Metro after changing client variables.

### Firebase and Google Sign-In

The committed `google-services.json` identifies the existing development Firebase app; it does not provide permission to use that backend. For your own Firebase project:

1. Choose an Android package in `app.json`, then register that exact package in Firebase.
2. Download its `google-services.json` and replace the root copy **locally**, or export `GOOGLE_SERVICES_JSON` with the path to your file. Do not accidentally commit someone else's replacement configuration.
3. Enable Email/Password and Google authentication. Add your debug signing certificate's SHA-1/SHA-256 in Firebase, then download the updated config.
4. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the **web** OAuth client for that same project. The Android OAuth client ID is different.
5. Configure Firestore using the repository's schema, rules, and indexes. Coordinate changes with the backend owner; cloning does not deploy any resources.

Android setup does **not** require `GoogleService-Info.plist`, Xcode, xtool, CocoaPods, or an Apple account. Legacy React Native iOS configuration remains during the staged migration; new iOS work belongs in the separate Swift repository.

### What mock mode covers

Mock mode selects sample repositories for participating domains and the AI conversation pipeline. Native Firebase authentication and some direct Firestore call sites remain live. It is not a complete offline app or a backend-free sign-in demo.

For live mode, authorized Firebase and Supabase resources, deployed policies, and data must already exist. Firestore discovery and Supabase AI search have different data sources; one can contain tutors while the other is empty. Do not expect cloning or installing npm packages to populate either service.

## 3. Prepare Android

Install Android Studio and **JDK 21**. Select these packages in Android Studio's SDK Manager:

- Android SDK Platform 36
- Android SDK Build-Tools 36.0.0
- Android SDK Platform-Tools
- NDK (Side by side) 27.1.12297006
- Android SDK Command-line Tools, plus an emulator image if you need one

These versions come from `app.json` and the locked React Native package. Allow Gradle to download its remaining build dependencies on the first build. Accept the Android SDK licenses when prompted.

For a typical Ubuntu x86-64 installation:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
java -version
adb version
npm run setup:check -- --android
```

Adjust those paths to your installation; other CPU architectures have different JDK directories. Keep the exports in your shell profile after confirming them. The current Gradle 8.14 wrapper supports Java through 24; Java 25 requires a newer Gradle. Use JDK 21 here rather than upgrading Gradle during setup. See the [Gradle compatibility table](https://docs.gradle.org/current/userguide/compatibility.html).

Start an emulator, or connect an Android phone with USB debugging enabled and accept its trust prompt:

```bash
adb devices
npm run android
```

Expo generates the ignored `android/` directory on the first build. Existing native customizations must be reviewed before regenerating it; `prebuild --clean` is not a routine repair command.

After the development app is installed, start subsequent JavaScript sessions with:

```bash
npx expo start --dev-client
```

This app requires a native development build. **Expo Go is unsupported** because Firebase, Google Sign-In, and native maps need native modules. Native dependency, config plugin, Firebase file, OAuth, or Maps-key changes require rebuilding the development client.

## 4. Run optional backend checks

Cloud Functions have a separate dependency tree and lockfile:

```bash
npm --prefix functions ci
npm run setup:check -- --backend
npm --prefix functions run build
```

Root tooling uses Node 24. The hosted Functions runtime is currently Node 20, declared separately in `functions/package.json` and `firebase.json`; building TypeScript locally does not change it. Installing that subproject on Node 24 currently prints an `EBADENGINE` warning for its Node 20 runtime declaration. Its TypeScript build is checked on Node 24 in CI; runtime testing still belongs on the configured backend runtime.

### Local Firestore rules tests

JDK 21+ is required for the Firebase rules emulator. The following command tests only the local rules using a demo project, without cloud credentials:

```bash
npx firebase emulators:exec --only firestore --project demo-edumentx "node scripts/rulesEmulationTest.mjs && node scripts/batchesRulesTest.mjs && node scripts/acceptRequestRulesTest.mjs && node scripts/messagesRulesTest.mjs && node scripts/reviewsListRulesTest.mjs && node scripts/removeEnrollmentRulesTest.mjs && node scripts/tutorDetailsRulesTest.mjs && node scripts/userRulesTest.mjs"
```

The first run downloads the emulator. `npm run test:rules` additionally checks deployed rules and needs credentials; use the explicit local command above when contributing from a fresh clone.

`npm run verify:local` runs the broader local suite once dependencies and the emulator cache exist. Its report distinguishes local checks from native device and store release work. `smoke:*`, `seed:*`, `backfill:*`, `delete:user`, and `deploy:*` commands can modify real services and are not setup steps.

## If something fails

| Symptom | Check |
| --- | --- |
| `EBADENGINE` from npm | Run `nvm install` and `nvm use`; do not bypass the engine requirement |
| `Unsupported class file major version` or Gradle fails on Java 25 | Point `JAVA_HOME` to JDK 21 and check `java -version` |
| Firebase default app is missing | Match `google-services.json` to `app.json`, then rebuild the native client |
| Google Sign-In fails | Match the web client ID, Android package, and installed signing certificate to the same Firebase project |
| Maps is blank or reports a missing key | Configure the restricted Android Maps key and rebuild the client |
| Mock mode still requests Firebase access | Authentication and some Firestore paths remain live; check the authorized development backend |
| Missing native module in Expo Go | Install the app with `npm run android`, then use the development client |

Passing source and setup checks does not prove device permissions, OAuth, maps, uploads, push delivery, or production readiness. Test those in the installed development build. For store preparation, follow [the release guide](../05-Build-and-Deploy/README.md); for learning, follow [the codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md).
