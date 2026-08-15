# EdumentX — Figma AI Tutor Context

> Companion to `FIGMA_AI_CONTEXT.md` (global tokens) and
> `FIGMA_AI_AUTH_CONTEXT.md` / `FIGMA_AI_STUDENT_CONTEXT.md`. This
> export covers the five **tutor-side** surfaces at field level:
> Dashboard, Enrollment Inbox (+ accept slot-picker), Capacity &
> Schedule, Group Batches (+ 3-step creation wizard), and Payouts.
> Token values (`bg-surface`, `rounded-card`, `text-display`…) are
> defined in `FIGMA_AI_CONTEXT.md` §1.

---

## 0. Screen Map & Shared Shell

```
tutor-home      → (capacity card) tutor-capacity · (See all) tutor-inbox
                → (batch CTA) batches · (quick actions) 4 routes
tutor-inbox     → (Accept) slot-picker Modal → acceptRequest
                → (Decline) confirm Alert
tutor-capacity  → (save bar) bulk saveAvailability
batches         → (Create New Batch) 3-step wizard → createBatch
payouts         → (Change/Remove) payment method · live earnings
```

**Tutor tab dock — `TutorBottomBar`** (4 tabs, no hero on inbox/capacity/batches):
- Light tone (flat bar): `bg-surface`, 1px `border-t border-border`,
  `px-2`, **safe-area bottom inset + 12px**. Active tab = 48×28
  `pill` fill `#F1ECE0` behind the icon + **32×2 amber underline**
  (springs between tabs). Inactive icon `#6B7268`, active `#2F5D50`,
  labels 11px/500. **Inbox tab carries a count badge:** red `#C1503D`
  pill, `min-w-16px h-4`, top-right of the icon, white 10px count
  ("9+" cap).
- Dark tone (floating glass dock): translucent white rounded-3xl
  (`bg-glass` + `bg-glass-border` hairline + soft drop shadow),
  active = white icon on `rgba(255,255,255,0.08)` well, amber
  underline.
- Tab paths: Dashboard `/tutor-home` · Inbox `/tutor-inbox` ·
  Batches `/batches` · Profile `/tutor_edit_profile`.

---

## 1. Tutor Dashboard (`/tutor-home`)

Canvas `bg-background` (warm paper). **Light `ScreenHeader`** +
body + `TutorBottomBar`. Empty-state branch renders instead of the
dashboard when the profile doc is missing / `fullName` is empty.

### 1.1 Header
- **Greeting row:** "Good to see you," (body 15/400 `#6B7280`) →
  **name** — screen-title 22/500 `#0F172A` with the **2px `#E5A03B`
  amber underline** (self-start).
- **Verified pill** (when `isVerifiedProfessional`): 12px
  `shield-checkmark` green + caption `#3F8A5A`, `bg-verification-light`
  pill, `px-2.5 py-1`.
- **Trailing actions:** 40×40 white `pill` messages button (1px
  hairline, 19px `chatbubble-ellipses-outline` `#2F5D50`, →
  `/messages`) + `NotificationBell`.
