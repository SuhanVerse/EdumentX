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

### A. `AdminHome: failed to fetch counts [firestore/failed-precondition]` — FIXED (needs deploy)

- **Where:** `src/screens/admin/AdminHome.tsx` → `fetchPlatformCounts`.
- **Root cause:** the pending-requests KPI uses
  `collectionGroup(db, "requests")` + `where("status", "==", "pending")`.
  A collection-group query filtering only on `status` needs a
  **single-field COLLECTION_GROUP index on `requests.status`**. The
  existing `firebase/firestore.indexes.json` entry for `requests`
  (`studentUid ASC, status ASC`) does NOT serve a status-only query.
- **Fix:** `requests.status` COLLECTION_GROUP override added to
  `firebase/firestore.indexes.json`. **Deploy required** for the live
  KPI to come up:
  ```
  firebase deploy --only firestore:indexes
  ```

### B. `Text strings must be rendered within a <Text> component` — FIXED (Aug 16)

- **Reported sites:** `MapSearch.tsx:415` (inside `ScreenLayout`),
  `VerificationQueue.tsx:1660` (`PendingEditCard` Approve
  `Pressable`), and the logs show `ScreenLayout.tsx:65` — the
  `SafeAreaView` render. All point at a raw string child of a
  non-`Text` host somewhere under the tree.
- **Root cause (found Aug 16 — the earlier "stale cache" verdict
  was WRONG):** same-line whitespace between JSX tags becomes a
  real text node. The JSX transform strips whitespace-only text
  that contains a newline, but KEEPS same-line whitespace. Two
  sites had a tag boundary and content on the SAME line:
  - `src/screens/student/MapSearch.tsx` (was line 589):
    `/>      {/* comment */}` — the 6 spaces between the
    `TutorPreviewSheet` close and the comment survive the
    transform, so `children` gets a `"      "` text node that
    React flattens as a direct child of `SafeAreaView` →
    error reported at `ScreenLayout.tsx:65` / `MapSearch.tsx:415`.
  - `src/screens/admin/VerificationQueue.tsx` (was line 1669):
    `>          <Ionicons …` — the 10 spaces between the
    `Pressable` opening tag and `<Ionicons>` survive → text node
    child of the Pressable → error at `VerificationQueue.tsx:1660`.
- **Detection:** a babel AST scan for `JSXText` nodes that are
  whitespace-only and newline-free under non-`Text` hosts found
  exactly these two across all of `src/`. Everything else with
  `\n` in it is stripped by the transform and safe.
- **Fix:** split the same-line tags onto separate lines in both
  files (no more text nodes). tsc + eslint clean.
- **Prevention:** keep the scanner (`scan_whitespace_text.mjs`,
  one-off, removed after use) as the recipe: parse all `src/**/*.tsx`
  with `@babel/parser`, flag `JSXText` matching `!value.includes('\n')
  && value.trim() === ''` under non-`Text` hosts.

### C. `getIdToken` deprecation warnings (rNFirebase v22 namespaced API)

- **Where:** `src/services/ai/chatService.ts:226` —
  `idToken = await currentUser.getIdToken(false);`.
- **Root cause:** this is the only call site in the repo; rNFirebase
  warns when the legacy namespaced method form is used.
- **Fix pointer:** switch to the modular function —
  `import { getIdToken } from "@react-native-firebase/auth";` then
  `getIdToken(currentUser, false)`.

### D. `ReviewModal: submitReview failed [firestore/permission-denied]` — FIXED

- **Where:** `src/components/domain/ReviewModal.tsx` →
  `src/services/enrollments/FirebaseReviewRepository.ts`
  (`submitReview`).
- **Root cause (found Aug 16):** `submitReview` runs ONE transaction
  that (1) creates the review doc AND (2) updates the TUTOR's
  `users/{tutorUid}/tutorProfile/default` aggregates (rating /
  reviewCount / categoryRatings / reviewBreakdown / updatedAt). The
  reviewer is not the profile owner, so write #2 was denied and the
  whole transaction rolled back. The `smoke:reviews` suite missed it
  because it only wrote the review doc, never the profile update.
- **Fix:** a narrow `allow update` carve-out on
  `users/{userId}/tutorProfile/default` letting any signed-in user
  change ONLY the five aggregate fields (`hasOnly` check). Personal
  fields stay owner/admin-only. Locked in by `reviewsListRulesTest.mjs`
  §4b (emulator) and `smoke:reviews` step 4 (now mirrors the real
  transaction).

### E. `sweepExpiredEnrollments: commit failed [permission-denied]` (log flood) — FIXED

- **Where:** `src/services/enrollments/FirebaseEnrollmentRepository.ts`
  (`sweepExpiredEnrollments`; called from `subscribeEnrollments`).
- **Root cause (found Aug 16):** the STUDENT screens
  (`TutorDetailsScreen.tsx`, `EnrollmentFormScreen.tsx`) subscribe to
  a tutor's roster via `subscribeEnrollments(tutorUid)` to build the
  BookedMap — and that subscription ran the expiry sweep AS THE
  STUDENT, writing the tutor's roster rows + profile and getting
  denied on every snapshot (hence the flood). Secondary hazard:
  legacy roster rows predating the required `tutorUid` field would
  also deny the tutor's own sweep.
