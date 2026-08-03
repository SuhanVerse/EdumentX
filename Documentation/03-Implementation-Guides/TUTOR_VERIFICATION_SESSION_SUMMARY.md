# Tutor Verification System — Session Summary

**Date:** July 8, 2026
**Branch:** `feature/auth-phoe-entry` (carried over from
`feature/StudentUI` lineage)
**Scope:** Tutor pending-review flow, high-risk edit queue, document
upload, notifications, security rules, and the related routing fixes.

This document records the work done in a single end-to-end session on
the tutor verification subsystem. It is meant to be read alongside
`Documentation/01-Architecture/ARCHITECTURE.md` §6 (admin +
verification) and `Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`.

---

## 1. Goals

1. **Fix the admin "permission denied" error** that surfaced when an
   admin tried to approve a tutor from the verification queue.
2. **Route newly-signed-up tutors to `/tutor-pending`** instead of
   landing them on `/tutor-home` with a small "under review" card.
3. **Stop routing high-risk edits back to `TutorProfileScreen`**
   (the original "profile" screen has a back button that leads to
   `/role-selection`, which is a UX blunder for a verified tutor).
4. **Add document uploads** — citizenship ID, academic certificate,
   optional demo video — to the tutor profile setup, the tutor's
   profile screen, and the admin's verification queue.
5. **Wire notifications** so the tutor sees admin decisions in their
   in-app inbox.
6. **Allow tutors to discard a high-risk edit** (removes the queue
   doc, no change to profile, no admin notification).

---

## 2. Files Touched

### New files

| Path | Purpose |
| --- | --- |
| `lib/verification/documents.ts` | Tutor document upload helper (Supabase, with size + MIME guards). |
| `lib/verification/editableFields.ts` | Single source of truth for which fields are live-editable vs. need re-review. |
| `lib/verification/notifications.ts` | `writeNotification` + `notificationCopy` helpers. |
| `lib/verification/discovery.ts` | Student-side filter for verified tutors. |
| `components/forms/DocumentUploader.tsx` | `DocumentUploader` (single-slot) and `TutorDocumentList` (read-only). |
| `app/tutor-pending.tsx` | Tutor pending-review route wrapper. |
| `app/tutor_edit_teaching_details.tsx` | High-risk edit route wrapper. |
| `screens/tutor/PendingReview.tsx` | The full pending-review screen. |
| `screens/tutor/EditTeachingDetails.tsx` | The high-risk edit screen (subjects, rate, location, docs). |
| `firebase/firestore.indexes.json` | Composite indexes for the queue queries. |
| `Documentation/03-Implementation-Guides/VERIFICATION_SMOKE_TEST.md` | Manual smoke test for the queue. |

### Modified files

| Path | Change |
| --- | --- |
| `firebase/firestore.rules` | Added admin write access to `users/{uid}/{subcollection}/*`; new `tutors/{uid}` and `notifications/{uid}` rules with diff-based read-flag guard. |
| `app/_layout.tsx` | Added `/tutor-pending` and `/tutor_edit_teaching_details` to the allowed-for-signed-in set; added the redirect rule that sends a tutor to `/tutor-pending` when `tutorVerificationStatus === "pending"`. |
| `screens/auth/TutorProfileScreen.tsx` | Document upload section (3 slots), `canSubmit` now requires citizenship + certificate, `router.replace("/tutor-pending")` after save, store updated to `tutorVerificationStatus: "pending"`. |
| `screens/tutor/edit_profile.tsx` | Hydrates `documents` from the profile doc; routes "Subjects, rate & location" to `/tutor_edit_teaching_details`; new "Verification documents" section with a read-only list and an Edit link. |
| `screens/admin/VerificationQueue.tsx` | Wires `writeNotification` into all three admin handlers (verify-approve/reject/more-info, edit-approve, edit-reject); remaining UI unchanged. |
| `screens/shared/Notification.tsx` | Live `onSnapshot` on `notifications/{uid}`; new "Verification" tab; row tap marks read via a diff-restricted update; rejection/info-request reason shown inline. |
| `lib/mock/tutors.ts` | Mock data now reflects the verified-tutor shape for student discovery. |
| `store/authStore.ts` | Added `tutorVerificationStatus` (with explicit `TutorVerificationStatus` union) and `setTutorVerificationStatus` action. |
| `components/forms/EditableField.tsx`, `components/forms/MenuRow.tsx` | Minor presentation adjustments for the new "Verification documents" row. |

