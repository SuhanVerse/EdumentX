# Firebase Auth — Phase 3 Notes

> **Audience**: developers working on the auth flow, dashboards, or the
> `users/{uid}` Firestore data model.
> **Auth model**: Native Firebase Auth via **Email + Password** (free)
> or **Google Sign-In** (free). Phone OTP was removed on June 21,
> 2026 — Clerk was attempted as a brief replacement on June 20 but
> was reverted the next day (Clerk's `integration_firebase` template
> is now discontinued for new accounts, and the free Spark plan has
> no SMS quota).
> **Project ID in use**: `edumentx-dev` (Firestore region
> `asia-south1`).
> **SDKs**:
>   - `@react-native-firebase/app` + `@react-native-firebase/auth` v24.1.x
>   - `@react-native-firebase/firestore` v24.1.x
>   - `@react-native-google-signin/google-signin` v16.x

This file is the **developer-facing operations doc** for the current
auth + Firestore model. It's a "how to talk to the system and what to
watch out for" doc; the older Clerk-pivot doc is archived under
`Documentation/99-Archive/2026-06-21-clerk-revert/`.

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

The only Firebase env var the dev build reads at runtime are the
`EXPO_PUBLIC_FIREBASE_*` keys themselves (used to bootstrap the
native SDK; see `google-services.json` for the matching native
config). See Section 9 for how rule changes are pushed to the live
project — there is no emulator shim in the app right now.

---

## 2. Files at the project root that this phase needs

| File | Where it comes from | Required for |
|---|---|---|
| `google-services.json` | Firebase Console → Project Settings → Your apps → Android app (`com.anonymous.edumentx`) → Download | Native build. **Must match the SHA-1 / SHA-256 fingerprints in the Firebase Console** — those are already configured from the `eas credentials` output you ran. |
| `.env` | committed | Firebase API keys for the dev project (`EXPO_PUBLIC_FIREBASE_*`) |

If you change the Android package name in `app.json`, **or** rotate
the keystore (`eas credentials` → Keystore → Reset), the SHA-1 /
SHA-256 fingerprints change and you must re-register the Android app
in the Firebase Console and re-download `google-services.json`.

---

## 3. Authentication methods

Two free methods are wired up. There is no Clerk, no SMS, no phone
provider.

### 3a. Email + Password

