# EdumentX — Figma AI Design Context

> Reverse-engineered from the production codebase (React Native + NativeWind,
> Expo SDK 54). All values below are extracted from `tailwind.config.js`,
> `src/constants/colors.ts`, `src/constants/theme.ts`, `global.css` and the
> component sources. Use this to regenerate pixel-accurate Figma frames.

---

## 1. Design Tokens & Theme

### 1.1 Color Palette (exact hex)

| Category | Token | Hex / Value | Usage |
|---|---|---|---|
| **Page well (dark)** | `night` / `ink` | `#0F172A` | Dark heroes, splash, page behind glass |
| **Page well (deeper)** | `night-deep` | `#0A0F1E` | "Under" dark glass cards |
| **Page canvas (light)** | `background` | `#FBF8F2` | Warm paper — most light screens |
| **Admin canvas** | `background-admin` | `#F6F3EC` | Admin screens |
| **Card surface** | `surface` | `#FFFFFF` | Cards, inputs, sheets |
| **Muted surface** | `surface-muted` / `sand` | `#F1ECE0` | Disabled fills, input wells, chips |
| **Glass (dark UI)** | `glass` | `rgba(255,255,255,0.06)` | Translucent dark cards |
| **Glass (strong)** | `glass-strong` | `rgba(255,255,255,0.10)` | Dark icon wells |
| **Glass border** | `glass-border` | `rgba(255,255,255,0.14)` | Hairline on dark |
| **Glass (faint)** | `glass-faint` | `rgba(255,255,255,0.03)` | Subtle dark fills |
| **Primary (brand green)** | `primary` | `#2F5D50` | "Chalkboard" green CTAs, active states |
| **Primary pressed** | `primary-dark` | `#254B41` | Pressed state |
| **Primary tint** | `primary-light` | `#F1ECE0` | Soft green-tinted wells |
| **Accent (amber — the brand color)** | `accent` / `amber` | `#E5A03B` | Single high-priority CTA per screen |
| **Accent tint** | `accent-light` / `accent-soft` | `#FBEBCF` | Amber chip/well backgrounds |
| **Accent text on tint** | `accent-dark` | `#8B5E10` | Amber-on-tint text |
| **Verification green** | `verification` / `success` | `#3F8A5A` | Verified badges, positive bars |
| **Verification dark** | `verification-dark` | `#2D6B44` | Success text on tint |
| **Verification tint** | `verification-light` / `success-bg` | `#DCF0E4` | Success pill backgrounds |
| **AI blue** | `ai` | `#4A7FA5` | AI assistant accents |
| **AI dark** | `ai-dark` | `#2D5F80` | AI text on tint |
| **AI tint** | `ai-light` | `#EBF3F9` | AI chip backgrounds |
| **AI border** | `ai-border` | `#B8D4E8` | AI hairline |
| **Warning** | `warning` | `#E5A03B` | Warning states (amber family) |
| **Warning text** | `warning-text` | `#8B5E10` | — |
| **Warning tint** | `warning-bg` | `#FBEBCF` | — |
| **Danger** | `danger` | `#C1503D` | Destructive, declined, heart-filled |
| **Danger text** | `danger-text` | `#8B3628` | — |
| **Danger tint** | `danger-bg` | `#F9E5E1` | Danger pill backgrounds |
| **Text primary** | `text-primary` / `ink` | `#0F172A` | Headings & body on light |
| **Text secondary** | `text-secondary` | `#6B7280` | Sub-labels |
| **Text muted** | `text-muted` / `ink-muted` | `#6B7280` | Helper/caption text |
| **Text inverse** | `text-inverse` | `#FFFFFF` | Labels on filled CTAs |
| **Text link** | `text-link` | `#2F5D50` | Links |
| **Border** | `border` | `#E7E1D3` | Card hairlines, dividers |
| **Border strong** | `border-strong` | `#6B7280` | Input focus-level |
| **Border subtle** | `border-subtle` | `rgba(15,23,42,0.05)` | Very light hairlines |
| **Onboarding map** | `onb-map` | `#F0EBE0` | Illustration bg |
| **Onboarding AI** | `onb-ai` | `#EBF3F9` | Illustration bg |
| **Onboarding verify** | `onb-verify` | `#DCF0E4` | Illustration bg |
| **Splash** | `splash` | `#0F172A` | Splash screen bg |
| **Splash text** | `splash-text` | `#FBF8F2` | Splash wordmark |