### Removed (this session)

None of the old screens were deleted in this pass. The
`verification_docs.tsx` reference screen the user asked us to study
remains in place — the new code lives in `TutorProfileScreen.tsx`,
`edit_profile.tsx`, `EditTeachingDetails.tsx`, and
`DocumentUploader.tsx`. The user said "this one will later be
deleted"; a follow-up should drop it once we're confident nothing
references it.

---

## 3. Bug Fixes

### 3.1 Admin "permission denied" on approval

**Symptom:** Tapping Approve in the verification queue threw a
`permission-denied` and nothing changed.

**Root cause:** The `users/{uid}/{subcollection}/{document=**}` rule
only allowed the owner to write. The admin queue's batch
(`applyVerificationDecision`) was writing
`users/{uid}/tutorProfile/default` to mirror the verification status
onto the denormalized profile, but the admin wasn't the owner.

**Fix (`firebase/firestore.rules`):**

```text
match /{subcollection}/{document=**} {
  allow read: if isOwner(userId) || isAdmin();
  allow write: if isOwner(userId) || isAdmin();
}
```

The admin can now write profile subcollection docs in lock-step with
the verification doc. The admin queue is the only admin-side write
path that touches the profile subcollection, and the merge payload
it sends is constrained to the denormalized flags
(`verificationStatus`, `rejectionReason`, `hasPendingUpdate`,
`isVerifiedProfessional`, `updatedAt`).

### 3.2 Tutor lands on `/tutor-home` with a stub banner

**Symptom:** A newly-signed-up tutor with a pending verification doc
was being routed to `/tutor-home`, where a small banner asked them
to "get reviewed" before accessing features.

**Fix (`screens/auth/TutorProfileScreen.tsx` + `app/_layout.tsx`):**

- After save, `TutorProfileScreen` now calls
  `router.replace("/tutor-pending")` (not `/tutor-home`).
- It also updates the auth store:
  `setTutorVerificationStatus("pending")`.
- The root layout's redirect rule reads the store on every render:

  ```text
  user && verified && role === "tutor" && tutorVerificationStatus === "pending"
    → /tutor-pending
  ```

The layout guard is the source of truth: a stale `tutor-home`
back-stack entry that an admin hasn't cleared (e.g. on next login
before the snapshot fires) can't trick the user back into the
dashboard.

### 3.3 High-risk edit routed to `TutorProfileScreen`

**Symptom:** Editing subjects / rate / location on `edit_profile.tsx`
pushed the tutor to `TutorProfileScreen` (`/profile-tutor`), which
has a back button pointing at `/role-selection`. The user described
this as a "blunder" — a verified tutor should never see
`/role-selection` again.

**Fix:** Built a new dedicated route
`/tutor_edit_teaching_details` (`screens/tutor/EditTeachingDetails.tsx`)
with its own screen. It reads the current profile on mount, lets the
tutor change subjects, grades, rate, location, and documents, and on
Save commits a 3-way `writeBatch` (profile flag +
`tutorProfileUpdates/{uid}` + `users/{uid}.updatedAt`) before
navigating to `/tutor-pending`. Discard just deletes the queue doc
and pops back to `edit_profile.tsx` with no profile change.

`edit_profile.tsx` was updated so the "Subjects, rate & location"
`MenuRow` now points to the new route instead of
`/profile-tutor`.

---

## 4. New Features

### 4.1 Verification documents

**Three doc kinds, defined in `lib/verification/documents.ts`:**

| Kind | Required? | Accepted types | Max size |
| --- | --- | --- | --- |
| `citizenship` | yes | JPG / PNG / WEBP / HEIC | 4 MB |
| `certificate` | yes | JPG / PNG / WEBP / HEIC | 4 MB |
| `demo` | no | MP4 / MOV | 25 MB |

