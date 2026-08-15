# EdumentX — Figma AI Admin & Shared Sheets Context

> Companion to `FIGMA_AI_CONTEXT.md` (global tokens) and the
> auth/student/tutor exports. This final export covers the **admin
> console** (Home, Platform Statistics, Verification Queue, User
> Management) and the **shared bottom-sheet / modal components** used
> across the app (enrollment request, edit request, review, remove,
> student picker, calendar, student availability grid, document
> viewers). Token values are defined in `FIGMA_AI_CONTEXT.md` §1.

---

## 0. Screen Map & Shared Shell

```
admin-home            → platform-statistics · verification-queue · user-management
platform-statistics   → (no children; KPI grid + bar lists)
verification-queue    → RejectReasonDialog · ImageViewerModal · VideoViewerModal
user-management       → ConfirmDialog (soft) → ConfirmDialog (hard)
student/tutor screens → RequestEnrollmentSheet · EditRequestSheet · ReviewModal
                        RemoveEnrollmentDialog · StudentPickerSheet · CalendarDatePicker
                        StudentAvailabilityGrid · AvailabilityTimeList
```

**Admin nav — `AdminNav`** (4 tabs, mirrors the role dock):
Dark-hero headers on every admin screen (deep slate `#0F172A`
`ScreenHeader`); active tab + amber underline convention identical to
`TutorBottomBar` (48×28 pill + 32×2 amber underline, spring).

**Dark hero header (all four screens):**
- Overline (body white/70, e.g. "Dashboard" / "Moderation" /
  "Management") → **title** (screen-title 22/500 white) → caption
  row (white/70).
- Variants: AdminHome + PlatformStatistics greet by **live display
  name** ("Good to see you, {name}" — resolves
  `adminProfile.fullName` → `auth.displayName` → email localpart →
  "Admin"); VerificationQueue + UserManagement show static titles
  with live counts.

---

## 1. Admin Home (`/admin-home`)

Canvas `bg-background`. Dark hero + body + `AdminNav`.

### 1.1 Hero
- "Dashboard" overline → **display name** (screen-title, white,
  1 line) → "Manage platform, verifications & users" (caption
  white/70). Trailing `NotificationBell` (`tone="dark"`).

### 1.2 Section cards (vertical stack, 16px gaps)
Each card: white surface (hairline, radius 14, `p-4`), flex row —
48×48 **`pill` icon well** (24px icon) → title (card-title/500) +
optional **count pill** inline + subtitle (caption muted) + optional
count-label micro + chevron. Card taps push to the route:

| Card | Icon well | Route |
|---|---|---|
| Platform Statistics — "App-wide metrics & trends" | `bg-ai-light`, `analytics` blue | `/platform-statistics` |
| Verification Queue — "Review pending tutor verifications" | `bg-verification-light`, `shield-checkmark` green | `/verification-queue` |
| User Management — "View & manage all registered users" | `bg-accent-light`, `people` amber | `/user-management` |

- **User Management card count pill** (`bg-accent`, white micro):
  `total − suspended`; count-label micro below: "**N active · M
  suspended**" (or "N users"). Counts are a live one-shot
  `getDocs(users)` (no composite index).

---

## 2. Platform Statistics (`/platform-statistics`)

