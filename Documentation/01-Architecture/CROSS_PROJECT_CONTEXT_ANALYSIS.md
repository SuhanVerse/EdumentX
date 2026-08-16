# EdumentX × BasoBas — Cross-Project Context Analysis

> **Date:** July 26, 2026
> **Purpose:** Comprehensive structural architecture, design system, and implementation analysis comparing EdumentX (home tutoring marketplace) with BasoBas (rental property marketplace), identifying patterns, contrasts, and learnings for cross-pollination.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overviews](#2-project-overviews)
3. [Architecture Comparison](#3-architecture-comparison)
4. [Design System Comparison](#4-design-system-comparison)
5. [Component Library Comparison](#5-component-library-comparison)
6. [State Management](#6-state-management)
7. [Authentication & Onboarding](#7-authentication--onboarding)
8. [Service Layer](#8-service-layer)
9. [Navigation & Routing](#9-navigation--routing)
10. [Data Models](#10-data-models)
11. [Screen Map & Feature Matrix](#11-screen-map--feature-matrix)
12. [Motion & Animation Systems](#12-motion--animation-systems)
13. [Zero-Budget Architecture](#13-zero-budget-architecture)
14. [Key Learnings & Cross-Pollination Opportunities](#14-key-learnings--cross-pollination-opportunities)
15. [Migration & Refactoring Guide](#15-migration--refactoring-guide)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

| Dimension | EdumentX | BasoBas (Reference) |
|-----------|----------|---------------------|
| **Domain** | Home tutoring marketplace (Kathmandu Valley) | Rental property marketplace (Nepal) |
| **Platform** | Mobile (Expo SDK 54, RN 0.81.5) | Mobile (Expo SDK 54, RN 0.81.5) |
| **Styling** | NativeWind 4.2.5 (Tailwind) | NativeWind (Tailwind) |
| **Auth** | Firebase Auth (Email/Password + Google) | Clerk (Phone OTP) → Supabase Auth |
| **Database** | Cloud Firestore (Spark) | Supabase (PostgreSQL) |
| **File Storage** | Supabase Storage | Supabase Storage |
| **State** | Zustand (auth only) | Zustand (auth, onboarding, properties, user) |
| **Icons** | Ionicons (@expo/vector-icons) | Lucide React Native |
| **Typography** | System font + Tailwind tokens | DM Sans + DM Serif Display (Google Fonts) |
| **Navigation** | Expo Router (Stack, custom BottomNav) | Expo Router (Stack + Tabs + GlassDock) |
| **Animations** | Reanimated 4 + worklets 0.5.1 | Reanimated 4 |
| **Gestures** | react-native-gesture-handler 2.28.0 | react-native-gesture-handler 2.28.0 |
| **3D/GL** | expo-gl + @react-three/fiber | None |
| **Maps** | react-native-maps (pending OSM tiles) | react-native-maps (planned) |
| **Bottom Sheets** | None (custom modals used) | @gorhom/bottom-sheet 5.x |
| **Forms** | react-hook-form (planned in package.json) | react-hook-form + zod |
| **Testing** | None | None |

---

## 2. Project Overviews

### 2.1 EdumentX

> **Tagline:** Connect with verified home tutors in Kathmandu Valley

EdumentX is a mobile marketplace connecting students/parents with verified home tutors. It features:
- Role-based dashboards: **Student** (discovery, AI chat, enrollment), **Tutor** (profile management, batch creation, inbox), **Admin** (verification queue, user management, platform statistics)
- Document-based tutor verification pipeline (admin reviews documents)
- Map-based tutor discovery (using OpenStreetMap, keyless)
- AI tutor recommendation engine (using Groq/HuggingFace, free tier)
- Three user-facing auth surfaces: Email/Password signup, Google Sign-In, role selection

**Current phase:** Phase 3 complete (Native Firebase Auth, Supabase Storage, profile management, live Firestore reads, verification pipeline). Phase 4 (map tiles, AI integration) and Phase 5 (sessions, enrollments, batches, live metrics) pending.

### 2.2 BasoBas (Reference Project)

> **Tagline:** "Find your home. Before it's gone."
> **Nepali meaning:** बासोबास — "dwelling" or "residence"

BasoBas is a rental property marketplace replacing brokers in Nepal's rental process. It features:
- Role-based experiences: **Tenant** (discovery, search, map, visits), **Landlord** (property management, request handling, KYC verification)
- **Dual-role support**: One account can hold both roles, switchable from Profile
- KYC identity verification (Citizenship/NID) for landlords (mandatory) and tenants (optional)
- Privacy-preserving address system (address only revealed on ACCEPTED visit status)
- Complete visit request lifecycle (8 statuses, side effects per transition)
- Pro plan (tenants only, 5 premium features)
- Phone OTP authentication only (no email, no social login)

**Documentation strength:** BasoBas has exceptionally well-documented product specifications (14+ docs covering every aspect of the product). The documentation is written in plain English with structured decision logs, business rules, and screen maps.

---

## 3. Architecture Comparison

### 3.1 EdumentX Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    React Native / Expo SDK 54                   │
├────────────────────────────────────────────────────────────────┤
│                    Expo Router (Stack Navigator)                 │
│              Flat file routing (no tab navigator groups)         │
├──────────────────────────┬─────────────────────────────────────┤
│      Screens Layer       │         Component Layer              │
│  app/ (23 route files)   │  components/ui/ (7 primitives)       │
│  screens/ (24 screens)   │  components/forms/ (9 inputs)        │
│                          │  components/shared/ (5 layouts)      │
│                          │  components/motion/ (8 animations)   │
│                          │  components/domain/ (TutorCard)      │
│                          │  components/premium/ (3D/illustr.)   │
├──────────────────────────┼─────────────────────────────────────┤
│      Services Layer      │        State / Lib Layer             │
│  services/firebase/      │  store/authStore.ts (Zustand)        │
│  services/supabase/      │  lib/registration.ts                 │
│                          │  lib/validation.ts                   │
│                          │  lib/verification/ (4 modules)       │
│                          │  lib/tutor/ (5 modules)              │
└──────────────────────────┴─────────────────────────────────────┘
```

**Key architectural traits:**
- **Flat route structure:** All routes at `app/` level with no group directories
- **Custom bottom navigation:** `BottomNav.tsx` and `AdminNav.tsx` render inline in each screen (not via expo-router Tabs)
- **Inline live subscriptions:** Each screen manages its own `onSnapshot` Firestore subscriptions via `useEffect`
- **Per-role file structure:** Screens organized by role (`screens/student/`, `screens/tutor/`, `screens/admin/`)
- **Dual routing:** Some screens in `app/` are thin wrappers, while `screens/` hold the actual component logic

### 3.2 BasoBas Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    React Native / Expo SDK 54                   │
├────────────────────────────────────────────────────────────────┤
│            Expo Router (Stack + Tabs with GlassDock)            │
│              Grouped routing: (auth) / (tenant) / (landlord)    │
├──────────────────────────┬─────────────────────────────────────┤
│      Screens Layer       │         Component Layer              │
│  app/(auth)/ (9 screens) │  src/components/form/ (4)            │
│  app/(tenant)/ (20 screens) │  src/components/layout/ (3)       │
│  app/(landlord)/ (16 screens)│  src/components/navigation/ (GlassDock)│
│                           │  src/components/property/ (7)       │
│                           │  src/components/onboarding/ (8)     │
│                           │  src/components/shared/ (4)         │
│                           │  src/components/user/ (2)           │
├──────────────────────────┼─────────────────────────────────────┤
│      Services Layer      │        State / Lib Layer             │
│  src/services/ (4)       │  src/store/ (4 Zustand stores)       │
│                           │  src/hooks/ (2 custom hooks)        │
│                           │  src/lib/ (result, supabase client) │
│                           │  src/theme/tokens.ts                │
└──────────────────────────┴─────────────────────────────────────┘
```

**Key architectural traits:**
- **Grouped routing:** Route groups `(auth)`, `(tenant)`, `(landlord)` with proper expo-router Tabs for tab bars
- **GlassDock navigation:** Custom floating iOS-style pill tab bar using `BlurView` + absolute positioning
- **Modular service layer:** Every backend interaction goes through `src/services/` modules
- **Multi-store Zustand:** 4 separate stores (auth, onboarding, property, user) with clear separation of concerns
- **Design tokens:** Centralized `src/theme/tokens.ts` with Tailwind config mirroring the token values

### 3.3 Key Architectural Differences

| Aspect | EdumentX | BasoBas | Assessment |
|--------|----------|---------|------------|
| Route structure | Flat (no groups) | Grouped (`(auth)`, `(tenant)`) | BasoBas is better organized |
| Tab navigation | Custom inline BottomNav | Custom GlassDock via Tabs adapter | GlassDock is more sophisticated |
| State management | Minimal (1 store) | Multi-store (4 stores) | BasoBas scales better |
| Services | Mixed inline/separate | All separate service files | BasoBas is cleaner |
| Design tokens | Tailwind classes only | Tailwind + JS tokens | Both valid, BasoBas more flexible |
| File organization | Mixed (`app/` + `screens/`) | Unified (`app/` only) | BasoBas is simpler |
| Docs quality | Detailed (audit, 14 docs) | Excellent (16+ product docs) | BasoBas docs are reference-quality |

---

## 4. Design System Comparison

### 4.1 Color Palette

#### EdumentX (`tailwind.config.js` → `constants/colors.ts`)

```typescript
// constants/colors.ts
export const colors = {
  brand: {
    primary: '#2F5D50',    // Deep forest green — primary CTA
    secondary: '#E5A03B',   // Amber/gold — highlights, accent
    verification: '#3F8A5A',// Green — verification states
    ai: '#4A7FA5',          // Blue — AI-related UI
    accent: '#E5A03B',      // Same as secondary
  },
  bg: {
    primary: '#FAFAF8',     // Page background
    surface: '#FFFFFF',     // Cards, panels
    night: '#0D1117',       // Dark hero headers
    canvas: '#F4F4F0',      // Image placeholders
  },
  text: {
    primary: '#1A1A1A',     // Primary text
    secondary: '#4A4A4A',   // Body text
    muted: '#6B7268',       // Secondary/meta text
    inverse: '#FFFFFF',     // Text on dark backgrounds
  },
  semantic: {
    danger: '#C1503D',
    warning: '#E5A03B',
    success: '#3F8A5A',
    verification: '#3F8A5A',
    ai: '#4A7FA5',
    accent: '#E5A03B',
  },
  // ... over 40 tokenized colors
}
```

Key NativeWind tokens: `bg-night`, `bg-background`, `bg-surface`, `bg-accent`, `text-text-primary`, `text-text-muted`, `border-border`, `rounded-card`.

#### BasoBas (`tailwind.config.js` → `src/theme/tokens.ts`)

```typescript
// src/theme/tokens.ts
export const tokens = {
  color: {
    bg: '#FFFFFF',
    canvas: '#F4F4F0',
    ink: '#0A0A0A',          // Primary text
    ink2: '#6B6B6B',         // Secondary text
    ink3: '#AAAAAA',         // Muted text
    placeholder: '#C0C0C0',  // Placeholder text
    brand: '#1A6B4A',        // Primary CTA green
    brandLight: '#E8F5EE',   // Brand tint
    line: '#E8E8E8',         // Borders, dividers
    divider: '#F0F0F0',
    input: '#F5F5F5',
    inputReadonly: '#F0F0F0',
    danger: '#E53E3E',
    dangerBg: '#FEE2E2',
    rating: '#F5A623',       // Gold star color
    dockSurface: 'rgba(18, 18, 18, 0.78)',  // Glass dock background
  },
  // ...
}
```

Key NativeWind tokens: `bg-bg`, `bg-canvas`, `bg-brand`, `text-ink`, `text-ink2`, `text-brand`, `border-line`, `rounded-pill`.

### 4.2 Typography

| Property | EdumentX | BasoBas |
|----------|----------|---------|
| Font family | System default (no custom fonts) | DM Sans (body) + DM Serif Display (headlines) |
| Headings | `text-screen-title` (custom) | `text-h1` (26px), `text-h2` (22px), `text-h3` (18px) |
| Body | `text-body` (15px) | `text-body` (15px) |
| Small | `text-body-sm` (13px) | `text-body-sm` (13px) |
| Caption | `text-caption` (12px) | `text-caption` (12px) |
| Micro | Not defined | `text-label` (11px), `text-micro` (10px) |
| Font weight | `font-medium`, `font-semibold` | `font-sans`, `font-medium`, `font-semibold`, `font-bold`, `font-display` |

**EdumentX advantage:** No custom font loading → faster splash screen, simpler bundle.
**BasoBas advantage:** DM Serif Display adds character to headings, better design hierarchy.

### 4.3 Spacing & Border Radius

| Token | EdumentX | BasoBas |
|-------|----------|---------|
| Card radius | `rounded-card` (14px) | `rounded-card` (14px) |
| Pill radius | `rounded-pill` (999px) | `rounded-pill` (999px) |
| Button height | `h-btn` / `h-input` (56px) | `h-[56px]` / `input-h: 56px` |
| Input padding | `px-3` (12px) | `px-4` (16px) |
| Screen padding | `px-5` (20px) | `px-6` (24px) |
| Section gap | `gap-4` (16px) | `section-gap` (20px) |
| Dock height | 64px | `dock-h: 64px` |

**Observation:** Both projects use very similar spacing rhythms (8px grid). EdumentX uses NativeWind shorthand utilities more heavily; BasoBas defines explicit tokens and mirrors them in Tailwind config.

---

## 5. Component Library Comparison

### 5.1 UI Primitives

| Component | EdumentX | BasoBas |
|-----------|----------|---------|
| **Button** | `PrimaryButton.tsx` (variants, loading, disabled, press-scale animation) | `PrimaryButton.tsx` (haptics, loading, StyleSheet) |
| **Secondary Button** | `SecondaryButton.tsx` (with types) | No separate component (uses `Pressable` directly) |
| **Avatar** | `Avatar.tsx` (initials fallback, deterministic tinting, size variants) | `Avatar.tsx` (simpler, user component) |
| **Search Bar** | `SearchBar.tsx` (icon layout, filter button) | `SearchBar.tsx` (similar pattern) |
| **Pagination** | `PaginationDots.tsx` | `PaginationDots.tsx` (onboarding) |
| **Image Viewer** | `ImageViewer.tsx` | No equivalent |
| **Video Viewer** | `VideoViewer.tsx` | No equivalent |
| **Status Pill** | No dedicated component (inline) | `StatusPill.tsx` (8 status variants with colors) |
| **Menu Row** | `MenuRow.tsx` (form component) | `MenuRow.tsx` (shared component) |

### 5.2 Form Components

| Component | EdumentX | BasoBas |
|-----------|----------|---------|
| Text Input | `EditableField.tsx` (inline editing, animate focus) | `FormField.tsx` (label, error, multiline) |
| Location | `LocationField.tsx` (Nominatim geocoding, 3-char min) | No equivalent (uses map pin in listing flow) |
| Chip Group | `ChipGroup.tsx` (multi-select, press-scale) | `FilterChip.tsx` (filter chips) |
| Toggle/Switch | `SwitchThumb.tsx` (Reanimated spring animation) | `Toggle.tsx` (simple class-swap) |
| Avatar Upload | `AvatarUploader.tsx` (Supabase storage) | Uses `image-picker` inline |
| Document Upload | `DocumentUploader.tsx` (states: idle/loading/uploaded/error) | No equivalent (KYC handled differently) |
| Confirm Dialog | `ConfirmDialog.tsx` | No equivalent |
| OTP Input | No equivalent | `OTPInput.tsx` (6-box, auto-submit) |
| Name/Email | `NameEmailFields.tsx` (composite) | Inline in forms |

### 5.3 Layout & Navigation Components

#### EdumentX Navigation

```tsx
// BottomNav.tsx — Inline custom bottom bar
// Used by each screen individually
// Three variants: student, tutor, admin
// Active state: ActivePill animated indicator
// Icons: Ionicons
// Height: ~64px
```

#### BasoBas Navigation (GlassDock)

```tsx
// GlassDock.tsx — Floating iOS-style pill navigation
// Wraps expo-router Tabs via FloatingDock adapter
// Two variants: tenant, landlord (from dockItems constants)
// Active state: 52×52 black circle + white icon
// Badge: Red dot on notification tab
// Glass effect: BlurView (intensity 25) + rgba(100,100,100,0.35)
// Shadow: RN StyleSheet (elevation 14)
// Dimensions: 312 × 64px, centered, 8px above safe bottom
// Spacer: DOCK_BOTTOM_GAP = 8, DOCK_RESERVED_HEIGHT = 64
```

```tsx
// DockTab.tsx — Individual dock cell
// flex-1 self-stretch (equal share of dock width)
// Active: black circle behind icon
// Inactive: dark gray icon (INACTIVE_COLOR = '#0A0A0A')
// Notification badge: red pill top-right
// Hit slop: 8px
```

### 5.4 Property/Domain Components

| Component | EdumentX (TutorCard) | BasoBas (PropertyCard) |
|-----------|----------------------|----------------------|
| Variants | `wide`, `compact-h` | `compact-h`, `grid`, `wide` |
| Status overlay | Verified badge | `active`/`paused`/`draft` pill |
| Save action | Heart icon (lucide-react-native) | Heart icon (lucide-react-native) |
| Rating | Star with numeric | Star with numeric |
| Price | `monthlyRateNpr` | `priceMonthly` (NPR) |
| Location | `neighborhood, city` | `area` + `location` |
| Layout | Wide: full-width with image | Grid: 48% width, 2-column |

**Key difference:** BasoBas's `PropertyCard` has a `grid` variant for 2-column layouts. EdumentX's `TutorCard` supports `compact-h` for horizontal scrolling sections.

---

## 6. State Management

### 6.1 EdumentX State

**Single Zustand store** (`store/authStore.ts`):

```typescript
interface AuthStore {
  user: User | null;           // Firebase Auth User
  role: 'student' | 'tutor' | 'admin' | null;
  isLoaded: boolean;
  
  setUser: (user: User | null) => void;
  setRole: (role: 'student' | 'tutor' | 'admin' | null) => void;
  setIsLoaded: (loaded: boolean) => void;
  reset: () => void;
}
```

- **No sub-stores** — all feature state is local `useState` + `useEffect` in screens
- **Firestore as state:** Profile data, tutor listings, etc. live in Firestore and are read via `onSnapshot` in each screen's `useEffect`
- **No caching layer:** Data is re-fetched on every screen mount (Firestore SDK does local caching)

### 6.2 BasoBas State

**Four Zustand stores:**

```typescript
// store/authStore.ts — Auth & profile state
interface AuthStore {
  profile: Profile | null;
  isLoaded: boolean;
  isOnboarded: boolean;
  setProfile, setIsLoaded, clearAll;
}

// store/onboardingStore.ts — Onboarding wizard state
interface OnboardingState {
  roles: UserRole[];
  profile: OnboardingProfileData;
  kyc: OnboardingKYCData;
  isSubmitting: boolean;
  submitError: string | null;
  onboardingComplete: boolean;
  // Step-by-step setters: setRole, setAvatar, setFullName, etc.
  getPayload: () => OnboardingPayload;
}

// store/propertyStore.ts — Property data & filters
interface PropertyStore {
  properties: Property[];      // 15 mock properties
  savedPropertyIds: string[];
  filters: PropertyFilters;
  toggleSaved, setFilter, resetFilters, getFilteredProperties;
}

// store/userStore.ts — Additional user state
```

**Key insight:** BasoBas separates concerns into multiple stores (auth ≠ onboarding ≠ property), which keeps each store small and focused. EdumentX could benefit from a dedicated `tutorStore` and `studentStore`.

### 6.3 Comparison

| Aspect | EdumentX | BasoBas | Recommendation |
|--------|----------|---------|----------------|
| Number of stores | 1 | 4 | BasoBas is more scalable |
| Separation of concerns | Low (auth + role in one store) | High (auth, onboarding, property, user) | Split EdumentX stores |
| Feature state management | Local `useState` in screens | Zustand stores + local state | Add dedicated stores |
| Data persistence | Firestore `onSnapshot` | Store + Supabase | EdumentX is simpler |
| Filter/search state | Local state | Zustand store with `getFilteredProperties` | Store-based filters scale better |

---

## 7. Authentication & Onboarding

### 7.1 EdumentX Auth Flow

```
[EmailSignUp.tsx] ← Single auth surface (signup + login)
    │
    ├── Email/Password (createUserWithEmailAndPassword)
    │   └── Email verification (sendEmailVerification, reload)
    │       └── "I've verified — continue" button
    │
    └── Google Sign-In (GoogleSignin + signInWithCredential)
        └── Auto-verified (skips email verification)
    │
    ▼
[RoleSelection.tsx] ← Pick student or tutor (writes role to Firestore)
    │
    ├── Student → [StudentProfileScreen.tsx]
    │   (username, phone, grade, subjects, location)
    │
    └── Tutor → [TutorProfileScreen.tsx]
        (username, phone, headline, bio, monthly rate)
    │
    ▼
Dashboard (student-home or tutor-home)
```

**Auth routing guard** (`app/_layout.tsx`):
1. Wait for root navigator to mount
2. `!user` → `/email-signup`
3. `user && !emailVerified && password-provider` → `/email-signup`
4. `user && verified && !role` → `/role-selection`
5. `user && verified && role` → matching dashboard

### 7.2 BasoBas Auth Flow

```
[Landing Screen] ← Seen by all users on first open
    │
    ├── "Get Started — It's Free"
    └── "Log In with Phone Number"
    │
    ▼
[Phone Entry Screen] ← +977 (Nepal only), 10-digit mobile
    │
    ▼
[OTP Verification Screen] ← 6-box input, auto-submit
    │
    ├── Returning user → Home (no onboarding)
    │
    └── New user:
        ▼
    [Role Selection] ← Step 1/3 (Tenant / Landlord / Both)
        ▼
    [Profile Setup] ← Step 2/3 (Name + City REQUIRED)
        ▼
    ├── If Landlord: [KYC Landlord] ← Step 3/3 (MANDATORY)
    └── If Tenant:   [KYC Tenant] ← Step 3/3 (optional)
        ▼
    [Onboarding Complete] → Auto-navigates after 2 seconds to Home
```

**KYC verification states:** `UNVERIFIED` → `UNDER_REVIEW` → `VERIFIED` | `REJECTED`.

**Mid-onboarding resilience:** If user closes app mid-onboarding, progress is auto-resumed:
- Before OTP → Landing screen
- After OTP, before profile → Profile Setup
- After profile, before KYC → KYC screen
- After KYC submitted → Home (KYC continues in background)

### 7.3 Key Differences

| Aspect | EdumentX | BasoBas |
|--------|----------|---------|
| Auth methods | Email/Password + Google | Phone OTP only |
| Verification | Email verification link | SMS OTP (6 digits, 60s) |
| Role selection | Single role (student OR tutor) | Dual role (tenant AND/OR landlord) |
| Profile fields | 4–5 fields (role-specific) | Name + City + photo (universal) |
| KYC/Documentation | Tutor verification (admin approves) | Landlord KYC (mandatory), Tenant KYC (optional) |
| Onboarding steps | 2 screens after auth | 3 screens after auth + progress bar |
| Resume mid-onboarding | No (re-starts from signup) | Yes (auto-resumes from last completed step) |

---

## 8. Service Layer

### 8.1 EdumentX Services

| File | Purpose |
|------|---------|
| `services/firebase/authService.ts` | Firebase Auth wrapper: signup, login, Google Sign-In, logout |
| `services/firebase/errors.ts` | Firebase error code mapping to user-friendly messages |
| `services/supabase/client.ts` | Supabase client initialization (anon key) |
| `services/supabase/storage.ts` | File upload/download to Supabase Storage buckets |
| `lib/registration.ts` | Registration orchestrator: creates Firestore user doc + profile subcollection |
| `lib/validation.ts` | Form validation helpers (email, password, phone, etc.) |
| `lib/tutor/firestoreTutorService.ts` | Firestore tutor CRUD: `subscribeTutors`, `getTutorById`, `updateTutorProfile` |
| `lib/verification/` (4 files) | Verification pipeline: discovery, documents, editableFields, notifications |
| `lib/motion.ts` | Motion constants (duration, easing presets) |
| `lib/mock/tutors.ts` | Fallback mock tutor data |

### 8.2 BasoBas Services

| File | Purpose |
|------|---------|
| `src/services/onboarding.service.ts` | Complete onboarding orchestration: avatar upload → profile RPC → KYC submission |
| `src/services/profile.service.ts` | Profile CRUD: `getProfile`, `updateProfile`, `updateAvatar`, `switchActiveRole` |
| `src/services/kyc.service.ts` | KYC document upload and submission to Supabase |
| `src/services/storage.service.ts` | Supabase Storage operations: avatar upload |
| `src/hooks/useAuth.ts` | Clerk Auth hook wrapper |
| `src/hooks/useClerkSupabase.ts` | Supabase client with Clerk auth token for RLS |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/lib/result.ts` | Result type pattern: `ok(value) | err(error)` — Rust-style error handling |
| `src/lib/clerkTokenCache.ts` | Token caching for Clerk + Supabase integration |

### 8.3 Comparison

| Pattern | EdumentX | BasoBas |
|---------|----------|---------|
| Error handling | Try/catch + console.warn | Result type (`ok`/`err`) — Rust-style |
| Service modules | Mixed (`services/` + `lib/`) | Clean `src/services/` |
| Return types | `void` or direct values | Explicit `Result<T>` type |
| Hook patterns | `useEffect` with `onSnapshot` | Custom hooks (`useAuth`, `useClerkSupabase`) |
| Orchestration | `lib/registration.ts` orchestrates | `onboarding.service.ts` orchestrates |

**BasoBas's `Result<T>` pattern** is notable — it enforces explicit error handling at every call site and avoids uncaught promise rejections.

---

## 9. Navigation & Routing

### 9.1 EdumentX Routing

**File structure (`app/`):**
```
app/
  _layout.tsx          ← Root layout (GestureHandler → SafeArea → Stack)
  index.tsx            ← Splash/redirect
  email-signup.tsx     ← Auth entry
  role-selection.tsx   ← Role picker
  profile-student.tsx  ← Student profile setup
  profile-tutor.tsx    ← Tutor profile setup
  student-home.tsx     ← Student dashboard
  tutor-home.tsx       ← Tutor dashboard
  tutor/[id].tsx       ← Tutor detail (dynamic route)
  admin-home.tsx       ← Admin dashboard
  ... (23 route files total)
```

**Routing pattern:**
- Flat file structure (no route groups)
- Custom `BottomNav.tsx` rendered inline in each screen
- No expo-router `Tabs` — each screen manages its own navigation bar
- `router.replace()` for flow transitions (e.g., signup → role-selection)
- Route guard in `_layout.tsx` for auth/verified/role checks

### 9.2 BasoBas Routing

**File structure (`app/`):**
```
app/
  _layout.tsx              ← Root (Clerk → GestureHandler → SafeArea → Stack)
  index.tsx                ← Landing screen
  (auth)/                  ← Auth group
    _layout.tsx
    phone.tsx, otp.tsx, onboarding.tsx, role.tsx,
    profile-setup.tsx, kyc-landlord.tsx, kyc-tenant.tsx, ...
  (tenant)/                ← Tenant group
    (tabs)/                ← Tab navigator
      _layout.tsx          ← Tabs + FloatingDock
      index.tsx, search.tsx, visits.tsx, profile.tsx
    property/[id].tsx, saved.tsx, map.tsx, ...
  (landlord)/              ← Landlord group
    (tabs)/                ← Tab navigator
      _layout.tsx          ← Tabs + FloatingDock
      index.tsx, listings.tsx, requests.tsx, profile.tsx
    listing/[id].tsx, notifications.tsx, ...
```

**Routing pattern:**
- Route groups `(auth)`, `(tenant)`, `(landlord)` for logical separation
- Expo Router `Tabs` for tab navigation with custom `tabBar` component
- `FloatingDock` adapter bridges `BottomTabBarProps` → `GlassDock`
- Deep linking respected via standard expo-router navigation
- `useSegments()` for role detection in shared components

### 9.3 Comparison

| Aspect | EdumentX | BasoBas |
|--------|----------|---------|
| Route organization | Flat (23 routes) | Grouped (auth/tenant/landlord) |
| Tab navigation | Custom inline component | Expo Router Tabs + GlassDock adapter |
| Dynamic routes | `tutor/[id].tsx` | `property/[id].tsx`, `visit/[id].tsx` |
| Role detection | Layout guard + store | `useSegments()` + store |
| Deep linking | Basic | Full support via expo-router |
| Back navigation | `router.replace()` + history management | `router.back()` natural |

**Key takeaway:** BasoBas's grouped routing with proper tab integration is more scalable and aligns with expo-router best practices. EdumentX's flat structure works for the current number of screens but won't scale well.

---

## 10. Data Models

### 10.1 EdumentX Firestore Schema

```
users/{uid}
├── role: 'student' | 'tutor' | 'admin'
├── email: string
├── displayName: string?
├── status: 'active' | 'suspended'?
├── createdAt: Timestamp
│
├── studentProfile/default
│   ├── fullName: string
│   ├── username: string
│   ├── phone: string?
│   ├── grade: string?
│   ├── subjects: string[]?
│   ├── location: { neighborhood?, city }
│   └── avatarUrl: string?
│
├── tutorProfile/default
│   ├── fullName: string
│   ├── username: string
│   ├── phone: string?
│   ├── headline: string
│   ├── bio: string?
│   ├── subjects: string[]
│   ├── gradesTeaching: string[]
│   ├── yearsExperience: number
│   ├── monthlyRateNpr: number
│   ├── location: { neighborhood?, city }
│   ├── photoUrl: string?
│   ├── isVerifiedProfessional: boolean
│   ├── verificationStatus: 'pending' | 'approved' | 'rejected' | 'more_info'?
│   ├── hasPendingUpdate: boolean?
│   ├── rejectionReason: string?
│   └── rating, reviewCount, responseRate, capacity, currentStudents, profileCompletion, thisMonthEarningsNpr: number
│
├── adminProfile/default
│   └── fullName: string?
│
├── tutorVerification/{verificationId}
│   ├── status: string
│   ├── documents: Document[]
│   └── reviewedBy: string?
│
└── tutorProfileUpdates/{updateId}
    ├── status: string
    └── changes: object
```

### 10.2 BasoBas Supabase Schema

```sql
-- Key tables (from migrations):
profiles
  clerk_id: text PRIMARY KEY
  phone: text NOT NULL
  full_name: text?
  avatar_url: text?
  avatar_path: text?
  city: text?
  active_role: 'tenant' | 'landlord'?
  onboarding_complete: boolean DEFAULT false
  created_at, updated_at: timestamptz

user_roles
  id: uuid PRIMARY KEY
  clerk_id: text REFERENCES profiles(clerk_id)
  role: 'tenant' | 'landlord'
  created_at: timestamptz

properties
  id: uuid PRIMARY KEY
  landlord_clerk_id: text REFERENCES profiles(clerk_id)
  title, description: text
  type: 'Room' | 'Apartment' | 'House' | 'Office' | 'Flat'
  monthly_rent: numeric
  bedrooms, bathrooms, floor: int
  area_sqft: int?
  facilities: text[]
  status: 'available' | 'high_demand' | 'under_discussion' | 'occupied'
  locality, full_address: text
  latitude, longitude: numeric
  is_negotiable: boolean
  available_from: date
  cover_photo_url, cover_photo_path: text?
  created_at, updated_at: timestamptz

kyc_submissions
  id: uuid PRIMARY KEY
  clerk_id: text REFERENCES profiles(clerk_id)
  document_type: 'CITIZENSHIP' | 'NATIONAL_ID'
  front_image_url, back_image_url: text
  electricity_bill_url: text?
  status: 'under_review' | 'verified' | 'rejected'
  submitted_at, reviewed_at: timestamptz
  reviewer_notes: text?
```

**Key structural differences:**
- EdumentX uses Firestore subcollections (`users/{uid}/studentProfile/default`); BasoBas uses flat SQL tables
- BasoBas has proper foreign key relationships (`clerk_id REFERENCES profiles`)
- BasoBas has a separate `user_roles` table supporting dual-role (vs EdumentX single `role` field)
- BasoBas properties have structured JSON-like arrays (`facilities: text[]`) vs nested maps

---

## 11. Screen Map & Feature Matrix

### 11.1 EdumentX Screen Map (23 routes + 24 screens)

```
AUTH (4)
├── /email-signup            ← Auth entry (signup/login/Google)
├── /role-selection          ← Role picker
├── /profile-student         ← Student profile setup
├── /profile-tutor           ← Tutor profile setup

STUDENT (6)
├── /student-home            ← Dashboard: search, tutor recommendations
├── /stu-profile             ← Student profile & settings
├── /map-search              ← Map-based tutor discovery [placeholder]
├── /AI-chat                 ← AI tutor chat [UI-only]
├── /enrollment              ← Enrollment management
├── /filters-sheet           ← Search filter sheet
├── /tutor/[id]              ← Tutor detail view

TUTOR (6)
├── /tutor-home              ← Dashboard: metrics, capacity, requests
├── /tutor_edit_profile      ← Edit tutor profile
├── /tutor_edit_teaching_details  ← Edit teaching subjects/details
├── /tutor-pending           ← Pending review screen
├── /tutor-inbox             ← Tutor inbox [mock data]
├── /batches                 ← Batch creation

ADMIN (5)
├── /admin-home              ← Admin landing
├── /admin-profile           ← Admin profile
├── /verification-queue      ← Tutor verification management
├── /user-management         ← User listing & management
├── /platform-statistics     ← Platform metrics

SHARED (2)
├── /notification            ← Notification center
├── /onboarding              ← Onboarding (3D splash scenes)
├── /_layout.tsx             ← Root layout with auth guard
├── /index.tsx               ← App entry
```

### 11.2 BasoBas Screen Map (48 screens planned)

```
AUTH (9)
├── /index                   ← Landing screen
├── /(auth)/phone            ← Phone entry (+977 only)
├── /(auth)/otp              ← OTP verification (6-box)
├── /(auth)/role             ← Role selection (tenant/landlord/both)
├── /(auth)/profile-setup     ← Profile setup (name+city)
├── /(auth)/kyc-tenant       ← KYC (optional)
├── /(auth)/kyc-landlord     ← KYC (mandatory)
├── /(auth)/confirmation     ← Onboarding complete
├── /(auth)/loading          ← Loading/auth gate

TENANT (20)
├── (tabs)/
│   ├── index                ← Home: feed, recommendations, categories
│   ├── search               ← Search + filters + results
│   ├── visits               ← Visit history (active/completed/archived)
│   ├── profile              ← Tenant profile
├── property/[id]            ← Property detail
├── property/[id]/gallery    ← Full gallery view
├── map                      ← Full map search
├── saved                    ← Saved properties
├── search-results           ← Full search result page
├── ai-preferences           ← AI preference config (Pro)
├── edit-profile             ← Edit profile
├── preferences              ← User preferences
├── notifications            ← Notification center
├── settings                 ← Settings screen
├── landlord/[id]            ← Public landlord profile
├── visit/[id]               ← Visit detail
├── report                   ← Report issue
├── reviews/                 ← Reviews overview
├── reviews/property/[id]    ← Property reviews
├── reviews/write/[visitId]  ← Write a review
├── _modal/filter            ← Filter bottom sheet (modal)
├── _modal/notifications-prefs  ← Notification preferences (modal)

LANDLORD (16)
├── (tabs)/
│   ├── index                ← Dashboard: listings, stats
│   ├── listings             ← All properties management
│   ├── requests             ← Visit requests
│   ├── profile              ← Landlord profile
├── listing/new/step-1       ← Add listing: basic info
├── listing/new/step-2       ← Add listing: property details
├── listing/new/step-3       ← Add listing: photos
├── listing/new/step-4       ← Add listing: location + publish
├── listing/[id]             ← Listing detail/edit
├── request/[id]             ← Visit request detail
├── tenant/[id]              ← Tenant profile (landlord view)
├── verification             ← KYC verification status
├── visits                   ← Visit history
├── edit-profile             ← Edit landlord profile
├── ai-preferences           ← AI preferences
├── notifications            ← Notification center
├── settings                 ← Settings
```

### 11.3 Feature Comparison Matrix

| Feature Area | EdumentX | BasoBas |
|-------------|----------|---------|
| User roles | Student, Tutor, Admin | Tenant, Landlord (dual role) |
| Role switching | No (one role per auth) | Yes (instant from Profile) |
| KYC verification | Tutor documents (admin review) | Landlord KYC (mandatory), Tenant (optional) |
| Document types | Multiple (credential, photo, ID) | Citizenship or National ID only |
| Status badge | Verified Professional | Verified ✓ badge |
| Search | Basic text search | Full-text + filters + map |
| Map | Placeholder (OSM pending) | React Native Maps + clustering |
| AI recommendation | Chatbot (UI-only) | AI suggestions (behavioural) |
| Pro/premium plan | No | Yes (5 features, tenants only) |
| Messaging/inbox | Tutor inbox (mock) | Visit request system only |
| Batch management | Yes (group sessions) | No |
| Enrollment system | Yes (student enrollments) | No (visit requests instead) |
| Admin panel | Verification + users + stats | No (Supabase Studio) |
| 3D onboarding | Yes (Three.js scenes) | No (illustrations) |
| Ratings & reviews | Mock data | Full system (tenant reviews landlord) |
| Pricing | Monthly tutor rate | Monthly rent (NPR) |

---

## 12. Motion & Animation Systems

### 12.1 EdumentX Motion

**Centralized motion constants** (`lib/motion.ts`):

```typescript
export const motion = {
  duration: {
    fast: 150,
    medium: 300,
    slow: 500,
  },
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    snappy: { damping: 15, stiffness: 300 },
    bouncy: { damping: 10, stiffness: 200 },
  },
};
```

**Motion components** (`components/motion/`):

| Component | Description |
|-----------|-------------|
| `AnimatedPressable.tsx` | Reanimated `Pressable` with scale feedback (`usePressScale` hook) |
| `ActivePill.tsx` | Sliding pill indicator for segmented controls / tab bars |
| `FieldShell.tsx` | Animated wrapper for form fields (focus highlight, error state) |
| `FloatingEmptyIcon.tsx` | Gently floating icon for empty states |
| `Skeleton.tsx` | Pulsing opacity skeleton loader (flex-based) |
| `SwitchThumb.tsx` | Reanimated switch thumb with spring animation |
| `hooks.ts` | `usePressScale()` — press-in/out animation hook |
| `index.ts` | Re-exports all motion components |

**Animation patterns:**
- Press scale: `useSharedValue(1)` → `withSpring(0.96)` on press → `withSpring(1)` on release
- Active pill: Sliding via `useAnimatedStyle` with `translateX` interpolation
- Skeleton: Pulsing opacity via `withRepeat(withSequence(withTiming(0.3), withTiming(1)), -1, true)`
- Switch: Spring-based thumb position + interpolated track color

### 12.2 BasoBas Motion

BasoBas doesn't have a dedicated motion module. Animation is done inline:
- **GlassDock:** Shadow via StyleSheet (no reanimated in dock itself)
- **FilterDrawer:** `Animated.Value` + `PanResponder` for drag-to-dismiss (legacy `Animated` API, not Reanimated)
- **ScheduleVisitDrawer:** Bottom sheet via `@gorhom/bottom-sheet` (native driver)
- **PropertyCard heart:** Inline press feedback
- **No dedicated Skeleton:** Data loads synchronously from mock data

**Comparison:**

| Aspect | EdumentX | BasoBas |
|--------|----------|---------|
| Motion constants | Centralized `lib/motion.ts` | Inline values |
| Press feedback | Dedicated hook + component (`usePressScale` + `AnimatedPressable`) | `opacity: pressed ? 0.5 : 1` in Pressable style |
| Tab indicator | `ActivePill.tsx` (Reanimated sliding pill) | Class-swap (no animation between tabs) |
| Skeleton loader | Dedicated `Skeleton.tsx` | Not present |
| Switch | `SwitchThumb.tsx` (Reanimated spring) | `Toggle.tsx` (simple class-swap) |
| Bottom sheet | Not used (custom modals) | `@gorhom/bottom-sheet` (native) |
| Drag-to-dismiss | Not used | `PanResponder` in FilterDrawer |

**EdumentX has a more sophisticated motion system**, but BasoBas uses native bottom sheets which perform better.

---

## 13. Zero-Budget Architecture

Both projects operate under similar zero-budget constraints (Nepal-based demos without international credit cards).

| Service | EdumentX | BasoBas | Cost Model |
|---------|----------|---------|------------|
| **Auth** | Firebase Auth (Spark) — free | Clerk Free Tier → Supabase Auth | Free |
| **Database** | Firestore (Spark) — 1GB, 50K reads/day | Supabase — 500MB, 50K rows | Free |
| **File Storage** | Supabase Storage — 1GB free | Supabase Storage — 1GB free | Free |
| **Map Tiles** | OpenStreetMap (keyless) | OpenStreetMap (keyless, planned) | Free |
| **Geocoding** | Nominatim (keyless, 1 req/sec) | Nominatim (keyless) | Free |
| **AI** | Groq / HuggingFace (free tier) | Not AI-dependent | Free |
| **Maps SDK** | react-native-maps + UrlTile | react-native-maps + UrlTile | Free |
| **Location** | expo-location (built-in) | expo-location (built-in) | Free |
| **Forms** | react-hook-form (OSS) | react-hook-form + zod (OSS) | Free |
| **SMS/OTP** | Email (free) via Firebase | Clerk/Twilio Verify (paid — potential issue) | Needs migration |
| **Notifications** | Firestore onSnapshot (reactive) | to be implemented | Free |

**Note:** BasoBas uses Clerk for phone OTP which requires Twilio credits (~$0.0079/SMS). This is the only non-zero-budget component in BasoBas. The project's `PROJECT_SETUP.md` notes this constraint.

---

## 14. Key Learnings & Cross-Pollination Opportunities

### 14.1 What EdumentX Should Adopt from BasoBas

1. **Result Type Pattern (`Result<T>`)** — Replace try/catch with explicit `ok(value) | err(error)` for all service functions. This forces callers to handle errors explicitly and prevents uncaught rejections.

2. **Multi-Store Zustand** — Split the single auth store into dedicated stores: `authStore`, `tutorStore`, `studentStore`, `filterStore`. Reduces re-renders and keeps concerns separated.

3. **Documentation Quality** — BasoBas's product docs are exceptional. EdumentX should adopt similar structured documentation with decision logs, business rules, and screen maps.

4. **Dual Role System** — While EdumentX currently assigns a single role, the ability to be both student AND tutor could unlock "study groups" and "peer tutoring" features.

5. **GlassDock Navigation** — The floating iOS-style pill dock is visually superior to a full-width bottom bar. Could be adapted for EdumentX role-based navigation.

6. **Route Groups** — Migrating from flat `app/` routing to group-based `(student)/`, `(tutor)/`, `(admin)/` routing would improve organization and enable proper tab navigation.

7. **KYC Status State Machine** — BasoBas's KYC state model (`UNVERIFIED → UNDER_REVIEW → VERIFIED/REJECTED` with cooldowns) is a solid reference for EdumentX's tutor verification pipeline.

8. **Onboarding Resume** — Auto-resuming mid-onboarding (after OTP, before profile) would improve user experience for tutors who close the app mid-setup.

9. **Bottom Sheet Pattern** — `@gorhom/bottom-sheet` for sheets (filters, schedule, confirmations) instead of custom modals.

10. **Service Module Pattern** — All backend logic in `services/` with clean interfaces, not mixed into screens via inline `useEffect`.

### 14.2 What BasoBas Should Adopt from EdumentX

1. **Motion System** — The centralized motion constants (`lib/motion.ts`) and reusable animation components (`AnimatedPressable`, `ActivePill`, `Skeleton`) are production-quality. BasoBas currently relies on inline class-swaps and legacy `Animated` API.

2. **Admin Dashboard** — EdumentX's admin panel (verification queue, user management, platform statistics) is a feature BasoBas needs for KYC review but doesn't have.

3. **3D Onboarding** — While overkill for a rental app, the onboarding splash/scene concept could be simplified for BasoBas's landing screen.

4. **Document Upload Pattern** — `DocumentUploader.tsx` with clear states (uploading/uploaded/error) is reusable for BasoBas's KYC screens.

5. **Profile Completion Indicator** — The tutor dashboard's profile completion progress bar could help BasoBas landlords complete their listing setup.

6. **Subject/Badge Chip Components** — EdumentX's `ChipGroup` and inline chip patterns are useful for BasoBas's facility/tag selection.

7. **Skeleton Loaders** — BasoBas doesn't show loading states anywhere. EdumentX's skeleton system would improve perceived performance.

### 14.3 Shared Best Practices

1. **Tailwind-Only Styling** — Both projects correctly avoid `style={{}}` objects (except for shadows and SVG fills). This keeps the codebase consistent.

2. **No Tamagui** — Both projects use NativeWind without Tamagui, avoiding the complexity and build issues.

3. **Zustand over Redux** — Both correctly choose Zustand for its simplicity and TypeScript friendliness.

4. **Expo Router** — Both use Expo Router (v6) for file-based routing with TypeScript support.

5. **Reanimated over Animated** — Both use Reanimated for UI-thread animations (though BasoBas has legacy `Animated` in filter drawer).

6. **Native Firebase Auth / Supabase Auth** — Both use native auth SDKs (not web-based) for better performance and deep-linking support.

---

## 15. Migration & Refactoring Guide

### 15.1 Converting BasoBas Patterns to EdumentX

When porting BasoBas patterns to EdumentX, follow these rules:

```typescript
// ❌ BasoBas pattern (Clerk + Supabase):
const { userId, session } = useAuth()
const supabase = createClient(session)
const { data } = await supabase.from('profiles').select('*').single()

// ✅ EdumentX pattern (Firebase Auth + Firestore):
import { getApp } from '@react-native-firebase/app'
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore'

const db = getFirestore(getApp())
const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
  // handle data
})
```

```tsx
// ❌ BasoBas pattern (Lucide icons):
import { Heart, Star } from 'lucide-react-native'
<Heart size={18} color="#E53E3E" />

// ✅ EdumentX pattern (Ionicons):
import { Ionicons } from '@expo/vector-icons'
<Ionicons name="heart" size={18} color="#E53E3E" />
```

```tsx
// ❌ BasoBas pattern (StyleSheet for custom styling):
const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 14,
  },
})

// ✅ EdumentX pattern (NativeWind only):
<View className="bg-surface rounded-card p-4 border border-border" />
// (Shadows still need StyleSheet for RN — acceptable exception)
```

```tsx
// ❌ BasoBas pattern (varies per screen):
<ScreenHeader title="Notifications" showBack />

// ✅ EdumentX pattern (consistent ScreenLayout):
<ScreenLayout variant="night">
  {/* content */}
</ScreenLayout>
```

### 15.2 Adding a New Feature to EdumentX

Follow this checklist when adding features inspired by BasoBas:

```
[ ] 1. Define types in lib/{feature}/types.ts
[ ] 2. Create service in services/firebase/{feature}Service.ts (or lib/{feature}/)
[ ] 3. Add Zustand store in store/{feature}Store.ts if needed
[ ] 4. Create screen in screens/{role}/{Feature}Screen.tsx
[ ] 5. Create route file in app/{feature}.tsx
[ ] 6. Add motion/animation in components/motion/
[ ] 7. Add reusable components in components/{domain|ui|forms}/
[ ] 8. Wire into navigation (BottomNav.tsx or AdminNav.tsx if needed)
[ ] 9. Add to _layout.tsx guard if auth-gated
[ ] 10. Update Documentation/ if changing architecture
```

### 15.3 Route Migration Guide

To migrate from flat routing to grouped routing (like BasoBas):

```diff
// Current (flat):
app/
  student-home.tsx
  tutor-home.tsx
  map-search.tsx

// Future (grouped):
app/
+ (student)/
+   (tabs)/
+     _layout.tsx    ← Tabs + BottomNav
+     index.tsx      ← student-home
+     map-search.tsx
+     profile.tsx
+ (tutor)/
+   (tabs)/
+     _layout.tsx    ← Tabs + BottomNav
+     index.tsx      ← tutor-home
+     profile.tsx
+     batches.tsx
+ (admin)/
+   (tabs)/
+     _layout.tsx    ← Tabs + AdminNav
+     index.tsx      ← admin-home
+     verification-queue.tsx
+     user-management.tsx
```

---

## 16. Appendices

### A. EdumentX Key File Reference

| Path | Purpose | Lines ~ |
|------|---------|---------|
| `app/_layout.tsx` | Root layout + auth guard (5-step redirect) | 100+ |
| `screens/auth/EmailSignUp.tsx` | Auth entry: signup/login/Google | 300+ |
| `screens/auth/RoleSelection.tsx` | Role picker (student/tutor) | 150+ |
| `screens/auth/StudentProfileScreen.tsx` | Student profile setup form | 200+ |
| `screens/auth/TutorProfileScreen.tsx` | Tutor profile setup form | 200+ |
| `screens/student/StudentHome.tsx` | Student dashboard + tutor discovery | 250+ |
| `screens/tutor/tutor_home.tsx` | Tutor dashboard + metrics | 500+ |
| `screens/admin/AdminHome.tsx` | Admin landing + quick stats | 200+ |
| `screens/admin/VerificationQueue.tsx` | Tutor verification review | 200+ |
| `services/firebase/authService.ts` | Firebase Auth wrapper | 150+ |
| `lib/registration.ts` | Registration orchestrator | 100+ |
| `lib/tutor/firestoreTutorService.ts` | Tutor Firestore CRUD | 100+ |
| `constants/colors.ts` | Color tokens (>40) | 100+ |
| `constants/theme.ts` | Theme configuration | 100+ |
| `store/authStore.ts` | Zustand auth store | 40+ |

### B. BasoBas Key File Reference

| Path | Purpose | Lines ~ |
|------|---------|---------|
| `app/_layout.tsx` | Root layout + Clerk provider + font loading | 80+ |
| `app/(tenant)/(tabs)/_layout.tsx` | Tenant Tabs + FloatingDock | 30+ |
| `src/components/navigation/GlassDock/GlassDock.tsx` | Floating pill nav bar | 100+ |
| `src/components/navigation/GlassDock/components/DockTab.tsx` | Individual dock tab | 60+ |
| `src/components/navigation/FloatingDock.tsx` | Tabs adapter for GlassDock | 60+ |
| `src/components/property/PropertyCard.tsx` | Property card (3 variants) | 150+ |
| `src/components/property/FilterDrawer.tsx` | Filter bottom sheet | 200+ |
| `src/components/property/ScheduleVisitDrawer.tsx` | Schedule visit bottom sheet | 300+ |
| `src/components/property/RadiusMapView.tsx` | Map view with radius circle | 250+ |
| `src/components/layout/ScreenBody.tsx` | Screen layout primitives | 70+ |
| `src/components/shared/StatusPill.tsx` | Status badge (8 variants) | 70+ |
| `src/services/onboarding.service.ts` | Onboarding orchestration service | 100+ |
| `src/services/profile.service.ts` | Profile CRUD service | 100+ |
| `src/store/propertyStore.ts` | Property data + filters store | 250+ |
| `src/theme/tokens.ts` | Design tokens (colors, fonts, spacing) | 50+ |
| `docs/*.md` | Product documentation (16 files) | 2000+ total |

### C. Dependency Inventory

#### EdumentX Core Dependencies

```json
{
  "@react-native-firebase/app": "^24.1.1",
  "@react-native-firebase/auth": "^24.1.1",
  "@react-native-firebase/firestore": "^24.1.1",
  "@react-native-google-signin/google-signin": "^13.1.0",
  "@supabase/supabase-js": "^2.108.2",
  "@expo/vector-icons": "^15.0.3",
  "nativewind": "^4.2.5",
  "expo-router": "~6.0.24",
  "react-native-reanimated": "~4.1.1",
  "react-native-gesture-handler": "~2.28.0",
  "zustand": "^5.0.14",
  "@react-three/fiber": "^9.2.5",
  "three": "^0.176.0",
  "expo-gl": "~15.0.10",
  "expo-video": "~3.0.16",
  "react-native-maps": "1.20.1"
}
```

#### BasoBas Core Dependencies

```json
{
  "@clerk/expo": "^3.6.5",
  "@gorhom/bottom-sheet": "^5.2.14",
  "@supabase/supabase-js": "^2.108.2",
  "@expo-google-fonts/dm-sans": "^0.4.2",
  "@expo-google-fonts/dm-serif-display": "^0.4.2",
  "lucide-react-native": "^1.18.0",
  "nativewind": "latest",
  "expo-router": "~6.0.24",
  "react-native-reanimated": "~4.1.1",
  "react-native-gesture-handler": "~2.28.0",
  "zustand": "^4.5.5",
  "react-hook-form": "^7.55.0",
  "zod": "^4.4.3",
  "expo-blur": "~15.0.8",
  "expo-haptics": "~15.0.8",
  "react-native-maps": "1.20.1",
  "react-native-svg": "15.12.1",
  "react-native-country-picker-modal": "^2.0.0"
}
```

### D. File Count Comparison

| Category | EdumentX | BasoBas |
|----------|----------|---------|
| Route files | 23 | 48 (~planned) |
| Screen components | 24 | 40+ |
| UI components | 7 | 4 |
| Form components | 9 | 4 |
| Motion components | 8 | 0 (dedicated) |
| Navigation components | 3 | 5 (GlassDock suite) |
| Layout components | 2 | 3 |
| Premium/illustration | 6 | 0 |
| Domain components | 1 | 7 |
| Service modules | 4 | 4 |
| Library modules | 10+ | 3 |
| State stores | 1 | 4 |
| Configuration files | 10+ | 10+ |
| Documentation files | ~40 | ~20 |
| **Total (approx)** | **~150 files** | **~150 files** |

### E. Terms & Semantics Mapping

| EdumentX Concept | BasoBas Equivalent | Notes |
|-----------------|-------------------|-------|
| Student | Tenant | Service consumer |
| Tutor | Landlord | Service provider |
| Subject | Facility/Amenity | Categorization tags |
| Monthly rate (NPR) | Monthly rent (NPR) | Pricing field |
| Grade (e.g., Grade 9) | Room type (e.g., 2BHK) | Categorical filter |
| Enrollment request | Visit request | Request lifecycle |
| Verification status | KYC status | State machine |
| Batch | Listing group | Collection |
| Session (class) | Visit | Scheduled event |
| Admin | Super Admin (Supabase) | Platform management |
| Profile (subcollection) | Profile (table row) | User data model |
| TutorCard | PropertyCard | Domain card component |

---

> **Document generated:** July 26, 2026
> **Context sources:** EdumentX codebase (all screens, components, services, config) + BasoBas reference app (app/, src/, docs/)
> **Author:** Buffy (EdumentX Strategic Coding Assistant)
