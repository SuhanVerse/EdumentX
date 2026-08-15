# EdumentX — Figma AI Student Marketplace Context

> Companion to `FIGMA_AI_CONTEXT.md` (global tokens) and
> `FIGMA_AI_AUTH_CONTEXT.md` (auth flow). This export covers the five
> **student marketplace** surfaces at field level: Home, Map Search
> (+ filters + tutor preview), Tutor Details (+ enroll sheet + review
> modal), My Enrollments, and the AI assistant chat. All screens sit
> on the 5-tab student `BottomNav` (Home · Map · AI · Enrollments ·
> Profile) unless noted.

---

## 0. Screen Map

```
student-home   → (CTA) map-search
map-search     → (marker/carousel tap) tutor/[id]
tutor/[id]     → (Enroll CTA) RequestEnrollmentSheet
               → (share) native Share · (heart) saved-tutors
               → (Rate & Review) ReviewModal
enrollment     → (card tap) tutor/[id] · (Message) chat
AI-chat        → (constraint pills + composer)
```

---

## 1. Student Home (`/student-home`)

Canvas `bg-background` (warm paper), light `ScreenHeader`.

### 1.1 Header
- **Greeting row:** "Good day," (body 15/400 `#6B7280`) → **name** —
  screen-title 22/500 `#0F172A` with the **2px amber underline** motif.
- **Trailing actions:** 40×40 `pill` white button (1px `#E7E1D3` border,
  19px chat bubble icon `#2F5D50`, → `/messages`) + `NotificationBell`
  (same pill anatomy with an unread-count badge).
- **Location row:** 14px `location-outline` icon `#6B7280` + caption
  13px `#6B7280` (e.g. "Patan, Lalitpur").
- **Search bar:** white surface, **radius 16**, **48px tall**, 1px
  border; leading 18px `search-outline` `#6B7280`; placeholder
  "Search subjects, tutors, locations…" `#9CA3AF`; text 15px.

### 1.2 Body
- **Primary CTA — "Explore tutors on the map"** (the ONLY amber surface
  on the screen): 52px tall, radius 16, `bg-amber` `#E5A03B` fill,
  **night `#0F172A` icon + label** (semibold), soft amber glow shadow
  (`0 10px 30px rgba(229,160,59,0.25)`). Routes to `/map-search`.
- **Section header:** "Recommended tutors" (section-title 15/500) +
  right-aligned "**N available**" caption `#6B7280`; sub-line
  "Verified tutors ready to help you learn" (body-sm muted).
- **Tutor list:** vertical stack, 16px gap, of **TutorCard `wide`**
  (full anatomy in `FIGMA_AI_CONTEXT.md` §2.2) — live from Firestore,
  ratings overlaid from the reviews collection.
- **Loading:** centered `ActivityIndicator` `#2F5D50` + "Loading
  tutors…" caption. **Empty state:** 56×56 white icon well (radius 16,
  hairline, 26px `search-outline` `#6B7280`) + "No tutors available
  yet" (card-title) + "Approved tutors will appear here once they've
  been verified by our team." (body-sm muted).
- **Bottom:** `BottomNav` student, active tab Home.

---

## 2. Map Search (`/map-search`)

Canvas: full-bleed **native map**; dark hero header + floating
controls + bottom carousel + `BottomNav`.

### 2.1 Header (dark hero `#0F172A`, `px-5 pt-14 pb-4`)
- **Title block:** "Find a tutor" (body, white/70) → "**Near you**"
  (screen-title 22/500 white + amber underline). Trailing: 40×40 `pill`
  back button (`bg-white/10`, white chevron) → `/student-home`.
- **Search + filter row (`gap-2`):**
  - Search: flex-1 white field, radius 14, **48px tall**, leading
    18px `search-outline` `#6B7280`; placeholder "Search tutors,
    subjects…" `#6B7280`; clear `close-circle` 18px appears when
    non-empty.
  - **Filter button:** 48×48, radius 14, **`bg-accent` amber**, white
    20px `options-outline` icon → opens `FiltersSheet`.

### 2.2 Map surface
- OpenStreetMap tiles (no key) with **custom drop pins**: teardrop pin
  rasterized with the tutor's **photo** (avatar pins — `TutorAvatarPin`:
  white head clipped to the avatar, 3px ring + tail in **slate
  `#0F172A`** for standard tutors, **amber `#E5A03B`** for verified
  professionals, who also get a 17px amber shield badge on the head
  rim); fallback PNG teardrop set (`markerIcons.ts`: amber badge +
  slate dot for regular, green badge + white dot for verified); native
  tinted pin as last resort. A selected pin swaps to a **wide-white-ring**
  variant (`pin-tutor-selected` / `pin-verified-selected`).
