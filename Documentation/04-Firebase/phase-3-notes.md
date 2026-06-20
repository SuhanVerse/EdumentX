# Firebase + Clerk — Phase 3 Notes (post-Clerk-pivot)

> **Audience**: developers working on the auth flow, dashboards, or the
> `users/{uid}` Firestore data model.
> **Pivot date**: June 20, 2026 — identity moved from Firebase Auth to
> Clerk Auth. Firebase is retained **only** for Firestore. The two
> systems are bridged by `components/ClerkFirebaseBridge.tsx` (the
> "Silent Bridge"), which signs the RNFirebase client in/out in the
> background as the Clerk session changes. See
> `Documentation/04-Firebase/Clerk_Integration.md` for the original
> integration spec.
> **Source of truth for the integration design**:
> `Documentation/04-Firebase/Clerk_Integration.md`.
> **Project ID in use**: `edumentx-dev` (Firestore region `asia-south1`).
> **SDK**: `@clerk/clerk-expo` v2.19.x (identity) + `@react-native-firebase/app` + `@react-native-firebase/firestore` (data) + `@react-native-firebase/auth` (used **only** by the bridge for `signInWithCustomToken` — never call it from feature code).

This file is the **developer-facing operations doc** for the
post-pivot auth + Firestore model. It's a "how to talk to the system
and what to watch out for" doc; the original plan files
(`firebase-auth-plan.md`, `firebase-auth-plan-audit.md`) are kept
under `Documentation/05-Build-and-Deploy/` for historical context but
are **superseded by the Clerk pivot**.

---

## 1. Source of truth for Firebase config

**For the React Native app**: `google-services.json` at the project
root. The native Firebase SDK reads it at native build time. It is
auto-generated when you register the Android app in the Firebase
Console (Project Settings → Your apps → Android).

**For the v2 web admin tool** (out of scope): `.env` keeps
`EXPO_PUBLIC_FIREBASE_*` values. The RN app does **not** read these
at runtime — see the warning below.

> **⚠️ Do not read `process.env.EXPO_PUBLIC_FIREBASE_*` from React
> Native code.** The native SDK does not see these values. Reading
> them at runtime will give you `undefined` and you'll spend a day
> debugging why Firestore writes fail silently. Use
> `import { getFirestore, getApp, doc, setDoc } from '@react-native-firebase/firestore'`. That's it.

The only Firebase env var we read at runtime is
`EXPO_PUBLIC_FIREBASE_USE_EMULATOR` (gated behind
`services/firebase/emulator.ts`). Keep it set to `false` in `.env`;
flip to `true` only when running `firebase emulators:start` locally.

The only Clerk env var we read at runtime is
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`. This goes to
`<ClerkProvider>` in `app/_layout.tsx`. Get it from the Clerk
Dashboard → API Keys.

---

## 2. Files at the project root that this phase needs

| File | Where it comes from | Required for |
|---|---|---|
| `google-services.json` | Firebase Console → Project Settings → Your apps → Android app (`com.anonymous.edumentx`) → Download | Native build. **Must match the SHA-1 / SHA-256 fingerprints in the Firebase Console** — those are already configured from the `eas credentials` output you ran. |
| `.env` | committed | `EXPO_PUBLIC_FIREBASE_USE_EMULATOR`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `google-services.plist` (iOS, future) | Firebase Console → Project Settings → Your apps → iOS app | iOS builds. Out of scope for v1. |

If you change the Android package name in `app.json`, **or** rotate
the keystore (`eas credentials` → Keystore → Reset), the SHA-1 /
SHA-256 fingerprints change and you must re-register the Android app
in the Firebase Console and re-download `google-services.json`. The
old one will silently break the ClerkFirebaseBridge (Firebase rejects
the custom token with `auth/invalid-app-credential`).

---

## 3. How Clerk and Firestore identify the same user

The bridge works because Clerk's `integration_firebase` JWT template
mints a Firebase-shaped custom token whose `uid` claim is the Clerk
user id. The RNFirebase `signInWithCustomToken()` call decodes that
token and uses the `uid` claim as the local Firebase user id. From
that point on, every Firestore `request.auth.uid` is the Clerk user
id.

This means **the document path `users/{clerkUid}` works in every
security rule, every client query, and every server-side call** —
without any extra mapping layer. The single source of truth for the
user identity is Clerk; Firestore just uses the id it gets.

If you ever need to look up a user by Clerk id, the path is
`firestore.collection('users').doc(clerkUserId)`. If you ever need to
look up a Clerk user by Firestore doc id, call
`clerkClient.users.getUser(firestoreDocId)`. The two systems stay in
lock-step.

---

## 4. Doc-collection layout

```
/users/{clerkUid}                    # user profile (owner-only read/write)
  ├── uid                            # string, == clerkUserId
  ├── email                          # string | null
  ├── displayName                    # string | null
  ├── username                       # string | null (custom username, 3-30 chars)
  ├── role                           # "student" | "tutor"
  ├── createdAt, updatedAt           # serverTimestamp
  ├── tutorProfile/default           # subcollection doc (if role=tutor)
  └── studentProfile/default         # subcollection doc (if role=student)
