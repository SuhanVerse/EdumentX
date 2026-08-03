# Tutor Verification — End-to-End Smoke Test

Run this checklist whenever the verification flow is changed. It
exercises every wiring point added in the
`feature/auth-phoe-entry` branch:

- `store/authStore.ts` — `tutorVerificationStatus` field
- `app/_layout.tsx` — redirect tree branch for `status === "pending"`
- `screens/auth/TutorProfileScreen.tsx` — atomic
  `tutorVerifications/{uid}` write
- `screens/tutor/PendingReview.tsx` — under-review screen
- `screens/tutor/edit_profile.tsx` — model-B edit policy
- `lib/verification/editableFields.ts` — `LIVE_EDITABLE_FIELDS` whitelist
- `lib/verification/discovery.ts` — verified-tutor filter
- `screens/admin/VerificationQueue.tsx` — admin queue against real
  Firestore

Two devices (or one device + one emulator) make this much faster:
Device A = the new tutor's phone. Device B = the admin's phone.

## 0. One-time setup

```bash
# 1. Service account key (Firebase Console → Project Settings →
#    Service Accounts → "Generate new private key"). The key is
#    written to a local file and exported for the seed script.
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/edumentx-sa.json

# 2. Build + start the dev client.
npx expo start --clear

# 3. Rebuild the native dev client so the @react-native-firebase
#    modules load with the fresh `tutors/{uid}` collection. The
#    `expo prebuild` step below is needed once; the rebuild is
#    enough thereafter unless we add new native modules.
npx expo prebuild
npx expo run:android   # or: npx expo run:ios
```

## 1. Bootstrap an admin (Device B)

```
1.  Open the dev client on Device B.
2.  Sign up with the email listed in scripts/seedAdmin.ts (currently
    asimdkt63@gmail.com OR khsuhan100@gmail.com).
3.  Complete the role-selection + admin-profile setup so the
    `users/{uid}/adminProfile/default` doc exists.
4.  From the project root on the dev machine, run:
        npm run seed:admin
    The script writes `admins/{uid}` for every email in
    ADMIN_EMAILS that has a `users/{uid}` row.
5.  Sign out and sign back in on Device B. The layout guard will
    now see `admins/{uid}` and route to `/admin-home`.
```

Expected: bottom-nav now shows the admin sections (Home, Queue,
Users, Profile). The "Verification Queue" tile leads to
`/admin/verification-queue`.

## 2. New-tutor sign-up (Device A)

```
1.  Install the dev client on Device A (or use a fresh emulator).
2.  Sign up with a new email + password. Tap the EmailSignUp toggle
    into "Sign up" mode if needed.
3.  Verify the email; tap "I've verified — continue".
4.  On role-selection, pick "I'm a tutor".
5.  Fill out the tutor profile form. Real-looking data is fine —
    just be sure the rate + subjects + location fields are populated.
6.  Tap "Save profile".
```

Expected after save:
- `users/{uid}/tutorProfile/default` exists with
  `verificationStatus: "pending"`,
  `isVerifiedProfessional: false`,
  `rejectionReason: null`,
  `hasPendingUpdate: false`.
- `tutorVerifications/{uid}` exists with
  `status: "pending"`,
  `adminNotes: null`,
  `reviewedBy: null`,
  `reviewedAt: null`.
- The layout guard reads `verificationStatus: "pending"` and
  routes to `/tutor-pending`.
- The PendingReview screen renders with the "under review"
  messaging, the review checklist, and the "Contact support"
  link.

## 3. Admin approves (Device B)

```
1.  On Device B, navigate to "Verification Queue" (or the
    admin-home tile).
2.  The new tutor's card should be in the "New Tutor
    Verifications" section, status "Pending Review".
3.  Tap "Approve".
```

Expected after approve:
- `tutorVerifications/{uid}.status === "approved"`,
  `reviewedAt` set, `reviewedBy === adminUid`.
- `users/{uid}/tutorProfile/default.verificationStatus === "approved"`,
  `isVerifiedProfessional === true`.
- The card slides out of "New Tutor Verifications" and appears
  under "Decided" when expanded.
- On Device A, the layout guard picks up the new status on the
  next render and routes from `/tutor-pending` to `/tutor-home`.
  The tutor home should show the blue "Verified Professional"
  tick in the metrics card.

## 4. Live edit (Device A, after approval)

```
1.  On Device A, tap Profile → Edit.
2.  Change the bio to something new. Save.
3.  Return to the home tab.
```

Expected:
- The bio updates immediately in the dashboard / marketplace
  cards. No review banner appears, no admin queue entry is
  created. `bio` is in `LIVE_EDITABLE_FIELDS`.

## 5. High-risk edit (Device A, after approval)

