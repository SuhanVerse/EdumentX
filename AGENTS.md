# EdumentX System Directives

You are an expert React Native + NativeWind engineer building EdumentX.

## Architectural Rules

1. **Use standard React Native primitives** (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) for layout — apply styling through NativeWind `className` props, not inline `style={{}}` objects.
2. **Never use Tamagui.** All `@tamagui/*` packages and `tamagui.config.ts` have been removed. Do not reintroduce them.
3. **Never hardcode hex colors.** Always use design tokens defined in `tailwind.config.js` (e.g., `bg-night`, `text-amber`, `border-border`). The narrow exceptions are SVG illustrations (`src/components/illustrations/*`) where `react-native-svg` primitives need raw hex — those consume `src/constants/colors.ts`.
4. **Reference Sandbox:** The folder `Documentation/98-Reference-BasoBas/` contains a React web app. You may study its UX logic, component composition, and layout structures, but you MUST translate those concepts into pure React Native + NativeWind code before writing anything to our `src/app/` or `src/components/` directories.
5. **Auth is native Firebase Auth.** Use `@react-native-firebase/auth` (`getAuth(getApp())`, `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInWithCredential`, etc.) and `@react-native-google-signin/google-signin` for Google Sign-In. The unified entry point is `src/screens/auth/EmailSignUp.tsx` — it hosts both the Email + Password form and the "Continue with Google" button. Do NOT reintroduce Clerk; a one-day pivot to Clerk (June 20) was reverted the next day (Clerk's `integration_firebase` template is discontinued for new accounts). The Clerk-pivot history is archived under `Documentation/99-Archive/2026-06-21-clerk-revert/`.
6. **Zero-budget / free-tier only.** This project is a college demo built without an international credit card. **Never suggest Firebase Cloud Storage, Firebase Cloud Functions, Google Maps SDK, Google Places API, OpenAI, Anthropic, Cohere, Mapbox, or Algolia** — all require a paid plan or card. Object storage lives in **Supabase Storage** (1 GB free, no card). Map tiles come from **OpenStreetMap** via `react-native-maps` `<UrlTile>` (no key). Geocoding uses **Nominatim** (keyless). Distance / KNN / matching math runs **client-side** (no Cloud Functions). The RAG chatbot uses **Groq** or **HuggingFace Serverless Inference** (free dev tier). Before adding any new dependency, update `Documentation/01-Architecture/ARCHITECTURE.md` §0 with a row justifying it as zero-budget. If it can't be justified, replace the feature or remove it.

## Translation Protocol

When referencing the BasoBas project (found in `Documentation/98-Reference-BasoBas/`):

* DO NOT copy BasoBas CSS, Tailwind classes, or standard React Native components wholesale — study the *ideas*, not the markup.
* ONLY study their UX flow, navigation logic, and layout composition.
* ALWAYS rewrite their UI logic into our EdumentX design system using React Native primitives + NativeWind classes (`bg-night`, `text-amber`, `rounded-card`, `p-4`).
* Read `Documentation/98-Reference-BasoBas/ANALYSIS.md` first for the per-file translation map.

## Current State

> Living snapshot — each block below carries its own date. The auth
> narrative is the **June 21, 2026** snapshot (the Clerk-revert pivot);
> the dashboard / enrollments / testing blocks are **Aug 2026**.

**Phase 2 (Native Firebase Auth) — Complete (June 21, 2026 snapshot)**

Identity lives in native Firebase Auth. Two free methods are wired up:
**Email + Password** (via `createUserWithEmailAndPassword` +
`sendEmailVerification`) and **Google Sign-In** (via
`@react-native-google-signin/google-signin` + `signInWithCredential`).
There is no Clerk, no SMS, and no phone provider — Firebase's SMS OTP
requires the paid Blaze plan, and a one-day Clerk pivot (June 20) was
reverted after Clerk discontinued their `integration_firebase` template
for new accounts.

The Clerk-pivot history is archived under
`Documentation/99-Archive/2026-06-21-clerk-revert/`.

**Auth flow (Email + Password / Google):**
- `src/screens/auth/EmailSignUp.tsx` — single auth entry screen with a
  "Sign up" / "Log in" toggle. On signup, calls
  `signUpWithEmail(...)` and flips to a "check your inbox" pending
  panel that hosts the **"I've verified — continue"** button. That
  button is the only place the app calls
  `auth.currentUser.reload()` — without it, the cached `User`
  object's `emailVerified` flag stays stale and the layout guard
  refuses to advance. This was Bug #4 in the June 21 audit.
- `src/screens/auth/EmailSignUp.tsx` — also hosts the "Continue with
  Google" button, which calls `signInWithGoogle()`. Google users are
  auto-verified by Google and skip the inbox step entirely.

**Auth-flow routing ("Source of Truth"):**
`src/app/_layout.tsx` runs a 5-step redirect tree on every render where
`user` / `role` / `segments` change:
1. Wait for the root navigator to mount (`useRootNavigationState()`).
2. `!user` → `/email-signup`.
3. `user && !emailVerified && password-provider` → `/email-signup`
   (the "check your inbox" panel; user can also sit on the screen
   freely).
4. `user && verified && !role` → `/role-selection` (first-time
   signup, no doc yet).
5. `user && verified && role` → matching dashboard.

Step 5 was Bug #1 ("Amnesia Login Loop") — an existing user with a
populated `users/{uid}.role` was being sent back to
`/role-selection` on login. The fix: read the role inside the
`onAuthStateChanged` callback (not in a separate effect) and write
it to the Zustand store **before** the redirect effect runs, so the
guard sees the populated role on its first pass.

**Phase flow (after auth):**
```
email-signup        ← single auth surface (signup or login)
  ↓ (verified, role still null)
role-selection      ← pick student or tutor (writes role to Firestore)
  ↓ (role set)
profile-student     ← collect username, phone, grade, subjects, location
  or profile-tutor  ← collect username, phone, headline, bio, monthly rate
  ↓ (profile subcollection written)
student-home        ← live dashboard (reads users/{uid} + profile subdoc)
  or tutor-home
```

**Files at play in this flow:**
- ✅ `src/app/_layout.tsx` (Source-of-Truth routing + onAuthStateChanged)
- ✅ `src/screens/auth/EmailSignUp.tsx` (signup + login + Google + "I've verified — continue")
- ✅ `src/screens/auth/RoleSelection.tsx` (writes role, routes to /profile-* not dashboard)
- ✅ `src/screens/auth/StudentProfileScreen.tsx` (writes
  `users/{uid}/studentProfile/default`)
- ✅ `src/screens/auth/TutorProfileScreen.tsx` (writes
  `users/{uid}/tutorProfile/default`, uses `monthlyRateNpr`)
- ✅ `src/screens/student/student_home.tsx` (live `onSnapshot` reads,
  shows real `fullName` + `locationLabel`)
- ✅ `src/screens/tutor/tutor_home.tsx` (live `onSnapshot` reads, shows
  real `fullName` + verified flag)
- ✅ `src/services/firebase/authService.ts` (modular RNFirebase API,
  Google Sign-In, no OTP)
- ✅ `src/components/forms/LocationField.tsx` (`MIN_CITY_LENGTH = 3`, not
  2 — the location-field bug from the June 21 audit)
- ✅ `src/lib/registration.ts` (no more Clerk-pivot type-level
  placeholders)

**Files removed in this pivot:**
- ❌ `src/screens/auth/PhoneEntryScreen.tsx`
- ❌ `src/screens/auth/OtpVerify.tsx`
- ❌ `src/screens/auth/Password.tsx`
- ❌ `src/app/phone-entry.tsx`
- ❌ `src/app/otpverify.tsx`
- ❌ `src/app/create_password.tsx`
- ❌ `src/components/ClerkFirebaseBridge.tsx`
- ❌ `@clerk/clerk-expo`, `expo-crypto`, `expo-secure-store`,
  `expo-web-browser`, `expo-application`
- ❌ `Documentation/04-Firebase/Clerk_Integration.md` (moved to
  archive)

**Build pipeline (expo SDK 54, NativeWind 4.2.x, native Firebase) — June 21 snapshot, still current as of Aug 2026:**
- `babel.config.js` uses `babel-preset-expo` with
  `jsxImportSource: 'nativewind'` + `nativewind/babel`. No
  reanimated/Tamagui plugins.
- `metro.config.js` uses `getDefaultConfig(__dirname, { isCSSEnabled: true })`
  only. The `Documentation/98-Reference-BasoBas/` folder is excluded
  via `blockList`.
- `src/app/_layout.tsx` mounts `<GestureHandlerRootView>` →
  `<SafeAreaProvider>` → `<Stack>`. The Stack always renders (no
  conditional tree returns — that breaks expo-router child
  tracking). The loading overlay sits on top via
  `pointerEvents="none"`.
- `users/{uid}` is the only Firestore root document the auth flow
  touches. Role + verified flag drive the redirect guard.
- `useRootNavigationState()` gate prevents `router.replace()` from
  firing before the navigator mounts.

**Tutor dashboard + enrollments (Aug 2026):**
- `src/screens/tutor/TutorHome.tsx` is fully live: metrics (rating,
  reviews, response rate, monthly earnings, capacity, profile
  completion) read from `users/{uid}/tutorProfile/default` via
  `onSnapshot`; pending requests come from
  `enrollmentRequests/{tutorUid}/requests` filtered to `pending`;
  "today's sessions" are **derived** from the live roster
  (`enrollments/{tutorUid}/roster`) — there is NO `sessions`
  collection (`deriveTodaySessions` in
  `services/enrollments/derived.ts` matches active enrollments whose
  `slotKey` day == today's Asia/Kathmandu weekday AND whose
  `[startDate, endDate]` window contains today).
- `src/screens/tutor/TutorInbox.tsx` is live via the shared
  `EnrollmentRequestCard`; accept opens a slot-picker sheet
  (`AvailabilityTimeList` fed by `subscribeAvailability` +
  `subscribeEnrollments` + `subscribeBatches`) and calls
  `acceptRequest` (requires a concrete `slotKey`); decline calls
  `declineRequest` (hard-deletes the request).
- **slotKey format is `"<day>:<slot>"`** (e.g. `mon:5-7`) — built by
  `slotKey()` / parsed by `parseSlotKey` in
  `services/enrollments/types.ts`. A malformed key (e.g. `mon-5-7`)
  returns `null` and is silently excluded from derived views, so
  writers (tests, seeds, scripts) MUST use the colon format.
  `derived.ts` logs a warn-once (`warnBadSlotKey`) for bad keys.
- **Group Batches is live** — `services/batches/` (`BatchesRepository`
  interface + Firebase/Mock impls + `dataSource` selector gated by
  `EXPO_PUBLIC_USE_MOCK_DATA`). `BatchCreation.tsx` fetches live
  batches + per-batch members, its student picker reads the live
  active roster (`enrollments/{tutorUid}/roster`), and the 3-step
  wizard creates batches via the existing `createBatch` transaction.
  Member add/remove + `endBatch` use direct paths (no
  collectionGroup scans). Rules verified in `test:rules`.
- **Platform Statistics is live** — `PlatformStatistics.tsx` aggregates
  real counts with `getCountFromServer` (users, tutors, approved
  tutors, pending enrollment requests) with loading/error/retry
  states; the fabricated `MOCK_ADMIN_STATS` module was deleted.

**Search-visibility flag (Aug 2026):**
- The tutor dashboard's "Available for new students / Hidden from
  search" toggle writes `tutors/{uid}.isAvailableForNewStudents`
  (via `setTutorAvailability` in
  `src/lib/tutor/firestoreTutorService.ts`). Discovery
  (`subscribeTutors` — backs both StudentHome and MapSearch) filters
  `where("isAvailableForNewStudents", "==", true)`.
- `tutors/{uid}` is otherwise admin-write-only; the rules carve-out
  (`firebase/firestore.rules`) lets the OWNER update only that flag
  (+ `updatedAt`) via
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly(...)`.
  NOTE: `differsOnlyFrom` is NOT a real rules function — it fails
  closed; don't reintroduce it.
- Newly-approved tutors default to visible (the admin approval mirror
  writes `isAvailableForNewStudents: true`); the backfill script
  (`npm run backfill:tutor-availability`) defaults legacy docs to
  `true` so the strict filter doesn't hide them.

**Test commands (Aug 2026):**
- `npm run test:derived` — 44 unit tests over every pure helper in
  `services/enrollments/derived.ts` + `types.ts` (KTM date helpers,
  slotKey parsing, today-sessions derivation, booked-map, capacity
  counts, malformed-slotKey guard).
- `npm run test:rules` — TWO checks: (1) `test:rules:deployed`
  fetches the latest released ruleset from the Firebase Rules API
  and fails on drift vs local `firebase/firestore.rules` (needs
  `GOOGLE_APPLICATION_CREDENTIALS`); (2) boots the Firestore
  emulator with the LOCAL rules and exercises the security rules
  via the REST API — the `tutors/{uid}` availability carve-out
  (owner flip allowed; other fields denied; stranger denied) and
  the batches collections (owner creates batch + adds/removes
  members; strangers denied).

**Pending deliverables (as of Aug 15, 2026):**
- Rebuild the EAS dev client with the updated native deps (Clerk
  packages removed, `@react-native-google-signin/google-signin`
  restored).

