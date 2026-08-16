# EdumentX System Directives

You are an expert React Native + NativeWind engineer building EdumentX.

## Architectural Rules

1. **Use standard React Native primitives** (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) for layout — apply styling through NativeWind `className` props, not inline `style={{}}` objects.
2. **Never use Tamagui.** All `@tamagui/*` packages and `tamagui.config.ts` have been removed. Do not reintroduce them.
3. **Never hardcode hex colors.** Always use design tokens defined in `tailwind.config.js` (e.g., `bg-night`, `text-amber`, `border-border`). The narrow exceptions are SVG illustrations (`src/components/illustrations/*`) where `react-native-svg` primitives need raw hex — those consume `src/constants/colors.ts`. **Enforced by four custom ESLint rules** (`eslint-rules/design-tokens.js`, registered in `eslint.config.js`, regression-tested by `npm run test:lint-rules`): `no-raw-hex-placeholder` rejects raw hex in `placeholderTextColor`; `no-raw-hex-color-prop` rejects raw hex in `color="#…"` props (Ionicons, ActivityIndicator, …); `no-raw-hex-inline-color` rejects raw hex in inline-style `backgroundColor` / `border*Color` (pure black `#000000` scrims are the one exempt convention — there's no black token and `shadowColor` is likewise out of scope); and `no-non-token-radius` rejects any `className` radius that isn't a token — `rounded-xs|sm|md|card|lg|xl|hero|pill` (with `-t/-b/-l/-r` partials). Tailwind defaults (`rounded-2xl`, `rounded-full`, `rounded-t-3xl`) and arbitrary `rounded-[…]` values are violations because `theme.extend` leaves them off the documented scale. Every hex value must map to `src/constants/colors.ts` (e.g. `#2F5D50`→`colors.brand.primary`, `#E5A03B`→`colors.brand.accent`, `#3F8A5A`→`colors.brand.verification`, `#4A7FA5`→`colors.brand.ai`, `#C1503D`→`colors.semantic.danger`, `#6B7280`→`colors.text.muted`, `#0F172A`→`colors.text.primary`, `#FFFFFF`→`colors.text.inverse`).
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
- `src/screens/tutor/TutorHome.tsx` is fully live: capacity +
  active-students + monthly rate come from
  `users/{uid}/tutorProfile/default` via `onSnapshot`; **Avg rating
  + Reviews** are derived from the `reviews/{tutorUid}/reviews`
  collection (`subscribeReviews`); **Response rate** = share of
  responded requests across the full request history; **Monthly
  revenue** = live roster × `monthlyRateNpr` (zero-budget earnings
  proxy — no session billing). Pending requests come from
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
- **In-app messaging is live** — `services/messages/` (messages
  domain: `MessagesRepository` interface + Firebase/Mock impls +
  `dataSource` selector). Schema: `conversations/{conversationId}`
  with a `messages` subcollection; `conversationId` is the **sorted
  participant pair joined by `__`** (`conversationKey`), so either
  side addresses the same thread without a lookup. Each side
  self-writes its own display `meta` (name/avatar) so the hub needs
  no cross-user reads. Routes: `/chat` (params `peerId`,
  optional `peerName`/`peerAvatar`) + `/messages` hub. Entries:
  the student enrollment card's "Message" CTA, Messages header
  buttons on both dashboards, and TutorHome's quick actions.
  Rules caveat: list-membership ops (`in`/`hasAny`) and bare
  `auth` fail the local emulator with "Null value error" — the
  conversation rules use scalar `participantA`/`participantB` ==
  `request.auth.uid` checks instead (see the comment in
  `firebase/firestore.rules`). The hub inbox query therefore
  filters on the scalars with a composite `or()` (NOT
  `array-contains` on `participants` — that shape is unprovable
  against the scalar rules and 403'd on every render until the
  Aug 2026 fix; `messagesRulesTest.mjs` §1b locks it in).
- **Saved tutors is live** — `services/savedTutors/` domain.
  Storage: a `savedTutors` uid-key map on
  `users/{uid}/studentProfile/default`; the heart on
  `TutorDetailsScreen` and the `/saved-tutors` list (TutorCard wide
  cards from the live tutor feed) both subscribe to it, and
  `toggleSavedTutor` flips a single key with `deleteField()` in one
  `setDoc(merge)`. No rules change was needed — the owner
  subcollection wildcard (`match /users/{userId}/{subcollection}/
  {document=**}`) already covers it.
- **Help & support is live** — `/help-support` (FAQ + mailto).
  TutorDetailsScreen share uses the native `Share.share`; the group
  batch pricing card routes to `/chat`; session CTAs open the
  enroll sheet. All "Coming soon" alerts in student/tutor profiles
  are gone. The payouts + payment-methods feature was **removed
  (Aug 15)** — `services/paymentMethods/`, `PaymentMethodForm`,
  `/payouts`, and `/payment-methods` were deleted; the "Monthly
  revenue" dashboard metric (roster × rate) went with it.

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
- **Live ratings on the cards** — the discovery docs only mirror
  `rating`/`reviewCount` at approval time (and are admin-write-only,
  so students can't bump them), so `FirebaseTutorRepository`
  `subscribeTutors` overlays live aggregates from a single
  `collectionGroup("reviews")` subscription (status == "active" docs,
  grouped by `tutorUid`) onto every listing. One listener covers all
  tutors; no index needed (no filters on the query).
  `TutorDetailsScreen` does the same per-tutor: it subscribes to
  `reviews/{uid}/reviews` and merges rating, count, star breakdown,
  category averages and the review LIST over the fetched profile
  (`mergeLiveReviews` in the screen), so the Reviews & Ratings
  section shows real reviews instead of the profile doc's mirrored
  aggregates (which never included the list). `Review` carries an
  optional `categoryRatings` (mapped from the raw doc) to feed the
  category averages. Note: the local
  emulator's `runQuery` can't do `collectionGroupId` (400) — the
  `reviewsListRulesTest.mjs` suite verifies the underlying `list`
  rule via the document-parent query form instead.
  NOTE: `differsOnlyFrom` is NOT a real rules function — it fails
  closed; don't reintroduce it.
- Newly-approved tutors default to visible (the admin approval mirror
  writes `isAvailableForNewStudents: true`); the backfill script
  (`npm run backfill:tutor-availability`) defaults legacy docs to
  `true` so the strict filter doesn't hide them.

**Test commands (Aug 2026):**
- `npm run test:derived` — 47 unit tests over every pure helper in
  `services/enrollments/derived.ts` + `types.ts` (KTM date helpers,
  slotKey parsing, today-sessions derivation, booked-map, capacity
  counts + availability-draft helpers, malformed-slotKey guard).
- `npm run test:rules` — TWO stages: (1) `test:rules:deployed`
  fetches the latest released ruleset from the Firebase Rules API
  and fails on drift vs local `firebase/firestore.rules` (needs
  `GOOGLE_APPLICATION_CREDENTIALS`); (2) boots the Firestore
  emulator with the LOCAL rules and exercises the security rules
  via the REST API across SIX suites: the `tutors/{uid}`
  availability carve-out, the batches collections, the
  acceptRequest transaction paths (incl. the legacy no-counters
  profile carve-out + the student fast-forward `endDate`
  carve-out for the dev QA helper), the conversations/messages
  participant gates (incl. the hub `or()` scalar list query),
  the reviews list rules, and the removeEnrollment cascade.

**Pending deliverables (as of Aug 15, 2026):**
- Rebuild the EAS dev client with the updated native deps (Clerk
  packages removed, `@react-native-google-signin/google-signin`
  restored).