> Design language summary: **warm paper light theme** (`#FBF8F2`) + **deep
> slate dark heroes** (`#0F172A`), one **amber brand accent** (`#E5A03B`)
> reserved for the single primary CTA, **chalkboard green** (`#2F5D50`) for
> default CTAs and active states, **verification green** (`#3F8A5A`) for
> verified/success, **danger red** (`#C1503D`) for destructive. Cards are
> **white with a 1px `#E7E1D3` hairline** — shadows are intentionally NOT
> used; the hairline does the separation. Dark surfaces use **translucent
> white glass** (`rgba(255,255,255,0.06–0.14)`) instead of flat fills.

### 1.2 Typography Scale

| Token | Size / Line / Weight | Usage |
|---|---|---|
| `display` | 28 / 34 · **700** | Big numbers, hero numerals |
| `hero` / `header-title` | 28 / 34 · 500 / 26 / 34 · 500 | Screen hero titles |
| `screen-title` | 22 / 29 · 500 | Tab-screen titles |
| `heading` | 20 / 26 · 600 | Section numerals, metric values |
| `section-title` | 15 / 22 · 500 | Section headers |
| `card-title` | 14 / 20 · 500 | Card titles |
| `body` | 15 / 22 · 400 | Default body |
| `body-sm` | 13 / 19 · 400 | Secondary body |
| `caption` | 13 / 18 · 500 | Captions, sub-labels |
| `label` | 12 / 16 · 600 · +0.4px ls | Field labels, overline-ish |
| `micro` | 10 / 13 · 500 | Badges, pills, tab labels |
| `button` | 14 / 20 · 500 | Button labels |
| `button-sm` | 13 / 18 · 500 | Small buttons |

### 1.3 Border Radius

| Token | Value | Use |
|---|---|---|
| `xs` | 6px | Small chips |
| `sm` | 8px | Inner chips, inputs on dark |
| `md` | 12px | Nested surfaces |
| `card` | **14px** | The standard card radius (buttons, cards, inputs) |
| `lg` / `hero` | 18px | Hero blocks |
| `xl` | 24px | Large sheets |
| `rounded-t-3xl` | 24px top | Screen-sheet seam over dark hero |
| `pill` | 9999px | Avatars, chips, badges, switches |

### 1.4 Spacing / Sizing Grid

- Base grid: **4px**; content gutters **24px** (`px-6`); body top **32px**
  (`pt-8`); end-of-scroll cushion **48px** (`pb-12`); hero bottom **32px**
  (`pb-8`).
- Named sizes: `touch` 44, `input` 48, `input-lg` 52, `btn` 52, `btn-lg` 56,
  `btn-sm` 40, `avatar` 40, `avatar-card` 60, `avatar-profile` 96,
  `bottom-nav` 64, `chip-sm` 38, `pill-sm` 36, `cta-amber` 56.
- Border widths: hairline 1px, emphasis 1.5px, thick 2px.

### 1.5 Token QA Checklist — hex → exact Tailwind class

> Design-QA mapping: for **any hex found in a Figma frame**, look it up here
> to find the exact NativeWind class it must be coded with. Every value
> below is read straight from `tailwind.config.js` `theme.extend.colors`.
> QA rule of thumb: **fill → `bg-*` · text → `text-*` · stroke → `border-*`**
> — and any hex that matches a token here is a violation in code unless it
> lives in an SVG illustration (`src/components/illustrations/*`, which
> consumes `src/constants/colors.ts` instead).

