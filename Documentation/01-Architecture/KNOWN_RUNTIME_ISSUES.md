# Known Runtime Issues & Session Handoff (Aug 16, 2026)

Purpose of this file: hand off the exact state of the repo + the
investigation already done on the current on-device runtime errors, so a
fresh chat can fix them without re-deriving anything. All code changes
below are committed; nothing is lost.

## 1. Last commit — what just landed

`0e1764c` on `develop` (working tree clean, NOT yet pushed):

- **Firestore rules aligned** (`firebase/firestore.rules`) — the
  recursive `{prefix=**}` rules for `roster` / `requests` / `members` /
  `classes` now mirror the direct-path allowances. Real Firestore
  applies those recursive rules to direct-path list queries too (the
  emulator is laxer and hides it), which was blocking the
  student-facing `TutorDetailsScreen` subscriptions. **These rules are
  already DEPLOYED to the live project.**
- **New verification suites** — `scripts/tutorDetailsRulesTest.mjs`
  (emulator, 8 checks) added to `test:rules` (now 7 suites);
  `scripts/smokeTestTutorDetails.ts` (live, 6 paths) added as
  `smoke:tutor-details` and wired into CI's live-smoke step.
- **Admin Home merged with Statistics** — `PlatformStatistics.tsx` and
  the `/platform-statistics` route deleted; `AdminHome.tsx` rewritten
  with a live KPI grid (`getCountFromServer`). `AdminProfile.tsx`
  cleaned ("Last updated" text removed).
- **Bottom-nav lag fixed** — the active pill/underline no longer
  springs from tab-0 on mount (first-layout hard jump in
  `useActiveIndicator`, `BottomNav`, `TutorBottomBar`); per-tab
  haptics removed.

Verification: `tsc` 0 errors, `eslint` 0 problems, `test:rules`
7/7 suites green (63 checks) at commit time.

## 2. Known runtime errors (from the Aug 16 on-device log)

### A. `AdminHome: failed to fetch counts [firestore/failed-precondition]`

- **Where:** `src/screens/admin/AdminHome.tsx` → `fetchPlatformCounts`.
- **Root cause:** the pending-requests KPI uses
  `collectionGroup(db, "requests")` + `where("status", "==", "pending")`.
  A collection-group query filtering only on `status` needs a
  **single-field COLLECTION_GROUP index on `requests.status`**. The
  existing `firebase/firestore.indexes.json` entry for `requests`
  (`studentUid ASC, status ASC`) does NOT serve a status-only query.
- **Fix pointer:** add a `fieldOverrides` entry for
  `requests.status` with `"queryScope": "COLLECTION_GROUP"` in
  `firebase/firestore.indexes.json`, then deploy indexes
  (`firebase deploy --only firestore:indexes`). The `tutors`
  verificationStatus query is a plain collection query and needs
  nothing.

### B. `Text strings must be rendered within a <Text> component`

- **Two reported sites:** `MapSearch.tsx:415` (inside `ScreenLayout`)
  and `VerificationQueue.tsx:1660` (`PendingEditCard` Approve
  `Pressable`).
- **Investigation already done:** both lines were read from live disk
  and are **provably clean** — the Approve `Pressable`'s only children
  are `<Ionicons>` + `<Text>`, and a Babel AST scan of the entire
  MapSearch tree found zero raw-string children under non-`Text` hosts.
  RN 0.81 logs this error non-fatally.
- **Verdict:** stale Metro transform cache on the device (old module
  served to the phone). Fix: `npx expo start -c`, then fully reload
  the app on the device (kill + reopen). If it persists after a clean
  bundle, re-audit `TutorPreviewSheet` / `FiltersSheet` /
  `TutorCard` for a runtime-value child (e.g. `{count && "label"}`).

### C. `getIdToken` deprecation warnings (rNFirebase v22 namespaced API)

- **Where:** `src/services/ai/chatService.ts:226` —
  `idToken = await currentUser.getIdToken(false);`.
- **Root cause:** this is the only call site in the repo; rNFirebase
  warns when the legacy namespaced method form is used.
- **Fix pointer:** switch to the modular function —
  `import { getIdToken } from "@react-native-firebase/auth";` then
  `getIdToken(currentUser, false)`.

### D. `ReviewModal: submitReview failed [firestore/permission-denied]`

- **Where:** `src/components/domain/ReviewModal.tsx` →
  `src/services/enrollments/FirebaseReviewRepository.ts:116`
  (`submitReview`).
- **Context:** the `smoke:reviews` live suite proves a client-created
  review at `reviews/{tutorUid}/reviews/{reviewId}` with
  `studentUid == auth.uid` passes the rules. So the failure is likely
  a written field or path that differs from the rules' create
  condition (or the transaction's aggregate write). Compare the app's
  write against the `reviews` create rule before assuming a rule bug.

### E. `sweepExpiredEnrollments: commit failed [permission-denied]` (log flood)

- **Where:** `src/services/enrollments/FirebaseEnrollmentRepository.ts`
  (`sweepExpiredEnrollments`, ~line 272; called from
  `subscribeEnrollments` ~line 455).
- **What it writes:** `enrollments/{tutorUid}/roster/{id}` → `status:
  "expired"`, plus `users/{tutorUid}/tutorProfile/default` →
  `enrolledCount` / `currentStudents`. It fires on every
  `subscribeEnrollments` callback, which is why the log floods.
- **Fix pointer:** check the `roster` update rule — the tutor flipping
  their own roster row's status to `expired` is likely not permitted,
  or the profile-doc `enrolledCount` update conflicts with a
  condition. The `acceptRequestRulesTest.mjs` comment at line 140
  references this path, so the emulator suite may already encode the
  intended rule.

### F. Duplicate key `seed-1` in `BrowseBatchesScreen`

- **Where:** `src/screens/student/BrowseBatchesScreen.tsx:137`
  (`key={b.batchId}`).
- **Root cause:** leftover smoke-test batch docs in the live project —
  `batches/{tutorUid}/classes/seed-1` exists under multiple smoke
  tutors, so the collection-group list yields duplicate `batchId`s.
- **Fix pointer:** clean the seeded docs from the live project (or
  key the list by `${b.tutorUid}-${b.batchId}`), and make the batch
  smoke script use unique batch IDs / clean up in `finally`.

## 3. Expected log noise (not bugs)

- `fetchTutorProfile("smoke-browse-tutor-…") → ALL PATHS FAILED` —
  CI smoke tests run against the same live project as the dev app;
  those throwaway tutors never have profile docs. Transient, harmless.
- AndroidManifest `usesCleartextTraffic` / `exported` merge warnings
  and Gradle deprecation warnings during `npx expo run:android` are
  normal Expo SDK 54 output.

## 4. Handy commands

- `npm run test:rules` — deployed-drift check + 7 emulator suites
- `npm run smoke:tutor-details` / `smoke:reviews` / `smoke:enrollments`
  / `smoke:batches-browse` / `smoke:messages` — live suites (need
  `GCP_SA_KEY`-style service account in env)
- `npx expo start -c` — clear Metro cache (fixes stale-bundle errors)
