# Figma Make — Master Design Brief
## EdumentX v2: Industry-Grade Multi-Role Tutor Marketplace

> **Purpose**: This is the **single, definitive prompt** for generating a Figma Make (or Musho / Relume / Galileo) design that converts EdumentX from "good-enough auth screens" into a polished, multi-role, industry-grade product. It includes a sidebar navigation, all 3 user roles (Student, Tutor, Admin), responsive breakpoints, and design-system extraction.
>
> **Use case**: Paste this entire brief into your AI design tool. Attach the supporting files listed in §7. Iterate on each phase independently.

---

## 0. How to Use This Brief

This brief is organized into **8 phases**. Figma Make works best when you feed it **one phase at a time**:

| Phase | What to Generate | Estimated Iterations |
|-------|------------------|----------------------|
| 1 | Design system tokens page (colors, type, spacing, components) | 1-2 |
| 2 | App shell: sidebar + bottom tab + status bar | 1 |
| 3 | Guest & Onboarding flow (Splash, Onboarding, Auth, OTP) | 1-2 |
| 4 | Student/Parent role (Home, Map, Tutor Detail, Enroll, Chat) | 2-3 |
| 5 | Tutor role (Dashboard, Profile, Schedule, Verification Queue) | 2-3 |
| 6 | Admin role (Console, Verifications, Analytics, User Mgmt) | 2-3 |
| 7 | Edge cases & states (empty, error, loading, success) | 1 |
| 8 | Component library handoff page | 1 |

After all phases are exported, follow §8 to extract the design system.

---

## 1. Product Context (Always Include)

```
APP NAME:         EdumentX
PRODUCT TYPE:     Location-based home tutor marketplace (mobile-first)
PRIMARY MARKET:   Nepal (NP), but international-ready
CURRENT STAGE:    MVP — authentication UI shipped, dashboards pending
PLATFORMS:        iOS + Android (Expo SDK 54, React Native, TypeScript)
DESIGN DIRECTION: "Quiet Luxury" — premium, minimal, like Linear or Stripe
ANTI-PATTERNS:    No oversaturated gradients, no generic pill buttons,
                  no heavy black drop shadows, no childish illustrations.
                  Think: a tutor's parent is a doctor or engineer — the
                  app must feel trustworthy and adult.
REFERENCE APPS:   Linear, Stripe, Notion, Arc Browser, Things 3, Duolingo
                  (for the delight), Apple Maps (for map UI quality).
```

---

## 2. Design Tokens (Authoritative)

> **These tokens match the actual `constants/theme.ts` in the codebase.** Do not invent new colors.

### 2.1 Color System

#### Brand

| Token Name | Hex | Use |
|------------|-----|-----|
| `brand.primary` / `Night` | `#0F172A` | Headers, primary buttons, dark surfaces |
| `brand.primaryDark` | `#020617` | Pressed state of primary |
| `brand.primaryLight` / `Sand` | `#F1F5F9` | Light backgrounds, icon circles |
| `brand.accent` / `Copper` | `#B45309` | CTAs, highlights (use ONLY for the "Finish setup" type moments) |
| `brand.verification` / `Emerald` | `#059669` | Verified badges, success states |
| `brand.verificationLight` | `#ECFDF5` | Verified tints |
| `brand.ai` / `Indigo` | `#4F46E5` | AI features (matching, suggestions) |
| `brand.aiLight` | `#EEF2FF` | AI tints |

#### Semantic

| Token | Color | Text | Background | Subtle |
|-------|-------|------|------------|--------|
| `success` | `#059669` | `#064E3B` | `#DCFCE7` | — |
| `warning` | `#D97706` | `#92400E` | `#FEF3C7` | `#FFFBEB` |
| `danger` | `#DC2626` | `#7F1D1D` | `#FEE2E2` | `#FEF2F2` |
| `info` | `#0F172A` | — | `#F1F5F9` | — |

#### Neutral Surface

| Token | Hex |
|-------|-----|
| `background.page` | `#F1F5F9` (Sand — page bg) |
| `background.adminPage` | `#F8FAFC` |
| `background.surface` | `#FFFFFF` (cards) |
| `background.disabled` | `#F1F5F9` |

#### Text Hierarchy

