# BasoBas Reference Project — Analysis for EdumentX Translation

> **Status:** Reference only. Do NOT copy code, CSS, or components.
> **Protocol:** See `../../CLAUDE.md` Translation Protocol. UX patterns translate; implementation does not.

This folder contains a Figma-Make export of a friend's web app for **room rentals in Nepal** (Vite + Tailwind 4 + Radix UI + shadcn-style). It is included as a **UX reference** for our tutor-discovery app EdumentX. The two products share a market (Nepal, mobile-first, two-sided) but differ in domain, palette, and stack.

---

## 1. What BasoBas Is (Quick Map)

| Layer | Choice | Implication for EdumentX |
| --- | --- | --- |
| Runtime | Web SPA (Vite) | We translate to React Native + Expo. |
| Styling | Tailwind 4 + CSS variables | We translate to Tamagui design tokens. |
| Component lib | Radix UI + shadcn primitives | We translate to Tamagui primitives (`YStack`, `XStack`, `Button`, `Sheet`). |
| Icons | lucide-react | We use `@expo/vector-icons` (Ionicons) — same family of stroke icons, similar API. |
| Animation | Framer Motion | We use `Animated` / Reanimated 3 via Tamagui animations. |
| State | React useState | We use Zustand once service layer is in (Phase 3). |

The full file tree lives under `src/app/` with `screens/`, `components/`, `data/`, and `profile-screens.tsx`. Theme tokens are in `src/styles/theme.css`.

---

## 2. Visual Language — What to Borrow, What to Replace

### Borrow (structural patterns)
- **Generous vertical rhythm** — 24–32 px section padding, 18–20 px screen-edge padding, eyebrows → headline → subhead → content → CTA.
- **Pill-shaped controls** — primary buttons, chips, and the bottom nav are all 999 px radius.
- **Floating bottom nav** — a single dark pill with 4–5 icon tabs, the active tab is white with label, others are muted. This is the cleanest nav pattern in the project; we will reuse it for student/tutor bottom nav.
- **Eyes-up status pill** — location/city pill at the top of MapScreen is a 999 px white pill with shadow. Translate to our `HeaderCityPill` component.
- **Shadowed white FABs** — the "locate" button on the map, the back button, and the floating action buttons all use `boxShadow: 0 8px 20px rgba(15,17,20,0.12)` on a 999 px white disc. Translate to `Tamagui` `shadow` props.
- **Eyebrow + Serif headline + Sans body** — small uppercase eyebrow (`Step 1 · Choose your role`), large serif headline (`How will you use BasoBas?`), sans body. Translate to Plus Jakarta Sans display + Inter body or a single family with weight contrast.
- **Image-less illustrations** — feature screens use pure CSS/SVG illustrations (stacked cards, calendar pills, map grid). This is **critical** for EdumentX: we have no image assets, so we build illustrations as Tamagui/SVG components.

### Replace (palette, identity, voice)
- **BasoBas green** (`#1A6B4A`) → **EdumentX copper/amber** (`$amber = #B45309`) for primary brand. We are not rentals; we are tutors. Warmth and trust, not "landlord" green.
- **BasoBas cream** (`#FAFAF8`) → **EdumentX sand** (`$sand = #F1F5F9`) for page background.
- **BasoBas near-black** (`#0F1114`) → **EdumentX night** (`$night = #0F172A`) for primary text and dark surfaces.
- **BasoBas display serif (DM Serif Display)** → **EdumentX display** (Plus Jakarta Sans 600/700) — we are sans-only by design choice, no serif.
- **BasoBas body sans (DM Sans)** → **EdumentX body** (Inter 400/500, currently @tamagui/font-inter).
- **Voice** — BasoBas uses "Nepal" copy directly, real-estate metaphors ("home", "visits", "rooms"). EdumentX uses "tutors", "subjects", "near you", "learn". Translating copy, not stealing it.

---

## 3. Component Patterns to Translate

