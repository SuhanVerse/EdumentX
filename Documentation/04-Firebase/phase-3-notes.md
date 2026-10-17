# Auth and profile contract

Repository contract checked 2026-10-17. This stable filename remains linked from source comments; “Phase 3” is historical naming.

Read the [codebase and learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) for the wider architecture and [project setup](../03-Implementation-Guides/PROJECT_SETUP.md) for installation.

## Identity and configuration

Identity uses native `@react-native-firebase/auth` with email/password and Google Sign-In. `src/services/firebase/authService.ts` wraps these operations using the modular API. There is no Clerk or phone OTP flow.

The native default Firebase app comes from `google-services.json` and `GoogleService-Info.plist`, referenced by `app.json`. App services use `getAuth(getApp())` and `getFirestore(getApp())`; do not add a second web Firebase initializer. `.env` is ignored; public Firebase fields in its template are not a replacement for native service files.

Both platform identifiers currently equal `com.anonymous.edumentx`. Package/bundle changes require a coordinated Firebase, OAuth, signing and EAS migration. Android Google Sign-In also depends on the correct signing-certificate fingerprints; `authService.ts` configures the OAuth **web** client ID used to request an ID token.

## Routing ownership

`src/app/_layout.tsx` owns redirects; `src/store/authStore.ts` holds resolved session state. The auth callback reads account metadata before clearing loading, preventing a returning user from briefly appearing to have no role. The root Stack stays mounted while a loading overlay is shown.

| Condition | Result |
|---|---|
| Navigator/auth loading | Wait |
| Signed out | Auth/onboarding routes only |
| Password provider with unverified email | `/email-signup` pending inbox panel |
| Verified account with no role | `/role-selection` |
| Admin without a populated admin profile | `/admin-profile` |
| Tutor with pending verification | `/tutor-pending` |
| Resolved role | Corresponding dashboard, with allowed feature routes accessible |

Suspended/deleted account metadata causes sign-out during auth resolution. UI routing is not a security boundary; Firestore rules independently authorize requests.

`EmailSignUp.tsx` provides signup/login, Google Sign-In and “I've verified — continue”. Its verification handler reloads the native user before rechecking `emailVerified`. The email link alone does not update an already-cached user object. Google sign-in skips that pending email step.

## Profile writes are atomic

`RoleSelection.tsx` writes auth metadata and navigates to a profile form. It deliberately **does not persist the selected role**. The profile forms commit the role and profile together, then update the auth store.

| Writer | Batch writes |
|---|---|
| `StudentProfileScreen.tsx` | `users/{uid}` with student role + `users/{uid}/studentProfile/default` |
| `TutorProfileScreen.tsx` | `users/{uid}` with tutor role + `users/{uid}/tutorProfile/default` + `tutorVerifications/{uid}` pending submission |

Student profiles hold identity/contact fields, grade, subjects and location. Tutor profiles hold teaching subjects/grades, credentials, experience, documents, location and **`monthlyRateNpr`**. Follow `src/lib/registration.ts` and the actual form payloads for validation and field shapes; usernames are display handles, not login credentials or a documented global-uniqueness guarantee.

The tutor verification queue is authoritative; profile flags cache the state for routing. Approval publishes the public `tutors/{uid}` discovery mirror. A tutor must also be visible and have enabled availability to appear in discovery.

## Authorization boundaries

- `isAdmin()` checks the Firebase Auth `admin: true` custom claim. The `admins/{uid}` ledger drives client routing; neither the ledger nor `users.role` grants rules authority. See [admin access](./adminsetup.md).
- Owner writes cannot change protected root-account status/deletion/subscription fields. Student/tutor role transitions are constrained by rules.
- Pro tier fields on tutor profiles and discovery documents are server-granted after eSewa sandbox verification; clients cannot grant a live subscription.
- Private verification documents upload through the Firebase-token-verified `upload-verification-doc` Edge Function. Migration `017` removes the earlier anonymous write policies. PII reads use short-lived URLs from `verification-doc-url`; demo videos use a separate public bucket.

Read [firestore.rules](../../firebase/firestore.rules) for exact per-path permissions, not an abbreviated schema in this page.

## Rules work and diagnosis

The app normally targets live services; the rules suites target the local emulator. `npm run test:rules` first checks deployed/local drift using credentials, then runs emulator suites. It is not a credential-free unit-test command. Live smoke scripts create temporary users/data and require owner-approved use on the chosen project.

When debugging `permission-denied`, identify the UID/token claim, exact path, operation, payload, query shape and deployed ruleset. Do not assume publication fixes every denial. REST PATCH probes need `updateMask.fieldPaths`; an unmasked PATCH can replace the document.

Known test caveats are documented in rule comments: create rules cannot read an absent production `resource`; optional claims need `.get(key, default)`; local emulator behavior around `exists()` and `diff()` has diverged from production. Preserve verb-specific tests and the repository's `unchanged()` checks.

Rule publication, index changes and service deployments are owner operations in the [deployment runbook](../05-Build-and-Deploy/DEPLOYMENT_GUIDE.md). Local edits alone do not change a released ruleset.