| Token | Hex |
|-------|-----|
| `text.primary` | `#0F172A` |
| `text.secondary` | `#475569` |
| `text.tertiary` | `#1E293B` |
| `text.muted` | `#94A3B8` |
| `text.disabled` | `#CBD5E1` |
| `text.inverse` | `#FFFFFF` |
| `text.link` | `#B45309` (Copper link) |

#### Borders

| Token | Value |
|-------|-------|
| `border.default` | `#E2E8F0` |
| `border.strong` | `#94A3B8` |
| `border.subtle` | `rgba(15, 23, 42, 0.04)` |
| `border.card` | `rgba(15, 23, 42, 0.06)` |

### 2.2 Typography

- **Font Family**: **Plus Jakarta Sans** (geometric, clean tracking, modern)
  - Fallback chain: `Inter`, `SF Pro Text`, `system-ui, -apple-system, sans-serif`
- **Mono / Numeric**: `JetBrains Mono` (for session codes, phone numbers, stats)

| Token | Size | Line Height | Weight | Letter Spacing | Case | Use |
|-------|------|-------------|--------|----------------|------|-----|
| `brandTitle` | 30 | 36 | 500 | — | — | Brand splash |
| `heroTitle` | 28 | 34 | 500 | -0.3 | — | Screen titles |
| `screenTitle` | 22 | 29 | 500 | -0.2 | — | Section headings |
| `sectionTitle` | 15 | 22 | 500 | — | — | Card section labels |
| `cardTitle` | 14 | 20 | 500 | — | — | Card titles |
| `body` | 14 | 20 | 400 | — | — | Body text |
| `onboardingBody` | 15 | 24 | 400 | — | — | Onboarding subtitles |
| `bodySmall` | 12 | 18 | 400 | — | — | Helper text |
| `caption` | 12 | 18 | 400 | — | — | Captions |
| `overline` | 11 | 15 | 500 | 0.6 | UPPERCASE | Labels |
| `button` | 14 | 20 | 500 | — | — | Button text |
| `buttonLarge` | 16 | 22 | 600 | — | — | Hero CTA |
| `sessionCode` | 32 | 32 | 500 | 5 | — | Code displays |

### 2.3 Spacing (8pt grid)

| Name | px | Use |
|------|----|-----|
| `xxs` | 2 | — |
| `xs` | 4 | Inline icon gaps |
| `s` | 6 | — |
| `sm` | 8 | Chip gaps, default tight stack |
| `md` | 10 | — |
| `lg` | 12 | Card inner padding (tight) |
| `xl` | 14 | — |
| `page` | 16 | **Standard screen horizontal padding** |
| `section` | 18 | — |
| `screen` | 20 | Card padding, between sections |
| `xxl` | 22 | — |
| `xxxl` | 24 | Major section gap |
| `huge` | 32 | Hero section top padding |
| `giant` | 48 | Splash spacing |

### 2.4 Border Radius

| Name | px | Use |
|------|----|-----|
| `xs` | 6 | Tags, micro-elements |
| `sm` | 8 | Chips |
| `md` | 10 | Inputs, small buttons |
| `card` | 12 | Cards, primary buttons |
| `lg` | 14 | Role cards, hero cards |
| `hero` | 18 | Hero sections |
| `circle` | 999 | Avatars, dots, full pills |

### 2.5 Component Sizes

| Token | px | Use |
|-------|----|-----|
| `touchTarget` | 44 | Min tap target (iOS HIG) |
| `inputHeight` | 48 | Standard input |
| `inputHeightLarge` | 52 | Large input |
| `primaryButtonHeight` | 52 | Primary CTA |
| `primaryButtonHeightLarge` | 56 | Hero CTA (Profile "Finish") |
| `compactButtonHeight` | 40 | Compact button |
| `bottomNavHeight` | 64 | Bottom tab bar |
| `sidebarWidth` | 256 | Desktop sidebar (expanded) |
| `sidebarWidthCollapsed` | 72 | Desktop sidebar (collapsed) |
| `avatarSmall` | 40 | List avatar |
| `avatarCard` | 60 | Card avatar |
| `avatarProfile` | 96 | Profile avatar |
| `otpBoxWidth` | 44 | OTP digit |
| `otpBoxHeight` | 52 | OTP digit |
| `mapPinLarge` | 48 | Map pin marker |
| `mapPinSmall` | 32 | Cluster marker |

### 2.6 Elevation (subtle, layered, never harsh)