| Hex / Value | Exact Tailwind class(es) | Used for |
|---|---|---|
| `#0F172A` | `bg-night` · `bg-ink` · `text-text-primary` · `text-text` · `text-ink` · `bg-splash` | Dark heroes, headings & body on light, splash |
| `#0A0F1E` | `bg-night-deep` | "Under" dark glass cards |
| `#FBF8F2` | `bg-background` · `text-splash-text` · `bg-splash-text` | Warm paper canvas, splash wordmark |
| `#F6F3EC` | `bg-background-admin` | Admin screens |
| `#FFFFFF` | `bg-surface` · `bg-background-surface` · `text-text-inverse` | Cards, inputs, sheets; labels on filled CTAs |
| `#F1ECE0` | `bg-surface-muted` · `bg-sand` · `bg-primary-light` | Disabled fills, input wells, chips, soft green wells |
| `rgba(255,255,255,0.03)` | `bg-glass-faint` | Subtle dark fills |
| `rgba(255,255,255,0.06)` | `bg-glass` | Translucent dark cards |
| `rgba(255,255,255,0.10)` | `bg-glass-strong` | Dark icon wells |
| `rgba(255,255,255,0.14)` | `bg-glass-border` · `border-glass-border` | Hairline on dark |
| `#2F5D50` | `bg-primary` · `text-text-link` | Default CTAs, active states, links, icons |
| `#254B41` | `bg-primary-dark` | Primary pressed state |
| `#E5A03B` | `bg-accent` · `bg-amber` · `bg-warning` · `text-accent` · `text-amber` · `text-warning` | The single high-priority CTA; amber accents, stars, warning states |
| `#FBEBCF` | `bg-accent-light` · `bg-accent-soft` · `bg-amber-light` · `bg-warning-bg` | Amber chip/well backgrounds |
| `#8B5E10` | `text-accent-dark` · `text-warning-text` | Amber-on-tint text |
| `#3F8A5A` | `bg-verification` · `bg-success` · `text-verification` · `text-success` | Verified badges, positive bars, success text |
| `#2D6B44` | `bg-verification-dark` · `text-verification-dark` · `text-success-text` | Success text on tint |
| `#DCF0E4` | `bg-verification-light` · `bg-success-bg` · `bg-onb-verify` | Success pill backgrounds, onboarding illustration bg |
| `#4A7FA5` | `bg-ai` · `text-ai` | AI assistant accents, group-batch family |
| `#2D5F80` | `bg-ai-dark` · `text-ai-dark` | AI text on tint |
| `#EBF3F9` | `bg-ai-light` · `bg-onb-ai` | AI chip backgrounds, onboarding illustration bg |
| `#B8D4E8` | `border-ai-border` · `bg-ai-border` | AI hairline |
| `#C1503D` | `bg-danger` · `text-danger` | Destructive, declined, heart-filled |
| `#8B3628` | `text-danger-text` | Danger text on tint |
| `#F9E5E1` | `bg-danger-bg` | Danger pill backgrounds |
| `#6B7280` | `text-text-secondary` · `text-text-muted` · `text-ink-muted` · `border-border-strong` | Sub-labels, helper/caption text, input focus-level border |
| `#9CA3AF` | (placeholder gray — see note below) | TextInput placeholder text |
| `#E7E1D3` | `border-border` · `bg-border` | Card hairlines, dividers, track fills |
| `rgba(15,23,42,0.05)` | `border-border-subtle` | Very light hairlines |
| `#F0EBE0` | `bg-onb-map` | Onboarding illustration bg |
| `rgba(251,248,242,0.20)` | `bg-splash-track` | Splash progress track |

