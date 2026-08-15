# EdumentX — Zero-Budget Hybrid Architecture

> **Status**: Source of truth for the production stack.
> **Last updated**: Aug 2026 — Phase 3.5 stabilization + enrollment
> data-model notes. The 3D stack (`expo-gl`, `three`, `@react-three/fiber`,
> `@react-three/drei`) was **removed** after a device crash in
> `WebGLCapabilities.getMaxPrecision`; onboarding now uses flat
> `react-native-svg` illustrations. Map pins, GPS auto-location and the
> location picker shipped in the same pass. §2 documents the
> enrollment collections + `slotKey` format; §9a documents the
> `node:test` unit-test pattern. See §4a for the removal rationale.
> **Read this first** if you are about to add a new backend dependency.

This document is the canonical reference for every service the EdumentX
app talks to. The single design rule is **zero-budget**:

> Every dependency must be usable on a free tier with **no credit card
> required**. If a service starts gating its free tier behind a card or
> billable plan, we replace it before shipping the next phase.

The architecture is a **hybrid**: we keep the parts of Firebase that work
on the Spark plan (Auth + Firestore) and use other free services for the
parts Firebase gates behind Blaze (Cloud Storage, Cloud Functions,
Maps SDK). This avoids rewriting the auth + database layer that has
been working since Phase 2.

---

## TL;DR — The Stack at a Glance

| Layer | Service | Free Tier | Card Required |
|-------|---------|-----------|---------------|
| **Auth** | Firebase Authentication (Spark) | Unlimited MAU (Email + Google) | No |
| **Database** | Cloud Firestore (Spark) | 1 GiB, 50K reads/day, 20K writes/day | No |
| **Object Storage** | Supabase Storage | 1 GB across all buckets | No |
| **Map Tiles** | OpenStreetMap (`tile.openstreetmap.org`) | Unlimited, keyless | No |
| **Geocoding** | Nominatim (OpenStreetMap) | ~1 req/sec, no key | No |
| **Location Math** | Client-side Haversine + KNN (in-app) | Free (just CPU) | No |
| **RAG / Chatbot** | Groq Cloud API (Llama 3) **or** HuggingFace Serverless | Free dev tier | No |
| **Push (future)** | Firebase Cloud Messaging | Unlimited | No |
| **Analytics (future)** | Firebase Analytics | Unlimited events | No |
| **Animations** | Reanimated 4 worklets (press springs, splash particles, onboarding transitions) | MIT, on-device only | No |
| **Illustrations** | `react-native-svg` (onboarding scenes) — the 3D stack (`expo-gl`/R3F/`three`) was **removed** in Phase 3.5 after a device crash (`WebGLCapabilities.getMaxPrecision`) | MIT, on-device only | No |
| **UX / Haptics** | `expo-haptics` (Phase 2 UI overhaul: tactile 100ms press micro-interactions) | MIT, keyless, on-device only | No |
| **Map Markers** | `expo-image` + `react-native-view-shot` + bundled cluster PNGs (Aug 2026: teardrop pins with the tutor avatar are rasterized offscreen via `captureRef`, loaded through `Image.loadAsync` into `SharedRef<'image'>` Google Map markers) | MIT, keyless, on-device only | No |

If a future feature needs a service not on this list, **stop and add a
row to this table before writing any code**. Do not introduce a paid
dependency without explicit approval.

---

## 1. Auth — Firebase Authentication (Spark)

**Why**: We use `@react-native-firebase/auth` v24.x. Email + Password
and Google Sign-In are wired up. The Clerk pivot (June 20) was reverted
because Clerk discontinued its `integration_firebase` template for new
accounts — see `Documentation/99-Archive/2026-06-21-clerk-revert/`.

**Phone SMS OTP is intentionally NOT used.** Firebase Phone auth needs
the Blaze plan to send SMS even on the free MAU quota.

**Code map**:
- `services/firebase/authService.ts` — modular RNFirebase API
  (`getAuth(getApp())`, `createUserWithEmailAndPassword`,
  `signInWithEmailAndPassword`, `signInWithCredential` for Google).
- `screens/auth/EmailSignUp.tsx` — single auth surface, "Sign up" /
  "Log in" toggle, "Continue with Google" button, "I've verified —
  continue" pending panel.