| Level | Shadow | Use |
|-------|--------|-----|
| `e0` | none | Flat |
| `e1` | `0 1 2 rgba(15,23,42,0.04)` | Hairline cards |
| `e2` | `0 4 12 rgba(15,23,42,0.05)` | Default cards |
| `e3` | `0 8 24 rgba(15,23,42,0.08)` | Floating sheets |
| `e4` | `0 16 40 rgba(15,23,42,0.12)` | Modals, popovers |
| `eCopper` | `0 4 12 rgba(180, 83, 9, 0.20)` | Accent CTA glow |

### 2.7 Motion

| Token | Value | Use |
|-------|-------|-----|
| `easeOut` | `cubic-bezier(0.16, 1, 0.3, 1)` | Page enter, button press |
| `easeIn` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit |
| `durationFast` | 120ms | Hover, micro |
| `durationNormal` | 220ms | State changes |
| `durationSlow` | 400ms | Page transitions |
| `springDefault` | `{ damping: 18, stiffness: 220, mass: 1 }` | Sheets, modals |

---

## 3. App Shell: Sidebar + Bottom Tab (CRITICAL)

> **This is the navigation container that the rest of the app lives inside.** The sidebar is mandatory per the brief.

### 3.1 Desktop / Tablet Sidebar (≥ 768px width)

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────┐                                                     │
│ │  E   │  EdumentX                                           │
│ │      │  Premium Tutoring, Verified.                        │
│ ├──────┤                                                     │
│ │  ⌂   │  Home                                              │
│ │  ◉   │  Discover                                          │
│ │  ♥   │  Saved                                             │
│ │  ☰   │  My Enrollments                                    │
│ │  💬  │  Messages                                          │
│ │  👤  │  Profile                                           │
│ ├──────┤                                                     │
│ │  ⛭   │  Settings                                          │
│ │  ⓘ   │  Help & Support                                    │
│ ├──────┤                                                     │
│ │  ☰   │  Switch Role ▾   (Student / Tutor / Admin)         │
│ │  A   │  Aarav Tamang                                      │
│ │      │  Student · Grade 10                                │
│ └──────┘                                                     │
│                                                              │
│               [ Main content area ]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Specs:**
- Width: **256px** (expanded) / **72px** (collapsed, icon-only with tooltips)
- Background: `#FFFFFF`
- Right border: `0.5px #E2E8F0`
- Brand header: 80px tall, contains geometric "E" logo (32px square, dark fill, white letter) + "EdumentX" wordmark
- Active nav item: 8px wide copper left bar + `#F1F5F9` background tint + `#0F172A` text
- Inactive nav item: 16px icon + 14px label, `#475569` color
- Nav item height: 44px, padding 12px horizontal
- Profile footer: 72px tall card, avatar (40px) + name + role chip + "Manage account" chevron
- Hover state: background `#F8FAFC` 200ms transition
- **Role switcher** at bottom (Student / Tutor / Admin) is the most important element — it must be visible at all times because the user might toggle between roles

### 3.2 Mobile Bottom Tab (≤ 767px width)

5 tabs (icon + label):
- **Home** (`home-outline` / `home`)
- **Discover** (`map-outline` / `map`) — opens map view
- **Enroll** (`school-outline` / `school`) — list of current tutors
- **Chat** (`chatbubbles-outline` / `chatbubbles`) — with unread badge
- **Profile** (`person-outline` / `person`)

**Specs:**
- Height: 64px + safe-area-inset-bottom
- Background: `#FFFFFF`
- Top border: `0.5px #E2E8F0`
- Active tab: `#0F172A` icon + label
- Inactive tab: `#94A3B8` icon + label
- Center FAB (floating action button) for "Find tutor" on Student role (44px circle, `#0F172A` bg, white `+` icon, 8px lift shadow)
- Add a 6th floating element: **Role pill** above the tab bar on mobile showing current role (Student/Tutor/Admin) — tappable to open role switcher sheet

### 3.3 Top App Bar (shared by all inner screens)

```
┌──────────────────────────────────────────┐
│  ← Back          Page Title         ⌕ ⋮ │
│  (optional subtitle)                    │
└──────────────────────────────────────────┘
```

- Height: 56px (mobile) / 64px (desktop)
- Background: `#FFFFFF` with 0.5px bottom border
- Back button: 44px tap target, `chevron-back` icon 24px `#0F172A`
- Title: `screenTitle` 22/500 left-aligned (or centered on mobile)
- Right actions: search icon (24px) + kebab menu (24px) for context actions