```

### `/users/{clerkUid}/tutorProfile/default`

| Field | Type | Notes |
|---|---|---|
| `subjects` | `string[]` | selected from the SUBJECTS list in `TutorProfileScreen` |
| `gradesTeaching` | `string[]` | selected from the GRADES list |
| `yearsExperience` | `number` | int |
| `hourlyRateNpr` | `number` | int |
| `location` | `{ neighborhood: string; city: string }` | mirror of `lib/registration.ts#LocationValue` |
| `headline` | `string` | one-line pitch |
| `bio` | `string` | long-form |
| `phoneDisplay` | `string` | formatted phone for display |
| `phone` | `string` | unverified digits-only, for parent-initiated contact (collected on the profile screen) |
| `username` | `string` | unverified, mirrors `users/{clerkUid}.username` |
| `fullName` | `string` | |
| `email` | `string` | |
| `updatedAt` | `serverTimestamp` | |

### `/users/{clerkUid}/studentProfile/default`

| Field | Type | Notes |
|---|---|---|
| `grade` | `string` | e.g. `"Grade 10"` |
| `subjects` | `string[]` | subjects needed |
| `location` | `{ neighborhood: string; city: string }` | |
| `phone` | `string` | unverified digits-only, for parent-initiated contact |
| `username` | `string` | unverified, mirrors `users/{clerkUid}.username` |
| `fullName` | `string` | |
| `email` | `string` | |
| `updatedAt` | `serverTimestamp` | |

`/admins/{adminId}` was removed entirely in the Clerk pivot — admin
sign-in is now a separate Clerk user with a `publicMetadata.role` of
`"admin"` (out of scope for v1).

---

## 5. Firestore security rules — current state