Canvas `bg-background`. Dark hero (greeting by live name + "EdumentX ·
Platform statistics" caption) + body with **three cards** + `AdminNav`.

### 2.1 KPI grid (2×2, `flex-row flex-wrap`, min-w 45% tiles)
Each tile: white card (radius 14, `p-4`) — 40×40 `pill` icon well
(20px tinted icon) → **screen-title value** (loading shows "—") →
overline label (uppercase muted) → delta row (12px `trending-up`
green + micro "**+0% this week**"). Values are **live server-side
counts** (`getCountFromServer`, O(1) — no doc payloads):

| Tile | Icon | Tint | Source |
|---|---|---|---|
| Registered users | `people` | `bg-accent-light` amber | `users` count |
| Tutors on platform | `book` | `bg-verification-light` green | `tutors` count |
| Verified tutors | `shield-checkmark` | `bg-ai-light` blue | % of `tutors` with `verificationStatus == "approved"` |
| Pending requests | `mail-unread` | `bg-accent-light` amber | `enrollmentRequests` where `status == "pending"` |

- **Error state:** compact danger row (`bg-danger-bg` + hairline,
  radius 14, `p-4`): alert icon + "Couldn't load live counts" +
  **Retry pill** (`bg-danger`, white micro).
- **No chart library** — bars are plain `View` widths (bundle stays
  tiny, no native module).

### 2.2 Weekly enrollment trend (bar list)
- White card (radius 14, `p-4`): header "Weekly enrollment trend"
  (section-title) + **"+22%" amber pill** (micro, `bg-accent-light`).
- 7 rows: day label (`w-8`, caption secondary) → 10px `pill` track
  (`bg-sand`) with **amber fill** (`width = value/max %`) → value
  (`w-7`, right-aligned caption/500).
- **Static sample data** (no time-series collection exists yet).

### 2.3 Subject demand (bar list)
- Same card pattern, 6 rows: subject label (`w-24`, 1 line) → sand
  track + amber fill → value (`w-9`). Sorted descending. **Static
  sample data** until a demand source exists.

---

## 3. Verification Queue (`/verification-queue`)

Canvas `bg-background`. Dark hero + **four sections** + `AdminNav`.
Two live `onSnapshot` streams: `tutorVerifications` (all, partitioned
client-side) and `tutorProfileUpdates` (`status == "pending"` only).

### 3.1 Hero
- "Moderation" overline → "Verification Queue" → amber pulse dot
  (6px `bg-warning`) + "**N open · M decided**" caption ("Loading
  queue…" while the first snapshot is in flight).

### 3.2 SectionHeader
- Row: title (section-title/500) + **count pill** (tinted per
  accent: warning amber / verification green / ai blue, micro/600) +
  helper caption (muted).

### 3.3 VerificationCard (pending / more_info)
White card (hairline, radius 14, `p-4`, `mb-3`):

**Header row:** 48px avatar (photo or amber initial tile) → name
(card-title) + email · phone (caption muted, wraps) + "Submitted
{relative}" (caption muted) + **StatusBadge** right.
- StatusBadge pills (radius 8, micro/500 with 11px icon): **Pending
  Review** (`bg-warning-bg` amber) · **Approved** (`bg-success-bg`
  green) · **Rejected** (`bg-danger-bg` red) · **Info Requested**
  (`bg-ai-light` blue).

**Details grid:** 5 `DetailItem` chips (`bg-sand`, radius 8, `p-3`,
flex-1 min-40%): Subjects · Level · Rate ("Rs X/mo") · Experience ·
Degree · Institution — micro uppercase muted label + button-sm
value.

**Bio block** (when present): `bg-sand` rounded-md, micro "BIO" +
body-sm secondary.

**Documents:** micro "DOCUMENTS" + horizontal `DocumentThumbnail`
rail.

**Admin note** (when a previous decision captured a reason):
`bg-danger-bg`, micro "ADMIN NOTE" + body-sm.

**Actions (pending / more_info only,** `border-t`): three equal
40px buttons, radius 8, white text:
- **Approve** (`bg-success` green, checkmark icon)
- **Reject** (`bg-danger` red, close icon)
- **Info** (`bg-ai` blue, info icon) — *pending only*
- Buttons dim to 0.5 while `busy` (per-row in-flight guard).

### 3.4 DocumentThumbnail (shared by both card types)
- 128px-wide card (`bg-sand`, hairline, radius 8, overflow hidden).
- **Image docs** (citizenship/certificate): 80px-tall cover photo
  (cache-busted `?t=uploadedAt`) → 9px label + 8px `formatBytes`
  caption.
- **Video / missing URL:** 80px well `bg-accent-light` with 28px
  `play-circle` / `image-outline` amber icon → same caption block.
- Tap → in-app `ImageViewerModal` / `VideoViewerModal` (never the
  system browser).

### 3.5 PendingEditCard (profile-change diff)
White card, same shell, header gains an **"Edit" badge**
(`bg-ai-light` radius 8, 11px `create-outline` + blue micro) instead
of a status pill.

- **Updated documents** rail (when the edit swaps scans) — same
  `DocumentThumbnail` anatomy.
- **Diff rows** (`bg-sand`, radius 8, `p-3`, 12px gap) — per changed
  field: micro uppercase label → row: **old value** (body-sm,
  muted, ~~struck through~~) → 12px `arrow-forward` muted → **new
  value** (body-sm, **accent amber**, semibold). Rate formatted
  "Rs X", arrays joined ", ".
- "No changed fields detected." fallback row when the diff is empty.
- Actions: **Approve** (green) / **Reject** (red) — 40px, radius 8.

### 3.6 Decided section (collapsed by default)
- Toggle header: 16px chevron + "Decided" (section-title) +
  "(N)" muted.
- **DecidedRow** (0.8 opacity): 40px avatar + name (+ green
  `checkmark-circle` when approved) + "Decided {relative} · subjects"
  caption + status pill.

### 3.7 RejectReasonDialog (Modal, fade)
- Backdrop `bg-black/50`, centered card: `bg-surface`, **radius 24**
  (`rounded-hero`), `p-5`, `max-w-[360px]`, soft shadow.
- 48×48 `pill` `bg-danger-bg` well (24px `close-circle` danger) →
  "**Reject {name}?**" (section-title, centered) → "Tell the tutor
  why. They'll see this on their dashboard." (body-sm secondary).
- **Reason textarea:** `bg-sand`, radius 14, `p-3`, `min-h-[96px]`,
  4 lines, placeholder "e.g. Documents are unclear. Please re-upload
  a clearer citizenship scan.".
- Buttons: **Reject** (min 48px, radius 14, `bg-danger`, white;
  disabled until reason is non-empty) + **Cancel** (`bg-sand`,
  secondary text).

### 3.8 Empty state
- 56×56 `pill` `bg-accent-light` well (26px `shield-checkmark`
  amber) + "Queue is clear" (card-title) + "New tutor verifications
  and edit requests will appear here."

---

## 4. User Management (`/user-management`)

Canvas `bg-background`. Dark hero with **search bar**, filter pill
card below the hero, list, `AdminNav`.

### 4.1 Hero
- "Management" overline → "User Management" + right-aligned caption
  "**N users · M deleted**" (white/60).
- **Search bar** (white, radius 12, `h-11`, `px-3`): 18px
  `search-outline` muted + TextInput "Search users…" (flex-1,
  body-lg) + `close-circle` clear button when non-empty.

### 4.2 Filter card (below hero, `bg-background`, `border-b`)
- **Horizontal scroll** of two pill groups separated by a 1px×24px
  `bg-border` divider.
- **FilterPill anatomy:** `flex-row`, radius pill, `px-3 py-1.5`,
  label (button-sm/500) + count badge (pill, `bg-white/20` active /
  `bg-white/60` idle). Status group active = `bg-ai` blue; Role group
  active = `bg-ai` blue; inactive = `bg-sand` + secondary text.
- Status: All · Active · Suspended · Deleted. Role: All roles ·
  Students · Tutors · Admins.

### 4.3 UserRow
White card (hairline, radius 14, `p-4`, `gap-3`):

**Top row:** 48px avatar in a `bg-sand` circle (photo or **amber
initial**) with a 16px green `checkmark-circle` **verified badge**
overlapping bottom-right → name (card-title, 1 line) + **role chip**
(radius pill, micro/500: Admin `bg-ai-light`/blue · Tutor
`bg-verification-light`/green · Student `bg-amber-light`/amber) →
email (caption secondary, 1 line) → meta line: phone · "Joined
{Mon d, yyyy}" (caption muted, wraps).

**Bottom row** (`border-t pt-1`): **status chip** (radius pill,
micro/500 + 11px icon: Active `bg-success-bg` green · Suspended
`bg-warning-bg` amber `pause-circle` · Deleted `bg-danger-bg` red
`trash`) → flex spacer → actions:
- **Active:** Suspend (`bg-danger/10` pill, danger text) + Delete
  (`bg-danger/10`, danger text).
- **Suspended/Deleted:** Restore (`bg-success/10`, green text).

### 4.4 Delete flow (two chained ConfirmDialogs)
- **Soft delete** — ConfirmDialog (centered card, destructive):
  "{name} ({email}) will be marked as deleted… user data retained
  but hidden" + an amber **"Delete permanently"** text link that
  chains to the hard-delete dialog. Confirm = `updateDoc` status →
  `deleted` + `deletedAt`.
- **Hard delete** — ConfirmDialog: "will be removed from Firestore —
  user record, profiles, verification & notification docs — and
  files deleted from Supabase Storage. This cannot be undone." +
  caption noting the Firebase Auth identity must be removed via the
  dev-laptop script. Confirm = `purgeUserAccount` (Firestore rows +
  Supabase files).

### 4.5 Empty state / dev fallback
- 56×56 `pill` `bg-amber-light` well (26px `people-outline` amber) +
  branched title ("No users yet" / "No matching users" / "Couldn't
  load users" / "Demo data loaded") + subtitle.
- **Dev-only** "Show demo data" pill (`bg-accent-light`, amber
  text) when the live read failed + a warning banner at the list
  bottom (`bg-warning-bg`, border amber) while mock data is shown.
  Hidden in production.

---

## 5. Shared Sheets & Modals (student / tutor surfaces)

All sheets share the same shell: **Modal slide-up**, backdrop
`bg-black/50`, sheet `bg-background` (white) **top radius 24**, max
height 88–90%, **drag-handle bar** (40×4 `pill` `bg-border`), header
with section-title/600 + 36×36 `pill` close button (`bg-surface` +
hairline, 18px `#6B7268`), `ScrollView` with
`keyboardShouldPersistTaps="handled"` and bottom safe-area padding.

### 5.1 RequestEnrollmentSheet (student → tutor)
Full spec in `FIGMA_AI_STUDENT_CONTEXT.md` §3.10 — summary: header
avatar+name+subjects, free-form **schedule** input (48px), two
`CalendarDatePicker`s (auto-bump rule), optional message (88px,
n/280), danger error banner, **amber "Send request"** (48px, radius
14).

### 5.2 EditRequestSheet (student edits a pending request)
- Header: "Edit request" + "Update your request to {FirstName}. The
  tutor sees the most recent version." + close.
- **Read-only subject chips** (`bg-sand`, micro secondary).
- **Schedule summary** — same 48px input + helper caption.
- **Start date / End date** — same `CalendarDatePicker` pair; the
  start picker is **not gated to today** (a pending request may
  legitimately pre-date today); end min = start.
- **Message (optional)** — 88px multiline, max 280, n/280 counter.
- Error banner (danger tint) surfaces `RequestAlreadyDecidedError`
  as "This request was already accepted or declined. We'll refresh
  the list."
- **Save changes** — 48px, radius 14, **amber**; disabled when
  `!canSubmit || !isDirty`, label flips to "No changes yet" when
  clean.
- **Remove request** — 48px, radius 14, white + 1px
  `border-danger/30`, trash icon + danger text; confirm Alert first.

### 5.3 ReviewModal (student rates a tutor)
- Header: "Rate & review" + "How was your experience with
  {FirstName}?" + close.
- **Overall rating:** 5 × 32px stars (tap; `star` filled amber /
  `star-outline` muted) + caption "Tap a star" / "{n}/5".
- **Sub-scores (optional):** white card (hairline, radius 14,
  `p-3`) with 4 rows — Teaching · Punctuality · Communication ·
  Knowledge — each a 5 × 20px star row (same fill rule).
- **Comment (optional):** 100px multiline, max 500, n/500 counter.
- Error banner (danger tint) + **"Submit review"** — 48px, radius
  14, **amber**, white spinner while submitting.

### 5.4 RemoveEnrollmentDialog (tutor removes a student)
- Wrapper over `ConfirmDialog`: title "**Remove {Name}?**", message
  "The student will be notified and their slot will reopen. This
  can't be undone."
- **Reason textarea** (required): label "REASON" (uppercase micro),
  `bg-background` hairline radius 8 `px-3 py-2`, min 76px, 3 lines,
  placeholder "e.g. Class ended early". Confirm disabled while
  empty; label swaps to "Removing…" while in flight.

### 5.5 StudentPickerSheet (batch creation — alternate picker)
- Header: "Pick students" + "Select 2–6 enrolled students" + close
  (`bg-sand` pill).
- **StudentRow:** 40px initial circle (`bg-ai` white when selected /
  `bg-surface-muted` muted idle) → name (card-title, 1 line) →
  grade (caption muted) → right 24px radio check (`border-2`,
  selected = `bg-ai` + white ✓). Selected rows: `bg-ai-light` +
  `border-ai`; idle: `bg-surface` + `border-border`; rows dim to 0.5
  when the 6-cap is reached.
- Footer (`border-t`): counter caption ("N selected · pick at least
  M more" / "maximum reached") + **Continue** (min 48px, radius 14,
  `bg-ai` blue; disabled `bg-sand` + muted).
- **Empty state:** amber `calendar-outline` well + illustration +
  "No students to add" + "Batches are built from enrolled
  students…" + **Back** button (`bg-ai`).

### 5.6 CalendarDatePicker (hand-rolled month grid)
- White card (hairline, radius 14, `p-3`).
- **Header:** 36×36 `pill` chevron buttons + "**{Month} {Year}**"
  (card-title/600). Prev chevron blocks (0.3 opacity) when the
  previous month is entirely in the past.
- **Day-of-week row:** Sun–Sat, micro uppercase muted.
- **Grid:** 6 rows × 7 cols, square aspect-ratio cells, `m-0.5`,
  radius pill, press-scale animation:
  - **Disabled** (past / before `minIso` / after `maxIso`):
    `bg-surface-muted` at 0.4 opacity, muted day.
  - **Selected:** `bg-accent` amber + white semibold day.
  - **Today:** `bg-verification-light` + 1px `border-verification`
    + green semibold day.
  - **Default:** `bg-surface`, primary day.
- No "OK" — tapping a day commits (`onChange(iso)`). KTM-aware
  "today" floor via `todayIsoInKtm()`.

### 5.7 StudentAvailabilityGrid (student multi-select)
- Same geometry as the tutor grid (7 day-rows × 6 slots, time-label
  column header, `maxHeight 460` scroll, legend dots).
- Cell contract: **Available** green tint/checkmark · **Selected**
  green tint + **2px amber border ring** · **Available + Pending**
  green tint + 12px hourglass + bottom-right count badge · **Booked**
  blue tint/people (disabled) · **Off** sand dot at 0.7 opacity.
- Tapping Booked/Off fires `onSlotDisabled` → parent shakes the
  grid; tapping Available/Pending toggles the selection set.
- **Selection is purely visual** — the student's real intent goes
  into the sheet's schedule text field.

### 5.8 Document viewers (admin)
- **ImageViewerModal:** full-screen, dark backdrop, scaled image,
  label header + close.
- **VideoViewerModal:** full-screen `expo-video` player with label
  + close. Both replace the system browser for document previews.

---

## 6. Cross-screen Interaction Spec

- **Admin surface tokens:** dark `#0F172A` hero everywhere; body
  canvas warm paper; cards white + `#E7E1D3` hairline; no shadows.
- **Status color language is universal:** amber = pending/warning,
  green = approved/active/verified, red = rejected/danger,
  blue = info/edit/more-info. Used for pills, chips, icons, and
  progress bars identically across admin, tutor, and student UIs.
- **Amber CTAs:** sheets use amber for their single primary action
  (Send request, Save changes, Submit review). Admin actions are
  status-colored instead (green Approve / red Reject / blue Info),
  and User Management's destructive pills are tinted fills on
  white cards.
- **Every list is live** (onSnapshot or count queries); loading
  states are skeletons, spinners, or "—" dashes; empty states are
  first-class (icon well + title + helper).
- **Dev-only affordances never ship:** the User Management "Show
  demo data" pill and mock banner are gated by `__DEV__`.