- `app/_layout.tsx` — Source-of-Truth routing: 5-step redirect tree
  driven by `useAuthStore` (`user`, `role`, `isLoading`).
- `firebase/firestore.rules` — owner-only access to `users/{uid}` and
  its subcollections. Publish via `npm run deploy:rules`.

**Hard rule**: do not introduce any other identity provider without
checking that it works on Firebase Spark.

---

## 2. Database — Cloud Firestore (Spark)

**Why**: Already shipped, already has rules, already deployed to
`edumentx-dev`. The `users/{uid}` doc + `users/{uid}/{student,tutor}Profile/default`
subcollection pattern is the source of truth.

**Collection layout** (unchanged from the original Phase 2 design):

```
users/{uid}                        # structural metadata (uid, email,
                                   #   role, displayName, createdAt,
                                   #   updatedAt)
users/{uid}/studentProfile/default # student-only profile fields
                                   #   (incl. `savedTutors` uid-key
                                   #   map §7.5 + `paymentMethods` map
                                   #   §7.6)
users/{uid}/tutorProfile/default   # tutor-only profile fields
                                   #   (incl. single `payoutMethod`
                                   #   object §7.6)
```

When we add tutor-discovery in Phase 5, the candidate collection will be
`tutors/{uid}` (denormalized for read efficiency), but write access
stays owner-only.

