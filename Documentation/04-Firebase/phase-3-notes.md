# Firebase — Phase 3 Notes (Native React Native Firebase)

> **Audience**: developers working on the Firebase Auth + dashboards sprint.
> **Source of truth**: `Documentation/05-Build-and-Deploy/firebase-auth-plan.md` (rewritten June 12, 2026 to use `@react-native-firebase/*` instead of the JS SDK; see `firebase-auth-plan-audit.md` finding #14 for the override).
> **Project ID in use**: `edumentx-dev` (Firestore region `asia-south1`).
> **SDK**: `@react-native-firebase/app` + `@react-native-firebase/auth` + `@react-native-firebase/firestore` (RNFB 21.x on Expo SDK 54 / new architecture).

This file is the **developer-facing operations doc** for Firebase. The plan is the "what to build" doc; this is the "how to talk to Firebase and what to watch out for" doc.

---

## 1. Source of truth for Firebase config

**For the React Native app**: `google-services.json` at the project root. The native Firebase SDK reads it at native build time. It is auto-generated when you register the Android app in the Firebase Console (Project Settings → Your apps → Android).

**For the v2 web admin tool** (out of scope): `.env` keeps `EXPO_PUBLIC_FIREBASE_*` values.

> **⚠️ Do not read `process.env.EXPO_PUBLIC_FIREBASE_*` from React Native code.** The native SDK does not see these values. Reading them at runtime will give you `undefined` and you'll spend a day debugging why auth fails silently. Use `import auth from '@react-native-firebase/auth'` and `import firestore from '@react-native-firebase/firestore'`. That's it.

The only env var we read at runtime is `EXPO_PUBLIC_FIREBASE_USE_EMULATOR` (gated behind `services/firebase/emulator.ts`). Keep it set to `false` in `.env`; flip to `true` only when running `firebase emulators:start` locally.

---

## 2. Files at the project root that this phase needs

| File | Where it comes from | Required for |
|---|---|---|
| `google-services.json` | Firebase Console → Project Settings → Your apps → Android app (`com.anonymous.edumentx`) → Download | Native build. **Must match the SHA-1 / SHA-256 fingerprints in the Firebase Console** — those are already configured from the `eas credentials` output you ran. |
| `.env` | committed | `EXPO_PUBLIC_FIREBASE_USE_EMULATOR` |
| `google-services.plist` (iOS, future) | Firebase Console → Project Settings → Your apps → iOS app | iOS builds. Out of scope for v1. |

If you change the Android package name in `app.json`, **or** rotate the keystore (`eas credentials` → Keystore → Reset), the SHA-1 / SHA-256 fingerprints change and you must re-register the Android app in the Firebase Console and re-download `google-services.json`. The old one will silently break auth.

---

## 3. Doc-collection layout

```
/users/{uid}                        # user profile (owner-only read/write)
  ├── uid                           # string, == userId
  ├── phone                         # E.164 (e.g. "+97798XXXXXXXX")
  ├── fullName                      # string
  ├── email                         # string
  ├── role                          # "student" | "tutor"
  ├── createdAt, updatedAt          # serverTimestamp
  ├── tutorProfile/default          # subcollection doc (if role=tutor)
  └── studentProfile/default        # subcollection doc (if role=student)

/admins/{adminId}                   # admin credentials (see §4 caveats)
  ├── email                         # unique
  ├── displayName                   # string
  ├── role                          # "admin"
  ├── salt                          # base64, per-admin random
  ├── passwordHash                  # sha256(salt + ":" + password), base64
  └── createdAt, updatedAt          # serverTimestamp
```

### `/users/{uid}/tutorProfile/default`

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
| `updatedAt` | `serverTimestamp` | |

### `/users/{uid}/studentProfile/default`

| Field | Type | Notes |
|---|---|---|
| `grade` | `string` | e.g. `"Grade 10"` |
| `subjects` | `string[]` | subjects needed |
| `location` | `{ neighborhood: string; city: string }` | |
| `updatedAt` | `serverTimestamp` | |

### `/admins/{adminId}`

See §4 (admin security caveat) before reading or writing this collection.

---

## 4. Firestore security rules — current state

`firebase/firestore.rules`:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
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

    match /admins/{adminId} {
      // ⚠️ v1: PUBLIC read. See §5. Replace with Cloud Function in v2.
      allow read:  if true;
      allow write: if false;
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

---

## 5. Admin sign-in — v1 security caveat

**This is the single most important thing to know about the v1 admin flow.**

- The `admins` collection is **publicly readable** by design.
- The password is stored as `sha256(salt + ":" + password)` with a per-admin random salt.
- Client-side: the app reads the doc, computes the same hash with the stored salt, and uses `timingSafeEqual` (constant-time comparison) to compare.
- This is **acceptable for the v1 demo** (one seed-admin account, dev environment) but is **not safe for production**.

### v2 plan (out of scope for v1)

1. Create a Cloud Function `matchAdmin(email, password)` that:
   - Verifies the SHA-256 hash server-side (admin SDK has full access).
   - On match, mints a custom token via `admin.auth().createCustomToken(uid)`.
   - Returns `{ customToken, uid, displayName }`.
2. Change the client to call this function on submit.
3. Client receives the custom token, calls `auth().signInWithCustomToken(customToken)`.
4. Now the admin has a real Firebase Auth session; `auth().currentUser` is populated.
5. Tighten the `admins` rule to `allow read: if request.auth != null;` (or remove client reads entirely).

This is tracked here as a v2 ticket. Do not ship `admins` docs to production until the Cloud Function is live.

---

## 6. Phone auth — no reCAPTCHA, no webview

**Big difference from the JS-SDK era**: there is **no `RecaptchaVerifier`, no `applicationVerifier`, no `react-native-webview`, no invisible iframe**.

The native RNFirebase `auth().signInWithPhoneNumber(phone)` call:

```ts
import auth from '@react-native-firebase/auth';

const confirmation = await auth().signInWithPhoneNumber('+97798XXXXXXXX');
// ↑ no second argument
const user = await confirmation.confirm('123456');
```

On Android, RNFirebase calls into the native `FirebaseAuth` SDK which uses **Google Play Integrity** for automatic device verification. On iOS it uses APNs. Both paths are first-party Google APIs, not a webview fallback. The user never sees a reCAPTCHA challenge unless Play Integrity is missing on the device (rare — modern Android devices all have it).

### Common emulator / dev-mode pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `auth/app-not-authorized` on emulator | Emulator image has no Google Play Services | Use a Google APIs emulator image, not a vanilla AOSP one. In Android Studio AVD Manager: choose a system image with "Google Play" in the name. |
| `auth/operation-not-allowed` on first send | Phone sign-in not enabled in Firebase Console | Auth → Sign-in method → Phone → Enable |
| `auth/invalid-app-credential` on real device | SHA-1 / SHA-256 mismatch | Re-run `eas credentials` → Display Fingerprint. Add the values to Firebase Console → Project Settings → Your apps → Android → Fingerprints. Re-download `google-services.json`. |
| OTP never arrives on real device | SMS quota exceeded, or phone number not in test numbers | Add the phone to Auth → Sign-in method → Phone → "Phone numbers for testing" with a fixed code |

For local dev, **always add a test phone** in the Firebase Console (e.g. `+9779800000000` → code `123456`). This bypasses real SMS billing and is the documented path.

---

## 7. Local dev workflow

```bash
# 1. Start the Firestore + Auth emulators
firebase emulators:start
# → Firestore at 127.0.0.1:8080
# → Auth at 127.0.0.1:9099

# 2. Tell the RN app to use them
echo 'EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true' >> .env

# 3. Boot Metro
npx expo start -c
```

When `EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true`, `services/firebase/emulator.ts` calls `firestore().useEmulator('127.0.0.1', 8080)`. (The Auth emulator auto-connects because the native SDK detects the env-flag; no separate call needed.) Verify in the Emulator UI at http://localhost:4000 that the test admin doc and any test users appear in the right collections.

---

## 8. Common error codes (RNFirebase)

Surfaced via `services/firebase/errors.ts → formatFirebaseError(code)`:

| Code | Meaning | UI action |
|---|---|---|
| `auth/invalid-phone-number` | Phone not E.164 or not allowed by region | show "Enter a valid 10-digit Nepali number" |
| `auth/too-many-requests` | SMS quota or rate limit | show "Too many attempts. Try again in 5 minutes." |
| `auth/invalid-verification-code` | OTP mismatch | shake the OTP box, clear the field |
| `auth/code-expired` | OTP > 5 min old | "Code expired. Tap to resend." |
| `auth/network-request-failed` | no network | "Check your connection and try again." |
| `auth/app-not-authorized` | SHA-1 mismatch or missing Play Services | log to crashlytics, show "Auth not configured. Contact support." |
| `auth/operation-not-allowed` | Phone provider not enabled in Console | log to crashlytics, show "Auth not configured. Contact support." |
| `auth/requires-recent-login` | `updatePassword` called > 5 min after sign-in | re-authenticate, then retry |
| `firestore/permission-denied` | rule violation | generic "Unable to save. Please try again." (do not leak rule details) |
| `firestore/not-found` | `users/{uid}` doesn't exist post-OTP | this is the "finish your profile" case — route to `/(auth)/role-selection` |

---

## 9. What to NOT do in v1

- **Don't** read `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` from RN code. The native SDK doesn't see it. Use the imports.
- **Don't** add a `RecaptchaVerifier` to the call site. The native SDK doesn't take one. If you see `auth/argument-error` from `signInWithPhoneNumber`, check that you're not passing a verifier you copied from a JS-SDK tutorial.
- **Don't** install `firebase` or `react-native-webview` for auth. They are no longer needed.
- **Don't** edit `app.json` to add `@react-native-firebase/app` as a config plugin. RNFB 21.x auto-initializes from `google-services.json` at native build time. Adding it will throw "plugin not found" on `expo prebuild`.
- **Don't** change the Android package name without also re-registering the Android app in the Firebase Console. The package name in `app.json` (`com.anonymous.edumentx`) MUST match the one in `google-services.json`.
- **Don't** store the seed admin password in plaintext in the seed script output or in git. The script should write `{ salt, passwordHash }` and print only a `✅ seeded admin: admin@edumentx.dev` confirmation to stdout.
- **Don't** ship `admins` collection docs to production. The rule is public-read by design for v1 demo, which is fine for the dev project, **not** fine for `edumentx-prod`.
- **Don't** add `adminProfile` as a value of the `Role` union type in `types/user.ts`. `adminProfile` is orthogonal — admins are matched in a separate collection, not signed up via the role selection flow.

---

## 10. v2 ticket list

- [ ] Cloud Function `matchAdmin(email, password) → customToken` + client `signInWithCustomToken` swap
- [ ] Tighten `admins` rule to `allow read: if request.auth != null;` (or remove client reads)
- [ ] Cloud Function `signInWithPhonePassword(phone, password) → customToken` to enable phone+password login
- [ ] iOS app registration + `GoogleService-Info.plist`
- [ ] Avatar upload to Firebase Storage (Storage rules are already in place)
- [ ] Tutor verification flow (Blue Tick Pro, document upload)
- [ ] Switch from SHA-256 to bcrypt/argon2 for password storage

---

## 12. Email + password sign-in (100% free, added June 19, 2026)

A third sign-in path alongside phone OTP and Google Sign-In. The phone OTP path stays as the primary flow for users who don't have or don't want to share an email; Google Sign-In is the fast path for users with a Google account. **Email + password** is the free fallback that doesn't burn SMS quota — useful for desktop test users, for users in regions where Google Sign-In is unavailable, and as a recovery path if the phone provider is temporarily down.

### Flow

1. From `/phone-entry` the user taps **"Continue with email"** → routes to `/email-signup` (`screens/auth/EmailSignUp.tsx`).
2. The screen has a `signup` / `login` toggle (matches the visual pattern of `/phone-entry`). In signup mode:
   - `authService.signUpWithEmail(email, password)` calls `createUserWithEmailAndPassword` and immediately `sendEmailVerification` on the new user.
   - The screen flips to the **"Check your inbox"** pending state — shows the email address the link was sent to, a "Resend verification email" link, and an "I've verified — continue" button.
   - **Don't route them to `/role-selection` yet.** The pending screen's job is to keep them on this screen until `emailVerified === true`.
3. The user taps the link in their email → Firebase Auth server flips the `emailVerified` flag on their user.
4. When they tap **"I've verified — continue"**, the screen calls `getAuth(getApp()).currentUser.reload()` to re-read the server-side claims. If `emailVerified` is now `true`, sync the local Zustand store and `router.replace("/role-selection")`.
5. In login mode (existing verified user): `authService.loginWithEmail(email, password)` → `signInWithEmailAndPassword`. If `emailVerified === false` (they signed up but never tapped the link), show the same pending screen. If `true`, route to `/role-selection` directly.

### Client-side guard

The `_layout.tsx` redirect effect has a **new step** between the signed-out and signed-in branches:

```ts
// Signed in via email/password but unverified — bounce to /email-signup.
if (isEmailPasswordUser && !emailVerified) {
  const allowedWhileUnverified = new Set(["email-signup", "phone-entry"]);
  if (!allowedWhileUnverified.has(currentRoute)) {
    router.replace("/email-signup");
  }
  return;
}
```

`isEmailPasswordUser` is `user.providerData.some(p => p.providerId === "password")`. Phone OTP users and Google Sign-In users return `false` for that predicate (their `providerData` is `["phone"]` or `["google.com"]`), so they bypass this check entirely.

### Why the client-side check is "best effort"

This is a UI guard, not a security boundary. A malicious user can patch the JS bundle to skip the check. The **real** authorization layer is in `firestore.rules` (which we extend in a v2 sprint to check `request.auth.token.email_verified === true` on writes to `users/{uid}/studentProfile` and `users/{uid}/tutorProfile`). For v1 the only data an unverified user can read is the public docs, so the risk is low.

### Quota + cost

`sendEmailVerification` has no per-message cost — it's counted against the project's Auth quota, which defaults to a few hundred sends/day. Plenty for a single-country beta. **No billing setup is required.** If we ever blow past the default, raise the quota in Firebase Console → Authentication → Sign-in method → Email/Password → "Email link quota".

---

## 13. Logout from dashboards (added June 19, 2026)

Before this change, there was no way to clear the Firebase Auth session once signed in — the dashboards had no logout button, and there was no profile/settings screen. The fix:

- `store/authStore.ts` gained a `reset()` action that clears `user`, `role`, `confirmationResult`, and flips `isLoading` to `false`.
- `services/firebase/authService.ts` already had `logout()` (the modular `auth.signOut()`). No changes there.
- Both dashboards (`screens/student/student_home.tsx`, `screens/tutor/tutor_home.tsx`) now have a destructive-styled **"Log out"** `Pressable` at the bottom of the ScrollView, with a confirmation dialog so an accidental tap doesn't destroy the session. The handler:
  1. Calls `await logout()`.
  2. Calls `useAuthStore.getState().reset()` to drop the cached `user` and `role`.
  3. `router.replace("/phone-entry")` — `replace`, not `push`, so the dashboard isn't left under the auth screen in the navigation stack.
- The `_layout.tsx` guard's `onAuthStateChanged` callback also resets the store when Firebase Auth fires its `null` user event, so even if the dashboard's `reset()` call were skipped, the layout guard would catch it on the next render.

The new `reset()` action is also useful for tests that need to reset state between cases.

---

*Maintained by SuhanVerse · June 19, 2026 (added email verification §12, logout from dashboards §13; dashboard mock-data milestone)*

---

## 11. Dashboards — current state

The student and tutor dashboards were implemented on June 17, 2026 (PRs #28 and #30) as **UI-only milestones with mock-data arrays**. They render correctly and the auth-guard correctly routes `student` → `/student-home` and `tutor` → `/tutor-home`. The next sprint (Sprint 4 — Map & Discovery) replaces the mocks with live Firestore queries.

| Route | File | Mock data sources (to be replaced) | Real Firestore source |
|---|---|---|---|
| `/student-home` | `screens/student/student_home.tsx` | `MOCK_TUTORS`, `PROFILE` | `tutors/{uid}` for self, `tutors` collection (geo + subject filter) for the rest |
| `/tutor-home` | `screens/tutor/tutor_home.tsx` | `TUTOR_PROFILE`, `TODAY_SESSIONS`, `PENDING_REQUESTS`, `BATCH_REQUESTS`, `SESSION_SLOTS` | `tutors/{uid}` (self profile), `sessions` (today filter), `enrollmentRequests` (tutorId + status==pending), `batchRequests` (tutorId + status==pending) |

The TODO markers in those files name the exact Firestore collection + filter for each mock block.

---

*Maintained by SuhanVerse · June 19, 2026 (dashboards merged into main; mock-data milestone)*
