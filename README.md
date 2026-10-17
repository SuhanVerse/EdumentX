<img src="assets/logo-mark.png" width="72" height="72" alt="EdumentX book and map-pin logo">

# EdumentX

EdumentX helps students and parents in Nepal find nearby tutors and request a place in their schedule. Tutors manage availability, enrollments, and group batches in the same Android and iOS app.

The project is in development. This repository contains the mobile app, backend functions, and security rules.

<p align="center">
  <img src="Documentation/assets/enrollment-overview.png" width="440" alt="Enrollment overview: a student browses tutors and sends a request; the tutor accepts and assigns an available slot.">
</p>

## What you can do

- Find tutors on a map, filter results, read reviews, and save profiles.
- Send enrollment requests, choose preferred slots, and track enrollments.
- Set tutoring availability, accept requests, and manage student rosters and group batches.
- Send direct messages with read receipts and receive notifications.
- Submit tutor documents for verification; review applications and manage accounts through the admin screens.
- Search for tutors through an AI assistant and try the eSewa Pro upgrade demonstration with sandbox payments.

Sign-in uses email/password with email verification, or Google. Students and tutors have separate onboarding and dashboards.

## Run locally

Use Node 24 from [`.nvmrc`](.nvmrc) and npm. Android needs the Android SDK and an emulator or device; local iOS builds need macOS, Xcode, and CocoaPods. **This app requires a native development build; Expo Go is unsupported.**

From the repository root:

```bash
nvm use
npm ci
if [ ! -e .env ]; then cp .env.example .env; fi
```

Fill in the public Supabase configuration and restricted Android Maps key in `.env`. Obtain the matching `google-services.json` and `GoogleService-Info.plist` from the project owner. The [setup guide](Documentation/03-Implementation-Guides/PROJECT_SETUP.md) covers configuration and Google Sign-In; [installation](Documentation/05-Build-and-Deploy/install-guide.md) covers devices and signing.

Build for your platform:

```bash
npm run android
# Or, on a Mac configured for iOS:
npm run ios
```

With a compatible development client already installed, use `npx expo start --dev-client`. Sign in, complete a student profile, and browse available tutors.

`EXPO_PUBLIC_USE_MOCK_DATA=true` selects mocks in participating domains, including the assistant. Authentication and some Firestore reads remain live. Restart Metro after changing environment values.

## Development

The app uses Expo SDK 54, React Native, TypeScript, NativeWind, Expo Router, and Zustand. Firebase provides native authentication, Firestore, and push-trigger functions; Supabase provides storage and Edge Functions. Maps use Google on Android and Apple on iOS.

Run the local checks:

```bash
npm run typecheck
npm run lint
npm run test:derived
npm run test:lint-rules
```

See [local Firestore rules tests](Documentation/03-Implementation-Guides/PROJECT_SETUP.md#local-firestore-rules-tests) for emulator checks. `npm run test:rules` also requires credentials to compare deployed rules. [CI](.github/workflows/ci.yml) defines the automated checks and optional credentialed smoke tests.

Live features depend on the configured backend, deployed rules, storage policies, and search data. eSewa remains sandbox-only. The project targets $0 at demo usage within service quotas; see the [architecture and cost policy](Documentation/01-Architecture/ARCHITECTURE.md).

## Learn and contribute

Start with the [codebase and learning guide](Documentation/00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) for source-reading order, feature walkthroughs, and practice exercises. The [documentation index](Documentation/README.md) links the remaining guides; the [deployment runbook](Documentation/05-Build-and-Deploy/DEPLOYMENT_GUIDE.md) covers distribution.

Read [AGENTS.md](AGENTS.md) before changing code. Keep credentials and private user data out of commits.

Licensed under [GNU GPL v3](LICENSE). See [reference-asset attributions](Documentation/07-Design-Context/ASIM_DESIGN_ATTRIBUTIONS.md) for third-party material.