**Storage:** Supabase Storage bucket
`private-verification-docs` (1 GB free tier). Files are uploaded via
`services/supabase/storage.ts`'s `uploadVerificationDoc`. Size caps
are enforced client-side *before* the network call so the user sees
a friendly error rather than a 413 from Supabase.

**Persistence:** The upload result is a `TutorDocument` record
(`{ kind, path, bytes, name, uploadedAt }`) that gets persisted to
**both** `tutorVerifications/{uid}.documents` (initial signup) and
`users/{uid}/tutorProfile/default.documents` (live, after approval).
High-risk edits store the proposed set on
`tutorProfileUpdates/{uid}.proposed.documents` and only apply on
admin approval.

**UI surfaces:**

- `TutorProfileScreen.tsx` — three `DocumentUploader` slots in the
  sign-up form. The Save button is gated on
  `citizenshipDoc && certificateDoc`.
- `edit_profile.tsx` — new "Verification documents" section with a
  read-only `TutorDocumentList` and an "Edit" link that routes to
  the high-risk edit screen (because changes to documents are
  high-risk).
- `EditTeachingDetails.tsx` — three `DocumentUploader` slots inside
  the high-risk edit flow; changes join the proposed payload and
  ride the same writeBatch.
- `VerificationQueue.tsx` — documents list in the expanded
  verification card (still as label thumbnails — previews can land
  when the admin SDK is wired in a later phase).

### 4.2 Edit-flow: discard + save

`EditTeachingDetails.tsx` exposes two actions:

- **Save changes** — 3-way `writeBatch`:
  1. `users/{uid}/tutorProfile/default` set-merge
     `hasPendingUpdate: true`.
  2. `tutorProfileUpdates/{uid}` create/update with
     `status: "pending"`, `proposed`, `current`, `submittedAt`.
  3. `users/{uid}` set `updatedAt: serverTimestamp()`.
  Then `router.replace("/tutor-pending")`.

- **Discard** — `deleteDoc(tutorProfileUpdates/{uid})` and
  `set-merge(profileRef, { hasPendingUpdate: false })`, then
  `router.back()`. No notification is written.

The proposed payload is built by `splitProfileChanges` and only
contains fields that actually changed
(see `lib/verification/editableFields.ts` — change detection
helpers `subsetsDiffer`, `locationsEqual`,
`docKindListChanged`, `docsListDiffers`).

### 4.3 Notifications

**Write side** (`lib/verification/notifications.ts`):

```ts
writeNotification(
  recipientUid,
  { type, title, body, reason }
)
```

Five `NotificationType` values cover the admin queue's decisions:
`verification_approved`, `verification_rejected`,
`verification_more_info`, `edit_approved`, `edit_rejected`. Each has
a matching `notificationCopy` helper that owns the user-facing copy
(title / body / reason), so the same wording ships across the admin
button, the notification bell, and any future banner.

`writeNotification` is called **after** the verification
`writeBatch` commits. If the batch fails, no notification is left
in the tutor's inbox pointing at a decision that never landed.

**Read side** (`screens/shared/Notification.tsx`):

- `onSnapshot(collection(db, "notifications", user.uid))` — live
  list, newest first.
- A new "Verification" tab joins the existing tabs (All, Unread,
  …) so tutors can filter admin decisions out of the inbox.
- Tapping a row marks it read via `updateDoc` setting
  `read: true, readAt: serverTimestamp()`. The
  `notifications/{uid}` rule restricts the user update to exactly
  those two keys
  (`request.resource.data.diff(resource.data).changedKeys().hasOnly(["read","readAt"])`),
  so a client can't mutate the title / body / timestamp of a
  notification it didn't author.
- Rejection / info-request reasons render inline as a small red
  panel under the body.

### 4.4 `tutors/{uid}` denormalized cache

New collection, new rule:

```text
match /tutors/{uid} {
  allow read: if isOwner(uid) || isAdmin();
  allow create, update: if isAdmin();
  allow delete: if false;
}
```

