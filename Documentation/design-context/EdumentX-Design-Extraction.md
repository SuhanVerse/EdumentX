# EdumentX Figma Make Design Layout Extraction

Handoff document for porting the existing Figma Make prototype (React + Tailwind v4 + react-router) to a React Native Expo (Expo Router) implementation. This describes the current design only — no redesign.

---

## 1. App overview

**Name:** EdumentX — a mobile-first tutor-finding marketplace targeted at Nepal (Kathmandu Valley) with three user roles: **Student**, **Tutor**, and **Admin**.

**Primary user flows:**
- **Onboarding & auth:** Splash → Onboarding carousel → Phone entry → OTP → Create password → Role select → Profile setup.
- **Student:** Browse home / map → tutor profile → request enrollment (one-to-one OR join private batch via session code) → manage active enrollments → request batch conversion → rate & review.
- **Tutor:** Dashboard (session board + earnings) → pending requests inbox (new enrollments + batch requests sub-tabs) → manage 3-slot session capacity → group-batch view → capacity manager → edit profile / upload documents.
- **Admin:** Verification queue → user management → platform stats (KPIs + charts).

**Defining concepts:**
- Every tutor has **exactly 3 session slots**. A slot is either a 1-to-1 session, a **public batch** (4–5 students, discoverable), or a **private batch** (4–5 students, joined only via a shareable session code).
- Existing 1-to-1 students can **request batch conversion** to share cost with friends — tutor approves, a session code is generated.
- Flat design — **no gradients on cards, no shadows**. Inter font, weights 400/500 only. Mobile-frame viewport (~iPhone width, ~390 px).

**Stack assumed in current code:** React 18, react-router 6 (`createBrowserRouter`), Tailwind v4 (preflight + CSS custom properties), inline `style` objects for typography/spacing (per project rule against Tailwind text-size utilities), `lucide-react` for icons, `recharts` for admin charts.

---

## 2. Screen inventory

Each screen lives in `src/app/screens/<Name>.tsx` and is routed in `src/app/routes.tsx` under a single `Layout` shell. Suggested Expo Router paths use grouped folders `(auth)`, `(student)`, `(tutor)`, `(admin)`.

### 2.1 Splash — `/` → `app/index.tsx`
- **Sections:** Centered brand mark (graduation-cap glyph in blue circle) + wordmark "EdumentX" + tagline. Auto-navigates to `/onboarding` after a short delay.
- **Inputs:** None. **Nav:** Auto → Onboarding.

### 2.2 Onboarding — `/onboarding` → `app/(auth)/onboarding.tsx`
- **Sections:** Full-bleed illustration, title, body copy, 3-dot pagination indicator, "Next" primary button, "Skip" text button top-right.
- **States:** 3 slides (find tutor / verified profiles / batch savings). **Nav:** Last slide → `/phone-entry`.

### 2.3 PhoneEntry — `/phone-entry` → `app/(auth)/phone.tsx`
- **Sections:** Back chevron, "Enter your phone number" title, subtitle, country-code chip (`+977 🇳🇵`) + number TextInput row, "Send OTP" primary button, T&C footnote.
- **Validation:** 10-digit numeric. **Nav:** → `/otp`.

### 2.4 OTPVerify — `/otp` → `app/(auth)/otp.tsx`
- **Sections:** Header, masked phone display, 6-box OTP input row, "Resend in 30s" timer, primary "Verify" button.
- **Nav:** → `/create-password` (signup) or → role landing (login).

### 2.5 CreatePassword — `/create-password` → `app/(auth)/password.tsx`
- **Sections:** Two password TextInputs (with eye-toggle), strength hint row, "Continue" button. → `/role-select`.

### 2.6 RoleSelect — `/role-select` → `app/(auth)/role.tsx`
- **Sections:** Two large cards — "I want to learn" (student) and "I want to teach" (tutor). Each card: icon tile, title, body line. → `/profile-setup`.

### 2.7 ProfileSetup — `/profile-setup` → `app/(auth)/profile-setup.tsx`
- **Sections:** Avatar upload circle, Name input, Grade/Subject select (student) or Subjects + experience (tutor), Area input, "Finish" button. → role home.