- **Cluster pins:** count badge (green) — tapping zooms in.
- **Floating controls (absolute over map):**
  - **Recenter:** 44×44 white `pill`, `locate` 20px `#2F5D50`, shadow
    elevation, `bottom-36 right-4`.
  - **Count pill:** `bg-night/80`, radius pill, `px-3 py-1.5`, white
    `people` icon + "**N tutors on map**" caption white, top-left.
- **Nearby carousel (bottom, hidden when a preview sheet is open):**
  - Count chip: `bg-surface/90` pill, hairline, "**N tutors within X
    km**" caption muted, floating above the rail.
  - **Horizontal `FlatList`** of `TutorCard compact-h` (200px wide,
    16px gap, `snapToInterval` 216, `decelerationRate="fast"`, hidden
    scrollbar, bottom inset) — tap opens the preview sheet.
- **Loading state:** `bg-surface-muted` fill + centered spinner.

### 2.3 FiltersSheet (bottom-sheet Modal, MapSearch dims to ~55%)
- Sheet: white, **top radius 24**, max height 90%, **drag-handle bar**
  (40×4 pill `#F1ECE0`), drag-down to dismiss (>80px / fast swipe).
  Header "Filters" (section-title) + close 20px `#6B7268`.
- **Sections** (each `py-4`, 1px `#E7E1D3` bottom divider, overline
  caption uppercase):
  1. **Subject** — 8 pills (Math, Physics, Chemistry, Biology,
     English, Nepali, Computer, Accounts). **Subject pill anatomy:**
     `pill` radius, `px-4 py-2`, 1px border; active =
     `bg-accent`/`border-accent` + white text; inactive =
     `bg-verification-light` + `#2D6B44` text (teal-tinted outline).
  2. **Level** — 5 pills (Class 6-8, SEE, +2 Science, +2 Mgmt,
     Bachelor's); active = `bg-primary` + white, inactive = white +
     hairline + `#6B7280`.
  3. **Class mode** — 3 pills (Home tuition, Online, At tutor's
     place); same anatomy as Level.
  4. **Distance · within N km** — custom `RangeSlider`: 36px tall
     tap track; 4px `pill` track `#F1ECE0` with amber fill; **20×20
     white thumb, 2px amber border, pill**, centered on the value;
     tap-to-jump; range 1–20 km.
  5. **Budget · up to Rs X/mo** — same slider; 3,000–30,000 NPR,
     step 500.
  6. **Verification** — row card (`bg-sand`, hairline, radius 14,
     `p-3.5`): "Verified tutors only" (card-title) + caption "Show
     only Blue Tick Pro & Student Tutors" + 44×24 switch
     (`#6B7280` track → verification green, 20px white thumb).
- **Footer** (`border-t`, `px-5 pt-3 pb-6`, row): **Reset**
  (`SecondaryButton`, 40px, white + hairline + `#0F172A` text) +
  **"Show N results"** (`PrimaryButton accent` amber, flex-2, md).

### 2.4 TutorPreviewSheet (marker tap)
- Backdrop `bg-black/40`; sheet white, top radius 20, `px-5 pt-5 pb-8`,
  top border hairline.
- Row: **Avatar 48** + name (body semibold `#0F172A`) + green
  **verified `pill` badge** (8px, white check) + headline caption;
  close X (20px, `p-1.5`).
- Pills row: distance chip + service chip (`bg-surface-muted`, pill,
  hairline, caption `#6B7280`).
- CTA: **PrimaryButton accent** "View profile" → `/tutor/[id]`.

---

## 3. Tutor Details (`/tutor/[id]`)

Single scrollable page, 7 sections + sticky footer. Light canvas,
no BottomNav (modal-style route with its own top bar).

### 3.1 Fixed Top Bar (stays above scroll)
- Row `px-5 pb-2`: **back** (40px pill, white, hairline) · trailing
  **heart** (40px pill; outline `#6B7280` → filled `#C1503D` + pop
  animation when saved; toggles the `savedTutors` map) · **share**
  (same pill; opens the native share sheet with
  "Name — headline · Rs X/month on EdumentX").

### 3.2 Profile Header
- **Avatar 72px** with **2px `#E5A03B`/30 amber border**; verified
  tutors get a 20×20 green shield badge bottom-right (2px background
  ring).
- Name (heading 20/600) + inline green shield icon; headline (body
  secondary, 1 line); `@username` (body-sm muted); location row
  (12px pin + caption "Neighborhood, City").
- **Pills:** gender pill (`bg-accent-soft`/`border-accent/20`, amber
  caption + person icon) + subject pills (`bg-primary-light`, hairline,
  green caption).
- **3-stat row (`StatCell`s):** icon + **value** (heading) + label
  (caption muted): Rating (`star` amber) / Years (`briefcase`) /
  Reviews (`chatbubble`).

### 3.3 Pricing
- Two equal cards (`flex-1`, white, hairline, radius 14, `p-4`):
  - **1-to-1:** 40×40 `accent-soft` icon well (person-outline amber)
    → overline caption "1-TO-1" → **Rs X,XXX** (heading bold) →
    "/month" caption. Data-driven (live `monthlyRateNpr`).
  - **Group batch:** same card, amber icon well (people) → "Group
    batch" overline → caption "Message to ask about rates" — tap →
    `/chat` with this tutor.

### 3.4 Session Board
- Header: "Session Board" (section-title) + "N slots" green pill
  (when sessions exist) + sub-line "Browse available slots and enroll
  in one that fits your schedule."
- **Session cards:** white card (hairline, radius 14, `p-4`) —
  type row (lock/people icon green + "PRIVATE/PUBLIC BATCH" overline)
  + status pill (`bg-verification-light` green / `bg-accent-soft`
  amber / `bg-danger-bg` red) → "Subject — Name" (card-title) →
  schedule row (calendar icon + caption) → seats row ("2/4 filled" +
  mini progress bar, 6px, green fill) + **Enroll pill button**
  (green fill, white micro label; "Full" state: `bg-surface-muted`,
  muted text, disabled).
- **Empty-slot CTA:** full-width dashed card (`border-2 border-dashed
  border-border`, white) — 40px `accent-soft` pill + "Request an empty
  slot" (card-title) + "Suggest a day and time that works for you"
  (caption) + chevron → opens the enroll sheet.
- **Capacity card:** "Student capacity" + "X of Y filled" + 8px
  progress bar (`bg-verification` green / amber ≥80% / red 100%).
- **Empty state (no sessions):** 48px `primary-light` icon well
  (calendar) + "No sessions yet" + secondary helper.

### 3.5 Weekly Availability (student multi-select)
- `StudentAvailabilityGrid` — day columns × time rows; a slot can be:
  **Open** (white, hairline), **Selected** (2px amber border ring),
  **Booked** (muted/disabled, tap shakes the grid), **Pending**
  (hourglass overlay + count badge). Selection is purely visual —
  the actual times go into the sheet's schedule text.

### 3.6 About
- "About" section-title; expandable bio (body secondary, "Show more"
  accent link when truncated).

### 3.7 Demo Lesson
- **With video:** dark `bg-night` 160px-tall tile, dim overlay +
  layered play button (64px white/20 → 56px white/30 circle, white
  play icon) + info block ("Teaching demo" card-title / "See
  {FirstName}'s teaching style in action" body-sm muted). Tap → full
  `expo-video` player modal.
- **Without video:** white card, 48px `ai-light` icon well
  (videocam `#4A7FA5`) + "No demo video available" + helper.

### 3.8 Reviews & Ratings (live from the reviews collection)
- Score block: **X.X** (display 28/700) + 11px star row + "N reviews"
  micro.
- **Star breakdown:** 5 rows (5→1) — number + star icon + 6px bar
  (`bg-surface-muted` track, amber fill scaled to max count) + count.
- **Category bars:** white card "Rating breakdown" — 5 rows
  (Teaching/Punctuality/Communication/Knowledge/Overall): label
  body-sm + score body-sm (1 decimal) + star + 8px green bar
  (score/5).
- **Review cards:** white card (hairline, radius 14, `p-4`) — 40px
  avatar circle (photo or initials) + reviewer name (card-title) +
  green check (verified) + 10px star row + relative-time caption;
  comment body-sm. "Show all N reviews" pill (white, hairline,
  `px-6 py-2.5`, green text).
- **Empty:** 48px `accent-soft` well (star-outline amber) + "No
  reviews yet" + helper.

### 3.9 Sticky Footer (safe-area aware, `pt-4` + `max(bottom inset,16)`)
- Left: "1-to-1 monthly" micro muted → **Rs X,XXX** heading bold →
  "/month" micro.
- Right: **PrimaryButton `accent`** "Enroll with {FirstName}" →
  opens `RequestEnrollmentSheet`.

### 3.10 RequestEnrollmentSheet (modal bottom sheet)
- Sheet: white, **top radius 24**, max 90%, drag handle; header row:
  tutor avatar 40 + name + subjects (body-sm muted) + close X.
- **Schedule summary** (required): card-title label + caption helper
  ("A short description like 'Mon · Wed · Fri 5–7 PM' or 'Flexible on
  weekday evenings'.") + **48px input** (white, hairline, radius 14,
  `px-4`, placeholder "Mon · Wed · Fri 5–7 PM"). Free-form text — the
  tutor reads it on their inbox card.
- **Start date / End date:** two stacked `CalendarDatePicker`s —
  label row with live "Pick a date" caption; past dates blocked;
  end-date picker's minimum = max(today, start); picking a start past
  the current end auto-bumps end to start+30 days. Defaults: today +
  30 days.
- **Message (optional):** card-title label + **88px multiline input**
  (hairline, radius 14, `px-4 py-3`) placeholder "Anything the tutor
  should know…" + right-aligned micro counter **n/280**.
- **Error banner:** `bg-danger-bg` + 1px `#C1503D`/30 border + radius
  14 + `p-3` — 16px alert icon + caption danger text.
- **Submit:** full-width 48px, radius 14 — enabled =
  **`bg-accent` amber** + white spinner/label "Send request";
  disabled = `bg-surface-muted`. On success → toast-style alert
  ("Request sent — you'll see it under My Enrollments → Pending").

---

## 4. My Enrollments (`/enrollment`)

Light header + **segmented tabs** Active / Pending / Past (sliding
green pill, per-tab count) + card list + `BottomNav`.

### 4.1 Enrollment Card (Active/Past)
- White card, hairline, radius 14, `p-4`, **4px left stripe**:
  green `#3F8A5A` (active) / `#E7E1D3` (past).
- Row: **avatar 60px** (photo or `person-outline` fallback; resolved
  from the tutor's public profile) → **tutor name** (card-title,
  truncated; falls back to "Enrollment #xxxxxx") + **status pill**
  (Active = success-green; Past = neutral) → subject chips (amber
  tint) → date row (calendar icon + "start → end" caption) → slot row
  (time icon + "Slot: {key} / flexible" caption).
- **Active CTAs (row, `gap-2`):** "**Rate & Review**" (40px,
  `bg-accent-light`, radius 8, `#8B5E10` text) + "**Message tutor**"
  (40px, `bg-sand`, radius 8, secondary text → `/chat` with peer
  identity). Card tap → `/tutor/[id]`.
- **Pending tab** renders the same card with a sand message-preview
  block + **Edit / Cancel** actions (Edit opens `EditRequestSheet`).

### 4.2 ReviewModal (Rate & Review)
- Modal over the card: 5-star tap row (amber fill), 4 category bars,
  comment textarea, submit → `ReviewRepository.submitReview`
  (transactional: writes `reviews/{tutorUid}/reviews/{id}` + updates
  the profile aggregates). Success alert: "Thanks for your review".

---

## 5. AI Assistant Chat (`/AI-chat`)

Dark hero header + constraint pills + message thread + composer;
`BottomNav` (AI tab active).

### 5.1 Header
- Dark slate hero: back (white on `bg-white/10` pill) + **40×40
  `bg-ai` `#4A7FA5` pill** with white `sparkles` icon + online dot
  (6px success green) + title "AI Assistant" (white + amber
  underline) + subtitle caption.

### 5.2 Constraint pills
- Row of removable pills: `bg-ai-light`, 1px `#B8D4E8` border, pill
  radius, `px-3 py-1.5` — subject/grade/mode chips with an X; tap to
  remove.

### 5.3 Thread
- Inverted scroll (newest at bottom). **AI bubbles:** white cards,
  radius 14, hairline, avatar 28 left + body text; **user bubbles:**
  right-aligned `bg-primary` green with white text. Typing indicator
  while the model streams (request/response model).

### 5.4 Composer
- `bg-sand` pill bar (44px tall, `px-4`): TextInput "Ask about
  tutors, subjects, rates" (`#6B7280` placeholder, `returnKeyType
  send`) + circular send button (`bg-accent` amber, white arrow,
  disabled while loading).

---

## 6. Cross-screen Interaction Spec

- **Card taps** → tutor details (`router.push`); **tabs** →
  `router.replace` (back stack never grows).
- **Live data everywhere:** tutor lists, ratings, availability,
  requests, and messages all subscribe to Firestore (`onSnapshot`);
  empty states are first-class (icon well + title + helper).
- **Safe areas:** sheets and the sticky footer respect bottom insets;
  the map's floating carousel clears the `BottomNav`.
- **Amber usage:** exactly one amber CTA per surface — Home's map
  CTA, Map's filter button, Details' "Enroll with X", the sheet's
  "Send request", the chat's send button.