---

## 4. Screen Inventory by Role

> **Generate every screen in this list.** Each screen gets a 390×844 mobile frame AND a 1280×800 desktop/tablet frame showing the same screen in the sidebar layout.

### 4.1 Guest & Onboarding Flow (8 screens)

| # | Screen | File Route | Key Elements |
|---|--------|-----------|--------------|
| G1 | **Splash** | `/` | Dark `#0F172A` bg, 64px white logo box with "E", "EdumentX" 34px, "Find your perfect tutor nearby" subtitle, 104×4 progress bar |
| G2 | **Onboarding 1** | `/onboarding` | White bg, "Skip" top-right, sand-tinted illustration panel (280h) with 120px white circle + `location-outline` 58px in primary, "Discover tutors on the map" hero title, body, dot indicator (active 24×8 pill), "Next" CTA |
| G3 | **Onboarding 2** | `/onboarding` | Same shell, indigo-tinted panel, `sparkles-outline` icon, "Ask AI for the best match" |
| G4 | **Onboarding 3** | `/onboarding` | Same shell, emerald-tinted panel, `shield-checkmark-outline` icon, "Verified, trusted tutors", "Get started" button |
| G5 | **Phone Entry** | `/phone-entry` | Segmented control [Sign up | Log in], "Create your account" title, "PHONE NUMBER" label, country box (NP +977) + phone input, "Send OTP" CTA, terms text |
| G6 | **OTP Verify** | `/otpverify` | Shield-checkmark icon circle (64px), "Verify your number", phone display "+977 98XXXXXXXX", 6 OTP boxes (44×52), "Resend in 00:45", "Verify OTP" |
| G7 | **Create Password** | `/create_password` | Lock icon circle, "Create a password", password + confirm fields with eye toggle, length-based strength bar (red→yellow→green), "Continue" |
| G8 | **Role Selection** | `/role-selection` | Sand bg, "STEP 3 OF 4" overline, "How will you use EdumentX?", 2 role cards (Student/Parent, Tutor) with icon box + chevron/checkmark, "Continue" |
| G9 | **Profile Setup** | `/profile` | **Dark header** (`#0F172A` top section with back, "Set up your profile", subtitle), **sand body** with avatar (96px) + "Upload photo", form cards (Name, Email, Grade chips, Subject chips), **Copper "Finish setup" CTA** (56px, copper glow) |

### 4.2 Student / Parent Role (10 screens)

| # | Screen | File Route | Key Elements |
|---|--------|-----------|--------------|
| S1 | **Home Dashboard** | `/student/home` | Greeting "Good morning, Aarav" + role pill, **3 quick stats cards** (Saved Tutors / Active Sessions / Hours this week), "Continue learning" carousel of current tutors with progress bar, "Recommended for you" section, "Nearby tutors" preview |
| S2 | **Discover / Map** | `/student/discover` | **Map view** (Google Maps style) with custom pins (tutor avatar in copper ring), pulsing current-location dot, floating search bar top (with filter chip: Subject, Distance, Rating, Price), bottom sheet (collapsed = filter chips, expanded = full list) with tutor cards |
| S3 | **Tutor List** (non-map variant) | `/student/tutors` | List of tutor cards (horizontal layout: 60px avatar + name + rating + subject chips + price/hour + distance) using `@shopify/flash-list` style virtualization |
| S4 | **Tutor Detail** | `/student/tutor/:id` | Hero photo / cover, name + verified badge, rating + reviews count, hourly rate prominent, bio paragraph, subject chips, schedule preview, "Request enrollment" primary CTA (copper), secondary "Message" button, "Save" heart icon top-right |
| S5 | **Request Enrollment** | `/student/enroll/:id` | Modal/sheet, tutor summary at top, form: subjects multi-select, sessions per week, preferred time slots, message to tutor, total estimate, "Send request" CTA |
| S6 | **My Enrollments** | `/student/enrollments` | Tabs: Active / Pending / Past, each item is a card with tutor info, subject, schedule, status badge, "Message" / "View details" CTAs |
| S7 | **Chat List** | `/student/chats` | List of conversations: avatar, name, last message preview, unread badge, timestamp, online dot |
| S8 | **Chat Thread** | `/student/chat/:id` | Header (avatar + name + online status), message bubbles (sent = primary, received = surface), input bar with attachment + camera + send buttons, typing indicator |
| S9 | **Student Profile** | `/student/profile` | Avatar, name, grade + subjects display, "Edit profile" CTA, "Settings" list (Notifications, Privacy, Payment, Help, Sign out) |
| S10 | **Settings** (shared) | `/settings` | Sections: Account, Notifications, Privacy, Payments, Help & Support, About, Sign out — each row with chevron |