> **Two values NOT in the palette (deliberate):**
> - `#9CA3AF` — placeholder gray is hardcoded on TextInputs (Tailwind's
>   `placeholderTextColor` prop needs a raw string). Not a token; QA should
>   expect it only in `placeholderTextColor="#9CA3AF"` / `#6B7268` props.
> - `#6B7268` — the *icon-gray* variant (one step toward blue from
>   `#6B7280`) used for muted Ionicons/lucide `color` props. It is a
>   hardcoded prop value, not a `tailwind.config.js` token.
>
> **QA spot-check recipe:** pick any card in a Figma frame → its fill must
> be `bg-surface` (`#FFFFFF`) with a 1px `border-border` (`#E7E1D3`)
> hairline and **no drop shadow**; a dark hero must be `bg-night`
> (`#0F172A`); the single CTA must be `bg-accent` (`#E5A03B`); status
> pills follow the §1.1 semantic trio (`warning-bg` amber / `success-bg`
> green / `danger-bg` red). Anything else is drift.

---

## 2. Core Component Anatomy

### 2.1 PrimaryButton
- **Layout:** Auto-width (or stretch) filled button; label centered; optional
  leading icon + spinner overlay.
- **Sizes:** md = 52px tall, lg = 56px tall; radius **14px** (`card`).
- **Variants:**
  - `primary` — fill `#2F5D50`, label `#FFFFFF` (default "Continue" CTA).
  - `accent` — fill `#E5A03B`, label `#FFFFFF` (single paid/upgrade CTA).
  - `ghost` — fill `#FFFFFF`, **2px** border `#E7E1D3`, label `#0F172A`
    (secondary / "I already have an account").
- **Disabled:** fill swaps to `#F1ECE0` (sand), label to `#6B7280` — the
  button shape stays fully visible. (Ghost-disabled keeps the surface fill
  but halves the border: `bg-surface border-2 border-border/40` +
  `text-text-muted`.)
- **Interaction:** spring press scale 0.96 (Reanimated), ~100ms stiff spring
  + light haptic. Never uses `opacity` for disabled.

### 2.2 TutorCard (marketplace listing)
- **Wide variant** (full-width, `rounded-2xl` ~16px, white fill, 1px
  `#E7E1D3` border):
  - **Heart save button** — absolute top-right, 36×36 `pill` circle, white
    fill; heart `outline` in muted gray → filled `#C1503D` when saved; pops
    (scale 1→1.25→1) on toggle.
  - **Row 1:** circular Avatar (36px, initials or photo) → name (14/500) with
    green `checkmark-circle` `#3F8A5A` badge for verified tutors → headline
    (13/400 secondary) beneath.
  - **Row 2:** subject pills — `bg-amber/10` fill (10% amber over white),
    **`text-amber`** (`#E5A03B`) text, 8×2px padding, `rounded-pill`,
    max 3 + "+N" pill (white fill + hairline).
  - **Row 3:** amber star + rating (13) + `(reviewCount)` muted, location
    pin + city.
  - **Row 4:** price — `Rs X,XXX` (button weight) + "/mo" muted caption.
  - Padding: 16px all around; internal gap 8px (Auto Layout column).
- **Compact-h variant:** fixed **200px wide** rail card for horizontal
  carousels; padding 12px; name + verified badge, 2-line headline, rating
  + city, price.

### 2.3 Bottom Navigation — Student (BottomNav)
- **5 tabs:** Home, Map, AI, Enrollments, Profile (`router.replace`).
- **Light tone:** full-width bar, white fill, 1px top hairline `#E7E1D3`;
  active icon+label `#2F5D50`, inactive `#6B7268`; icons 20px, labels 10px.
- **Dark tone (floating dock):** translucent glass pill (`rgba(255,255,255,
  0.06)` fill + `0.14` hairline) floating inside the 24px page gutter;
  active icon white + **4px amber dot** under it (amber reserved for this
  "you are here" marker only); inactive icons white 45%.
- Active pill (light): 48×28 rounded background slides between tabs.

### 2.4 Bottom Navigation — Tutor (TutorBottomBar)
- **4 tabs:** Dashboard, Inbox, Batches, Profile; lucide icons.
- **Light tone:** active icon/label `#2F5D50` + sliding **32px underline**
  beneath the active tab; inactive `#6B7268`.
- **Dark tone:** glass dock; active marker is an amber underline.
- Supports an inbox badge count pill.