The admin queue's `applyVerificationDecision` handler
`set`s a doc here whenever a status flips, so the student-side
marketplace (`lib/verification/discovery.ts`) can do a flat
`where("verificationStatus", "==", "approved")` query without
joining the verification collection. (Phase 5+ will move this
write to a Firestore function so the client doesn't have to be
involved.)

---

## 5. Security Rules Summary

The full set of changes to `firebase/firestore.rules`:

1. `users/{uid}/{subcollection}/{document=**}` — admins can write
   alongside the owner (fixes 3.1).
2. `tutors/{uid}` — admin-only writes; owner + admin reads.
3. `tutorProfileUpdates/{uid}` — owners can `create` a
   `status: "pending"` doc; admins update the rest.
4. `notifications/{uid}` — admins can `create`; the recipient can
   `update` only `read` / `readAt`; everyone else is denied.

The `match /{document=**}` deny-all catch-all at the bottom of the
file is unchanged. New collections need an explicit rule added
before the client can touch them.

---

## 6. Testing Notes (manual)

`Documentation/03-Implementation-Guides/VERIFICATION_SMOKE_TEST.md`
covers the end-to-end flow with explicit "you should see X"
checkpoints. The short version:

1. Sign up as a new tutor; complete the profile + upload citizenship
   + certificate; tap **Submit for review**.
   → Should land on `/tutor-pending`, not `/tutor-home`.
2. Sign in as an admin; open `/admin/verification`.
   → The new tutor should appear under "New Tutor Verifications"
   with status `Pending Review`.
3. Tap **Approve**.
   → Profile doc's `verificationStatus` flips to `approved`;
   `tutors/{uid}` is created; a notification lands in the tutor's
   inbox.
4. From the tutor's profile screen, tap "Edit" on
   "Verification documents" (or "Subjects, rate & location" from
   the menu). Change one field, tap **Save changes**.
   → Should land on `/tutor-pending`; the change shows up in
   "Pending Edits" on the admin queue.
5. Tap **Discard** on the same screen.
   → Queue doc is deleted, `hasPendingUpdate` clears, no
   notification.
6. Tap **Reject** from the admin queue with a reason.
   → The tutor sees the rejection reason inline in the
   notification center.

The smoke test doc has the detailed pass / fail criteria.

---

## 7. Known Follow-ups

- **Live preview of uploaded docs** in the admin queue. Right now
  the cards render label placeholders; rendering the actual
  Supabase URLs requires the admin SDK + signed URLs (or a
  Cloud Function for the same effect), which lands with the Phase 5
  refactor.
- **Demo video thumb** — the admin queue currently shows a label
  for the demo tile. A 320×180 poster frame is a small follow-up
  (`react-native-video` + a seek-to-1-second snapshot is one path;
  generating it on upload is cleaner but needs a backend).
- **Auto-redirect to dashboard after approval** — the
  `onSnapshot` listener on `users/{uid}/tutorProfile/default` will
  see the flip in the next render, but the layout guard currently
  only re-evaluates on `user` / `role` / `segments` changes. Adding
  `tutorVerificationStatus` to the effect's dep array is a
  one-line follow-up; for now the tutor sees a "Check again" button
  on the pending screen.
- **LaTeX mid-defense** still can't build. Deferred to the very
  end per user direction.

---

## 8. Reading Order

If you're new to the verification subsystem, the right files to
read in order are:

1. `lib/verification/documents.ts` — what a doc is, how it uploads.
2. `lib/verification/editableFields.ts` — live vs. high-risk split.
3. `lib/verification/notifications.ts` — the write side of
   notifications.
4. `lib/verification/discovery.ts` — student-side verified-tutor
   filter.
5. `screens/tutor/EditTeachingDetails.tsx` — the high-risk edit
   screen (uses all four of the above).
6. `screens/admin/VerificationQueue.tsx` — the admin surface that
   consumes the queue.
7. `screens/shared/Notification.tsx` — the read side of
   notifications.
8. `firebase/firestore.rules` — the access-control layer that
   makes all of the above safe.