Lives on the `/email-signup` screen (mode toggle: "Sign up" / "Log
in"). Wraps Firebase Auth's `createUserWithEmailAndPassword` /
`signInWithEmailAndPassword`.

* **Signup flow**:
  1. `signUpWithEmail(email, password)` creates the account and
     immediately fires `sendEmailVerification` (best-effort).
  2. The screen flips to a "check your inbox" panel.
  3. The user taps the link in their email → Firebase Auth sets
     `emailVerified = true` on the server.
  4. The user taps **"I've verified — continue"** on the pending
     panel. The handler calls `auth.currentUser.reload()` to pull
     a fresh token claim, then re-checks `emailVerified`. Without
     the `reload()` call the local cache stays stale and the layout
     guard refuses to advance. **This was Bug #4 in the June 21,
     2026 audit — now fixed.**
  5. `_layout.tsx` then routes the user on to `/role-selection`.

* **Login flow**: `loginWithEmail(email, password)`. If the returned
  `user.emailVerified` is `false`, the screen flips to the same
  "check your inbox" panel (covers the case where someone signed up,
  didn't verify, and is now trying to log in months later).

### 3b. Google Sign-In

Lives on the same `/email-signup` screen, below the email/password
form. Wraps
`@react-native-google-signin/google-signin` + Firebase's
`signInWithCredential(GoogleAuthProvider.credential(idToken))`.

Google users are auto-verified by Google, so they skip the
"check your inbox" step entirely.

> **Setup**: `GoogleSignin.configure({ webClientId: '…' })` is
> called at module load in `services/firebase/authService.ts`. The
> `webClientId` (NOT the Android client ID) is what the native
> library uses to request the ID token. The current value is
> `343719549266-ue4i8d19kqel7sobu6vqheuqftdogndv.apps.googleusercontent.com`
> and was extracted from `google-services.json`. If you rotate the
> Firebase Android client secret, you must re-extract the
> `webClientId`.

---

## 4. Source-of-Truth routing

`app/_layout.tsx` owns the redirect logic. The decision tree runs on
every render where `user` / `role` / `segments` change:

```
0. Wait for the root navigator to mount.
1. While isLoading, do nothing.
2. !user            → /email-signup
3. user && !emailVerified (and password provider) → /email-signup
4. user && verified && !role  → /role-selection
5. user && verified && role   → /student-home or /tutor-home
```

Step 5 is the "Amnesia Login Loop" fix from the June 21, 2026 audit.
Before the fix, an existing user with a populated `users/{uid}.role`
who logged back in was sent to `/role-selection` because the layout
guard saw `role === null` (the doc fetch hadn't resolved yet). The
fix: we read `users/{uid}` immediately inside the
`onAuthStateChanged` callback and write the role into the Zustand
store **before** the redirect effect runs, so by the time the guard
fires the role is already populated.

---

## 5. Doc-collection layout

```
/users/{uid}                        # user profile (owner-only read/write)
  ├── uid                            # string, == auth uid
  ├── email                          # string | null
  ├── displayName                    # string | null (from Firebase Auth)
  ├── username                       # string | null (custom marketplace handle)
  ├── role                           # "student" | "tutor"
  ├── isVerifiedProfessional         # bool (tutor only — set manually after KYC)
  ├── createdAt, updatedAt           # serverTimestamp
  ├── tutorProfile/default           # subcollection doc (if role=tutor)
  └── studentProfile/default         # subcollection doc (if role=student)
```

### `/users/{uid}/tutorProfile/default`

| Field | Type | Notes |
|---|---|---|
| `subjects` | `string[]` | selected from the SUBJECTS list in `TutorProfileScreen` |
| `gradesTeaching` | `string[]` | selected from the GRADES list |
| `yearsExperience` | `number` | int |
| `monthlyRateNpr` | `number` | int — flat monthly figure so parents can budget without doing arithmetic. Field name is `monthlyRateNpr`, NOT `hourlyRateNpr` (renamed June 21, 2026). |
| `location` | `{ neighborhood: string; city: string }` | mirror of `lib/registration.ts#LocationValue` |
| `headline` | `string` | one-line pitch |
| `bio` | `string` | long-form |
| `phoneDisplay` | `string` | formatted phone for display |
| `phone` | `string` | unverified digits-only, for parent-initiated contact |
| `username` | `string` | custom marketplace handle (3–30 chars, `^[a-zA-Z0-9_.]+$`) |
| `fullName` | `string` | user's chosen display name |
| `email` | `string` | mirror of `users/{uid}.email` for read-only consumers |
| `updatedAt` | `serverTimestamp` | |

### `/users/{uid}/studentProfile/default`

| Field | Type | Notes |
|---|---|---|
| `fullName` | `string` | |
| `email` | `string` | mirror of `users/{uid}.email` |
| `username` | `string` | marketplace handle |
| `phone` | `string` | optional contact number |
| `grade` | `string \| null` | one of GRADES (or null for "just exploring") |
| `subjects` | `string[]` | subjects the student wants help with |
| `location` | `{ neighborhood: string; city: string } \| null` | |
| `updatedAt` | `serverTimestamp` | |

---

## 6. Why username is a marketplace handle, not a login credential

`users/{uid}.username` exists so the dashboard / tutor search can
show a memorable handle (e.g. `@aarav_tutors`) instead of an opaque
Firebase `uid`. It is **never** used to sign in — the auth flow is
email + password or Google, period.

Usernames are validated `^[a-zA-Z0-9_.]{3,30}$` on the profile
screens and enforced unique in the Firestore security rules (see
`firebase/firestore.rules`). The username field is optional —
leaving it blank falls back to `displayName` / email local-part /
literal "there" on the dashboards.

---

## 7. Why admin is not selectable from the UI

`UserRole` (in `store/authStore.ts`) is typed as `'student' | 'tutor'
| 'admin' | null`. The `'admin'` value is reserved for the
`admins/{uid}` Firestore collection and the future admin web tool.

`RoleSelection.tsx` only renders student + tutor cards. The only way
to grant admin is to write `role: 'admin'` directly from the
Firebase Console or the admin tool. This keeps the role hierarchy
explicit and prevents privilege escalation through the auth flow.

---

## 8. Email verification — gotchas

* The verification email is sent via Firebase Auth's default
  templated sender (`noreply@edumentx-dev.firebaseapp.com`). For
  production we'd switch this to a custom "from" address via
  Firebase Auth branding — out of scope for the beta.

* `auth.currentUser.reload()` is **mandatory** after the user clicks
  the link. Without it, the cached `User` object stays stale and the
  layout guard refuses to advance. The "I've verified — continue"
  button on `EmailSignUp.tsx` is the only place the app calls
  `reload()`.

* If the user closes the app and re-opens it after verifying, the
  `onAuthStateChanged` callback in `_layout.tsx` re-fires with the
  fresh claim automatically. So the layout guard does the right
  thing on cold start without needing the manual button press.

---

## 9. Deploying rule changes to the live `edumentx-dev` project

We are still in active development, so the single live Firebase
project (`edumentx-dev`) is the source of truth for both Auth state
and Firestore data. There is no separate production project yet — the
"production" surface is the same Google project the dev build talks to.

`firebase/firestore.rules` in the repo is the **canonical** rule
file. To ship a rule change to the live project:

**Option A — Firebase Console (easiest during dev)**

1. Open <https://console.firebase.google.com/project/edumentx-dev/firestore/rules>
2. Select all the existing rules, delete them, and paste the
   contents of `firebase/firestore.rules` from the repo.
3. Click **Publish**.

**Option B — Firebase CLI** (once `firebase login` is done on this
machine)

```bash
npm run deploy:rules         # publishes firebase/firestore.rules
# Optional: also deploy index updates
firebase deploy --only firestore:indexes
```

The CLI reads `firebase.json` (in the repo root) to know which rules
file to push, and `firebase/firestore.rules` is the file it picks up.
`.firebaserc` pins the project alias to `edumentx-dev` so the deploy
target is unambiguous.

**Always re-publish after editing `firebase/firestore.rules`** — the
rules sitting on Google's servers are independent of the file in the
repo. A rule change in the repo is *not* live until you publish it
one of the two ways above.

### Why this matters for the permission-denied bug

If the app reports `firestore/permission-denied` and the local
`firebase/firestore.rules` *does* allow the operation, it almost
always means the local rule hasn't been published to the live
project yet. Re-publish and the error clears within a few seconds.

This is different from the local Firebase emulator workflow, where
rules are read from disk on every request. We are not using the
emulator for the MVP — the dev build talks to Google's live servers
directly.