### 2.5 Avatar
- Circular, `pill` radius, **1px `#E7E1D3` border**, content centered.
- Fallback: 2-letter initials (first two words, uppercase, font-size ≈
  35% of diameter, color `#0F172A`) on one of 4 deterministic tints —
  `#F1ECE0` / `#FBEBCF` / `#DCF0E4` / `#EBF3F9` (chosen by first char).
- Sizes: 40 default, 44 in list rows, 60 card-level, 96 profile.
- With photo: `expo-image`, `cover`, 120ms fade.

### 2.6 MenuRow (settings list row)
- Auto Layout row: leading icon (20px, `#0F172A`) → label (14/500
  `#0F172A`, flex-1) → chevron-forward (16px `#6B7268`).
- Padding: 16px horizontal, 14px vertical; 1px `#E7E1D3` bottom divider
  between rows (dropped on `last`). Disabled state: 50% opacity, no press.

### 2.7 Chips / Pills / Badges
- **Subject chip:** `#FBEBCF` tint fill, `#8B5E10` text, 8px radius,
  8×2px padding, 10px label. Card pills use `amber/10` fill + `#E5A03B` text.
- **Status pill (request):** pending = `#FBEBCF` fill + `#E5A03B` text;
  accepted = `#DCF0E4` fill + `#2D6B44` text; declined = `#F9E5E1` fill +
  `#8B3628` text. Label 10px semibold, `pill` radius, 8×2px padding.
- **Provider chip (payment form):** 1px border; selected = `#FBEBCF` fill +
  `#E5A03B` border + amber text; unselected = white fill + `#E7E1D3` border
  + secondary text; 12×8px padding, pill radius, leading 14px icon.
- **Verified badge:** green `checkmark-circle` `#3F8A5A`, 14–16px, inline
  after a name.
- **Quick-action card:** 48%-width tile, white fill, hairline border,
  16px radius, 14px padding, 13px medium label.

### 2.8 Metric Tile (tutor dashboard)
- 48%-width tile, white fill, 1px `#E7E1D3` border, 16px radius, 14px
  padding; internal: icon well 32×32 (8px radius, `#FBF8F2` fill + hairline)
  → label (12px muted) → value (20px/600 `#0F172A`) → optional trend caption
  (green when up, muted otherwise). Icons monochrome `#2F5D50`.

### 2.9 EnrollmentRequestCard (tutor inbox)
- White card, 14px radius, **4px left color stripe**: amber `#E5A03B`
  (pending), green `#3F8A5A` (accepted, + 85% opacity), red `#C1503D`
  (declined); padding 16px.
- Header row: Avatar 40 → name + grade → status pill. Subject chips row.
  Schedule line ("Mon·Wed 5–7 PM · From 2026-08-15") in muted caption.
  Optional 2-line message preview. Footer: Accept (green) / Decline (red)
  buttons; accepted state swaps footer copy to a green confirmation.
- Collapsible — tapping the header toggles expand/collapse.

### 2.10 Form Controls
- **TextInput:** 48px tall (`input`), 14px radius, `#F1ECE0` fill + 1px
  `#E7E1D3` border, 16px horizontal padding, 15px text `#0F172A`, muted
  placeholder `#9CA3AF`.
- **Switch (availability):** 44×24 track, `pill`; OFF `#E7E1D3` → ON green
  `#3F8A5A` with a 20px white thumb spring-sliding; 2px elevation.
- **Sheet (modal bottom):** slides over content, white surface, 24px top
  radius, safe-area inset padding, drag handle optional.

### 2.11 Screen Layout System
- `ScreenLayout` variants: `night` (`#0F172A`), `background` (`#FBF8F2`),
  `surface` (white), `splash` — sets safe area + status bar color.
- `ScreenHeader` — fixed hero: **dark variant** `#0F172A` fill, 24px side
  gutters, 32px bottom pad; **light variant** white fill + 1px bottom
  hairline `#E7E1D3`.
- `ScreenScroll` — body: 24px gutters, 32px top pad, 48px bottom cushion,
  no scroll indicator, taps pass through the keyboard.