### 2.8 StudentHome — `/student/home` → `app/(student)/home.tsx`
- **Sections (top→bottom):** StatusBar; greeting header "Hi, Aarav" with bell icon; search bar; horizontal subject chip row; "Top tutors near you" section with vertical `TutorCard` list; AI chat FAB (bottom-right above BottomNav).
- **Bottom nav:** Home / Map / Chat / Enrollments / Profile.

### 2.9 MapSearch — `/student/map` → `app/(student)/map.tsx`
- **Sections:** Map image with pins; floating search/filter pill at top; bottom sheet listing matching `TutorCard`s.

### 2.10 FiltersSheet — `/student/filters` → modal route
- **Sections:** Subject multi-select chips, distance slider, price range slider, rating min stars, verified-only toggle, Apply/Reset buttons.

### 2.11 TutorProfile — `/student/tutor/:id` → `app/(student)/tutor/[id].tsx`
- **Sections:** Cover image with back chevron + share; avatar + name + BlueTick + rating row; subject chips; tabs (About / Reviews / Availability); **Session board** showing 3 slots (one-to-one User/blue, public-batch Users2/green, private-batch Lock/indigo, empty dashed); sticky bottom CTA "Enroll".

### 2.12 EnrollmentForm — `/student/enroll` → `app/(student)/enroll.tsx`
- **Sections:** ScreenHeader "Request to enroll"; **mode selector** (One-to-one / Join private batch); when one-to-one: plan picker, schedule slot picker, cost summary; when session-code: monospace code TextInput with `KeyRound` icon; sticky CTA whose label and color change by mode.

### 2.13 AIChat — `/student/chat` → `app/(student)/chat.tsx`
- **Sections:** Header "Ask EdumentX AI"; message list (purple-tinted assistant bubbles, user bubbles right); composer TextInput + send button. **Purple is reserved for AI only.**

### 2.14 MyEnrollments — `/student/enrollments` → `app/(student)/enrollments.tsx`
- **Sections:** Tabs (Active / Pending / Past), enrollment cards with tutor avatar, subject, schedule, status badge; tapping card → `/student/enrollment/:id`; "Batch invitation" yellow card for pending invites.

### 2.15 EnrollmentDetail — `/student/enrollment/:id` → `app/(student)/enrollment/[id].tsx`
- **Sections:** Tutor info, session-type pill, Calendar/Clock/MapPin rows, gradient indigo CTA "Share the cost with friends" with 3-step bullets, "Request batch conversion" button opening a bottom-sheet textarea + Send; after sending, confirmation chip + link to `/student/session-code`.

### 2.16 SessionCode — `/student/session-code` → `app/(student)/session-code.tsx`
- **Sections:** ScreenHeader; indigo→blue gradient hero card with monospace code + Copy/Share buttons; capacity bar `1 of 5`; numbered "How sharing works" list (4 steps); WhatsApp/SMS share row; "Back to enrollments" text link.

### 2.17 RateReview — `/student/review` → `app/(student)/review.tsx`
- **Sections:** Tutor avatar header, 5-star tap row, sub-rating sliders (Teaching, Punctuality, Communication, Knowledge), text area for review, Submit button.

### 2.18 BrowseBatches — `/student/batches` → `app/(student)/batches.tsx`
- **Sections:** Header, batch cards listing subject, tutor avatar, capacity (3/5), schedule, price, "Request to join" CTA.

### 2.19 StudentProfile — `/student/profile` → `app/(student)/profile.tsx`
- **Sections:** Avatar + name + grade; settings rows (Edit profile, Notifications, Language, Help, Logout). BottomNav.

### 2.20 TutorDashboard — `/tutor/dashboard` → `app/(tutor)/dashboard.tsx`
- **Sections:** Header with greeting + earnings KPI tiles; **Session board** (3 slots — same model as TutorProfile); **Pending requests** block with sub-tabs (New enrollments / Batch requests) — Batch tab renders conversion cards (Sparkles/indigo) and join cards (Lock + slot capacity bar; Accept disabled with red banner when slot is full); BottomNav (Dashboard / Inbox / Batch / Capacity / Profile).