`firebase/firestore.rules`:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    // `request.auth.uid` is the Clerk user id, not a Firebase uid —
    // ClerkFirebaseBridge uses the `uid` claim on the custom token as
    // the Firebase local uid, so the two are equal.
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    match /users/{userId} {
      allow create: if isOwner(userId) && request.resource.data.uid == userId;
      allow read:   if isOwner(userId);
      allow update: if isOwner(userId) && request.resource.data.uid == userId;
      allow delete: if false;

      match /tutorProfile/{document=**} {
        allow read:  if isOwner(userId);
        allow write: if isOwner(userId);
      }
      match /studentProfile/{document=**} {
        allow read:  if isOwner(userId);
        allow write: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy:

```bash
firebase deploy --only firestore:rules
```

Test (using the emulator suite):

```bash
firebase emulators:exec --only firestore "npm run test:rules"   # if a rules test script exists
```

The owner check is unchanged from the pre-pivot rules. The only
difference is that `request.auth.uid` now flows from Clerk's
custom-token `uid` claim instead of from a Firebase-owned account,
but the rules don't care where the uid came from.

---

## 6. The Silent Bridge — `components/ClerkFirebaseBridge.tsx`

This is the single component that owns the Clerk ↔ Firestore
identity mapping. **It is the only place in the codebase allowed to
import from `@react-native-firebase/auth`.**

What it does, in order:

1. Watches `useAuth()` from `@clerk/clerk-expo`.
2. While Clerk is loading, does nothing. The Firestore reads on the
   layout guard will fail with `auth/...` until this bridge signs the
   client in; that's expected and the layout guard is written to
   tolerate it.
3. When Clerk reports a signed-in user that we haven't already
   bridged, calls `useAuth().getToken({ template:
   'integration_firebase' })`. The JWT template is configured in the
   Clerk Dashboard; its name is hardcoded as
   `FIREBASE_JWT_TEMPLATE` in the component file.
4. Hands the token to `signInWithCustomToken(auth, token)`. The
   resulting Firebase user id is the Clerk user id (it's the `uid`
   claim in the token). The bridge stores the bridged uid in a
   `useRef` so it doesn't refetch the JWT on every Clerk re-render.
5. When Clerk reports a sign-out, calls `firebaseSignOut()` to drop
   the Firebase session.

Failure modes the bridge is designed to handle:

| Symptom | Cause | Bridge behavior |
|---|---|---|
| `getToken` returns `null` | The `integration_firebase` JWT template isn't enabled in the Clerk Dashboard, or it's named differently | Logs a clear error to the console. The Firestore writes will fail with `auth/custom-token-mismatch` — the dev sees a single console message naming the template and the Dashboard location. |
| `signInWithCustomToken` throws | Token expired or signed with a key Firebase doesn't trust | Logs the error. The next render where `useAuth()` re-emits a new session will retry. |
| `firebaseSignOut` throws | Already signed out (we triggered the sign-out ourselves) | Caught and swallowed. The only way this can fail is if Firebase was already signed out, in which case the throw is benign. |
| `useAuth()` returns `isLoaded: false` | Clerk is still resolving the session from SecureStore | The bridge effect early-returns. No token fetch is attempted. |

---

## 7. Auth flow — Unified Passwordless Gateway

The pre-pivot flow had three entry points (phone OTP, email/password,
Google). After the pivot there is **one** entry point
(`screens/auth/PhoneEntryScreen.tsx`) that handles both sign-in and
sign-up.

```
+----------------------------+
|  /phone-entry              |
|                            |
|  Identifier input          |
|  (email OR username)       |
+----------------------------+
              |
              v
+--------------------------------+
| signIn.create({ identifier })  |
+--------------------------------+
   |                  |
   | needs_first_     | form_identifier_not_found
   | factor           |
   v                  v
prepareFirstFactor    signUp.create({ emailAddress })
{ strategy:           +
   'email_code' }     signUp.prepareEmailAddressVerification(
                      { strategy: 'email_code' })
   |                  |
   +--------+---------+
            |
            v
+----------------------------+
|  /otpverify                |
|  mode: 'signin' | 'signup' |
+----------------------------+
            |
            v
   attemptFirstFactor        attemptEmailAddressVerification
   ({ strategy:              ({ code })
      'email_code',
      code })
            |
            v
   setActive({ session: createdSessionId })
            |
            v
+----------------------------+
|  app/_layout.tsx           |
|  layout guard: read        |
|  users/{clerkUid}.role,    |
|  route to dashboard        |
+----------------------------+
```

Google Sign-In is a parallel entry that bypasses the gateway
entirely: `useOAuth({ strategy: 'oauth_google' })` from
`@clerk/clerk-expo` opens Clerk's native OAuth popup, returns a
session id, and the layout guard takes over.

The `/role-selection` and `/profile-{student,tutor}` screens still
exist; they're reached when the layout guard sees a signed-in user
without a role, or with a role but no profile subdoc yet.

### Username support

The Clerk dashboard has the **Username requirement turned OFF**.
That means Clerk doesn't require a username at sign-up, but it still
*allows* one. The Unified Passwordless Gateway accepts a username as
the identifier; if `signIn.create({ identifier: "alice" })` succeeds
Clerk resolves it to the user, sends the email_code to the linked
email, and we never see the email on the OTP screen (we just say
"the email linked to alice").

If the username doesn't exist and the user typed a username rather
than an email, we **reject the sign-up** with a clear message — Clerk
rejects a `signUp.create({ emailAddress: "alice" })` call, and we
shouldn't pretend otherwise. The "I don't have an account" case for
a username resolves to "please enter your email" rather than
silently treating the username as an email.

---

## 8. Local dev workflow

```bash
# 1. Start the Firestore emulator
firebase emulators:start
# → Firestore at 127.0.0.1:8080

# 2. Tell the RN app to use it
echo 'EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true' >> .env

# 3. Boot Metro
npx expo start -c
```

When `EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true`,
`services/firebase/emulator.ts` calls
`firestore().useEmulator('127.0.0.1', 8080)`. Verify in the Emulator
UI at http://localhost:4000 that the test user docs appear under
`users/{clerkUid}`.

> **Note**: the Auth emulator is no longer used. Clerk is the identity
> provider, and Clerk doesn't have a local emulator on the free tier
> (you can use their staging keys for dev, but you can't fully
> replicate the production flow). For dev, use a Clerk **dev
> instance** with test email addresses and the real Email OTP flow —
> codes arrive in your inbox. The `integration_firebase` JWT template
> is enabled in dev too; just make sure the dev instance has the
> Firebase integration toggled on.

---

## 9. Common error codes (post-pivot)

Surfaced via inline `formatClerkError` helpers in
`screens/auth/PhoneEntryScreen.tsx` and `screens/auth/OtpVerify.tsx`:

| Code | Meaning | UI action |
|---|---|---|
| `form_identifier_not_found` | The identifier (email or username) doesn't match a Clerk user | caught internally; fall through to sign-up |
| `form_identifier_exists` | Trying to sign up with an email that already has a Clerk account | "An account with that email already exists. Try logging in instead." |
| `verification_expired` | The 6-digit code was older than 10 minutes | "That code has expired. Please request a new one." |
| `verification_failed` | The 6-digit code didn't match | "The code you entered didn't match. Please try again." |
| `too_many_requests` | Rate limit on the code-resend endpoint | "You've made too many attempts. Please wait a minute." |
| `network_error` / `network_timeout` | Connectivity | "Check your connection and try again." |
| `firestore/permission-denied` | Rule violation | generic "Unable to save. Please try again." (do not leak rule details) |
| `firestore/not-found` | `users/{uid}` doesn't exist post-OTP | This is the "finish your profile" case — route to `/role-selection` |

---

## 10. What to NOT do in v1

- **Don't** read `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` from RN
  code. The native SDK doesn't see it. Use the imports.
- **Don't** call `getAuth()`, `signInWithCustomToken()`, or
  `firebaseSignOut()` from anywhere except
  `components/ClerkFirebaseBridge.tsx`. Other code paths go through
  Clerk.
- **Don't** add Firebase Auth to your feature code for OTP, sign-in,
  sign-up, or Google. Clerk owns all of those.
- **Don't** add `@react-native-google-signin/google-signin` back to
  the project. Clerk's `useOAuth({ strategy: 'oauth_google' })`
  replaces it.
- **Don't** edit `app.json` to add `@react-native-firebase/app` as a
  config plugin. RNFB 21.x auto-initializes from `google-services.json`
  at native build time. Adding it will throw "plugin not found" on
  `expo prebuild`.
- **Don't** change the Android package name without also re-registering
  the Android app in the Firebase Console. The package name in
  `app.json` (`com.anonymous.edumentx`) MUST match the one in
  `google-services.json`.
- **Don't** write to `users/{uid}` from a code path that doesn't go
  through the bridge. If the bridge hasn't completed, your write
  will fail with `auth/...` and you'll blame the rules. The layout
  guard tolerates this; feature code should not.
- **Don't** use `signIn.create({ identifier: ... })` to test for
  account existence from feature code. It burns a sign-in attempt
  rate limit on Clerk. The only place this call belongs is the
  catch-and-fallback in `PhoneEntryScreen.tsx`.
- **Don't** put `confirmationResult` (or any Firebase Auth state) in
  the Zustand store. Clerk's `signIn` / `signUp` objects own that;
  if you feel the need to persist it, you almost certainly want a
  Clerk session token instead.

---

## 11. v2 ticket list (post-pivot)

- [ ] Cloud Function to set `publicMetadata.role = 'admin'` on a Clerk
  user (so admins can sign in via Clerk and the layout guard reads
  the role from Clerk instead of Firestore)
- [ ] Tighten `users/{uid}` rules with a `request.auth.token.email_verified
  === true` check on profile writes (now possible because Clerk
  sets `email_verified` in the custom token)
- [ ] iOS app registration + `GoogleService-Info.plist`
- [ ] Avatar upload to Firebase Storage (Storage rules are already in
  place)
- [ ] Tutor verification flow (Blue Tick Pro, document upload)
- [ ] Username uniqueness check via Cloud Function (currently the
  username lives only in Firestore; clients can write duplicates)

---

## 12. Dashboards — current state

The student and tutor dashboards were implemented on June 17, 2026
(PRs #28 and #30) as **UI-only milestones with mock-data arrays**.
They render correctly and the auth-guard correctly routes
`student` → `/student-home` and `tutor` → `/tutor-home`. The next
sprint (Sprint 4 — Map & Discovery) replaces the mocks with live
Firestore queries.

| Route | File | Mock data sources (to be replaced) | Real Firestore source |
|---|---|---|---|
| `/student-home` | `screens/student/student_home.tsx` | `MOCK_TUTORS`, `PROFILE` | `users/{clerkUid}` for self, `users` collection (role==tutor, filter by `tutorProfile.subjects` + `tutorProfile.location`) for the rest |
| `/tutor-home` | `screens/tutor/tutor_home.tsx` | `TUTOR_PROFILE`, `TODAY_SESSIONS`, `PENDING_REQUESTS`, `BATCH_REQUESTS`, `SESSION_SLOTS` | `users/{clerkUid}/tutorProfile/default` (self profile), `sessions` (tutorId filter), `enrollmentRequests` (tutorId + status==pending), `batchRequests` (tutorId + status==pending) |

The TODO markers in those files name the exact Firestore collection +
filter for each mock block.

The dashboards' sign-out handlers call `useClerk().signOut()` from
`@clerk/clerk-expo`, which fires the bridge's `firebaseSignOut()`
for us. They then call `useAuthStore.getState().reset()` to drop the
cached `user` and `role`, and `router.replace("/phone-entry")` to
clear the navigation stack.

---

*Maintained by SuhanVerse · June 20, 2026 (post-Clerk-pivot rewrite;
supersedes the June 19 phone OTP / email-password / dashboards
version of this file).*