### 4.3 Tutor Role (8 screens)

| # | Screen | File Route | Key Elements |
|---|--------|-----------|--------------|
| T1 | **Tutor Dashboard** | `/tutor/home` | Welcome + role pill, **4 stat cards** (Active Students / Hours Taught / Monthly Earnings / Avg Rating), "Pending requests" card with count, "Upcoming sessions" timeline, "Your Blue Tick status" progress card with "Complete verification" CTA |
| T2 | **Tutor Profile (Public)** | `/tutor/profile/:id` | Cover photo, avatar, name, verified badge, rating, hourly rate, bio, subjects, education list, reviews section |
| T3 | **Edit Tutor Profile** | `/tutor/profile/edit` | Avatar + cover uploader, name, headline, bio (textarea), hourly rate input, subjects multi-select, education add-list, "Save" CTA |
| T4 | **Schedule** | `/tutor/schedule` | Week view calendar with time slots, "Set availability" CTA, color-coded by status (available/booked/blocked), tap slot to add/remove |
| T5 | **Requests Inbox** | `/tutor/requests` | Tabs: New / Accepted / Declined, request card: student name + photo, subject, requested schedule, message preview, "Accept" + "Decline" buttons |
| T6 | **Verification Queue** | `/tutor/verify` | Stepper (4 steps: ID, Education, Address, Video intro), current step UI, "Upload document" dropzone with hairline border + icon, "Next" CTA |
| T7 | **Earnings** | `/tutor/earnings` | Total this month hero stat, chart placeholder (line chart of last 6 months), transaction list, "Withdraw" CTA |
| T8 | **Tutor Settings** | `/tutor/settings` | Same as Student settings but with tutor-specific sections: Payout method, Availability defaults, Verification status |

### 4.4 Admin Role (6 screens)

| # | Screen | File Route | Key Elements |
|---|--------|-----------|--------------|
| A1 | **Admin Console Home** | `/admin/home` | Sidebar in admin mode, **4 KPI cards** (Total Users / Active Tutors / Pending Verifications / Monthly Revenue), live activity feed, "Pending verifications" table preview |
| A2 | **Verification Queue** | `/admin/verifications` | Data table: Tutor name + photo, Submitted date, Documents count, Status badge, "Review" action. Top filters: status, date range |
| A3 | **Verification Detail** | `/admin/verifications/:id` | Tutor info sidebar, document viewer (PDF/image with zoom), check-list of verification criteria, "Approve" + "Reject" + "Request more info" buttons |
| A4 | **User Management** | `/admin/users` | Data table: Name, Role, Status, Joined, Last active, Actions. Bulk select, search bar, role filter |
| A5 | **Analytics Dashboard** | `/admin/analytics` | 4 stat cards on top, line chart (signups over 30 days), bar chart (tutors by subject), map heatmap of active users, top tutors leaderboard |
| A6 | **Admin Settings** | `/admin/settings` | Platform settings, feature flags, payouts config, audit log |

### 4.5 Edge Cases & States (12 screens)

Generate these as a single page with labeled variants:

| State | Variants |
|-------|----------|
| **Loading** | Skeleton card, skeleton list, full-screen spinner with logo |
| **Empty** | No tutors found, no chat history, no enrollments, no earnings |
| **Error** | Network error, 404, server error, permission denied |
| **Success** | Action completed (toast), enrollment accepted, profile saved |
| **Permission** | Location permission requested, notification permission, photo library |
| **Onboarding complete** | Welcome screen with confetti animation description |

---

## 5. Visual Style Rules (Critical)

These rules apply to **every screen** you generate:

### 5.1 Do
- ✅ Use **hairline borders** (0.5px `#E2E8F0`) instead of heavy shadows for card separation
- ✅ Use **multi-layered ultra-soft shadows** for floating elements (0.05 to 0.12 opacity only)
- ✅ Use **8-10px corner radius** for cards/inputs; 12-14px for hero cards; 999 for circles
- ✅ Use **Plus Jakarta Sans** consistently — never mix with system fonts
- ✅ Use **semantic color tokens** (semantic.success) not raw hex (e.g., `#059669`)
- ✅ Use **tabular-nums** for all numbers, prices, time displays
- ✅ Add **micro-interactions** annotations on hover/press states
- ✅ **Use icons** from Lucide or Phosphor — never emoji icons
- ✅ Respect **safe area** at top (status bar) and bottom (home indicator)
- ✅ Use **auto-layout** everywhere with proper constraints
- ✅ Add **dark mode** variants for the top 5 screens (Home, Discover, Tutor Detail, Tutor Dashboard, Admin Console) — use the same hex values but invert the surface/page roles

### 5.2 Don't
- ❌ No **oversaturated gradients** (no purple-to-pink)
- ❌ No **generic pill buttons** (use the 12-14px radius, not 999)
- ❌ No **heavy black drop shadows** (keep them subtle and layered)
- ❌ No **emoji icons** in the UI
- ❌ No **stock illustrations** of generic people at desks
- ❌ No **Material Design** patterns (no FAB drawer, no top app bar with hamburger)
- ❌ No **iOS Settings-style** long grouped lists (use cards instead)
- ❌ No **playful mascots** or cartoon characters

### 5.3 Iconography