### 2.21 TutorEditProfile — `/tutor/profile` → `app/(tutor)/profile.tsx`
- **Sections:** Avatar upload, Name, Bio textarea, Subjects chips, Hourly rate, Save button.

### 2.22 DocumentUpload — `/tutor/documents` → `app/(tutor)/documents.tsx`
- **Sections:** Three upload tiles (Citizenship ID, Degree, Demo Video) each showing thumbnail or dashed upload state; status pill (Pending / Verified); Submit-all CTA.

### 2.23 EnrollmentInbox — `/tutor/inbox` → `app/(tutor)/inbox.tsx`
- **Sections:** Tab chips (All / One-to-one / Batch). Ordered example sections: (1) OneToOneCard with privacy-preserving overlap SVG; (2) public batch join card; (3) Conversion request card with current→becomes preview + italic quote; (4) private batch join card auto-blocked (red banner, Accept disabled) when slot is full.

### 2.24 GroupBatch — `/tutor/batch` → `app/(tutor)/batch.tsx`
- **Sections:** Batch detail (name, subject, schedule), enrolled student avatar list with status chips, capacity progress bar, "Generate session code" / "Message all" actions.

### 2.25 CapacityManager — `/tutor/capacity` → `app/(tutor)/capacity.tsx`
- **Sections:** Weekly availability grid (7 days × 6 slots) — cells colored available (green) / booked (gray) / off (transparent); tap to toggle. Save button.

