<img src="assets/logo-mark.png" width="72" height="72" alt="EdumentX book and map-pin logo">

# EdumentX for Android

EdumentX helps students and parents in Nepal find nearby tutors and request a place in their schedule. Tutors manage availability, enrollments, and group batches in the Android app.

This Android app is the original **academic minor project**. The separate iOS version is an AI-assisted, experimental port and may contain errors. Later maintenance and documentation in this repository also use AI assistance.

This repository contains the React Native Android client, shared backend functions, and security rules. The separate [EdumentX-iOS](https://github.com/SuhanVerse/EdumentX-iOS) client uses SwiftUI and xtool on Ubuntu. Both apps are in development; the native iOS client currently builds as an unsigned sample trial.

The older React Native iOS target is retained here until native integration and device tests pass. The app name stays **EdumentX**; `EdumentX-Android` identifies this source repository.

<p align="center">
  <img src="Documentation/assets/enrollment-overview.png" width="440" alt="Enrollment overview: a student browses tutors and sends a request; the tutor accepts and assigns an available slot.">
</p>

## What you can do

- Find tutors on a map, filter results, read reviews, and save profiles.
- Send enrollment requests, choose preferred slots, and track enrollments.
- Set tutoring availability, accept requests, and manage student rosters and group batches.
- Send direct messages with read receipts and receive notifications.
- Submit tutor documents for verification; review applications and manage accounts through the admin screens.
- Search for tutors through an AI assistant. The optional eSewa demonstration is restricted to explicitly enabled development builds; production purchase routes are disabled.

Sign-in uses email/password with email verification, or Google. Students and tutors have separate onboarding and dashboards.

## Run locally

Use Node **24.16.0** from [`.nvmrc`](.nvmrc) and npm 11. The tested npm baseline is 11.21.0. Android builds also need a compatible JDK, Android SDK, and emulator or device. **This app requires a native development build; Expo Go is unsupported.**

Start with a fresh clone:

```bash
git clone https://github.com/SuhanVerse/EdumentX-Android.git
cd EdumentX-Android
nvm install
nvm use
npm ci
npm run setup:check
if [ ! -e .env ]; then cp .env.example .env; fi
```

Fill in public Supabase configuration and a restricted Android Maps key in `.env`. Use your own Firebase Android configuration or an owner-approved development backend. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` when using your own Google project. The [setup guide](Documentation/03-Implementation-Guides/PROJECT_SETUP.md) covers JDK/SDK versions, Firebase and Google Sign-In; [installation](Documentation/05-Build-and-Deploy/install-guide.md) covers devices and signing.

Build the Android app:

```bash
npm run setup:check -- --android
npm run android
```

With a compatible development client already installed, use `npx expo start --dev-client`. Sign in, complete a student profile, and browse available tutors.

`EXPO_PUBLIC_USE_MOCK_DATA=true` selects mocks in participating domains, including the assistant. Authentication and some Firestore reads remain live. Restart Metro after changing environment values.

## Development

The app uses Expo SDK 54, React Native, TypeScript, NativeWind, Expo Router, and Zustand. Firebase provides native authentication, Firestore, and push-trigger functions; Supabase provides storage and Edge Functions. Android maps use Google Maps. The Swift client shares the backend contracts and has its own build instructions.

Use `npm ci` to install the exact dependencies in the committed lockfile. [requirements.txt](requirements.txt) provides a generated overview of locked versions; it is not a Python installer for this app. The Cloud Functions runtime and lockfile are separate under `functions/`.

Run the local checks:

```bash
npm run typecheck
npm run lint
npm run test:derived
npm run test:lint-rules
```

See [local Firestore rules tests](Documentation/03-Implementation-Guides/PROJECT_SETUP.md#local-firestore-rules-tests) for emulator checks. `npm run test:rules` also requires credentials to compare deployed rules. [CI](.github/workflows/ci.yml) defines the automated checks and optional credentialed smoke tests.

Live features depend on the configured backend, deployed rules, storage policies, and search data. eSewa remains sandbox-only and unavailable in production builds. The project targets $0 at demo usage within service quotas; see the [architecture and cost policy](Documentation/01-Architecture/ARCHITECTURE.md).

## Learn and contribute

Start with the [codebase and learning guide](Documentation/00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) for source-reading order, feature walkthroughs, and practice exercises. The [documentation index](Documentation/README.md) links the remaining guides; the [deployment runbook](Documentation/05-Build-and-Deploy/DEPLOYMENT_GUIDE.md) covers distribution. For your immediate next steps, use the short [owner guide](Documentation/05-Build-and-Deploy/PERSONAL_RELEASE_STEPS.md).

Read [AGENTS.md](AGENTS.md) before changing code. Keep credentials and private user data out of commits.

Licensed under [GNU GPL v3](LICENSE). See [reference-asset attributions](Documentation/07-Design-Context/ASIM_DESIGN_ATTRIBUTIONS.md) for third-party material.