Use **Lucide Icons** (https://lucide.dev) or **Phosphor Icons** with the `regular` (outline) weight. Never filled icons in nav (except active state).

| Common icon needs | Lucide name |
|-------------------|-------------|
| Home | `home` / `house` |
| Discover/Map | `map-pin` / `map` |
| Saved/Heart | `heart` |
| Chat | `message-circle` / `message-square` |
| Profile | `user` / `user-circle` |
| Search | `search` |
| Filter | `sliders-horizontal` |
| Close | `x` |
| Back | `chevron-left` / `arrow-left` |
| Settings | `settings` / `sliders` |
| Verified badge | `badge-check` / `shield-check` |
| Upload | `upload-cloud` |
| Camera | `camera` |
| Send | `send` / `paper-plane` |
| Notification | `bell` |
| Calendar | `calendar` |
| Clock | `clock` |
| Money | `dollar-sign` / `banknote` |
| Star (rating) | `star` (filled) |
| More | `more-horizontal` / `more-vertical` |
| Logout | `log-out` |
| Eye / Eye-off | `eye` / `eye-off` |
| Lock | `lock` |
| Shield | `shield` |
| Sparkles (AI) | `sparkles` |
| Location | `map-pin` / `navigation` |
| Phone | `phone` |
| Mail | `mail` |

---

## 6. Responsive Behavior

Generate **3 viewport variants** of every primary screen:

| Viewport | Width | Layout |
|----------|-------|--------|
| **Mobile** | 390 × 844 | Bottom tab, full-screen sheets |
| **Tablet** | 768 × 1024 | Collapsed sidebar (72px) + content + right panel where applicable |
| **Desktop** | 1280 × 800 | Full sidebar (256px) + content area; data tables become visible |

**Rules:**
- Sidebar visible on tablet & desktop, hidden on mobile (bottom tab instead)
- Map is full-bleed on mobile, 60% width with 40% tutor list panel on tablet/desktop
- Data tables appear in admin screens on tablet+; cards on mobile
- Chat thread takes full screen on mobile; right-panel on desktop

---

## 7. Files to Attach When Generating

Attach these files in this order so the AI has full context:

| # | File | Why |
|---|------|-----|
| 1 | `Documentation/00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` | Full product context |
| 2 | `constants/theme.ts` | Master design tokens |
| 3 | `constants/colors.ts` | Color aliases |
| 4 | `constants/typography.ts` | Typography with overrides |
| 5 | `constants/spacing.ts` | Spacing aliases |
| 6 | `app/_layout.tsx` | Root layout structure |
| 7 | `app/index.tsx` | Splash routing |
| 8 | `screens/onboarding/SplashScreen.tsx` | Splash implementation |
| 9 | `screens/onboarding/OnboardingScreen.tsx` | Onboarding reference |
| 10 | `screens/auth/PhoneEntryScreen.tsx` | Phone entry reference |
| 11 | `screens/auth/OtpVerify.tsx` | OTP reference |
| 12 | `screens/auth/Password.tsx` | Password reference |
| 13 | `screens/auth/RoleSelection.tsx` | Role selection reference |
| 14 | `screens/auth/ProfileScreen.tsx` | Profile reference |
| 15 | `app.json` | Expo config |
| 16 | `package.json` | Dependencies |

---

## 8. Design System Extraction Prompt (For After Generation)

Once Figma Make returns the generated design, run this secondary prompt to extract a complete design system:

```text
I have a mobile app design with screens already built. I need you to extract 
and document a complete design system from the existing design that developers 
can use for implementation.

App name: EdumentX
Target platform: iOS + Android (React Native via Expo SDK 54)
Frame size: 390×844px (iPhone 14) and 1280×800px (desktop)

Analyze the screens in this Figma file and create a comprehensive design 
system specification document that includes:

1. COLOR TOKENS
   - List every color used and assign a semantic name
   - Group: brand, semantic, background, text, border
   - Note any opacity variants

2. TYPOGRAPHY SCALE
   - Font family/weight/size/line-height for every text style
   - Semantic mappings: heroTitle, screenTitle, body, caption, etc.

3. SPACING SYSTEM
   - Extract all padding/margin values into a 4 or 8 px scale
   - Document any layout patterns

4. COMPONENT SPECS
   - Buttons (primary, secondary, ghost, icon) with all states (default, hover, pressed, disabled, loading)
   - Input fields with default / focused / error / disabled states
   - Cards and containers (flat, elevated, hairline)
   - Navigation: top bar, bottom tab, sidebar items
   - Custom components: avatar, badge, chip, role card, OTP box, map pin, password strength bar

5. DESIGN TOKENS FILE
   - Generate a tokens.ts file with all values
   - Use TypeScript const objects matching the existing constants/theme.ts structure
   - Include light + dark mode variants

6. COMPONENT USAGE GUIDELINES
   - When to use each component variant
   - Accessibility notes (touch targets, contrast, labels)
   - Common patterns and anti-patterns

Output format: Create a DESIGN_SYSTEM.md website-style document with 
side-by-side previews (ASCII art or component specs), organized into 
navigable sections.

For my onboarding carousel that showcases 3 core features of the app, 
also generate rich visual feature illustrations (NOT placeholder images):

Feature 1 - "Discover tutors on the map": Build a mini map interface 
  with map pins, location marker, and a tutor card overlay.
Feature 2 - "Ask AI for the best match": Build a chat bubble interface 
  with AI messages, suggestion chips, and tutor card recommendations.
Feature 3 - "Verified, trusted tutors": Build a profile card stack 
  with verification badges, document checkmarks, and trust signals.

Each illustration should:
- Be built with actual UI components (not placeholders)
- Show the feature in action with realistic mock UI
- Use real component patterns from the design system
- Fit in a 360×260px container
- Match the app's visual style perfectly
- Have light AND dark mode variants

Design requirements:
- Background: #F1F5F9 (Sand) for slide 1, #EEF2FF (AI tint) for slide 2, 
  #ECFDF5 (Verification tint) for slide 3
- Accent: #0F172A (slide 1), #4F46E5 (slide 2), #059669 (slide 3)
- Border radius: 16px on outer panel
- Component style: cards with subtle shadows + hairline borders
```

---

## 9. Quality Checklist (Verify Before Exporting)

After Figma Make returns, manually verify these before exporting:

- [ ] All screens use the **exact** token colors listed in §2 (no random hex)
- [ ] All text styles match §2.2 (no ad-hoc font sizes)
- [ ] Spacing follows the 8pt grid (§2.3)
- [ ] Corner radii match §2.4
- [ ] **Sidebar is present** on all tablet/desktop variants
- [ ] **Bottom tab is present** on all mobile variants
- [ ] **Top app bar** is consistent across inner screens
- [ ] **Role switcher** is visible in sidebar and accessible on mobile
- [ ] All 3 roles have a complete set of screens
- [ ] Icons are from Lucide/Phosphor (no emoji)
- [ ] All 12 edge-case states are represented
- [ ] Dark mode variants exist for top 5 screens
- [ ] No gradients, no Material Design patterns, no pill buttons
- [ ] Auto-layout is applied (no free-floating elements)
- [ ] All interactive elements have a "pressed" state defined
- [ ] All forms have an "error" state defined

---

*Generated for EdumentX · June 2026 · v2.0 — supersedes all previous Figma prompts*