The high-risk UI is out of scope for this branch — `MenuRow`
sends the tutor back to `/profile-tutor` (the original
onboarding screen) so the values re-enter via
`TutorProfileScreen`, which the existing rules already gate as a
new verification write. For the smoke test:

```
1.  On Device A, Profile → Edit → tap "Teaching details".
2.  Change `monthlyRateNpr` to a new value. Save.
```

Expected:
- The navigation lands on `/profile-tutor` (the menu row sets
  `onPress` to `router.replace("/profile-tutor")`).
- Saving re-runs the same writeBatch as a brand-new
  verification, so a new `tutorVerifications/{uid}` doc is
  written and the layout guard routes the tutor back to
  `/tutor-pending`.

## 6. Admin sees the edit, rejects (Device B)

```
1.  On Device B, Verification Queue.
2.  The same tutor's previous card is now in "Decided" (status
    "approved"). A new card appears in "New Tutor Verifications"
    with the updated rate.
3.  Tap "Reject". Enter a reason ("Rate too high for the
    experience level"). Tap "Reject" to confirm.
```

Expected after reject:
- `tutorVerifications/{uid}.status === "rejected"`,
  `adminNotes === "<the reason>"`.
- `users/{uid}/tutorProfile/default.rejectionReason === "<the reason>"`,
  `verificationStatus === "rejected"`,
  `isVerifiedProfessional === false`.
- On Device A, the tutor home re-renders with the
  `ReviewBanner` in `tone="rejected"`, showing the reason.
- The tutor's profile fields stay as the previously-approved
  values (the new values were not applied; only the verification
  status changed).

## 7. Re-submit after rejection (Device A)

```
1.  Tap the "Resubmit for review" button on the rejected banner.
2.  Edit one of the live fields (e.g. bio) and save.
3.  Tap "Teaching details" → change rate → save.
```

Expected:
- The live bio update applies immediately.
- The rate re-write lands a new `tutorVerifications/{uid}` write,
  the layout guard routes to `/tutor-pending`, and the cycle
  repeats from step 2.

## 8. Verified filter (Phase 5 — currently a code-level check)

The real `tutors/{uid}` collection is not yet populated by
`TutorProfileScreen` (Phase 5 will add the denormalization write).
Until that ships, this is a code-level check rather than a UI one:

```
1.  Open `lib/verification/discovery.ts`. Confirm the filter
    matches:
        where("verificationStatus", "==", "approved")
        where("hasPendingUpdate", "==", false)
2.  Open `firebase/firestore.indexes.json`. Confirm the composite
    index on
        (verificationStatus ASC, hasPendingUpdate ASC)
    is listed under `indexes`.
3.  When the real query lands (Phase 5), also smoke-test:
        npm run seed:admin
        (creates a test tutors/{uid} doc with
         verificationStatus="approved", hasPendingUpdate=false)
    Then in a debug-only screen, run:
        onSnapshot(buildTutorDiscoveryQuery(), console.log)
    and confirm the doc is in the snapshot.
```

## Rollback

If anything fails at any step, the safest rollback is to
delete the offending `tutorVerifications/{uid}` doc and re-set
`users/{uid}/tutorProfile/default.verificationStatus` to
`"approved"`. The tutor will regain access on the next
`onAuthStateChanged` callback.

## Troubleshooting — `Network request failed` on upload

If `uploadVerificationDoc` (or `uploadAvatar`) throws
`[uploadVerificationDoc] Network request failed (bucket=…)` with
**no HTTP status code**, the most common cause is a **paused
Supabase project**. Free-tier Supabase projects pause after ~7
days of no API traffic, and a paused project serves an
edge-level error that React Native's `fetch` surfaces as the
generic `TypeError: Network request failed` (no status, no body).

**First thing to check:** open
`https://app.supabase.com/project/<your-project>` and look at the
project status. If it says **"Project is paused"**, click
**Restore project**. Uploads resume immediately — no code change
needed.

Other causes, in order of likelihood:

1. **Captive portal / no internet** on the device or emulator.
   The same `Network request failed` is RN's generic transport
   error.
2. **TLS / DNS block** of `*.supabase.co` on the device's network
   (school Wi-Fi, corporate VPN, regional ISP). Switch to a
   different network and retry.
3. **Bucket name mismatch** between
   `services/supabase/storage.ts` (`private-verification-docs`,
   singular) and the actual Supabase bucket. A 404 from a
   non-existent bucket would normally surface as a 4xx, but if
   the project is paused you'll get the same "Network request
   failed" instead.

To distinguish #1–#3 from a real bug, run the upload once with
`__DEV__` enabled — `uploadVerificationDoc` logs the full
`StorageUnknownError` (with `originalError`) to the device
console before rethrowing. A real bug leaves a stack trace; a
paused project / network failure leaves just the
`TypeError: Network request failed`.
