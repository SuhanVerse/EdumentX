# Deployment and distribution runbook

Repository configuration checked 2026-10-17. This describes owner-operated publication; it does not certify current cloud state or store readiness. Start with [project setup](../03-Implementation-Guides/PROJECT_SETUP.md), the [codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) and [native installation](./install-guide.md).

## Choose the operation

| Goal | Existing path |
|---|---|
| Daily native development | `npm run android` / `npm run ios`, then `npx expo start --dev-client` |
| EAS development client | `eas build --platform <android|ios> --profile development` |
| Android internal tester build | `eas build --platform android --profile preview` |
| Store candidate | `eas build --platform <android|ios> --profile production` |
| Submission after release checks | `eas submit --platform <android|ios> --profile production` |

Replace `<android|ios>` with one platform. `eas.json` defines `development` (dev client/internal), `preview` (internal) and `production` (`autoIncrement: true`); app versions come from EAS remote state. Preview/development profiles do not set `ios.simulator`. The app is already linked to an EAS project.

There is no `expo-updates` dependency or update URL/runtime configuration. **EAS Update is not an available hotfix path here**; publish a new artifact for installed preview/release builds. Native changes always require a compatible new binary.

## Before publishing an artifact

1. Confirm the intended commit, app environment, EAS project, signing identity and backend targets. `.firebaserc` defaults to `edumentx-dev`; an EAS profile name does not choose a separate Firebase backend.
2. Preserve `com.anonymous.edumentx` for Android and iOS. Renaming requires coordinated Firebase/OAuth, signing, EAS and store changes, not a last-minute edit.
3. Supply public app configuration through the selected build environment. Exclude service-account/service-role keys and LLM secrets; `EXPO_PUBLIC_*` values are extractable from the shipped bundle. Select mock/live mode deliberately.
4. Run `npm run typecheck`, `npm run lint`, `npm run test:derived` and `npm run test:lint-rules`. Native changes also need a build and device checks.
5. Exercise email verification, Google sign-in, both onboarding paths, map discovery, requests, messages, notifications and relevant admin flows on the intended build. Verify private-document access and sandbox payments when those areas changed.
6. Inspect local native changes before regeneration: ignored `android/` and `ios/` directories are not disposable backups.

Immediately before a store release, verify current [Apple submission requirements](https://developer.apple.com/app-store/submitting/) and [Google Play policy requirements](https://play.google.com/about/developer-content-policy/) against the actual artifact, permissions, privacy disclosures and account configuration. The SDK/target values in `app.json` alone are not proof of compliance.

## Firebase publication — authorized owners only

These commands mutate the selected cloud project. Confirm project access, reviewed changes and quota controls first; do not run them as beginner setup.

```bash
npx firebase deploy --project edumentx-dev --only firestore:rules,firestore:indexes
npm --prefix functions ci
npm --prefix functions run build
npx firebase deploy --project edumentx-dev --only functions
```

`firebase.json` selects `firebase/firestore.rules`, `firestore.indexes.json` and the `functions/` codebase. It specifies Node 20. The four exported functions are **Gen1**, in `asia-south1`, each with `maxInstances: 5`:

| Export | Trigger |
|---|---|
| `onNewChatMessage` | New conversation message |
| `onEnrollmentRequestCreated` | New enrollment request |
| `onEnrollmentRequestDecided` | Request becomes accepted |
| `onEnrollmentRequestDeleted` | Deleted nonaccepted request |

These send Expo push notifications using `users/{uid}.pushTokens`. The Android channel is **`inbox`**, matching `pushService.ts`; APNs/FCM delivery credentials and device permission must also work. Verify with two devices and a background/closed app, then inspect function logs and delivery failures. An exported function is not proof it is deployed.

Budget alerts are notifications, not hard spending caps. `maxInstances` limits concurrency, not total invocations or all project costs. Keep demo usage within the documented free allowances and review [architecture §0](../01-Architecture/ARCHITECTURE.md) before adding dependencies/services.

## Rules verification

`npm run test:rules` first fetches the deployed ruleset (`GOOGLE_APPLICATION_CREDENTIALS` required), then runs local emulator suites. Planned local rule changes can therefore fail the drift stage before publication. Run the emulator portion from `package.json` separately while developing; after an approved deploy, verify drift again.

The `smoke:*` scripts exercise the live backend and create temporary accounts/documents. They need explicit owner authorization for the chosen project; their cleanup code is not a guarantee against all failed-run leftovers. Do not substitute them for local unit checks by default.

## Supabase publication — authorized owners only

Review migrations in order before applying pending SQL. Migration `015` provides the payment ledger; `016` separates private PII and public demo videos; **`017` removes anonymous verification/demo upload policies**. Uploads go through `upload-verification-doc`, which verifies Firebase identity and derives the object path server-side.

For a reviewed function change, deploy its actual directory name, for example:

```bash
supabase functions deploy upload-verification-doc --no-verify-jwt
supabase functions deploy verification-doc-url --no-verify-jwt
supabase functions deploy create-esewa-order --no-verify-jwt
```

Other callable services are `chat`, `groq-proxy` and `verify-identity`. `--no-verify-jwt` bypasses the Supabase gateway verifier because callers use Firebase tokens; each function must retain its own Firebase-token validation. Never interpret the flag as permission to remove authentication.

Keep server secrets in Supabase: Firebase service credentials, provider credentials and storage signing credentials. Storage functions support `STORAGE_SERVICE_JWT` for storage-compatible signing; an opaque `sb_secret_…` value may not satisfy storage JWT validation. Never place this key in `.env` values shipped to clients. PII URLs are short-lived; demo-video public reads are intentional.

[eSewa operations](./esewa_integration.md) remain sandbox-only (`EPAYTEST`). Pro grants happen server-side after verification and before ledger completion. Cloud deployment, SQL application and backfills require review of the exact target and writes; they are not automatic release checklist commands.