### 3.1 BottomNav (`components/BottomNav.tsx`)
**What it does:** Absolute-positioned floating pill at the bottom of every main screen. 4 tabs. Active = white fill + label visible. Inactive = transparent + icon only + muted color.

**Translation to EdumentX:**
- File: `components/navigation/BottomNav.tsx`
- Primitives: `<YStack position="absolute" bottom={0} left={0} right={0} alignItems="center" pointerEvents="box-none">` then inner pill `<XStack bg="$night" borderRadius={999} shadowColor="$night" shadowOffset={{ width: 0, height: 8 }} shadowOpacity={0.25} shadowRadius={20}>`.
- Active state: `bg="$surface" color="$night"`, inactive: `color="rgba(255,255,255,0.55)"` (i.e. `colors.text.muted` mapped to white alpha).
- Tabs: `Home` (map), `Search` (search), `Bookings` (lessons), `Profile` (me) for students; `Home`, `Requests`, `Earnings`, `Profile` for tutors.
- Tap behavior: pass `active` and `onChange` props; do NOT wire to navigation directly — let the screen that renders it decide.

### 3.2 CategoryChips (`components/CategoryChips.tsx`)
**What it does:** Horizontal scroll of pill chips, one active. Pure toggle group, no routing.

**Translation to EdumentX:**
- File: `components/chips/SubjectChips.tsx`
- Primitives: `<ScrollView horizontal showsHorizontalScrollIndicator={false}>` wrapping a row of `<Button>`s. Or a Tamagui `XStack` with `overflow="scroll"`.
- Active chip: `bg="$night" color="$surface" borderColor="$night"`. Inactive: `bg="$surface" color="$night" borderColor="$border.default"`.
- Label set: `["Maths", "Science", "English", "Nepali", "Computer", "All"]` (student view); `["Class 1-5", "Class 6-10", "Class 11-12", "Test Prep", "Language"]` (tutor view).
- `onChange` callback receives the chip id.

### 3.3 PropertyCard (`components/PropertyCard.tsx`)
**What it does:** Rounded card (24 px radius) with image, discount badge, save button, address/title, price in mono font, and a stats row separated by a thin top border.

**Translation to EdumentX (TutorCard):**
- File: `components/cards/TutorCard.tsx`
- Replace image with avatar (initials in colored disc — no image assets needed).
- Discount badge → "Verified" badge: `bg="$night" color="$surface" borderRadius={999} px="$sm" py="$xs" fontSize={11} fontWeight="700"`.
- Save button → "Save" icon button: same 36×36 white disc with shadow.
- Price in mono → Hourly rate in our `$night` heavy weight: `Rs. 800/hr`.
- Stats row: 4 cells, dividers between, icons + label: `Rating`, `Distance`, `Subjects`, `Experience`. Top border `borderTopWidth={1} borderColor="$border.subtle"`.

### 3.4 FeatureVisual (inside `App.tsx`)
**What it does:** 3 illustrated feature cards, each a 200 px tall rounded rectangle with composed shapes inside: (a) stacked cards with verified seal, (b) calendar pill with confirmation badge, (c) map grid with active pin and locate FAB.

**Translation to EdumentX:**
- File: `components/illustrations/DiscoverIllustration.tsx`, `AiMatchIllustration.tsx`, `VerifiedIllustration.tsx`
- Use the same compositional approach: Tamagui `YStack` containers with absolute-positioned child `YStack`/`XStack` rectangles for the stacked cards, and `react-native-svg` for the map grid lines and pins.
- Color rules: background = `slide.backgroundColor` (warm/cool tint per slide), accent = `slide.accentColor` (the icon and the seal), all shapes use `$night`, `$surface`, and our `colors.onboarding.*` tokens.
- No images. No text. Pure shape composition. The copy lives below the illustration in the parent screen.

### 3.5 OTP Boxes (`App.tsx → OtpBox` + `OtpContent`)
**What it does:** 6 boxes, three states: filled (dark, white dot), active (white with 2 px dark border, blinking caret), empty (light gray fill, 1.5 px border).