- **Availability toggle card** (white, hairline, radius 16, `p-3.5`):
  label "Available for new students" / "Hidden from search"
  (body/500) + caption "Toggle to pause/resume appearing in search
  results" (caption `#6B7280`) + **animated switch** — 44×24 track,
  `#E7E1D3` → verification green via `interpolateColor`, white
  20px thumb with 1px hairline + `shadow-sm`, spring-sliding.
  Disabled while the first snapshot loads ("Loading search
  visibility…").

### 1.2 Review banners (flush under the header, no side gutter)
One of four `ReviewBanner` tones, dismissible ("Got it"):
- **Pending:** amber tint — "Your account is being reviewed. You'll
  get full access once an admin approves your profile."
- **More info:** AI-blue tint — "An admin has asked for more
  information. Please update your profile and re-submit."
- **Rejected:** danger tint — "Reason: {reason}. Please update your
  profile and re-submit."
- **Update pending:** amber tint — "Your recent profile changes are
  under review. Your profile isn't being shown to students right now."

### 1.3 Metric grid (3×2, `flex-row flex-wrap`, 48% width tiles)
Each tile: white card (hairline, radius 16, `p-3.5`, `mb-2.5`) —
32×32 icon well (radius 8, `bg-background` + hairline, 16px icon
`#2F5D50`) → label (label `#6B7280`) → value (**heading** `#0F172A`)
→ optional trend caption. All six are live:

| Tile | Icon | Value source |
|---|---|---|
| Active students | `people` | profile doc `currentStudents` (maintained by acceptRequest) |
| Avg rating | `star` | mean of live `reviews/{uid}/reviews` scores; `…` while loading, `—` when zero |
| Reviews | `chatbox-ellipses-outline` | live review count |
| Response rate | `flash-outline` | derived: `responded / total` across full request history; `—` until requests exist |
| Pending requests | `time` | live pending enrollment requests |
| Monthly revenue | `cash` | roster count × `monthlyRateNpr` ("Roster × monthly rate" footer) |

### 1.4 Capacity card (tappable → `/tutor-capacity`)
- White card (hairline, radius 16, `p-4`): 16px `people` icon
  `#6B7280` + "Capacity" (button-sm/500) + right-aligned
  "**X of Y filled**" (green `#3F8A5A`, red `#C1503D` at 100%) +
  chevron.
- **Progress bar:** 8px `pill` track `bg-border`; fill
  `bg-verification` / amber `#E5A03B` ≥80% / `bg-danger` 100%.

### 1.5 Profile completion
- Row card: "Profile completion" label → 6px `pill` track with
  **amber fill** + right-aligned "**N%**" (button-sm amber).

### 1.6 Today's sessions (derived live from the roster)
- Centered card (`p-6`): 56×56 `pill` icon well (`bg-background` +
  hairline, 26px `briefcase-outline` **amber**).
- **Loading:** "Loading sessions…" caption. **Empty:** "No sessions
  scheduled today." (caption muted).
- **Session rows:** 60px time column ("5–7 PM", amber caption/500)
  → student name (button-sm) + "Subject · Duration" (caption muted);
  1px `border-t` dividers.

### 1.7 Pending requests section
- Header row: "Pending requests" (card-title) + "**See all**" amber
  link + chevron → `/tutor-inbox`.
- **Sub-tabs (`RequestsSubTabs`):** segmented control — `bg-surface`
  container (hairline, radius 12, `p-1`), **sliding green
  `ActivePill`** (`#2F5D50`, 36px tall, rounded-lg) behind the active
  label; labels "New enrollments" (count) / "Batch requests" (0).
  Active label white; count chip `bg-white/25` when active, `bg-border`
  when not.
- **Request row** (tap → inbox): white card (hairline, radius 16,
  `p-3.5`) — 40px avatar (photo or initial tile) + student name
  (card-title) + amber **Pending badge** + grade caption + subject
  chips (amber tint `bg-accent-light`, `text-accent-dark`) +
  "`{schedule}` · From `{startDate}`" micro + 2-line message
  preview (body-sm secondary) when present.
- **Batch tab empty state:** 22px `people-outline` `#6B7268` +
  "No batch requests right now."

### 1.8 Group batch CTA
- Full-width row card: 40×40 **`bg-ai` `#4A7FA5`** icon well
  (white `people` 20px) + "Create a group batch" (card-title, AI
  blue) + "Combine 2–6 students into a shared batch" (caption
  muted) + chevron → `/batches`.

### 1.9 Quick actions (2×2 grid, 48% width)
- White cards (hairline, radius 16, `p-3.5`): "View inbox" →
  `/tutor-inbox` · "Manage batches" → `/batches` · "Set
  availability" → `/tutor-capacity` · "Messages" → `/messages`.

### 1.10 Empty state (no profile doc)
- Centered: 64×64 `bg-accent-soft` well (28px amber
  `document-text-outline`) + "Your tutor profile isn't set up yet"
  (section-title) + helper paragraph + **amber CTA** "Complete your
  profile" (min 56px, radius 16, → `/profile-tutor`) + caption
  "Already submitted? You may be under admin review…".

---

## 2. Enrollment Inbox (`/tutor-inbox`)

Canvas `bg-surface` variant, light header, `TutorBottomBar` with the
**pending-count badge** on the Inbox tab.

### 2.1 Header
- "Enrollment inbox" — display 28/500 with the **2px amber
  underline** (self-start) + live count line "**N pending
  requests**" (body, verification green; "Loading requests…" while
  the first snapshot is in flight).

### 2.2 List
- **Loading:** centered spinner `#2F5D50` + "Loading requests…"
  caption.
- **Empty:** 56×56 `pill` `bg-accent-light` well (26px amber
  `mail-open-outline`) + "No pending requests" (card-title) +
  "New enrollment requests from students will appear here."
  (body secondary).