### 2.26 VerificationQueue — `/admin/verification` → `app/(admin)/verification.tsx`
- **Sections:** Dark-blue header (#185FA5), `<AdminNav />` tabs (Stats / Verification / Users), Pending list (each card: avatar, name, submitted-time, doc thumbnails, Approve/Reject/More-info buttons), Reviewed list (compact, opacity 0.8, status pill).

### 2.27 UserManagement — `/admin/users` → `app/(admin)/users.tsx`
- **Sections:** Dark-blue header, AdminNav, search input, role filter tabs (All / Student / Tutor with counts), user list (avatar with BlueTick if verified, role + joined date, StatusBadge, Suspend/Reinstate + Remove buttons).

### 2.28 PlatformStats — `/admin/stats` → `app/(admin)/stats.tsx`
- **Sections:** Dark-blue header, AdminNav, 2×2 KPI grid (Users / Enrollments / Verified / Rating), Weekly enrollment **LineChart**, Subject demand horizontal **BarChart**, Recent activity feed.

### 2.29 NotificationsCenter — `/notifications` → `app/notifications.tsx`
- **Sections:** Header with mark-all-read; notification rows grouped by Today / Earlier (icon tile, title, body, time).

**States not currently rendered anywhere:** loading skeletons, offline banners, empty-state illustrations (except the empty slot card), API error toasts. See §8.

---

## 3. Layout structure

- **Viewport:** Fixed mobile frame ~390 px wide, full height; everything inside is `display: flex; flex-direction: column`. The active screen owns the whole frame.
- **Standard screen skeleton:**
  1. `<StatusBar />` (faux iOS status bar — time, signal, battery) — height 44.
  2. Header band — either dark-blue (#1A56DB / #185FA5 for admin) for primary screens, or white with back chevron via `<ScreenHeader />` for sub-screens.
  3. Scrollable body (`flex: 1; overflowY: auto; padding: 16px`).
  4. Optional sticky bottom CTA OR `<BottomNav />` (height ~64, white with top border, 5 icons).
- **Horizontal padding:** 16 px page gutters; 14–16 px inside cards.
- **Safe areas:** The current web prototype does not use `env(safe-area-inset-*)`. **RN port must wrap each screen in `SafeAreaView` (from `react-native-safe-area-context`)** — top inset for the header, bottom inset for `BottomNav` / sticky CTAs.
- **Responsive behavior:** Designs assume a single mobile width. There are no tablet/landscape breakpoints. For small Androids (~360 px) the existing 16 px gutters and font sizes still fit because rows already use `flex: 1` and chips scroll horizontally where needed.
- **Scroll regions:** Only the body scrolls — header and bottom nav are fixed within the frame.

---

## 4. Design system

### 4.1 Colors (exact hex)

Source of truth: `src/styles/theme.css` (CSS variables) + inline hex values reused across screens.

**Brand blue (education / primary):**
- `#1A56DB` primary
- `#0C3A7A` primary-dark
- `#E8F0FE` primary-light bg
- `#185FA5` admin/header variant (used on admin screens, recharts)
- `#BFDBFE` border

**Trust teal (verification / success):**
- `#0D9E75` teal
- `#0A7A59` teal-dark
- `#E0F5EE` teal-light bg
- `#1D9E75` success accent (admin variants)
- `#D1FAE5` success badge bg
- `#14532D` success text

**AI purple (chatbot + private batch accents):**
- `#4F46E5` indigo
- `#312E81` indigo-dark
- `#EEF2FF` indigo-light bg
- `#C7D2FE` border

**Semantic:**
- Pending: text `#B45309` / `#D97706`, bg `#FFFBEB` / `#FEF3C7`
- Error: text `#991B1B` / `#B91C1C` / `#EF4444` / `#DC2626`, bg `#FEF2F2` / `#FEE2E2`, border `#FECACA`
- Info: text `#1E40AF`, bg `#EFF6FF`

**Surfaces:**
- Page bg `#F9FAFB` (most screens), `#F5F5F3` (admin), card `#FFFFFF`, disabled `#F3F4F6`.

**Borders:** default `#E5E7EB`, strong `#D1D5DB`. Standard card border `0.5px solid #E5E7EB` or `rgba(0,0,0,0.08)`.

**Text:** primary `#111827`, secondary `#4B5563`, tertiary `#374151`, muted `#9CA3AF`, disabled `#D1D5DB`, on-dark `#FFFFFF`, link `#1A56DB`.

### 4.2 Typography

Font family: **Inter** (`Inter, sans-serif`). Weights used: **400 (normal)** and **500 (medium)** only. Monospace (`ui-monospace, SFMono-Regular, Menlo, monospace`) for session codes and OTP digits.

Sizes (in inline `style` — px values, **not** Tailwind text-* utilities):

| Role | Size | Weight | Line-height |
|---|---|---|---|
| Hero title / brand | 28–32 | 500 | 1.2 |
| Screen title (header) | 22 | 500 | 1.3 |
| Section title | 14–15 | 500 | 1.5 |
| Card title | 14 | 500 | 1.4 |
| Body | 13 | 400 | 1.5 |
| Body small | 12 | 400 | 1.5 |
| Caption / meta | 11 | 400 | 1.4 |
| Micro / tag | 10 | 500 | 1.3 |
| Uppercase label | 11–12, letter-spacing 0.04–0.06em | 500 | 1.3 |
| Session code | 32, letter-spacing 0.18em, monospace | 500 | 1.0 |

H1–H4 in `theme.css` are styled in `@layer base` and used only by raw HTML elements without inline style overrides.

### 4.3 Spacing

Scale used (px): **2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 32**. Most card padding is **14–16**, list-item gaps **8–10**, section gaps **12–16**.

### 4.4 Border radius

- **6** — small chips, doc thumbnails inner labels
- **8** — buttons (secondary, small), pill chips
- **10** — primary buttons, search bar, cards (compact)
- **12** — standard cards
- **14** — content cards with internal sections
- **18** — gradient hero cards (SessionCode)
- **999** — circular (avatars, dots, progress fills, badges)

### 4.5 Borders

- Card: `0.5px solid #E5E7EB` (or `rgba(0,0,0,0.08)`).
- Empty/dashed (empty slot): `1px dashed #D1D5DB`.
- Tab indicator: `2px solid <accent>` bottom-only.
- Hairline divider: `0.5px solid rgba(0,0,0,0.06)`.

### 4.6 Buttons

| Variant | bg | text | border | height | radius | font |
|---|---|---|---|---|---|---|
| Primary | `#1A56DB` | `#FFFFFF` | none | 48–52 | 10–12 | 14/500 |
| Primary on dark | `#FFFFFF` | `#1A56DB` | none | 44 | 10 | 13/500 |
| Secondary | `#E8F0FE` | `#1A56DB` | none | 40–44 | 8–10 | 13/500 |
| Success | `#0D9E75` / `#1D9E75` | `#FFFFFF` | none | 38 | 8 | 12/500 |
| Danger | `#FEE2E2` | `#EF4444` | `1px #FECACA` | 38 | 8 | 12/500 |
| Ghost / text | transparent | `#1A56DB` | none | 40–48 | n/a | 13/500 |
| Pill chip | `#F3F4F6` / `#E8F0FE` active | secondary/primary | none | 28–32 | 999 | 11–12/500 |

Disabled state: opacity 0.5 + `cursor: not-allowed`.

### 4.7 Inputs

- Height **44–48**, radius **10**, bg `#FFFFFF` or `#F3F3F5`, border `0.5px solid #E5E7EB`.
- Left icon padding 12, font-size 13–14, placeholder color `#9CA3AF`.
- Focus state in code: relies on default browser outline (port: implement `borderColor: #1A56DB` on focus in RN).

### 4.8 Cards

- White bg, radius 12–14, padding 14–16, border `0.5px solid #E5E7EB`, **no shadow**.
- Internal sections separated by `marginBottom: 10–12` rather than dividers.

### 4.9 Icons

Library: `lucide-react`, default size 14–18 px, stroke matches text color. Common: `Search`, `Bell`, `MapPin`, `Calendar`, `Clock`, `Users`, `Users2`, `User`, `Lock`, `KeyRound`, `Sparkles`, `Copy`, `Check`, `CheckCircle`, `XCircle`, `AlertCircle`, `Share2`, `MessageSquare`, `BookOpen`, `Star`, `BarChart3`, `ShieldCheck`, `PlusCircle`, `ChevronLeft`, `ChevronRight`.

For RN: replace with `@expo/vector-icons` → `Lucide` from `lucide-react-native` (preferred to keep glyph parity).

### 4.10 Badges & status pills

`<StatusBadge status="active|pending|past|suspended|verified|rejected" />` — small pill, radius 6, padding `3px 8px`, font 11/500:

| Status | bg | text |
|---|---|---|
| active / verified / approved | `#D1FAE5` | `#1D9E75` |
| pending | `#FEF3C7` | `#D97706` |
| past / info | `#E6F1FB` | `#185FA5` |
| suspended / rejected | `#FEE2E2` | `#EF4444` |

`<BlueTick size={n} />` — circular blue (#1A56DB) verified mark, used adjacent to verified user names and on avatars (bottom-right overlay).

---

## 5. Components

All shared components live in `src/app/components/shared/`. Each entry below: purpose · props · states · usage.

### 5.1 StatusBar
- **Purpose:** Faux iOS status bar (time, signal, wifi, battery) at top of every full-screen route.
- **Props:** none.
- **RN port:** Drop entirely — use the real status bar via `expo-status-bar` + `SafeAreaView` top inset.

### 5.2 ScreenHeader
- **Purpose:** White sub-screen header with back chevron, centered title, optional subtitle, optional trailing action.
- **Props:** `title: string; subtitle?: string; backPath?: string | -1; right?: ReactNode`.
- **States:** With/without subtitle; back arrow uses `navigate(-1)` when `backPath === -1`.
- **Usage:** EnrollmentForm, SessionCode, EnrollmentDetail, RateReview, FiltersSheet.

### 5.3 BottomNav
- **Purpose:** 5-tab bottom navigation (different tab set per role).
- **Props:** Reads `useLocation()`; renders 5 items with `Icon`, `label`, `path`.
- **States:** Active = primary blue icon + text; inactive = `#9CA3AF`.
- **Heights:** 64; border-top `0.5px solid #E5E7EB`; bg `#FFFFFF`.

### 5.4 AdminNav
- **Purpose:** Inline tab bar inside admin screen headers (Stats / Verification / Users).
- **Props:** none (reads `useLocation`).
- **States:** Active tab `bg: #FFFFFF, color: #185FA5`; inactive `bg: rgba(255,255,255,0.15), color: #FFFFFF`. Height 36, radius 8, font 12.
- **Usage:** VerificationQueue, UserManagement, PlatformStats.

### 5.5 TutorCard
- **Purpose:** Tutor list item used on StudentHome, MapSearch sheet, BrowseBatches.
- **Props:** `tutor: Tutor` (see `src/app/data/mockData.ts`).
- **Sections:** Avatar (60×60, radius 999) with BlueTick overlay if verified · name + rating row (`Star` icon + `4.8 · 42 reviews`) · subject chips · distance + rate row.
- **States:** Verified vs unverified (no BlueTick), tap → tutor profile.

### 5.6 SubjectChip
- **Purpose:** Pill showing a subject; toggleable in filter contexts.
- **Props:** `label: string; selected?: boolean; onPress?`.
- **Visual:** Unselected `#F3F4F6 / #4B5563`; selected `#E8F0FE / #1A56DB`.

### 5.7 StatusBadge — see §4.10.

### 5.8 BlueTick — see §4.10.

### 5.9 StarRating
- **Purpose:** Display or input rating (1–5).
- **Props:** `value: number; max?: number; onChange?(n)`.
- **Visual:** Filled stars `#F59E0B`, empty `#D1D5DB`. Size 14–18.

### 5.10 Layout
- **Purpose:** Outer dev shell that frames the active route inside a mobile-sized container with a side nav for jumping between screens. **Not part of the user product** — drop in the RN port.

### 5.11 SessionSlotCard (inline helper in TutorProfile)
- **Purpose:** Render one of 3 slots on the Session board.
- **Props:** `slot: SessionSlot`.
- **Variants:** 
  - one-to-one — `User` icon, blue `#1A56DB` on `#E8F0FE`.
  - public-batch — `Users2` icon, green `#0A7A59` on `#E0F5EE`, capacity bar.
  - private-batch — `Lock` icon, indigo `#4F46E5` on `#EEF2FF`, capacity bar + session code chip.
  - empty — dashed border + `PlusCircle`, muted text "Open slot".
- **States:** `acceptingRequests` shows a "● accepting" indicator; `status === "full"` adds FULL pill (`#FEE2E2 / #B91C1C`) and reduces opacity.

### 5.12 Splash logo block
- **Purpose:** Brand mark on `/`.
- **Composition:** 96×96 blue circle (#1A56DB) with white graduation-cap icon centered + 28/500 wordmark "EdumentX" + 13/400 tagline below.

### 5.13 Onboarding illustration + dots
- **Purpose:** 3-slide carousel.
- **Dots:** 8×8 circles, gap 6, active `#1A56DB`, inactive `#D1D5DB`.

### 5.14 Phone input row
- **Composition:** Country chip (flag + dial code, fixed width ~84, border `0.5px #E5E7EB`, radius 10) + TextInput (flex 1) — horizontal flex with 8 px gap.

### 5.15 OTP input
- **Composition:** 6 boxes, each 44×52, radius 10, center-aligned monospace 18/500, border `0.5px #E5E7EB` (focused: `#1A56DB`).

### 5.16 Segmented control (used in EnrollmentForm mode selector, EnrollmentInbox filter)
- **Composition:** Pill row inside a `#F3F4F6` rail (radius 999, padding 4); active segment `#FFFFFF` bg + `#1A56DB` text + subtle `0.5px` border; inactive `transparent / #6B7280`.

### 5.17 Password input
- **Composition:** TextInput with right-side eye-toggle button; `type` swaps between `password` and `text`.

### 5.18 Empty/full slot indicators
- "● accepting" dot uses `#0D9E75` 6×6 circle + 11/500 label.
- FULL pill: `#FEE2E2 / #B91C1C`, radius 6, 11/500.

---

## 6. React Native conversion notes

### 6.1 Element mapping

| Web (current) | React Native |
|---|---|
| `<div>` | `<View>` |
| `<span>`, `<p>`, text inside `<div>` | `<Text>` |
| `<button>` | `<Pressable>` (preferred for press states) or `<TouchableOpacity>` |
| `<input>` | `<TextInput>` |
| `<img src="...">` | `<Image source={{ uri }}>` (or `expo-image`) |
| `<a href>` / `<Link>` | `<Link>` from `expo-router` |
| `react-router` `useNavigate`, `useParams`, `useLocation` | `useRouter`, `useLocalSearchParams`, `usePathname` from `expo-router` |
| `createBrowserRouter([...])` | File-based routes under `app/` |
| Inline `style={{ ... }}` objects | `StyleSheet.create({...})` or inline (RN accepts both); convert CSS strings → numeric values |
| Tailwind utility classes | `nativewind` (Tailwind for RN) if Tailwind parity is needed; otherwise `StyleSheet` |
| `lucide-react` | `lucide-react-native` (drop-in) or `@expo/vector-icons` (Feather/Ionicons set) |
| `recharts` | `react-native-gifted-charts` or `victory-native` (recharts is web-DOM only) |
| `navigator.clipboard.writeText` | `expo-clipboard` `setStringAsync` |
| `navigator.share` | `Share.share` from `react-native` |
| CSS `overflow-y: auto` | `<ScrollView>` (or `FlatList` for long lists) |
| CSS `position: sticky` bottom CTA | Absolute-positioned `<View>` with `bottom: insets.bottom` |
| `cursor: pointer` | drop — irrelevant |
| `localStorage` | `expo-secure-store` (tokens) / `AsyncStorage` (prefs) |
| `<form>` + onSubmit | Controlled state + `<Pressable>` submit |

### 6.2 Safe area & status bar
- Wrap each screen in `<SafeAreaView edges={['top','bottom']}>` from `react-native-safe-area-context`.
- Use `expo-status-bar`'s `<StatusBar style="light" />` on dark headers, `"dark"` on white screens.
- Delete the web `StatusBar` component.

### 6.3 Style conversions to watch
- `border: "0.5px solid #E5E7EB"` → RN cannot render sub-pixel borders consistently; use `borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB'`.
- `boxShadow` — not used (flat design), no conversion needed.
- `linear-gradient(...)` (SessionCode hero, EnrollmentDetail CTA) → `expo-linear-gradient` `<LinearGradient colors={['#4F46E5','#1A56DB']} start={{x:0,y:0}} end={{x:1,y:1}}>`.
- `letterSpacing: "0.18em"` → RN uses absolute units: convert to `letterSpacing: 5` (≈ 0.18 × 32 px font).
- Text inside non-Text containers: **every string must be wrapped in `<Text>`** in RN.
- `whiteSpace: "nowrap"` → `numberOfLines={1}` on `<Text>`.
- `objectFit: "cover"` → `<Image resizeMode="cover">`.

### 6.4 Routing parity (current → Expo Router file)

```
app/
  _layout.tsx                       // root stack + providers
  index.tsx                         // Splash → '/'
  (auth)/
    _layout.tsx
    onboarding.tsx                  // /onboarding
    phone.tsx                       // /phone-entry
    otp.tsx                         // /otp
    password.tsx                    // /create-password
    role.tsx                        // /role-select
    profile-setup.tsx               // /profile-setup
  (student)/
    _layout.tsx                     // tabs: Home / Map / Chat / Enrollments / Profile
    home.tsx
    map.tsx
    filters.tsx                     // presented as modal
    chat.tsx
    enrollments.tsx
    review.tsx
    batches.tsx
    profile.tsx
    session-code.tsx
    tutor/[id].tsx
    enroll.tsx
    enrollment/[id].tsx
  (tutor)/
    _layout.tsx                     // tabs: Dashboard / Inbox / Batch / Capacity / Profile
    dashboard.tsx
    inbox.tsx
    batch.tsx
    capacity.tsx
    profile.tsx
    documents.tsx
  (admin)/
    _layout.tsx                     // top-tab AdminNav
    stats.tsx
    verification.tsx
    users.tsx
  notifications.tsx
```

### 6.5 Lists & performance
- `MyEnrollments`, `UserManagement`, `EnrollmentInbox`, `VerificationQueue`, `BrowseBatches`, `NotificationsCenter` should use `<FlatList>` instead of `.map()` over a `<ScrollView>` for memory parity on Android.

---

## 7. Implementation order

Suggested build sequence for the Expo port — earlier steps unblock later ones.

1. **Project setup:** Expo SDK + Expo Router, `react-native-safe-area-context`, `expo-status-bar`, `expo-linear-gradient`, `expo-clipboard`, `lucide-react-native`, `@expo/vector-icons`, optional `nativewind`.
2. **Design tokens:** Port `theme.css` variables into a single `theme.ts` module (colors, spacing, radii, typography). Build `Text` and `Button` wrapper components that consume the tokens — this kills 80 % of the per-screen styling cost.
3. **Shared primitives:** `BlueTick`, `StatusBadge`, `StarRating`, `SubjectChip`, `Card`, `ScreenHeader`.
4. **Navigation shells:** Root `_layout`, `(student)/_layout`, `(tutor)/_layout`, `(admin)/_layout`, plus `BottomNav` (now driven by Expo Router tabs).
5. **Mock data layer:** Port `mockData.ts` verbatim — keep type signatures (`Tutor`, `SessionSlot`, `BatchRequest`, etc.).
6. **Auth flow:** Splash → Onboarding → Phone → OTP → Password → RoleSelect → ProfileSetup.
7. **Student core:** StudentHome → TutorProfile (incl. Session board) → EnrollmentForm → MyEnrollments → EnrollmentDetail → SessionCode.
8. **Student secondary:** MapSearch, FiltersSheet (modal), AIChat, RateReview, BrowseBatches, StudentProfile, NotificationsCenter.
9. **Tutor flow:** TutorDashboard (session board + pending requests sub-tabs) → EnrollmentInbox → GroupBatch → CapacityManager → TutorEditProfile → DocumentUpload.
10. **Admin flow:** AdminNav → VerificationQueue → UserManagement → PlatformStats (port charts to `react-native-gifted-charts`).
11. **Polish pass:** Loading skeletons, error toasts, empty states (currently missing — see §8).
12. **Backend wire-up:** Replace mock arrays with real API/Supabase queries; add auth persistence.

---

## 8. Missing design details

These are gaps the design hands off — call them out for product before implementation:

- **Loading & skeleton states** — no skeleton designs exist for any list (tutors, enrollments, verification queue, etc.). Decide between spinner-only or skeleton cards.
- **Empty states** — only the empty session slot card is designed. No empty illustrations for "No enrollments yet", "No notifications", "No search results", "No reviews".
- **Error & offline states** — no toast component, no offline banner, no API error UI. Pick one of `react-native-toast-message` / native `Alert` / inline error rows.
- **Form validation** — error message styles aren't drawn (e.g., what does an invalid phone number / weak password look like?). Recommend `12/500 #DC2626` text below the input.
- **Auth wiring** — no real OTP/password backend; the current flow simulates success after any tap.
- **Permissions copy** — Camera/photos for avatar upload, contacts for share, notifications opt-in — no native permission prompt designs.
- **Accessibility** — no annotations for screen-reader labels, tap-target minimums (44 pt), or color-contrast review. Several caption colors (`#9CA3AF` on `#F9FAFB`) are borderline WCAG AA — verify.
- **Responsive behavior** — designs are pinned to a single ~390 px width. Confirm behavior on small Androids (~360) and large iPhones (~430). Long Nepali/Devanagari names may overflow 14-px tutor cards — needs `numberOfLines={1}` with ellipsis policy.
- **Dark mode** — `theme.css` declares `.dark` tokens but no screen has dark-mode visuals defined. Treat as out-of-scope until designed.
- **Microcopy in English vs Nepali** — copy is currently English-only; if i18n is in scope, no Nepali strings or RTL/longer-text handling exists.
- **Animation specs** — no motion specs for slide transitions, sheet presentations, toast enter/exit, OTP countdown. Use Expo Router defaults until designed.
- **Push notifications** — NotificationsCenter shows in-app rows, but there's no spec for deep-link payloads or notification-channel grouping.
- **Session-code lifecycle** — design shows generating a code, but no UI for revoking/rotating a code once issued.
- **Payment flow** — pricing is displayed on tutor cards and enrollment, but checkout/escrow/payout screens are not designed.
- **Admin settings** — `admin/settings` route currently points to `PlatformStats` as a placeholder (see `routes.tsx:69`). Real settings screen is undesigned.
- **Tutor's batch-conversion approval UI on TutorDashboard** — the conversion request card is in the inbox sub-tab, but the post-approval confirmation (code generation moment from tutor side) isn't drawn.