- `ScreenSheet` — the premium **"dark hero → light sheet"** seam: light
  content (`#FBF8F2`) overlaps the dark hero by 16px (`-mt-4`) with a
  24px top radius, so the hero reads as a backdrop behind a floating sheet.

---

## 3. Screen Inventory & Layout Hierarchy

> Format: top → bottom. All screens share the layout system in §2.11.
> "Dark hero → light sheet" means the ScreenSheet seam; "light header"
> means the white header with hairline.

### Auth & Onboarding
### Auth & Onboarding
- **email-signup:** Warm paper canvas (`bg-background`, no dark hero) →
  heading "Create your account" / "Welcome back" (hero 28/500 + 2px amber
  underline) → **Sign up / Log in segmented toggle** (sand track, active =
  white pill + hairline) → email + password inputs (FieldShell, 48px) +
  5-segment password strength bar on signup → PrimaryButton (green,
  full-width) → "or" divider → Google button (white card, 2px hairline,
  G logo) → pending "check your inbox" panel: mail icon well + "I've
  verified — continue" **green** PrimaryButton + "Resend verification
  email" text link.
- **role-selection:** Warm paper canvas (`bg-background`) with Back link →
  "Step 1 of 2" label → title "How will you use EdumentX?" (hero + amber
  underline) → two role cards (Student / Tutor, 92px tall, white fill +
  hairline border, 52px icon well, active = brand-colored border + pop-in
  24px checkmark pill, else chevron) → green "Continue" (lg, full-width).
- **profile-student / profile-tutor:** **Dark slate hero** (`bg-night`:
  step title + back) → form sections in white cards on warm paper:
  avatar uploader (88px circle) → fields
  (name, phone, grade, subjects multi-select, location picker) → rate
  input (tutor) → documents upload (tutor) → amber submit CTA.

### Student Flow
- **student-home:** Light header: greeting ("Good day," + name with
  amber underline) → full-width search TextInput (white on paper, rounded,
  placeholder "Search subjects, tutors, locations…") → **vertical list of
  TutorCards** (live, sorted) → BottomNav (dark glass dock over night? —
  home uses the light-header variant on paper). Empty state: icon +
  "No tutors available yet".
- **map-search:** **Dark hero header** ("Find a tutor" white/70 → "Near
  you" white + amber underline; search field + **amber filter button**) →
  **full-bleed native map** (OpenStreetMap tiles, custom drop pins — slate
  ring standard / amber ring + shield verified, wide-white-ring when
  selected; "N tutors on map" pill floats over the map) → **horizontal
  snap carousel** of 200px compact TutorCards floating over
  the map bottom (16px gap, snapToInterval 216, hidden scrollbar).
- **TutorDetailsScreen:** Fixed top bar (back chevron, heart save, native
  share) → Profile header (avatar 72 with 2px `amber/30` border + name +
  verified badge + location/
  distance + subject pills + 3-stat row: rating / years / reviews) →
  Pricing (two cards: 1-to-1 rate, group-batch "Message to ask") →
  Session board (session cards + capacity progress bar + "Request an
  empty slot" dashed CTA) → Weekly availability grid (student multi-select,
  booked/pending overlays) → About (expandable bio) → Demo lesson card
  (dark play tile or "No demo video" state) → Reviews & ratings (score
  block + star breakdown bars + category bars + review cards) → **sticky
  bottom CTA** "Enroll with [Name]" (amber).
- **enrollment:** Light header → segmented tabs **Active / Pending / Past**
  (sliding pill) → vertical list of enrollment cards (avatar + tutor name +
  rate + status pill; Message tutor / Rate buttons) → per-tab empty states
  with CTAs → BottomNav.
- **AI-chat:** Dark hero with AI blue avatar + online dot → constraint
  pills row → scrollable message thread (user bubbles right / AI left on
  white cards) → composer input + send (keyboard safe).
- **stu-profile:** Dark hero ("Your account") → light sheet: identity card
  (AvatarBubble 96 editable, name, verified email row) → editable fields
  (name, phone, read-only email) → Notifications row (badge) → More menu
  (Saved tutors / Payment methods / Help & support) → Logout (white card,
  red text) → version footer → BottomNav.
- **saved-tutors / payment-methods / help-support / messages / chat:**
  Light header + back button → list of TutorCards / payment-method rows /
  FAQ accordion / conversation rows / chat bubbles + composer.

### Tutor Flow
- **tutor-home (dashboard):** Light header: greeting + name (amber
  underline) + Verified Professional green pill → messages bell +
  notifications bell → availability toggle card (switch + status line) →
  optional review banner (pending = amber / rejected = red / more-info =
  blue, dismissible) → **2-column metric grid** (Active students, Avg
  rating, Reviews, Response rate, Pending requests, Monthly revenue) →
  Capacity card (progress bar, tappable → capacity screen) → Profile
  completion bar (amber) → Today's sessions card (derived, time + student
  rows) → Pending requests (2-tab segmented: New enrollments / Batch
  requests, sliding green pill; request cards) → "Create a group batch"
  CTA (AI-blue icon tile) → quick-action grid (Inbox / Batches /
  Availability / Messages) → TutorBottomBar.