**Translation to EdumentX:**
- File: `components/auth/OtpInput.tsx`
- 6 individual `<YStack>` cells, width=44, height=52, borderRadius=12, gap=$xs.
- Filled: `bg="$night" borderWidth={0}` with white Text child.
- Active: `bg="$surface" borderWidth={2} borderColor="$night"` with a blinking caret (Reanimated opacity loop).
- Empty: `bg="$surface" borderWidth={1} borderColor="$border.default"`.
- Use a single `useRef` array of 6 `TextInput` refs for paste / auto-advance, or controlled single-input with a hidden TextInput behind a Tap. The latter is what BasoBas does (visible state, hidden keyboard).

### 3.6 Modal / Sheet (`screens/VisitRequestModal.tsx`)
**What it does:** Bottom sheet that slides up from the bottom, 32 px top radii, max 85% height, with a header row (title + close), body (date chips, time chips, message), and a sticky bottom CTA. On submit, swaps to a success state with a dark check disc and headline.

**Translation to EdumentX:**
- File: `components/sheets/Sheet.tsx` (wrapper) + screens use it.
- Primitives: Tamagui `<Sheet>` (built into `@tamagui/sheet` if we add it) OR a custom implementation using Reanimated 3 + a `<Modal transparent>` host.
- For Phase 1, the modal doesn't exist in our app yet, but the **pattern** is: header (title + close), scrollable body, sticky bottom CTA, success state. Use this pattern when we add a "Booking confirmation" sheet in Phase 5.

### 3.7 PhoneEntry (`App.tsx → PhoneEntryContent` + `NumberKeyboard`)
**What it does:** Country code pill + phone input. Below, a "Nepal (+977) · 10 digits" hint. Below, a privacy line with a lock icon. The CTA is "Send Verification Code →".

**Translation to EdumentX:** `screens/auth/PhoneEntryScreen.tsx` — already migrated. The pattern we kept: NP/+977 pill on the left, full-width Input on the right, hint below, privacy + terms at the bottom. The difference from BasoBas: our screen has a Sign up / Log in **segmented tab** above the phone field, which is our added complexity (auth mode toggle).

---

## 4. UX Flow Mapping

BasoBas's auth-and-discovery flow (25 screens) maps loosely to EdumentX's flow. Use this as a sanity check when building new screens:

| BasoBas Step | EdumentX Step | Notes |
| --- | --- | --- |
| 01 App Loading | `SplashScreen` | Already migrated. |
| 02–04 Feature Visuals | `OnboardingScreen` (3 slides) | Already migrated. Build illustration components next. |
| 05 Landing | _No equivalent yet_ | We're cutting the marketing landing; the first user-facing screen is PhoneEntry. |
| 06 Phone Entry | `PhoneEntryScreen` | Already migrated. |
| 07 OTP Verify | `screens/auth/OtpVerify.tsx` | Not migrated. |
| (no equivalent) | `screens/auth/Password.tsx` | Create-password step (BasoBas doesn't have it because they use OTP-only). |
| 08 Role Selection | `screens/auth/RoleSelection.tsx` | Not migrated. |
| 09 Profile Setup (Tenant) | `screens/auth/ProfileScreen.tsx` | Not migrated. |
| 10 KYC (Landlord) | _Defer to Phase 5_ | We will do tutor KYC after MVP. |
| 32 Tenant Profile | `screens/profile/ProfileScreen.tsx` (Phase 5) | Full profile view. |
| 33 Landlord Profile | _N/A for Phase 1_ | Tutor-facing profile is a separate task. |
| 34 Edit Profile | `screens/profile/EditProfile.tsx` (Phase 5) | |
| 35 Settings | `screens/profile/Settings.tsx` (Phase 5) | |
| 36 Public Landlord Profile | _Tutor profile as seen by student — Phase 5_ | |
| 37 Notification Drawer | `screens/notifications/NotificationSheet.tsx` (Phase 5) | |
| 38 Saved Properties | `screens/student/SavedTutors.tsx` (Phase 5) | |
| 39–40 Visit History | `screens/student/Lessons.tsx` + tutor equivalent (Phase 5) | |
| 41 Rental Preferences | `screens/student/AiPreferences.tsx` (Phase 5) | |
| 42 KYC Upload (Tenant) | _Defer_ | |
| 43 AI Preferences | `screens/student/AiPreferences.tsx` (Phase 5) | The AI matching entry point. |
| 44 My Reviews | `screens/profile/Reviews.tsx` (Phase 5) | |
| 45 Verification Status | `screens/tutor/VerificationStatus.tsx` (Phase 5) | |
| 46 List Your Property | _N/A_ | Tutors list themselves, not properties. Different domain. |

The home / map / search experience is also in BasoBas but lives in `App.tsx` as `MapScreen` and `HomeScreen`. We do not import those files — the patterns they show (floating map pins, peek-up cards at the bottom, category chip row) will be re-implemented for tutor discovery in Phase 5 with `react-native-maps` and our Tamagui primitives.

---

## 5. Anti-Patterns NOT to Bring Across

- **Inline `style={{ ... }}` everywhere** — BasoBas is a Figma-Make export so it's 100% inline styles. We use Tamagui tokens via `$night`, `$amber`, `$sand`, `$surface`, etc. — no inline `style` except for computed dynamic values.
- **Tailwind class names** — even though we'll see `className="flex items-center gap-2"` in BasoBas, those mean nothing in our RN bundle. Replace with `YStack` + `XStack` + `gap` prop.
- **lucide-react imports** — translate to `@expo/vector-icons` Ionicons. Same `name`, `size`, `color` API. Icon mapping table is in the master guide.
- **DM Serif Display** — we are a sans-only app. Headlines use Plus Jakarta Sans 700; subheads use Inter 600.
- **The "Nepal" badge and "BETA" pill** — first-screen branding. We do not show "Nepal" in chrome (it's contextual) and we are not in beta publicly.
- **Wide-screen mockup styling** — BasoBas was rendered at 300×610 inside a 1440×900 canvas. We are rendering on a real phone screen, so all padding, gap, and font sizes need to be scaled up by 1.3× for readability. Trust our tokens, not BasoBas's pixel values.

---

## 6. File-by-File Reading Order for New Claude Sessions

If you are picking up this project cold, read these in order:

1. `theme.css` — to see the source color tokens (so you can map them to our `$night`/`$amber`/`$sand`).
2. `App.tsx` (the master screen manager) — to see the full flow at a glance.
3. `components/BottomNav.tsx` — the navigation pattern we will reuse first.
4. `components/CategoryChips.tsx` — the chips pattern.
5. `components/PropertyCard.tsx` — the card pattern.
6. `screens/MapScreen.tsx` — the map UI pattern (translated in Phase 5).
7. `screens/VisitRequestModal.tsx` — the bottom sheet pattern (used in Phase 5).
8. Skip the `profile-screens.tsx` until Phase 5 — too much surface area for our MVP.

That's it. The rest is filler for visual completeness; we only translate UX logic, not the design.

---

## 7. Summary — When You Need Inspiration

- **A floating nav?** Look at `BottomNav.tsx`.
- **A pill chip row?** Look at `CategoryChips.tsx`.
- **A rounded card with image / no image?** Look at `PropertyCard.tsx`.
- **An onboarding feature illustration (no image)?** Look at `FeatureVisual` in `App.tsx`.
- **OTP boxes?** Look at `OtpBox` in `App.tsx`.
- **A bottom sheet for a confirmation?** Look at `VisitRequestModal.tsx`.
- **A phone input with country code?** Look at `PhoneEntryContent` in `App.tsx`.
- **A loading screen with orbit dots?** Look at `LoadingContent` in `App.tsx`.

For each, **translate the pattern into Tamagui**. Never copy the file, never copy the class names, never copy the colors. If a pattern needs an image we don't have, replace it with a shape composition (like FeatureVisual does).

End of analysis.