**Enrollment collections** (Phase 5, all under the tutor's uid):

```
enrollmentRequests/{tutorUid}/requests/{requestId}  # pending student asks
enrollments/{tutorUid}/roster/{enrollmentId}         # active students
notifications/{uid}/items/{itemId}                   # per-user inbox
```

**Later collections** (all rule-covered, all deployed):

```
tutors/{uid}                          # denormalized discovery doc (admin-written;
                                      #   rating/reviewCount mirror is only
                                      #   refreshed at approval — the cards
                                      #   overlay LIVE aggregates from the
                                      #   reviews collectionGroup instead)
tutorVerifications/{uid}              # verification queue source of truth
tutorProfileUpdates/{uid}             # pending edit-review queue
reviews/{tutorUid}/reviews/{reviewId} # student reviews (counted on the profile;
                                      #   also aggregated per-tutor via
                                      #   collectionGroup for the cards)
batches/{tutorUid}/classes/{batchId}  # group batches
batches/{tutorUid}/classes/{batchId}/members/{memberId}
conversations/{conversationId}        # 1:1 messaging (deterministic id)
conversations/{conversationId}/messages/{messageId}
```

The messaging layout deserves a note: `conversationId` is the **sorted
participant pair joined by `__`** (`conversationKey(uidA, uidB)` in
`services/messages/types.ts`), so either side addresses the same
conversation without a lookup query. Membership is enforced in rules
via two scalar fields (`participantA`/`participantB` ==
`request.auth.uid`) because list-membership operators (`in`/`hasAny`)
and bare `auth` both fail the local rules emulator with "Null value
error" — see the comment block in `firebase/firestore.rules`.
`participants` (array) is kept solely for the hub's
`where participants array-contains uid` query.

**slotKey format — `"<day>:<slot>"`** (e.g. `mon:5-7`, `wed:9-12`).
This is a hard contract shared by every enrollment feature:

- Built with `slotKey(day, slot)` in `services/enrollments/types.ts`
  and parsed with `parseSlotKey` — a key that fails to parse returns
  `null` and is **silently excluded** from derived views
  (`deriveTodaySessions`, `computeBookedMap`, capacity counts), so a
  typo like `mon-5-7` (hyphen) instead of `mon:5-7` (colon) makes an
  enrollment invisible without an obvious error.
- Days are the `DayKey` union (`mon`…`sun`); slots are `TimeSlotKey`
  (`6-9`…`7-9`). See `types.ts` for the canonical lists.
- `derived.ts` logs a warn-once message for malformed keys so bad
  data can't hide (see the `warnBadSlotKey` guard).
- Any new writer (tests, seeds, scripts) MUST use the colon format or
  its data will never surface in the tutor dashboard.

**Hard rule**: do not call Cloud Functions from the client. There is no
Cloud Function runtime on Spark. All server-side logic (KNN, Haversine,
prompt assembly) runs in-app.

---

## 3. Object Storage — Supabase Storage (free tier)

**Why**: Firebase Cloud Storage requires Blaze (billing account + credit
card) as of February 2026. Supabase gives us 1 GB of object storage
with Row Level Security (RLS) policies, public avatars, and private
verification docs — all without a card.

**Setup** (already complete on `edumentx-storage`):
- Region: South Asia (Mumbai) — matches the Firebase database region.
- Bucket `public-avatars` — public read, image/* MIME only, 5 MB cap.
- Bucket `private-verification-docs` — owner + admin read, all MIME
  types, 25 MB cap.

**Code map**:
- `.env` — `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `services/supabase/client.ts` — singleton `createClient` instance
  (no Supabase Auth — Firebase owns identity; the anon key talks to
  the Storage REST API only).
- `services/supabase/storage.ts` — `uploadAvatar`,
  `uploadVerificationDoc`, `getVerificationDocPublicUrl`.
- `components/forms/AvatarUploader.tsx` — picks + compresses + uploads,
  writes the returned URL into the profile doc.
- `lib/verification/documents.ts` + `components/forms/DocumentUploader.tsx` —
  citizenship / certificate / demo uploads into `private-verification-docs`.

**Flow** (tutor uploads avatar):
1. User picks image in `expo-image-picker`.
2. `expo-image-manipulator` compresses to ≤ 1 MB and strips EXIF.
3. `uploadAvatarToSupabase(uri, uid)` uploads to `public-avatars/{uid}.jpg`.
4. Supabase returns a public URL string.
5. URL is written into `users/{uid}/{role}Profile/default.avatarUrl` via
   the existing `writeBatch` in `screens/auth/*ProfileScreen.tsx`.

**Flow** (tutor uploads verification doc):
1. `DocumentUploader` → `pickAndUploadTutorDoc` validates size + MIME,
   then `uploadVerificationDoc` writes `{uid}/{kind}.{ext}` (upsert).
2. The returned `TutorDocument` is persisted to Firestore on submit.
3. Upload failures (RLS, bucket missing, missing env) surface the
   bucket/path in the alert, with a ready-to-paste RLS INSERT policy
   hint for the anon key (see `storage.ts`). The anon key MUST have an
   INSERT policy on both buckets — Firebase is not a Supabase Auth
   session, so `authenticated`-only policies reject every upload.

**Hard rule**: never write a Supabase URL into a Firestore doc that the
user can later rename or delete; the URL must be stable for the lifetime
of the bucket.

**Deletion (admin "Delete permanently")** — `src/lib/admin/userLifecycle.ts`:
- Firestore purge is client-side: the app holds the anon key, and the
  admin portal is the only writer that should remove rows, so
  `firebase/firestore.rules` grants `delete: if isAdmin()` on
  `users/{uid}`, `tutors/{uid}`, `tutorVerifications/{uid}`,
  `tutorProfileUpdates/{uid}`, `notifications/{uid}` (deployed via
  `npm run deploy:rules`). The flow is documented in
  `src/screens/admin/UserManagement.tsx` + `lib/admin/userLifecycle.ts`.
- Storage objects are **best-effort** from the app: RLS cannot tie a
  Supabase storage row to the Firebase uid (the app never signs in to
  Supabase Auth), and we deliberately do NOT ship an open `anon DELETE`
  policy (anyone holding the public anon key could wipe the buckets).
  Failed removals are surfaced with a pointer to
  `npm run delete:user -- <uid>` — the dev-laptop script
  (`scripts/deleteUser.ts`) that deletes the Firebase Auth identity
  (`auth.deleteUser` — the *only* way on the Spark plan) and removes
  the objects with the service-role key, which bypasses RLS.
- Avatar objects are always `public-avatars/{uid}.jpg` (canonical path
  from `uploadAvatar`), verification docs `{uid}/{kind}.{ext}` — the
  script lists the `{uid}/` prefix, so it cleans stragglers the app
  couldn't see even when the profile doc is already gone.

---

## 4. Maps — `expo-maps` (Google/Apple native maps)

**Why**: The original plan pointed at OSM tiles via `react-native-maps`;
Phase 5.2 landed on **`expo-maps`** instead (Android renders the native
Google provider, iOS the native Apple provider) — no OSM tile server
load, offline-friendlier, and the Google Maps API key is only needed
for the Android **development** build (the `withGoogleMapsApiKey`
config plugin in `app.json`; the shipped APK's key can stay a dev key).
This supersedes the older `react-native-maps` + `<UrlTile>`
consideration — no `UrlTile` is used anywhere today.

**Setup**:
- `expo-maps` 0.12.x (installed via `npx expo install`).
- `app.json` plugins: `expo-maps` (requestLocationPermission),
  `expo-location` custom messages, and `./plugins/withGoogleMapsApiKey`.
- **Reusable surface**: `components/map/TutorMap.tsx` — a single
  `TutorMapView` that renders `GoogleMaps.View` on Android and
  `AppleMaps.View` on iOS with one props contract (markers, circles,
  imperative `setCameraPosition`, `onMarkerClick`, `onMapTap`,
  `onCameraMove`).

**Nepal camera lock** (`lib/location/nepalBounds.ts` + `TutorMap`):
- expo-maps has no "restrict panning to bounds" prop → out-of-bounds
  gestures are snapped back in `onCameraMove`.
- The snap is **throttled to one per 800ms** (`clampCooldownUntil`
  ref). Without the throttle, each superseded camera animation makes
  the previous native Promise reject with `java.util.concurrent.
  CancellationException: Animation cancelled` → "Call to function
  'ExpoGoogleMaps.setCameraPosition' has been rejected" red/log spam.
- On Android, zoom is clamped natively via `minZoomPreference`/
  `maxZoomPreference`, so the JS snap path only handles lat/lng.
- Consumers always receive the clamped camera during a snap so
  clustering math never sees phantom coordinates.

**Custom drop pins** (`components/map/TutorAvatarPin.tsx` +
`lib/map/avatarPins.tsx`):
- expo-maps Google markers accept only `SharedRef<'image'>` icons —
  never React nodes. Avatar pins are rendered offscreen by an
  `AvatarPinHost` and rasterized with `react-native-view-shot`
  (`captureRef` → temp PNG → `Image.loadAsync` → `ImageRef`).
- Unique pins are cached module-wide per `(photoUrl × verified)`;
  capture is gated on the avatar's `onLoad` with a 4 s timeout (a
  stale avatar URL must not hang the pin) — a failed or timed-out
  load falls back to the glyph pin, then to the bundled PNG set
  (`pin-tutor.png` / `pin-verified.png`), then to the native tint.
- `MapSearch` does NOT hot-swap icons: tutor markers mount only once
  all pins have resolved (4.5 s cap), because expo-maps' marker
  update path cannot be relied upon to change an existing marker's
  icon. Clusters always show the `pin-cluster.png` badge.

**Code map**:
- `components/map/TutorMap.tsx` — platform-adaptive map.
- `components/map/LocationPickerModal.tsx` — map in the profile form.
- `screens/student/MapSearch.tsx` — student map screen (live tutors,
  clustering via `useTutorClustering`, GPS recenter).
- `lib/location/nepalBounds.ts` — bounds, valley center, zoom range.
- `lib/location/nepalGeo.ts` — legacy-tutor centroid fallback ladder.
- `scripts/generate-markers.mjs` + `assets/markers/*.png` — PNG pins.

**Hard rule**: never add the Google Places API, Geocoding API, or a
billing-keyed map SDK. Geocoding stays on Nominatim (§5); the Google
API key stays dev-only.

---

## 5. Geocoding — Nominatim (OpenStreetMap)

**Why**: Free, keyless, returns neighborhood + city + country in one
call. The current `LocationField` component hand-rolls a fixed list of
Nepal locations — Nominatim upgrades that to live reverse-geocoding
without adding cost.

**Usage limits**: Nominatim's free service is rate-limited to ~1
request/second per IP. Heavy batch geocoding should use the
`/search?q=...&format=json` endpoint with a `User-Agent` header.

**Code map** (Phase 5.3, landed):
- `services/nominatim/reverse.ts` → `lib/location/geocoder.ts` +
  `lib/location/geocoding.ts` — forward + reverse geocoding with
  `accept-language=en` (query param **and** header) so Nepali
  responses come back in English; Devanagari results are stripped as
  a last-line defense.
- `components/forms/LocationField.tsx` — "Pick on Map" /
  "Use my location" GPS pin flow (map picker, not keystroke search).

**Hard rule**: respect the 1 req/sec rate limit. Debounce all
autocomplete keystrokes to 800 ms minimum.

---

## 4a. Onboarding Illustrations + Animations — `react-native-svg` + Reanimated 4 (no GL)

**Why**: Phases 3.0 shipped the three onboarding slides as 3D scenes
(`expo-gl` + `@react-three/fiber` + `@react-three/drei` + `three`).
On a physical device (RMX3630) that stack crashed on boot:

```
TypeError: Cannot read property 'precision' of undefined
  getMaxPrecision (three/build/three.cjs)
  WebGLCapabilities (three/build/three.cjs)
```

`WebGLCapabilities.getMaxPrecision` reads
`gl.getShaderPrecisionFormat(...)` and three.js 0.171 fails when the
driver returns `undefined` instead of a format object — a device-GL
edge case no JS-side flag (`gl.debug.checkShaderErrors = false`) can
avoid, because the crash happens during renderer construction, before
any shader compiles.

**Decision (Phase 3.5 stabilization)**: all four packages were removed
and the onboarding slides were rebuilt with flat `react-native-svg`
illustrations plus Reanimated 4 entrances. Zero GL in the bundle, zero
device variance, deterministic rendering. Animation stays on the UI
thread via worklets.

**Kept from the old pass**:
- `components/premium/SplashParticleField.tsx` — 24-particle ambient
  drift behind the splash (pure Reanimated worklets, no GL).
- `screens/onboarding/SplashScreen.tsx` — Reanimated 4 rewrite.

**Current code map**:
- `components/illustrations/DiscoverIllustration.tsx` — flat SVG map
  card (mini UI scene pattern from BasoBas `MapIllustration`).
- `components/illustrations/AiMatchIllustration.tsx` — flat SVG AI
  orb + amber sparkle motif (restates the removed `AiOrb3D`).
- `components/illustrations/VerifiedIllustration.tsx` — flat SVG
  verification card + seal.
- `screens/onboarding/OnboardingScreen.tsx` — carousel: eyebrow +
  title + body per BasoBas `OnboardingLayout`, fixed proportional
  illustration panel (~36% of screen height), spring-snap
  `PaginationDots`, `PrimaryButton` CTA.

**Rule going forward**: onboarding (and any "hero" surface) stays
flat-SVG. No `expo-gl` reimports without a written justification in
this section AND a device test matrix — the GL renderer is the single
biggest source of device-class crash risk in the project.

---

## 6. Location Math — Client-Side Haversine + KNN

**Why**: The original proposal calls for bounding-box pre-filtering,
Haversine distance, and weighted KNN ranking. There is no Cloud
Functions runtime on Spark, so we run the math in-app. The dataset is
small (a few hundred tutors), so the O(n) loop is fine on mid-range
Android devices.

**Code map** (Phase 5.4):
- `lib/location/haversine.ts` — `haversineMeters(a, b)`.
- `lib/location/bbox.ts` — `boundingBox(lat, lon, radiusKm)`.
- `lib/location/knn.ts` — `rankTutors(query, tutors, k=5)` — applies
  the weights from the proposal:
  `wd=0.35, wr=0.25, wq=0.20, wrating=0.15, we=0.05`.

**Hard rule**: never POST tutor coordinates to a server endpoint. The
query device is the only thing that needs them.

---

## 7. RAG Chatbot — Groq (preferred) or HuggingFace Serverless

**Why**: The original proposal mentions an OpenAI-powered tutor-matching
chatbot. OpenAI requires a paid key. Groq gives free Llama 3 inference
for hobby projects, and HuggingFace Serverless Inference has a free
monthly quota.

**Setup**:
- Get a free Groq API key at https://console.groq.com (login with
  Google, no card).
- Add `EXPO_PUBLIC_GROQ_API_KEY` to `.env` (the "anon" env var here
  means the key is safe to ship in the client because we rate-limit
  per uid in Firestore).

**Code map** (Phase 7.1):
- `services/llm/groq.ts` — `chatWithContext(systemPrompt, messages)`.
- `lib/rag/promptBuilder.ts` — assembles the system prompt from the
  top-K Firestore tutor matches (uses `lib/location/knn.ts`).
- `screens/chat/ChatbotScreen.tsx` — chat UI + free-text input.

**Fallback to HuggingFace**: if Groq is rate-limited or goes paid,
swap the `groq.ts` module for `huggingface.ts`. The prompt builder
and UI are provider-agnostic.

**Hard rule**: never embed an OpenAI / Anthropic / Cohere API key in
the client. They all require paid keys. Free providers only.

---

## 8. Anti-Patterns (what NOT to introduce)

- ❌ **Firebase Cloud Storage** — gates everything behind Blaze.
- ❌ **Firebase Cloud Functions** — same. Plus the free quota on Blaze
  is "perpetual free", but the plan itself requires a card.
- ❌ **Firebase Cloud Messaging on Blaze** — actually free on Spark,
  OK to use.
- ❌ **Google Maps SDK / Places API** — both require Cloud Billing.
- ❌ **OpenAI / Anthropic / Cohere** — paid only.
- ❌ **Mapbox** — paid above the hobby free tier; OSM is sufficient.
- ❌ **Algolia / Elasticsearch** — paid for our usage; use Firestore
  client-side filters instead.

If a future feature needs one of these, **replace the feature** before
adding the dependency.

---

## 9. Project Layout (zero-cost-relevant files)

```
.env                        # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
                            # EXPO_PUBLIC_FIREBASE_*, EXPO_PUBLIC_GROQ_API_KEY,
                            # EXPO_PUBLIC_USE_MOCK_DATA

firebase/
  firestore.rules           # owner/participant-gated access; deploy via `npm run deploy:rules`
  storage.rules             # unused — Supabase handles storage rules
  indexes.json
.firebaserc                 # pins project alias to `edumentx-dev`
firebase.json

src/services/               # one folder per domain; each has a Firebase + Mock
                            # impl + `dataSource.ts` selector (EXPO_PUBLIC_USE_MOCK_DATA)
  firebase/                 # authService.ts (modular RNFirebase), errors.ts
  supabase/                 # client.ts, storage.ts (uploadAvatar/uploadVerificationDoc)
  nominatim/                # geocoder.ts (keyless reverse/forward)
  tutors/                   # subscribeTutors (approved, available discovery docs)
  enrollments/              # requests, roster, availability, batches, reviews —
                            #   transactions + derived.ts (pure helpers, node:test-covered)
  batches/                  # batches/{tutorUid}/classes + members (roster-backed picker)
  messages/                 # conversations/{id} + messages (deterministic ids, meta)
  ai/                       # chatService.ts → Supabase Edge Function (Groq);
                            #   mockChatService.ts for USE_MOCK_DATA=true

src/lib/
  tutor/                    # firestoreTutorService, types
  admin/                    # userLifecycle.ts, verification/discovery
  location/                 # distance.ts (Haversine + nearest-N), nepalBounds, nepalGeo
  map/                      # markerIcons, avatarPins (teardrop pin rasterization)
  mock/                     # typed seed data (mock mode only)
  verification/             # notifications.ts (writeNotification), discovery.ts

src/components/
  shared/                   # ScreenLayout/ScreenHeader/ScreenScroll, BottomNav,
                            #   TutorBottomBar, NotificationBell, ReviewBanner
  domain/                   # TutorCard, EnrollmentRequestCard, EnrolledStudentRow,
                            #   WeeklyAvailabilityGrid, CalendarDatePicker, sheets
  map/                      # TutorMap, TutorPreviewSheet
  motion/                   # press-scale primitives, SwitchThumb, ActivePill, Skeleton
  ui/                       # Avatar, Card, ConfirmDialog, EmptyState
  forms/                    # LocationField, ConfirmDialog
  illustrations/            # SVG illustrations (raw hex allowed here)

src/screens/
  auth/                     # EmailSignUp, RoleSelection, Student/TutorProfileScreen
  student/                  # StudentHome, MapSearch, Enrollment, StudentProfile, AIChat, FiltersSheet
  tutor/                    # TutorHome, TutorInbox, BatchCreation, TutorCapacityScreen,
                            #   EditProfile, PendingReview, EditTeachingDetails
  admin/                    # AdminHome, PlatformStatistics, VerificationQueue,
                            #   UserManagement, AdminProfile
  shared/                   # Notification

src/app/                    # expo-router file routes (all Stack.Screen-registered)
src/store/                  # Zustand: authStore, aiChatStore
src/hooks/                  # useUserLocation, useTutorClustering, useCameraBounds
src/constants/              # colors.ts (SVG-only hex), theme.ts

scripts/                    # seed/backfill/test harnesses (tsc-compiled, node:test)
```

---

## 9a. Unit Tests — `node:test` (zero dependencies)

Pure-logic modules are covered with **Node's built-in test runner**
(`node:test`) — no jest/vitest install, so nothing to justify in §0.

**Run**: `npm run test:derived` — covers every pure helper in
`services/enrollments/derived.ts` + `types.ts` (47 tests across 9
suites): `todayIsoInKtm`, `todayDayKeyInKtm`, `slotDurationMinutes`,
`deriveTodaySessions`, `computeBookedMap`, `countAvailabilityCells`,
`cloneAvailability`, `countAvailabilityChanges`, `slotKey`/`parseSlotKey`,
`nextOccurrenceIsoInKtm`, plus the malformed-slotKey guard.

**Pattern** (mirrors the other `scripts/*.ts` flows):

```
scripts/testDerived.ts            # node:test + node:assert/strict
npm run test:derived              # tsc → node --test
```

**Conventions**:

- Tests import from `../src/...` directly and are compiled by the same
  `tsc` step — no mock Firestore/RN needed because the helpers are pure
  (no Firestore/RN imports; that's a `derived.ts` invariant).
- **Calendar helpers have two different clock conventions** — don't
  mix them: `todayIsoInKtm` / `todayDayKeyInKtm` take **UTC instants**
  and resolve in Asia/Kathmandu; `nextOccurrenceIsoInKtm` anchors on
  the **device's local calendar** (`new Date(y, m-1, d)` fixtures).
  Mixing them shifts results by a day.
- Verify weekday anchors with ground-truth `node` output before
  writing expectations — calendar tests fail on wrong anchors, not
  wrong code.
- Follow this pattern for new pure logic (`computeBookedMap`-style
  derived helpers, parsers, formatters) instead of adding a test
  framework.

---

## 10. What's Done and What's Next

| Phase | Status | Notes |
|-------|--------|-------|
| 1.5 Foundation (NativeWind) | ✅ Done | Source-of-truth tokens in `tailwind.config.js` |
| 2 Native Firebase Auth | ✅ Done | `EmailSignUp.tsx` + `RoleSelection.tsx` + `StudentProfileScreen.tsx` + `TutorProfileScreen.tsx` |
| 3 Onboarding + Animations + UI Primitives | ✅ Done | Phase 3.5: 3D slides **removed** (device GL crash, §4a), rebuilt as flat SVG illustrations; splash keeps Reanimated 4 + particle field; `PrimaryButton` / `PaginationDots` / `Avatar` / `TutorCard` primitives + `MOCK_TUTORS` seed. |
| 4 Native Maps + Custom Pins | ✅ Done | `expo-maps` (Google/Apple native maps) replaces the old OSM-via-`react-native-maps` plan (§4). Teardrop pins rasterize the tutor avatar offscreen (`react-native-view-shot` → `expo-image` → `SharedRef<'image'>`), clusters use a bundled PNG. Pins mount only after rasterization resolves (expo-maps can't hot-swap marker icons) with PNG-branded fallbacks. |
| 4a Nepal camera lock | ✅ Done | `clampCameraToNepal` snap-back in `onCameraMove`, throttled to one snap/800 ms after "Animation cancelled" rejection spam from superseded camera animations (§4). |
| 5.1 Supabase Storage | ✅ Done | `services/supabase/storage.ts` — `uploadAvatar` + `uploadVerificationDoc`; RLS hint surfaced in error messages. `limited` (iOS) photo permissions accepted. |
| 5.2 Map screen | ✅ Done | `MapSearch.tsx` — live Firestore tutors, GPS default camera, cluster + teardrop pins, `LocationPickerModal`. |
| 5.3 Nominatim geocoding | ✅ Done | `geocoder.ts` + `geocoding.ts` (`accept-language=en`), `LocationField` map picker. |
| 5.4 Client-side KNN | ✅ Done | `lib/location/distance.ts` (Haversine + nearest-N). |
| 6 Admin + Verification | ✅ Done | `VerificationQueue.tsx` — live `tutorVerifications` + `tutorProfileUpdates` `onSnapshot`, approve/reject/request-info actions; doc review via Supabase `private-verification-docs` public-URL workaround. `AdminHome` shows live user counts; `PlatformStatistics` aggregates live counts with `getCountFromServer`. |
| 7.1 RAG chatbot | ✅ Done | `AIChat.tsx` → `chatService` → Supabase Edge Function (Groq backend). JWT-verified, probe-verified end-to-end (Aug 15). `USE_MOCK_DATA=true` switches to the client-side mock pipeline. |
| 7.2 Polish + beta | ✅ Done | Phase 3b: BasoBas rhythm shared `Card` primitive (`components/ui/Card.tsx`) applied to profile screens; admin screens on the light `bg-background` theme. |
| 7.3 Group Batches | ✅ Done | `services/batches/` domain (`BatchesRepository` interface + Firebase/Mock impls + `dataSource` selector). `BatchCreation.tsx` live: roster-backed student picker, 3-step wizard, member add/remove, `endBatch`. Rules + `test:rules` checks cover all batch paths. |
| 7.4 In-app messaging | ✅ Done | `services/messages/` domain — `conversations/{id}` + `messages` subcollection with deterministic sorted-pair ids, participant-gated rules (scalar `participantA/B` checks — see §2). `/chat` (inverted FlatList, composer, peer identity from `meta`/tutor profile) + `/messages` hub; wired from the student enrollment card's "Message" CTA and both dashboards' headers. Rules deployed + 13 `test:rules` checks. |
| 7.5 Saved tutors | ✅ Done | `services/savedTutors/` domain — `savedTutors` uid-key map on `users/{uid}/studentProfile/default` (owner subcollection rules already cover it; no rules change). Toggle via `deleteField()` in one `setDoc(merge)`. Heart on `TutorDetailsScreen` + `/saved-tutors` list (TutorCard, live feed) replace the old "Coming soon" alert. |
| 7.6 Payments, Payouts, Help | ✅ Done | `services/paymentMethods/` domain — student `paymentMethods` map + tutor single `payoutMethod` on the profile docs, zero-commission direct-payment model (eSewa/Khalti/IME Pay/bank, shared `PaymentMethodForm`). `/payment-methods` (list + add/remove), `/payouts` (method + live roster × `monthlyRateNpr` earnings), `/help-support` (FAQ + mailto). Share on `TutorDetailsScreen` now uses the native `Share.share`; group-batch pricing card messages the tutor; session CTAs open the enroll sheet. All "Coming soon" alerts removed from student/tutor profiles. |
| 8 Admin user lifecycle | ✅ Done | Lifecycle: suspend / soft delete / **restore** (`status: active`, `deletedAt: null`) from `UserManagement.tsx`; "Delete permanently" (`lib/admin/userLifecycle.ts`) purges Firestore via `isAdmin()` rules grants + best-effort Supabase object removal. **Auth guard**: `src/app/_layout.tsx` reads `users/{uid}.status` inside `onAuthStateChanged` and signs out `deleted`/`suspended` accounts with an "Access Denied" alert — they can't reach any app screen. Firebase Auth identity deletion is server-side only: `scripts/deleteUser.ts` (`npm run delete:user`) — needs `GOOGLE_APPLICATION_CREDENTIALS` + service-role key, ends with a "cannot be undone" confirmation. |

See `Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`
for the full step-by-step checklist.

---

## 11. Why we are NOT rewriting on Supabase

We considered rewriting the backend on Supabase (Postgres + PostGIS +
Storage) to consolidate vendors. Reasons we kept Firebase for auth +
database:

1. **Working code**: the auth + Firestore flow is shipped and tested.
   Rewriting it would set the project back 2–3 weeks.
2. **Spark plan is genuinely free**: Auth + Firestore never required a
   card. The Blaze gate only hits Storage + Functions + Maps, which
   we are bypassing anyway.
3. **Two-project complexity**: a Supabase rewrite would introduce a
   second set of credentials, second client SDK, second security-rule
   language (Postgres RLS vs Firestore rules), and a migration path
   for the existing `users/{uid}` data.
4. **Supabase Auth is fine but not better** than Firebase Auth for our
   shape (email + Google). No clear win on switching.

The hybrid keeps what works and only swaps the parts that hit the
Blaze gate.

---

## 12. References

- Firebase Spark pricing: https://firebase.google.com/pricing
- Supabase pricing: https://supabase.com/pricing
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Groq free tier: https://console.groq.com (Llama 3 inference)
- HuggingFace Serverless Inference: https://huggingface.co/docs/api-inference

---

**If you are about to add a dependency, add it to the table in §0
first. If you can't justify it as zero-budget, find a free alternative
or remove the feature.**