- **tutor-inbox:** Light header ("Enrollment inbox" + pending count) →
  vertical list
  of EnrollmentRequestCards (accept/decline) → empty state.
- **batches:** Light header → live batch list (cards with members,
  per-member Remove) → 3-step wizard (1: student picker from roster 2:
  details 3: review) → create CTA → TutorBottomBar.
- **tutor_edit_profile:** Hero header → document/review banner if pending
  → live-editable fields (name, phone, photo) → teaching details row →
  verification documents list → More menu (Capacity / Batches / Payouts /
  Help & support) → Logout.
- **tutor-capacity:** Hero header → capacity counters (enrolled/cap,
  editable) → **weekly availability grid** (day columns × time rows,
  tap-to-toggle draft) → sticky "Save changes (N)" amber bar + Discard.
- **payouts:** Light header → payout method card (provider + identifier,
  Change/Remove; add form with provider chips) → monthly earnings card
  (roster × rate, "No commission" note).
- **tutor-pending:** Dark review screen — status + "under admin review"
  messaging.

### Admin Flow
- **admin-home:** Dark hero ("Dashboard" + live name) → 3 stat cards
  (Platform Statistics, Verification Queue, User Management) each with
  live count badge → admin BottomNav.
- **verification-queue:** Dark hero ("Moderation" + open/decided count) →
  list of pending tutor verifications
  (documents viewer, Approve/Request more info/Reject) + pending-edit
  diff cards + decided history.
- **platform-statistics:** Dark hero (greeting + "EdumentX · Platform
  statistics") → live count cards (users, tutors,
  approved, pending requests) with loading/error/retry + bar-list trend/
  demand cards.
- **user-management:** Dark hero ("Management" + search bar) → filter
  pill card (status + role groups) → user list → suspend/restore/
  delete actions (danger states).
- **admin-profile:** Profile fields + role badge.

---

## 4. Interaction & Motion Notes (for prototyping parity)

- **Press feedback everywhere:** spring scale (0.96–0.99 depending on
  surface; cards 0.98, chips 0.97, buttons 0.96) + light haptic.
- **Active pill / underline:** 32–48px shapes spring-slide between tabs
  (stiff spring, ~150ms).
- **Dark dock active marker:** 4px amber dot under the active icon.
- **No shadows** — 1px hairlines separate surfaces; dark UIs use
  translucent white glass.
- **Amber is reserved** for the single high-priority CTA / "you are here"
  marker; green is the default positive/CTA color.
- **Safe areas:** bottom navs and sticky CTAs respect the home indicator;
  sheets respect bottom insets.
- **Empty states** are first-class: 48–56px tinted icon wells
  (`accent-soft`/`primary-light`/`ai-light`) + title (14/500) + 13/400
  muted helper + optional CTA.