- **Fix:** `subscribeEnrollments` gained an options param
  (`{ runSweep?: boolean }`, default true); the two student call
  sites pass `{ runSweep: false }`. The roster update rule now keys
  the tutor clause on the PATH owner (`request.auth.uid == tutorUid`)
  so legacy rows without a `tutorUid` field still expire cleanly
  (locked in by `acceptRequestRulesTest.mjs` §7). The sweep also
  keeps `currentStudents` in sync with `enrolledCount` instead of
  zeroing it.

### F. Duplicate key `seed-1` in `BrowseBatchesScreen` — FIXED (app + script)

- **Where:** `src/screens/student/BrowseBatchesScreen.tsx`
  (`key={b.batchId}`).
- **Root cause:** leftover smoke-test batch docs in the live project —
  `batches/{tutorUid}/classes/seed-1` exists under multiple smoke
  tutors, so the collection-group list yields duplicate `batchId`s.
- **Fix:** the list now keys by `${b.tutorUid}-${b.batchId}` (immune
  to any future leftovers), and `scripts/smokeTestBatchesBrowse.ts`
  now uses per-run timestamped batch IDs + guarantees cleanup via
  `try/finally` so a crashed run can never reseed duplicates. If
  `seed-1` docs still exist in the live project, delete them via the
  Firebase Console (or `scripts/deleteUser.ts` per smoke tutor uid)
  — the app no longer crashes either way.

## 2.1. Fixes landed after this handoff (same-day session)

- **submitReview + sweepExpiredEnrollments — ROOT CAUSES FOUND.**
  `submitReview`'s transaction also updates the TUTOR's profile
  aggregates (a write no reviewer is allowed to do) — fixed with a
  narrow `hasOnly([...aggregate fields])` carve-out on
  `users/{uid}/tutorProfile/default` update. The sweep storm was the
  STUDENT screens (`TutorDetailsScreen`, `EnrollmentFormScreen`)
  running `subscribeEnrollments`, which swept AS THE STUDENT — fixed
  with `options.runSweep: false` on those call sites + a path-owner
  roster-update clause for legacy rows. Both locked in by emulator
  checks (`acceptRequestRulesTest.mjs` §7, `reviewsListRulesTest.mjs`
  §4b) and live smoke mirrors (`smoke:reviews` step 4 now performs
  the aggregate write).
- **AdminHome KPI — index added, DEPLOY REQUIRED:**
  `requests.status` COLLECTION_GROUP override in
  `firebase/firestore.indexes.json`; run
  `firebase deploy --only firestore:indexes`.
- **Duplicate-key crash — fixed app-side + script-side:**
  BrowseBatchesScreen keys by `${tutorUid}-${batchId}`;
  `smokeTestBatchesBrowse` uses timestamped ids and cleans up in
  `finally`. Leftover `seed-1` docs in the live project are harmless
  to the app now but can be scrubbed via the console.
- **Batch "404" — root cause:** the student detail screen read the
  batch from the ACTIVE-only marketplace feed, so ENDED batches
  (opened from My Enrollments) showed "Batch not found". Fixed with
  a direct-path `subscribeBatch` (status-agnostic) + one-shot tutor
  display enrichment.
- **Blank student avatars:** the tutor-facing roster/request feeds now
  backfill missing names/avatars from `users/{uid}/studentProfile/
  default` (emit-then-backfill, same pattern as the student view's
  tutor identity) — BatchCreation picker, TutorHome roster, and the
  inbox cards fill in real photos.
- **Admin light-theme purge:** all four admin screens switched to
  `ScreenHeader variant="light"` + text tokens (no more dark-navy
  heroes); StudentProfile skeleton unified to the plain `ScreenScroll`
  body; MyEnrollments tab bar got 24px gutters to match the list.
- **Chat keyboard handling:** the message list + composer now sit
  inside one `KeyboardAvoidingView` (`padding` on iOS / `height` on
  Android) so the thread anchors above the keyboard. Receipts ✓/✓✓,
  debounced typing, and the header unread badges already existed.
- **Microcopy:** help-support payment FAQ rewritten (monthly-rate
  basis, no in-app payments); TutorDetails share text enriched
  (verified · area · rating); all four profile footers already read
  "EdumentX • Version 1.0.0"; SecondaryButton spinner hex → tokens.

DEPLOYED (same day): `firebase deploy --only firestore:rules,
firestore:indexes` pushed the new rules (review-aggregate carve-out +
roster path-owner clause) and the `requests.status` COLLECTION_GROUP
index to `edumentx-dev`. All five live smoke suites then passed
against the deployed rules (`smoke:reviews` incl. the new aggregate
write, `smoke:batches-browse`, `smoke:enrollments`, `smoke:tutor-details`,
`smoke:messages`).

Also found + fixed during the cleanup: `smokeTestTutorDetails.ts`
was the ACTUAL source of the marketplace `seed-1` pollution — it
seeded `classes/seed-1` but its cleanup did a parent-only `delete()`
(which never touches subcollections), so EVERY CI run left a new
`seed-1` behind. Its cleanup now uses `recursiveDelete`; the 8 legacy
docs (6 × `seed-1`, `batch-active-1`, `batch-ended-1`) were scrubbed
from the live project and a re-run confirms no leftovers regenerate.

Still open: **C. `getIdToken` deprecation warning** (single call
site, cosmetic).

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