- **Cards:** vertical stack, 14px gap, of `EnrollmentRequestCard`.

### 2.3 EnrollmentRequestCard (shared studio card)
White card, radius 14, **`p-4`**, hairline border + **4px
`border-l-accent`** amber left stripe (pending). Decided state: green
stripe + 0.85 opacity ("Accepted — exact address shared with
student" footer) or red stripe ("Declined"). Collapsible via the
header row (chevron up/down `#6B7268`); default **expanded**.

Header row:
- **Avatar 40** (photo or initial on `bg-surface-muted` tile).
- Student name (card-title/500) + **Pending badge** (amber pill
  `bg-warning-bg`/`text-warning`) or Accepted/Declined badge
  (green/red tint pills).

Body (expanded):
- **Subject chips:** `bg-verification-light`, `text-verification`,
  micro/500.
- **"From the student" block** (when a message exists): `bg-accent-soft`
  card, 1px `border-accent/30`, radius 14, `p-3` — overline micro
  uppercase `#8B5E10` "FROM THE STUDENT" + body message.
- **Detail grid** (`bg-background`, radius 8, `p-3`, 2-col 50%):
  Schedule / Start / End fields — micro uppercase muted label +
  button-sm value.
- **Actions row (pending only):** "**Accept**" (flex-1, 40px, radius
  8, `bg-verification`, white check icon + white text; "Accepting…"
  + spinner while in flight) + "**Decline**" (flex-1, 40px, radius 8,
  white + `border-danger-bg`, red X + danger text).

### 2.4 Accept slot-picker (Modal, slide-up)
- Backdrop `bg-black/50`; sheet white, **top radius 24**, max 88%,
  drag-handle bar (40×4 `pill` `bg-border`).
- Header: "Pick a slot" (section-title/600) + caption "Choose the
  weekly slot for {name}'s enrollment. Booked slots are disabled."
- **`AvailabilityTimeList`** (scrollable, max 420px) — grouped by
  day: day overline (uppercase caption muted) → white card rows
  (`px-3.5 py-2.5`, 1px `border-b`): time label ("5–7 PM") + trailing
  pill **"Available"** (green tint) / **"Booked"** (muted tint,
  people icon, non-tappable). Available rows tappable; the selected
  row gets `bg-accent-soft` fill.
- **Footer** (`border-t`, `px-5 pt-4 pb-6`): **Confirm button** —
  min 48px, radius 14; enabled = `bg-verification` + white
  "Accept enrollment" / disabled = `bg-sand` + muted "Tap an
  available slot" + spinner while the transaction runs. Below:
  "Cancel" text button (40px, secondary).

### 2.5 Decline flow
- `Alert.alert` confirm ("Decline request?" / "{Name}'s request will
  be removed and they'll be notified.") with destructive "Decline".
  Row disappears on the next snapshot. Capacity-full and
  already-decided errors surface as friendly alerts.

---

## 3. Capacity & Schedule (`/tutor-capacity`)

Canvas `bg-background`, light header, body, `TutorBottomBar`. All
three data streams are live (availability, enrollments, batches);
edits accumulate in a local draft until **Save changes** flushes one
bulk write.

### 3.1 Header
- "Manage your" (body secondary) → "**Capacity & schedule**"
  (display 28/500, 2px amber underline) + sub-line
  "**X / Y filled · N slots available**" (body secondary) — all
  live.

### 3.2 Capacity progress card
- White card (hairline, radius 14, `p-4`): 16px `people` `#2F5D50`
  + "Student capacity" + "**X / Y filled**" (green) → 8px `pill`
  track `bg-background`; fill green / **amber ≥80%** / red 100%.

### 3.3 Weekly availability grid (`WeeklyAvailabilityGrid`)
White card (hairline, radius 14, `p-4`): "Weekly availability"
(card-title) + "Tap slots to edit, then save your changes."
(caption). Column header (time labels only, `ml-14`, micro uppercase
muted, 2 lines max) + **7 day-rows × 6 time slots** in a vertical
ScrollView (`maxHeight 460`).

Cell anatomy (h-12, radius 8, flex-1, 6px gaps):
- **Available:** `bg-verification-light` + 1px `border-verification`
  + 14px green `checkmark`.
- **Booked:** `bg-ai-light` + 1px `border-ai` + 14px blue `people`
  icon, disabled (tap blocked).
- **Off:** `bg-surface-muted`, transparent border, muted "·" dot at
  0.7 opacity; editable — tap flips Off ⇄ Available.
- Row label: day overline (uppercase, `w-12`).

**Legend** (below grid): Available (green tint square) / Booked (blue
tint) / Off (sand) — 12px squares + micro captions.

**Skeleton** while the first snapshot loads: time-label strip +
7 rows of `h-12 rounded-md` grey blocks + `w-8` label bars.

### 3.4 Info banner
- `bg-ai-light` + 1px `border-ai-border`, radius 14, `p-3.5`:
  18px info icon `#4A7FA5` + caption (AI blue): "One student per
  1-to-1 slot. Group batches occupy a full slot for all members.
  Students can request only your **Available** slots — conflicts are
  blocked automatically."

### 3.5 Sticky save bar (appears only while the draft is dirty)
- Floats above the bottom bar: `px-4 pt-3 pb-2`, `border-t`, `bg-background`.
- Left: "**Unsaved changes**" (button-sm) + "**N slots changed**"
  (caption muted) — or "Availability saved" / "Your schedule is
  live." for 2.2s after saving.
- Right: "Discard" text button (44px, secondary) + **"Save changes
  (N)"** — 44px, radius 14, **`bg-accent` amber** with white text
  (disabled = `bg-surface-muted` + muted text, spinner while
  saving).

---

## 4. Group Batches (`/batches`)

Canvas `bg-background`, light header, `TutorBottomBar`. The screen
has **no dark hero** — a plain header + `Create New Batch` CTA.

### 4.1 Header
- "Group Batches" (28px bold `#0F172A`) + "Combine students into
  shared batches" (secondary).

### 4.2 Create New Batch CTA
- Full-width **`bg-ai` `#4A7FA5`** card (`rounded-card py-4 px-6`):
  white **Plus** icon (lucide, 20px, `strokeWidth 3`) + white
  semibold "Create New Batch" → opens the wizard.

### 4.3 Active batches list
- Section title "Active Batches" (bold 18px).
- **Loading:** centered `ActivityIndicator` `#4A7FA5`.
- **Empty:** white card (hairline, radius 14, `p-6`, centered):
  "No batches yet. Create one to combine students into a shared
  class." (secondary).
- **Batch card** (white, hairline, radius 14, `p-5`, `mb-4`):
  - Header: **batch name** (bold 18px) + "Subject • Rs X/student/mo"
    (secondary) + **status pill** (`bg-success/10` + green text
    "Active" / muted "Ended").
  - **Seats row:** "Students" (xs secondary) ↔ "N in batch" (xs
    primary) + 6px `bg-border` track with **`bg-ai` fill**
    (members/6 max).
  - **Day chips:** `bg-background` pills, xs secondary text,
    "Mon · 5–7 PM" (from `slotKey`).
  - **Member avatars:** overlapping 32px circles (`-space-x-2`, 2px
    `border-surface`, `bg-ai/20` initial) — first 3, then "+N" —
    + "Remove" link (danger, xs) with confirm Alert.

### 4.4 Creation wizard (absolute overlay bottom sheet)
- Backdrop `bg-black/70`; sheet white, **top radius 24, 85% height,
  `p-6`**.
- Header: step title ("Pick students" / "Batch details" / "Review &
  create", 20px/600) + "Cancel" (AI blue).
- **Step indicator:** 3 segments — `h-1 flex-1 rounded-full`,
  filled = **`bg-accent`** amber, pending = `bg-border`.

**Step 1 — Pick students (2–6 required):**
- Caption "Step 1 of 3 — select 2-6 enrolled students." + counter
  "N/6 selected" (xs muted).
- **Roster rows** (live active enrollments): tappable card
  (`p-3 rounded-card mb-2 border`): selected = `border-accent` +
  `bg-accent-light`; idle = `border-border` + `bg-background`; full
  roster → remaining rows at 0.5 opacity + disabled.
  - 36px initial circle (`bg-accent` white text when selected /
    `bg-ai/20` blue text idle) + name (medium) + "Grade · Subject1,
    Subject2 · Mon · 5–7 PM" (xs muted, 1 line) + right **radio
    check**: 24px circle, `border-2`; selected = `bg-accent` +
    white ✓.
- Footer: "**Continue (N)**" — 48px+, radius 14, `bg-ai` white text
  (disabled = `bg-text-muted/20`).

**Step 2 — Batch details:**
- Caption "Step 2 of 3 — name, subject, fee & schedule."
- **Batch name** — TextInput (radius 14, hairline, `bg-background`,
  `px-4 py-3`, placeholder "e.g. Grade 10 Maths Batch A" `#6B7280`).
- **Subject** — 6 pill chips + "Other…": selected = `bg-accent` +
  white; idle = `bg-background` + hairline. "Other…" reveals a
  custom-subject TextInput (same anatomy, min 2 chars).
- **Monthly fee (NPR / student)** — numeric TextInput, placeholder
  "e.g. 2200", must be > 0.
- **Schedule (days)** — 7 day pills (Mon–Sun); tapping a day adds
  its `5-7` slot (toggle off re-taps). Selected pills
  `bg-accent`/white. Below: preview chips "Mon · 5–7 PM"
  (`bg-ai/10`, AI-blue text).
- Footer: "**Back**" (flex-1, `bg-background` + hairline) +
  "**Review**" (flex-1, `bg-ai`; disabled `bg-text-muted/20`).
  `canSubmit` = name ≥2 + subject set + fee > 0 + ≥1 slot.

**Step 3 — Review & create:**
- Summary card (`bg-background`, radius 14, `p-4`): name (semibold)
  → "Subject · Rs X/student/mo" (secondary) → schedule chips
  (white, hairline) → "N students: Name1, Name2…" (xs muted).
- "← Edit details" link (AI blue, centered).
- **"Save Batch"** — full-width 48px+, radius 14, **`bg-accent`**
  amber + white text (spinner while creating) → `createBatch`.

---

## 5. Payouts (`/payouts`)

Canvas `bg-background`, light header, **no bottom bar** (pushed from
the tutor profile's "More" section).

### 5.1 Header
- Row: "Payouts" (display 28/500, 2px amber underline) + trailing
  36×36 `pill` back button (`bg-background` + hairline, 20px
  chevron `#2F5D50`) + sub-line "How you receive payments"
  (secondary).

### 5.2 Payout method card
- Section label "Payout method" (`text-label` muted, uppercase).
- **Set state:** white card (hairline, radius 14, `p-4`) — 40×40
  `bg-accent-soft` icon well (provider icon, amber) + provider name
  (card-title) + identifier (caption muted, 1 line) + **Change** /
  **Remove** pills (radius pill, `bg-surface-muted` + hairline,
  micro/600; Remove is danger text).
- **Empty state:** dashed **"Add payout method"** CTA — full-width
  min-48px, radius 14, `border-2 border-dashed border-border`,
  amber `add` icon + amber semibold text.
- Helper caption: "Students pay you directly — EdumentX never holds
  your money."
- **Edit state:** `PaymentMethodForm` — provider **chip row** (4
  providers, `bg-accent` selected) + identifier TextInput (radius
  14, hairline) + "Save payout method" amber button + Cancel.
  Providers: eSewa / Khalti / IME Pay / Bank.

### 5.3 Monthly earnings card (live)
- Section label "Monthly earnings".
- White card (hairline, radius 14, `p-5`): **display 28/700**
  "Rs X,XXX" → caption "N enrolled students × Rs X,XXX/mo" (live
  roster count × live `monthlyRateNpr`) → green
  `shield-checkmark-outline` 14px + caption "No commission — you
  keep 100%".

---

## 6. Cross-screen Interaction Spec

- **Tabs** push (`router.push`) rather than replace — the dock keeps
  its active state via the pathname; inbox badge = live pending
  count.
- **Live everywhere:** dashboard metrics, requests, roster, reviews,
  availability, batches, and payment method all subscribe to
  Firestore; every surface has a first-class loading (spinner or
  skeleton) and empty state.
- **Draft-then-save on capacity:** cell taps never touch Firestore;
  a single bulk write flushes the whole grid, and the amber save bar
  appears only while dirty.
- **Amber usage (one per surface):** dashboard = map-less, so amber
  lives in the today-sessions icon + See all link + empty-state CTA
  (no single amber button); capacity = the "Save changes" button;
  batches = the step-indicator fill + "Save Batch"; payouts = the
  "Add payout method" CTA. Green `#2F5D50` owns all confirm actions
  (Accept enrollment, sub-tab pill).
- **AI blue** `#4A7FA5` is the *secondary brand* on tutor surfaces:
  the group-batch CTA, wizard continue buttons, and batch avatar
  fills — it signals the shared-class feature family.
