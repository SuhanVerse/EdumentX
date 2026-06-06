# EdumentX — Master Project Guide

> **Purpose**: This is the single source of truth for the EdumentX project — a **location-based home tutor marketplace** built with React Native (Expo) + Firebase. It contains the complete project overview, every screen's exact layout, design tokens, architecture, and a concrete roadmap for improvements.
>
> **Generated**: June 5, 2026  
> **Project Phase**: Early Development — Authentication & Onboarding UI complete, Firebase backend pending  
> **Verified Against**: Actual codebase (`screens/`, `app/`, `constants/`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Project Architecture](#3-project-architecture)
4. [Design System (Exact Tokens)](#4-design-system-exact-tokens)
5. [User Flow & Navigation](#5-user-flow--navigation)
6. [Complete Screen-by-Screen Reference](#6-complete-screen-by-screen-reference)
7. [Firebase Architecture](#7-firebase-architecture)
8. [Implementation Status](#8-implementation-status)
9. [🎯 How This Project Can Be Improved (Actionable)](#9-how-this-project-can-be-improved-actionable)
10. [Workflow & Architecture Improvements](#10-workflow--architecture-improvements)
11. [Performance & Reliability](#11-performance--reliability)
12. [Testing & Quality](#12-testing--quality)
13. [DevOps & Release Pipeline](#13-devops--release-pipeline)
14. [Quick-Reference for AI Tools](#14-quick-reference-for-ai-tools)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### What is EdumentX?

**EdumentX** is a **location-based tutor finding mobile app** that connects **Students/Parents** with **verified home Tutors** nearby. The product differentiates itself from generic e-learning platforms with:

- 🗺️ **Map-based tutor discovery** (location-first)
- ✅ **Trust system** — "Blue Tick Pro" document-verified tutors
- 🤖 **AI-powered matching** — natural-language tutor recommendations
- 🏠 **In-person home tutoring** focus (not online classes)
- 🇳🇵 **Initial market**: Nepal (NPR) — but architecture is internationally extensible

### Current Scope

| Status | Component |
|--------|-----------|
| ✅ Complete | Onboarding & Authentication UI flow (7 screens) |
| ✅ Complete | Design system & token layer |
| ✅ Complete | Firestore & Storage security rules (pre-implementation) |
| ⏳ Pending | Firebase Auth integration |
| ⏳ Pending | Firestore data persistence |
| ⏳ Pending | Dashboard screens (Student & Tutor) |
| ⏳ Pending | Map-based discovery |
| ⏳ Pending | AI tutor matching |
| ⏳ Pending | Tutor verification flow |
| ⏳ Pending | Reusable component library |
| ⏳ Pending | Global state management |

---

## 2. Technology Stack

### Core Framework

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Expo SDK | 54.0.33 |
| Language | TypeScript (strict) | 5.9.2 |
| UI Framework | React | 19.1.0 |
| Mobile Runtime | React Native | 0.81.5 |
| Navigation | Expo Router (file-based) | 6.0.23 |
| Icons | @expo/vector-icons (Ionicons) | 15.0.3 |
| Backend | Firebase (Auth, Firestore, Storage) | TBD |
| Maps | Google Maps | API key required |
| State Management | Local `useState` (no global store yet) | — |
| Styling | `StyleSheet.create` | — |

### Experimental Features Enabled (`app.json`)

```json
{
  "newArchEnabled": true,        // React Native New Architecture (Fabric + TurboModules)
  "typedRoutes": true,           // Strongly-typed route parameters
  "reactCompiler": true,         // React 19's automatic memoization
  "userInterfaceStyle": "automatic",  // Honors system light/dark (UI is light-only currently)
  "edgeToEdgeEnabled": true,     // Android edge-to-edge
  "predictiveBackGestureEnabled": false
}
```

### Environment Variables Required (`.env.example`)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_APP_ENV=development
```

### NPM Scripts

```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

### Missing Critical Dependencies (Recommended)

| Package | Purpose | Priority |
|---------|---------|----------|
| `firebase` | Firebase JS SDK | 🔴 Critical |
| `zustand` or `@tanstack/react-query` | Global state / server cache | 🔴 Critical |
| `react-hook-form` + `zod` | Forms & validation | 🔴 Critical |
| `react-native-reanimated` v3+ | High-perf animations & gestures | 🟡 High |
| `expo-location` | Geolocation for map features | 🔴 Critical |
| `react-native-maps` | Map view component | 🔴 Critical |
| `expo-image` | Optimized image component (replaces `Image`) | 🟡 High |
| `expo-haptics` | Tactile feedback | 🟢 Medium |
| `react-native-mmkv` | Fast key-value storage | 🟡 High |
| `@shopify/flash-list` | Performant lists (vs FlatList) | 🟡 High |
| `expo-localization` | Locale detection (country picker) | 🟡 High |
| `expo-notifications` | Push notifications | 🟢 Medium |
| `expo-device` | Device info | 🟢 Low |
| `expo-application` | Bundle id detection | 🟢 Low |

---

## 3. Project Architecture

### Directory Structure (Current)

```
EdumentX/
├── app/                            # Expo Router v6 — thin route wrappers
│   ├── _layout.tsx                 # Root: GestureHandler → SafeArea → Stack
│   ├── index.tsx                   # "/" → SplashScreen + 1800ms auto-nav
│   ├── onboarding.tsx              # /onboarding
│   ├── phone-entry.tsx             # /phone-entry (signup/login toggle)
│   ├── otpverify.tsx               # /otpverify
│   ├── create_password.tsx         # /create_password
│   ├── role-selection.tsx          # /role-selection
│   └── profile.tsx                 # /profile
│
├── screens/                        # Full UI + business logic
│   ├── auth/
│   │   ├── PhoneEntryScreen.tsx    # 385 lines
│   │   ├── OtpVerify.tsx           # 397 lines
│   │   ├── Password.tsx            # 357 lines
│   │   ├── RoleSelection.tsx       # 323 lines
│   │   └── ProfileScreen.tsx       # 458 lines
│   └── onboarding/
│       ├── SplashScreen.tsx        # 98 lines
│       └── OnboardingScreen.tsx    # 195 lines
│
├── components/                     # ❌ EMPTY — needs extraction
│   └── forms/                      # ❌ EMPTY
│
├── constants/                      # Design tokens
│   ├── theme.ts                    # ★ MASTER (5220 bytes)
│   ├── colors.ts                   # Re-exports subset
│   ├── typography.ts               # Re-exports + minor overrides
│   └── spacing.ts                  # Re-exports (with remapping!)
│
├── services/                       # ❌ EMPTY — Firebase services pending
│   └── firebase/
│
├── firebase/
│   ├── firestore.rules             # Default-deny + users/{uid}
│   ├── storage.rules               # Default-deny + users/{uid}/
│   └── indexes.json                # Empty
│
├── Documentation/
├── app.json
├── package.json
├── tsconfig.json                   # Path alias: @/* → ./*
├── firebase.json
├── .env.example
└── README.md
```

### Architectural Pattern (Current vs Recommended)

```
┌─────────────────────────────────────────────────────────┐
│  CURRENT (Flat)                RECOMMENDED (Layered)    │
├─────────────────────────────────────────────────────────┤
│  app/                          app/                     │
│     ↓                              ↓                   │
│  screens/                       screens/                │
│     │                              ↓                   │
│     └── (logic + UI inline)      components/ ←──┐       │
│                                    ↓           │       │
│  constants/                     hooks/ ───────┤       │
│                                    ↓          │       │
│  (no services)                   services/ ───┤       │
│                                    ↓          │       │
│                                 store/ ───────┘       │
│                                    ↓                  │
│  constants/                    constants/             │
│  firebase/ (rules only)        firebase/              │
└─────────────────────────────────────────────────────────┘
```

### Root Layout (`app/_layout.tsx`)

```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="phone-entry" />
      <Stack.Screen name="otpverify" />
      <Stack.Screen name="create_password" />
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="profile" />
    </Stack>
    <StatusBar style="dark" />
  </SafeAreaProvider>
</GestureHandlerRootView>
```

### Path Aliases (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

All imports use `@/`: `import { colors } from '@/constants/colors'`.

---

## 4. Design System (Exact Tokens)

> The single source of truth is `constants/theme.ts`. Other files re-export subsets.

### 4.1 Color Palette

#### Brand Colors

| Token | Hex | Description | Use Cases |
|-------|-----|-------------|-----------|
| `brand.primary` | `#0F172A` | **Night Slate** | Primary buttons, headings |
| `brand.primaryDark` | `#020617` | Darker variant | — |
| `brand.primaryLight` | `#F1F5F9` | **Sand** | Light backgrounds, icon circles |
| `brand.accent` | `#B45309` | **Polished Copper** | CTA accent (Profile "Finish" button) |
| `brand.verification` | `#059669` | **Forest Emerald** | Verified tutor badges |
| `brand.verificationDark` | `#065F46` | Dark emerald | — |
| `brand.verificationLight` | `#ECFDF5` | Light emerald tint | Icon boxes, success tints |
| `brand.ai` | `#4F46E5` | **Indigo** | AI feature accent |
| `brand.aiDark` | `#312E81` | Dark indigo | — |
| `brand.aiLight` | `#EEF2FF` | Light indigo tint | Onboarding slide 2 background |
| `brand.aiBorder` | `#C7D2FE` | AI border accent | — |
| `brand.splash` | `#0F172A` | Splash background | Same as primary |
| `brand.splashText` | `#F1F5F9` | Splash text color | — |
| `brand.splashTrack` | `rgba(241, 245, 249, 0.12)` | Progress bar track | — |
| `brand.primaryBorder` | `#E2E8F0` | Primary border color | — |

#### Semantic Colors

| Token | Color | Text | Background | Subtle | Border |
|-------|-------|------|------------|--------|--------|
| `success` | `#059669` | `#064E3B` | `#DCFCE7` | — | — |
| `warning` | `#D97706` | `#92400E` | `#FEF3C7` | `#FFFBEB` | — |
| `danger` | `#DC2626` | `#7F1D1D` | `#FEE2E2` | `#FEF2F2` | `#FECACA` |
| `info` | `#0F172A` | — | `#F1F5F9` | — | — |

#### Background / Text / Border Tokens

| Category | Token | Value |
|----------|-------|-------|
| **Background** | `background.page` | `#F1F5F9` (Sand — used by Role Selection) |
| | `background.adminPage` | `#F8FAFC` |
| | `background.surface` | `#FFFFFF` (Cards, inputs) |
| | `background.disabled` | `#F1F5F9` |
| **Text** | `text.primary` | `#0F172A` (Night — headings) |
| | `text.secondary` | `#475569` (Slate — body) |
| | `text.tertiary` | `#1E293B` |
| | `text.muted` | `#94A3B8` (Placeholders) |
| | `text.disabled` | `#CBD5E1` |
| | `text.inverse` | `#FFFFFF` |
| | `text.link` | `#B45309` (Copper) |
| **Border** | `border.default` | `#E2E8F0` |
| | `border.strong` | `#94A3B8` |
| | `border.subtle` | `rgba(15, 23, 42, 0.04)` |
| | `border.card` | `rgba(15, 23, 42, 0.06)` |

#### Onboarding-Specific

| Token | Hex | Slide |
|-------|-----|-------|
| `onboarding.mapBackground` | `#F1F5F9` | Slide 1 (Map/Location) |
| `onboarding.aiBackground` | `#EEF2FF` | Slide 2 (AI Match) |
| `onboarding.verifyBackground` | `#ECFDF5` | Slide 3 (Verified Tutors) |

### 4.2 Typography Scale

| Token | Size (px) | Line Height (px) | Weight | Notes |
|-------|-----------|------------------|--------|-------|
| `brandTitle` | 30 | 36 | 500 | — |
| `heroTitle` | 28 | 34 | 500 | Screen titles |
| `screenTitle` | 22 | 29 | 500 | — |
| `sectionTitle` | 15 | 22 | 500 | — |
| `cardTitle` | 14 | 20 | 500 | — |
| `body` (theme) | 13 | 20 | 400 | — |
| `body` (typography.ts override) | **14** | 20 | 400 | ← **This is what's used** |
| `onboardingBody` | 15 | 24 | 400 | Custom for onboarding subtitles |
| `bodySmall` | 12 | 18 | 400 | — |
| `caption` (theme) | 11 | 15 | 400 | — |
| `caption` (typography.ts override) | **12** | 18 | 400 | ← **This is what's used** |
| `micro` | 10 | 13 | 500 | — |
| `overline` | 11 | 15 | 500 | letterSpacing 0.6, UPPERCASE |
| `button` | 14 | 20 | 500 | — |
| `buttonSmall` | 13 | 18 | 500 | — |
| `sessionCode` | 32 | 32 | 500 | letterSpacing 5 |

> **⚠️ Override notice**: The exported `typography.body` (14px) and `typography.caption` (12px) are **larger** than what's defined in the master `theme.ts`. Always use the exported values.

### 4.3 Spacing Scale

| Theme Token | Value (px) | Exported As |
|-------------|-----------|-------------|
| `xxs` | 2 | — |
| `xs` | 4 | `spacing.xs` |
| `s` | 6 | — |
| `sm` | 8 | `spacing.sm` |
| `md` | 10 | — |
| `lg` | 12 | `spacing.md` ⚠️ remapped |
| `xl` | 14 | — |
| `page` | 16 | `spacing.page` |
| `section` | 18 | — |
| `screen` | 20 | `spacing.lg` ⚠️ remapped |
| `xxl` | 22 | — |
| `xxxl` | 24 | `spacing.xl` ⚠️ remapped |
| `huge` | 32 | `spacing.xxl` ⚠️ remapped |

> **⚠️ Footgun**: The spacing alias names don't match their pixel values. E.g., `spacing.md` = 12px (not 10px). **Always verify** the actual value before using.

### 4.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radii.xs` | 6 | Small elements |
| `radii.sm` | 8 | Chips, small cards |
| `radii.md` | 10 | Inputs, buttons |
| `radii.card` | 12 | Cards, primary buttons |
| `radii.lg` | 14 | Role cards, large buttons |
| `radii.hero` | 18 | Hero sections |
| `radii.circle` | 999 | Circles, pills |

### 4.5 Component Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `sizes.touchTarget` | 44 | Min tap target |
| `sizes.inputHeight` | 48 | Standard input |
| `sizes.inputHeightLarge` | 52 | Large input |
| `sizes.primaryButtonHeight` | 52 | Primary CTA |
| `sizes.compactButtonHeight` | 40 | Compact button |
| `sizes.bottomNavHeight` | 64 | Bottom nav bar |
| `sizes.avatarSmall` | 40 | Small avatar |
| `sizes.avatarCard` | 60 | Card-size avatar |
| `sizes.otpBoxWidth` | 44 | OTP digit width |
| `sizes.otpBoxHeight` | 52 | OTP digit height |

### 4.6 Component Presets

```ts
theme.components = {
  card:          { bg: '#FFFFFF', border: '#E5E7EB', radius: 12, padding: 16, borderWidth: hairline },
  input:         { bg: '#FFFFFF', border: '#E5E7EB', radius: 10, minHeight: 48, paddingH: 12, borderWidth: hairline },
  primaryButton: { bg: '#0F172A', radius: 12, minHeight: 52 },
  secondaryButton:{ bg: '#F1F5F9', radius: 10, minHeight: 44 },
  segmentedRail: { bg: '#F1F5F9', radius: 999, padding: 4 },
}
```

### 4.7 Badge System

| Badge | Background | Text |
|-------|-----------|------|
| `active`, `verified`, `approved` | `#DCFCE7` | `#059669` |
| `pending` | `#FEF3C7` | `#D97706` |
| `past` | `#F1F5F9` | `#475569` |
| `info` | `#F1F5F9` | `#0F172A` |
| `suspended`, `rejected` | `#FEE2E2` | `#DC2626` |

---

## 5. User Flow & Navigation

### Complete Authentication Flow

```
┌──────────────┐
│ App Launch   │
└──────┬───────┘
       ↓
┌──────────────────┐
│ SplashScreen (/) │  Dark bg, 1800ms progress bar
└──────┬───────────┘  router.replace after timer
       ↓
┌──────────────────────┐
│ Onboarding           │  3 slides: Map → AI → Verified
│ /onboarding          │  Tap "Skip" or "Get started"
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ PhoneEntry           │  Sign Up / Log In tabs
│ /phone-entry         │  [NP +977] + phone input
└──────┬───────────────┘
       ↓ (signup only)
┌──────────────────────┐
│ OtpVerify            │  6-digit boxes, 60s resend
│ /otpverify           │  phone passed via params
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ CreatePassword       │  Strength meter (length only)
│ /create_password     │  Confirm field
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ RoleSelection        │  Sand bg, "Step 3 of 4"
│ /role-selection      │  Student/Parent or Tutor
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ ProfileSetup         │  Dark header + sand body
│ /profile             │  Avatar, name, email, grade, subject
└──────┬───────────────┘
       ↓
   [Dashboard]  ⏳ Not yet implemented
```

### Route-to-Screen Mapping

| Route | Component | Status |
|-------|-----------|--------|
| `/` | `SplashScreen` (via `app/index.tsx`) | ✅ |
| `/onboarding` | `OnboardingScreen` | ✅ |
| `/phone-entry` | `PhoneEntryScreen` | ✅ |
| `/otpverify` | `OtpVerify` | ✅ |
| `/create_password` | `CreatePassword` (Password.tsx) | ✅ |
| `/role-selection` | `RoleSelectionScreen` | ✅ |
| `/profile` | `ProfileScreen` | ✅ |
| `/student/dashboard` | — | ⏳ TODO |
| `/tutor/dashboard` | — | ⏳ TODO |
| `/discover` (map) | — | ⏳ TODO |
| `/tutor/:id` | — | ⏳ TODO |
| `/chat/:id` | — | ⏳ TODO |

### Navigation Patterns

| Action | Method |
|--------|--------|
| Splash → Onboarding | `router.replace('/onboarding')` after 1800ms |
| Onboarding → Phone | `router.replace('/phone-entry')` |
| Phone → OTP | `router.push({ pathname: '/otpverify', params: { phone } })` |
| OTP → Password | `router.push('/create_password')` |
| Password → Role | `router.replace('/role-selection')` |
| Role → Profile | `router.push('/profile')` |
| Back buttons | `router.replace` (not `back()`) for stable flow |

---

## 6. Complete Screen-by-Screen Reference

### 6.1 Splash Screen

**Files**: `app/index.tsx` + `screens/onboarding/SplashScreen.tsx` (98 lines)  
**Route**: `/`

```
┌──────────────────────────────────┐
│       (Dark Night Slate bg)      │
│                                  │
│          ┌──────────┐            │
│          │    E     │  64×64     │
│          │  (white  │  radius:16 │
│          │   box)   │            │
│          └──────────┘            │
│                                  │
│         EdumentX                 │
│   Find your perfect tutor        │
│          nearby                  │
│                                  │
│     [═══════════════]            │
│       (104×4px progress)         │
│                                  │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#0F172A` (solid) |
| StatusBar | `light` (white icons) |
| Logo box | 64×64px, white, `borderRadius: 16` |
| Logo letter "E" | 30px, weight 600, `#0F172A` |
| Title "EdumentX" | 34px, weight 500, white, lineHeight 40 |
| Subtitle | 16px, `#F1F5F9`, lineHeight 22 |
| Progress bar | 104×4px, track `rgba(241,245,249,0.12)`, fill `#FFFFFF` |
| Animation | `Animated.timing` 0→100% over 1200ms |
| Auto-nav | `setTimeout(1800ms)` in `app/index.tsx` |

**Note**: The progress bar always animates to 100% then auto-navigates. Could feel more "honest" if it tied to actual app initialization.

---

### 6.2 Onboarding Screen

**File**: `screens/onboarding/OnboardingScreen.tsx` (195 lines)  
**Route**: `/onboarding`

```
┌──────────────────────────────────┐
│  (White surface)         [Skip]  │
│                                  │
│  ┌──────────────────────────┐    │
│  │   (Tinted panel, ~280h)  │    │
│  │                          │    │
│  │      ┌──────────┐        │    │
│  │      │  [Icon]  │ 120px  │    │
│  │      │   58px   │ circle │    │
│  │      └──────────┘        │    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  Discover tutors on the map      │
│  See verified home tutors...     │
│                                  │
│         ● ○ ○                    │
│                                  │
│  ┌──────────────────────────┐    │
│  │       Next / Get started │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**Slide Data (3 slides — exact):**

| # | Title | Subtitle | BG | Accent | Icon |
|---|-------|----------|----|----|------|
| 1 | "Discover tutors on the map" | "See verified home tutors in your neighborhood - sorted by distance, subject, and rating." | `#F1F5F9` | `#0F172A` | `location-outline` |
| 2 | "Ask AI for the best match" | "Tell our AI assistant what you need to learn. It recommends the right tutor in seconds." | `#EEF2FF` | `#4F46E5` | `sparkles-outline` |
| 3 | "Verified, trusted tutors" | "Every Blue Tick Pro tutor is document-verified by our team. Your safety, our priority." | `#ECFDF5` | `#059669` | `shield-checkmark-outline` |

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` (surface) |
| Illustration panel | Rounded 20px, height = `min(280, max(220, width × 0.72))` |
| Icon circle | 120×120px, white bg, 58px icon |
| Title | `heroTitle` (28/500), `#0F172A` |
| Subtitle | `onboardingBody` (15/24), `#475569` |
| Skip button | Top-right, 44px min-height, hitSlop 12 |
| Dots | Active: 24×8 pill `#0F172A`; Inactive: 8×8 circle `#94A3B8` |
| Primary button | 52px, radius 12, `#0F172A` bg |
| Navigation | State-based (tap-only, no swipe) |

---

### 6.3 Phone Entry Screen

**File**: `screens/auth/PhoneEntryScreen.tsx` (385 lines)  
**Route**: `/phone-entry`

```
┌──────────────────────────────────┐
│  (White surface)                 │
│  [← Back]                        │
│                                  │
│  Create your account             │
│  (or "Welcome back" in login)    │
│                                  │
│  ┌──────────┬──────────┐         │
│  │ Sign up  │  Log in  │         │
│  └──────────┴──────────┘         │
│                                  │
│  PHONE NUMBER                    │
│  ┌────────┐ ┌──────────────┐     │
│  │NP+977 ▾│ │ 97XXXXXXXX   │     │
│  └────────┘ └──────────────┘     │
│  (helper text)                   │
│                                  │
│  [Password - login only]         │
│  [Forgot password? - login only] │
│                                  │
│  ┌──────────────────────────┐    │
│  │     Send OTP / Log in    │    │
│  └──────────────────────────┘    │
│                                  │
│  By continuing, you agree to     │
│  EdumentX's Terms and Privacy.   │
└──────────────────────────────────┘
```

**Dual Mode (Sign Up / Log In):**

| Mode | Fields | CTA | Action |
|------|--------|-----|--------|
| Sign Up | Phone only | "Send OTP" | `router.push('/otpverify', { phone })` |
| Log In | Phone + Password + Forgot | "Log in" | `Alert` (Firebase not yet connected) |

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Title | `heroTitle` 28/500 |
| Segmented control | `#F1F5F9` rail, `#FFFFFF` active, radius 8-10 |
| Country box | 92×52px, displays "NP +977 ▾" (hardcoded!) |
| Phone input | 52px, radius 10, 16px font, maxLength 10 |
| Validation | Phone must be exactly 10 digits (digits-only) |
| Password | Login only, 52px, eye toggle, ≥6 chars |
| Forgot link | `caption` style, right-aligned, `#0F172A` |
| Primary button | 52px, radius 12, `#0F172A` / disabled `#94A3B8` |
| Disabled text | `#94A3B8` |
| Terms | `caption` centered, `#94A3B8` |
| Back | `router.replace('/onboarding')` |

**State**:
```ts
const [mode, setMode] = useState<'signup' | 'login'>('signup');
const [phone, setPhone] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const canSubmit = isPhoneValid && isPasswordValid;
```

---

### 6.4 OTP Verification Screen

**File**: `screens/auth/OtpVerify.tsx` (397 lines)  
**Route**: `/otpverify`

```
┌──────────────────────────────────┐
│  (White surface)                 │
│  [← Back]                        │
│                                  │
│         ┌──────────┐             │
│         │  🛡️      │  64px       │
│         │  shield  │  circle     │
│         └──────────┘             │
│                                  │
│      Verify your number          │
│   Enter the 6 digit code sent   │
│   to +977 98XXXXXXXX.           │
│                                  │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
│  │  │ │  │ │  │ │  │ │  │ │  │  │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │
│                                  │
│  Resend in 00:45        Resend   │
│                                  │
│  ┌──────────────────────────┐    │
│  │       Verify OTP         │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Icon circle | 64px, `#F1F5F9`, `shield-checkmark-outline` 28px |
| Title | `heroTitle` centered |
| Subtitle | `body` 14px centered, max-width 288, embeds `displayPhone` in `typography.button` weight |
| Phone display | "**+977 {phone}**" via `useLocalSearchParams` |
| OTP length | 6 digits |
| OTP box | 44×52px, radius 10, 1px border, 20px font weight 500 |
| Empty state | Border `#E2E8F0`, bg white |
| Filled state | Border `#0F172A`, bg `#F1F5F9` |
| Auto-advance | `requestAnimationFrame` focus on next input |
| Paste | Distributes multi-digit paste across remaining slots |
| Backspace | If current empty, clears previous + focuses it |
| Resend timer | 60s countdown, `fontVariant: ['tabular-nums']` |
| Resend button | Disabled while timer > 0 (muted), enabled after (primary) |
| Verify button | Enabled when all 6 filled, `#0F172A` / disabled `#94A3B8` |
| Auto-complete | `autoComplete="sms-otp"`, `textContentType="oneTimeCode"` |
| On verify | `router.push('/create_password')` |
| Back | `router.replace('/phone-entry')` |

**Note**: There is a commented-out `<View style={styles.infoCard}>` — could be re-enabled to inform users that real SMS is coming.

---

### 6.5 Password Creation Screen

**File**: `screens/auth/Password.tsx` (357 lines)  
**Route**: `/create_password`

```
┌──────────────────────────────────┐
│  (White surface)                 │
│  [← Back]                        │
│                                  │
│         ┌──────────┐             │
│         │  🔒      │  64px       │
│         │  lock    │  circle     │
│         └──────────┘             │
│                                  │
│      Create a password           │
│   Choose a strong password to    │
│   secure your account.           │
│                                  │
│  Password                        │
│  ┌───────────────────────[👁]─┐  │
│  │ ••••••••                   │  │
│  └────────────────────────────┘  │
│  [═══════════] Fair              │
│                                  │
│  Confirm Password                │
│  ┌───────────────────────[👁]─┐  │
│  │ ••••••••                   │  │
│  └────────────────────────────┘  │
│  (Passwords do not match)       │
│                                  │
│  ┌──────────────────────────┐    │
│  │       Continue            │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**Password Strength Meter (length-based only):**

| Length | Label | Color | Bar Width |
|--------|-------|-------|-----------|
| 0 | (hidden) | transparent | 0% |
| < 6 | "Weak" | `#DC2626` (danger) | 33% |
| 6-9 | "Fair" | `#D97706` (warning) | 66% |
| ≥ 10 | "Strong" | `#059669` (success) | 100% |

> **Note**: Strength is based on length alone — does NOT check character variety.

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Icon circle | 64px `#F1F5F9`, `lock-closed-outline` |
| Title | `heroTitle` |
| Input height | 52px (`primaryButtonHeight`), radius 10, 1px border |
| Eye toggle | Ionicons `eye-outline` / `eye-off-outline`, 20px, hitSlop 8 |
| Strength bar | 4px tall track, animated width |
| Error state | "Passwords do not match" in `#DC2626`, input border turns danger color |
| Submit condition | `password.length >= 6 && password === confirmPassword` |
| On submit | `router.replace('/role-selection')` |
| Back | `router.back()` |

**There is a commented-out `infoCard`** in this screen too.

---

### 6.6 Role Selection Screen

**File**: `screens/auth/RoleSelection.tsx` (323 lines)  
**Route**: `/role-selection`

```
┌──────────────────────────────────┐
│  (#F1F5F9 Sand bg) ⚠️ different │
│  [← Back]                        │
│                                  │
│  STEP 3 OF 4                     │
│  How will you use EdumentX?      │
│  Select your role once during    │
│  signup. Admin approval is       │
│  required to change it later.    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ ┌────┐  Student / Parent │    │
│  │ │ 🎓 │  Find verified    │  ► │
│  │ └────┘  home tutors...   │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ ┌────┐  Tutor            │    │
│  │ │ 📖 │  List your        │  ► │
│  │ └────┘  teaching...      │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │       Continue            │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**Role Cards (2 roles only):**

| Role | Title | Subtitle | Icon | Icon Color | Icon Box BG |
|------|-------|----------|------|-----------|-------------|
| `student` | Student / Parent | "Find verified home tutors and manage enrollments." | `school-outline` | `#0F172A` | `#F1F5F9` |
| `tutor` | Tutor | "List your teaching services and receive enrollment requests." | `book-outline` | `#059669` | `#ECFDF5` |

| Property | Value |
|----------|-------|
| Background | `#F1F5F9` (Sand) — different from other screens! |
| Step label | `overline` "Step 3 of 4" |
| Card layout | horizontal: icon box (52×52) + text + chevron/checkmark |
| Card min-height | 92px, radius 14, hairline border `#E2E8F0` |
| Selected (Student) | 1px border `#0F172A` |
| Selected (Tutor) | 1px border `#059669` |
| Checkmark | 22px circle filled with role's icon color, white `checkmark` 14px |
| Continue button | 52px, radius 12, `#0F172A`, fixed footer |
| Back | `router.replace('/create_password')` |

---

### 6.7 Profile Setup Screen

**File**: `screens/auth/ProfileScreen.tsx` (458 lines)  
**Route**: `/profile`

```
┌──────────────────────────────────┐
│ ████ Dark header (#0F172A) █████│
│ █ [← Back]                     █│
│ █ Set up your profile          █│
│ █ This helps tutors understand █│
│ █ your learning needs.         █│
│ ████████████████████████████████│
│ ─────────────────────────────────│
│ (Sand #F1F5F9 below)            │
│                                  │
│       ┌──────────┐               │
│       │  Avatar  │ 96×96         │
│       │  Person  │ circle        │
│       └──────────┘               │
│       Upload photo               │
│                                  │
│  ┌──────────────────────────┐    │
│  │ FULL NAME                │    │
│  │ ┌──────────────────────┐ │    │
│  │ │ e.g., Aarav Tamang   │ │    │
│  │ └──────────────────────┘ │    │
│  │ EMAIL                    │    │
│  │ ┌──────────────────────┐ │    │
│  │ │ e.g., aarav@gmail    │ │    │
│  │ └──────────────────────┘ │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ GRADE / CLASS            │    │
│  │ [Grade 7] [Grade 8] ... │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ SUBJECT NEEDED           │    │
│  │ [Math] [Physics] [Chem] │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │    Finish setup          │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Header bg | `#0F172A` (dark) |
| Header title | "Set up your profile" 26px weight 500, white, `letterSpacing: -0.5` |
| Header subtitle | 14px white opacity 0.7 |
| Back | White text, opacity 0.8 |
| Content bg | `#F1F5F9` (sand) |
| Avatar | 96×96px, 4px white border, `#E2E8F0` placeholder |
| Image picker | `expo-image-picker`, 1:1, quality 0.8 |
| Form cards | White, radius 16, subtle shadow (opacity 0.05), 1px subtle border |
| Card label | `overline` style 11px UPPERCASE `#94A3B8` |
| Text input | 52px height, radius 12, 1.5px border, 15px font |
| Input error | Border `#DC2626`, error text in danger color |
| Grade chips | 8 options, single-select, wrap layout |
| Subject chips | 7 options, single-select, wrap layout |
| Chip | 40px min-height, radius 10, 1.5px border, gap 8px wrap |
| Chip selected | bg `#0F172A`, border `#0F172A`, text white |
| Finish button | **56px** height (taller!), radius 14, bg `#B45309` (Copper) |
| Finish button shadow | `shadowColor: #B45309`, `shadowOpacity: 0.2`, `elevation: 4` |
| Finish text | 16px weight 600 |
| Validation | Name ≥ 3 chars, email regex, grade + subject selected |
| On submit | `Alert` (Firebase pending) — **no navigation** |

**Subject Options**: `Math`, `Physics`, `Chemistry`, `Computer Science`, `Biology`, `Nepali`, `English`

**Grade Options**: `Grade 7`, `Grade 8`, `Grade 9`, `Grade 10`, `Grade XI (Science)`, `Grade XI (Management)`, `Grade XII (Science)`, `Grade XII (Management)`

---

## 7. Firebase Architecture

### 7.1 Configuration (`firebase.json`)

```json
{
  "firestore": { "rules": "firebase/firestore.rules", "indexes": "firebase/indexes.json" },
  "storage":  { "rules": "firebase/storage.rules" },
  "emulators": {
    "auth":     { "port": 9099 },
    "firestore":{ "port": 8080 },
    "storage":  { "port": 9199 },
    "ui":       { "enabled": true, "port": 4000 }
  }
}
```

### 7.2 Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    match /users/{userId} {
      allow create: if isOwner(userId) && request.resource.data.uid == userId;
      allow read:   if isOwner(userId);
      allow update: if isOwner(userId) && request.resource.data.uid == userId;
      allow delete: if false;  // Users cannot be deleted
    }

    match /{document=**} {
      allow read, write: if false;  // Default deny
    }
  }
}
```

### 7.3 Storage Security Rules

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isOwner(userId) { return request.auth != null && request.auth.uid == userId; }

    match /users/{userId}/{allPaths=**} {
      allow read, write: if isOwner(userId);
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 7.4 Issues with Current Rules

| Issue | Recommendation |
|-------|----------------|
| Users can only read **their own** profile | Tutor listings must be publicly readable. Add: `match /tutors/{tutorId} { allow read: if true; }` |
| Default-deny blocks all collections | Define explicit rules for `tutors`, `enrollments`, `reviews`, `messages` upfront |
| Storage scoped to `/users/{uid}/` only | Add `/tutors/{tid}/` for credentials, `/public/` for assets |
| No rate limiting | Add per-user rate limit comments for write operations |

---

## 8. Implementation Status

### ✅ Complete

| Feature | File(s) | Notes |
|---------|---------|-------|
| Splash + auto-nav | `SplashScreen.tsx`, `app/index.tsx` | 1.8s timer, progress bar |
| Onboarding (3 slides) | `OnboardingScreen.tsx` | Tap-only navigation |
| Phone entry (signup/login) | `PhoneEntryScreen.tsx` | Nepal-only hardcoded |
| OTP with auto-advance | `OtpVerify.tsx` | Mock verification, 60s resend |
| Password creation | `Password.tsx` | Length-based strength |
| Role selection (2 roles) | `RoleSelection.tsx` | Student/Parent & Tutor |
| Profile setup | `ProfileScreen.tsx` | Avatar + form + chips |
| Design system | `constants/theme.ts` | Single source of truth |
| Expo Router v6 nav | `app/*.tsx` | All routes wired |
| Firebase rules | `firebase/*.rules` | Pre-emptive security |
| TypeScript strict | `tsconfig.json` | Path aliases configured |

### ⏳ Not Implemented (Priority Order)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | Firebase Auth integration | 🔴 P0 | Phone OTP + password sign-in |
| 2 | Firestore user doc creation | 🔴 P0 | Persist profile data on signup |
| 3 | Role-based dashboards | 🔴 P0 | Post-auth landing screens |
| 4 | Map-based tutor discovery | 🔴 P0 | Google Maps integration |
| 5 | Country picker (Nepal only now) | 🟡 P1 | Auto-detect locale |
| 6 | Storage avatar upload | 🟡 P1 | Image picker wired, no upload |
| 7 | Component library | 🟡 P1 | Extract `PrimaryButton`, `FormInput`, etc. |
| 8 | Global state management | 🟡 P1 | Registration data lost between screens |
| 9 | Service layer | 🟡 P1 | All Firebase calls inline currently |
| 10 | AI tutor matching | 🟢 P2 | Onboarding mentions it |
| 11 | Tutor verification | 🟢 P2 | "Blue Tick Pro" flow |
| 12 | Push notifications | 🟢 P3 | Future |
| 13 | Dark mode | 🟢 P3 | UI is light-only |
| 14 | Internationalization | 🟢 P3 | English only, but Nepal market |

---

## 9. 🎯 How This Project Can Be Improved (Actionable)

This is the **most important section** — concrete, prioritized improvements.

### 9.1 Critical UX Issues (Fix First)

#### 🔴 1. Registration Data Is Lost Between Screens
**Problem**: Each screen uses `useState`. If the user refreshes or app crashes mid-flow, all data is lost. There's no central store for `{ phone, countryCode, password, role, profile }`.

**Fix**: Implement a registration context using Zustand or React Context:

```ts
// store/registration.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useRegistrationStore = create(
  persist(
    (set) => ({
      phone: '',
      countryCode: '+977',
      password: '',
      role: null as 'student' | 'tutor' | null,
      profile: { fullName: '', email: '', grade: null, subject: null, avatarUri: null },
      setPhone: (phone) => set({ phone }),
      setRole: (role) => set({ role }),
      setProfile: (profile) => set({ profile }),
      reset: () => set({ phone: '', password: '', role: null, profile: { /* reset */ } }),
    }),
    { name: 'edumentx-registration', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

#### 🔴 2. Hardcoded Nepal Country Code
**Problem**: Phone entry shows only "NP +977" — no country picker. This limits the app to a single market.

**Fix**: Add `expo-localization` to detect locale, and use `react-native-country-picker-modal` or build a custom picker with `expo-localization`'s `getLocales()`.

#### 🔴 3. No Loading/Error States
**Problem**: Buttons just navigate or show an `Alert`. No spinner, no network error handling, no skeleton screens.

**Fix**:
- Add a `LoadingOverlay` component with `ActivityIndicator`
- Implement error boundaries around screens
- Add a `useToast` hook for inline notifications
- Show skeleton screens during data fetches

#### 🔴 4. No Real Firebase Integration
**Problem**: All "submit" actions show `Alert.alert('Next phase', 'Firebase will be added in auth sprint.')`. The app is essentially a UI prototype.

**Fix**: Initialize Firebase in `services/firebase/config.ts`:
```ts
import { initializeApp } from 'firebase/app';
import { getAuth, getFirestore, getStorage } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  // ...
});

export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
export const storage = getStorage(app);
```

Then implement:
- `services/firebase/auth.ts` — `signUpWithPhone`, `verifyOtp`, `signInWithPassword`
- `services/firebase/firestore.ts` — `createUserProfile`, `getUserProfile`
- `services/firebase/storage.ts` — `uploadAvatar`

#### 🔴 5. Profile Submit Goes Nowhere
**Problem**: `ProfileScreen.handleSubmit` shows an Alert but doesn't navigate. The user is stuck.

**Fix**: After Firebase wiring, navigate to `/student/dashboard` or `/tutor/dashboard` based on selected role.

### 9.2 Visual & Design Improvements

#### 🟡 6. Onboarding Should Be Swipeable
**Problem**: Users can only tap. Modern mobile UX expects horizontal swipe.

**Fix**: Use `react-native-reanimated` + `react-native-gesture-handler`:
```tsx
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

const scrollX = useSharedValue(0);
const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } });

<Animated.ScrollView
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  onScroll={onScroll}
  scrollEventThrottle={16}>
  {slides.map(/* ... */)}
</Animated.ScrollView>
```

#### 🟡 7. Add a Step Indicator Across Auth Flow
**Problem**: Only "Step 3 of 4" appears on Role Selection. Users don't know how far they are.

**Fix**: Create a `<StepIndicator current={2} total={5} />` component and show it consistently on:
- Phone (1/5)
- OTP (2/5)
- Password (3/5)
- Role (4/5)
- Profile (5/5)

#### 🟡 8. Add Splash Animation Variety
**Problem**: The "E" logo is static.

**Fix**: Add a Lottie animation or `react-native-reanimated` entry:
- Scale + opacity entrance for the logo
- Pulse/breathe loop on the logo
- Particle effects in the background

#### 🟡 9. Micro-Interactions Are Missing
**Problem**: Buttons just toggle state — no tactile feedback.

**Fix**:
```tsx
<Pressable
  onPressIn={() => { scale.value = withTiming(0.97, { duration: 80 }); }}
  onPressOut={() => { scale.value = withSpring(1); }}
  style={animatedStyle}>
```

Add to:
- Primary buttons (scale + haptic)
- Role cards (lift + shadow on select)
- OTP boxes (bounce on digit entry)
- Chips (spring scale)
- Page transitions (shared element)

#### 🟡 10. Use Custom Fonts
**Problem**: System font is generic.

**Fix**: Load `Inter` (variable weight) or `Plus Jakarta Sans`:
```ts
// app/_layout.tsx
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();
// ...
const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
```

#### 🟡 11. Improve Password Strength
**Problem**: Length-based only. "password" gets "Fair".

**Fix**: Use `zxcvbn` (or a simplified heuristic):
```ts
function getStrength(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  // ... map to 0-4 score
}
```

Display a checklist with animated checkmarks (8+ chars, uppercase, number, special).

#### 🟡 12. Add Illustrations to Onboarding
**Problem**: The 120px icon circle in a 280px panel looks sparse.

**Fix**: Use Lottie animations or custom SVG illustrations with depth.

### 9.3 Accessibility (Often Forgotten)

#### 🟢 13. Add `accessibilityLabel` Consistently
**Problem**: Some buttons have labels, some don't.

**Fix**: Audit every `Pressable`:
- Icon-only buttons need `accessibilityLabel`
- Form inputs need `accessibilityLabel` and error announcements
- Use `accessibilityRole` consistently: `button`, `header`, `link`, `text`

#### 🟢 14. Support Dynamic Type
**Problem**: Font sizes are fixed.

**Fix**: Use `PixelRatio.getFontScale()` to scale or use `allowFontScaling` prop:
```tsx
<Text maxFontSizeMultiplier={1.3}>Title</Text>
```

#### 🟢 15. Color Contrast
**Problem**: `#475569` on white may not pass WCAG AA for small text.

**Fix**: Audit each text/background pair. Aim for 4.5:1 ratio for body text.

---

## 10. Workflow & Architecture Improvements

### 10.1 Component Library (Build First)

Extract reusable components from existing screens:

```
components/
├── primitives/
│   ├── PrimaryButton.tsx        # All "Send OTP", "Continue", "Verify" buttons
│   ├── SecondaryButton.tsx
│   ├── IconButton.tsx           # Eye toggle, back button
│   ├── TextField.tsx            # Wrapped TextInput with label, error, helper
│   ├── PasswordField.tsx        # TextField + eye toggle
│   ├── PhoneField.tsx           # Country box + phone input
│   ├── OtpInput.tsx             # 6-digit grid with auto-advance
│   ├── Chip.tsx                 # Grade/Subject selectable chip
│   ├── ChipGroup.tsx            # Multi-chip wrapper with state
│   ├── Card.tsx                 # White surface card with optional shadow
│   ├── Avatar.tsx               # Circle image or initials placeholder
│   ├── Badge.tsx                # Status pill (pending/verified/rejected)
│   └── ProgressBar.tsx
├── feedback/
│   ├── Toast.tsx                # Notification
│   ├── Alert.tsx                # Custom modal
│   ├── Skeleton.tsx             # Loading placeholder
│   └── EmptyState.tsx
├── layout/
│   ├── ScreenContainer.tsx      # SafeArea + ScrollView + KeyboardAvoid
│   ├── BackHeader.tsx           # Back button + optional title
│   └── StepIndicator.tsx        # "Step 3 of 4" pill
└── onboarding/
    ├── OnboardingSlide.tsx
    └── DotIndicator.tsx
```

### 10.2 Custom Hooks

```
hooks/
├── useAuth.ts                   # Current user, sign in/out
├── useRegistration.ts           # Registration flow data
├── useForm.ts                   # Generic form state + validation
├── useDebounce.ts
├── useDebouncedValue.ts
├── useOtpCountdown.ts           # Reusable timer
├── usePasswordStrength.ts
├── useCountryPicker.ts
└── useKeyboard.ts               # Keyboard show/hide state
```

### 10.3 Service Layer

```
services/
├── firebase/
│   ├── config.ts                # initializeApp
│   ├── auth.ts                  # signUpWithPhone, verifyOtp, signInWithPassword
│   ├── firestore.ts             # CRUD user profile, tutor docs
│   └── storage.ts               # uploadAvatar, uploadDocument
├── api/
│   ├── client.ts                # Base fetch wrapper
│   ├── ai.ts                    # AI tutor matching
│   └── maps.ts                  # Google Maps geocoding
├── validation/
│   ├── phone.ts                 # Country-aware phone validation
│   ├── password.ts              # Strength rules
│   └── email.ts
├── analytics/
│   └── events.ts                # PostHog / Firebase Analytics wrappers
└── types/
    ├── user.ts                  # User, UserProfile, TutorProfile
    ├── tutor.ts                 # Tutor, Subject, Grade
    └── common.ts
```

### 10.4 Global State (Zustand Recommended)

```
store/
├── authStore.ts                 # Current user, loading
├── registrationStore.ts         # Multi-step form data (persisted)
├── discoveryStore.ts            # Map filters, search query
└── chatStore.ts                 # Active conversations
```

### 10.5 Form Architecture (react-hook-form + zod)

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(3, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  grade: z.enum(GRADES),
  subject: z.enum(SUBJECTS),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(profileSchema),
});
```

Benefits:
- Less boilerplate
- Real-time validation
- TypeScript inference
- Easy to test

---

## 11. Performance & Reliability

### 11.1 Performance Wins

| Improvement | Implementation | Impact |
|-------------|---------------|--------|
| Replace `Image` with `expo-image` | Better caching, blur-up, formats | 🔴 High |
| Use `@shopify/flash-list` for tutor lists | 10x better than FlatList for long lists | 🔴 High |
| Memoize screen components | `React.memo`, `useMemo`, `useCallback` | 🟡 Medium |
| Lazy load screens | Expo Router supports lazy bundling per route | 🟡 Medium |
| Use `react-native-mmkv` instead of AsyncStorage | 30x faster, sync API | 🟡 Medium |
| Image optimization on upload | Resize to 256×256 for avatars, 1200px for banners | 🟡 Medium |
| Code splitting with dynamic imports | For AI service, maps, etc. | 🟢 Low |

### 11.2 Error Handling

- **Add ErrorBoundary** at screen level with fallback UI
- **Catch Firebase errors** with helper: `formatFirebaseError(code: string): string`
- **Network detection** with `@react-native-community/netinfo` — show offline banner
- **Retry logic** for transient failures (auth token refresh, image upload)

### 11.3 Security Hardening

| Concern | Recommendation |
|---------|---------------|
| `.env` committed | Verify `.gitignore` excludes it; add to pre-commit hook |
| API keys in client | Use Firebase App Check to prevent abuse |
| OTP brute force | Backend rate limiting (Cloud Function) |
| Open redirects | Sanitize deep links in `expo-linking` |
| Avatar uploads | Compress + strip EXIF client-side |

---

## 12. Testing & Quality

### 12.1 Test Stack (Recommended)

```
__tests__/
├── unit/
│   ├── validation/
│   │   ├── phone.test.ts
│   │   ├── password.test.ts
│   │   └── email.test.ts
│   ├── hooks/
│   │   ├── useRegistration.test.ts
│   │   └── usePasswordStrength.test.ts
│   └── services/
│       └── firebase/
├── component/
│   ├── PrimaryButton.test.tsx
│   ├── OtpInput.test.tsx
│   └── RoleCard.test.tsx
└── e2e/
    ├── auth-flow.e2e.ts        # Full signup → dashboard
    └── tutor-discovery.e2e.ts
```

### 12.2 Tools

- **Jest** + **React Testing Library** for unit/component
- **Maestro** for E2E (simpler than Detox for this scope)
- **Storybook** for visual component development
- **TypeScript** for type safety (already enabled)
- **ESLint** + **Prettier** (already enabled)

### 12.3 CI Integration (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.19.4' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:e2e
```

---

## 13. DevOps & Release Pipeline

### 13.1 Recommended Setup

| Concern | Tool |
|---------|------|
| Builds | EAS Build (`eas build --platform ios/android`) |
| OTA Updates | EAS Update (`eas update`) |
| Store submission | EAS Submit (`eas submit`) |
| Crash reporting | Sentry (`@sentry/react-native`) |
| Analytics | PostHog or Firebase Analytics |
| Feature flags | Unleash or Statsig |
| Secrets | EAS Secrets for `.env` values |
| Versioning | `appVersionSource: "remote"` in `app.json` |

### 13.2 Pre-release Checklist

- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Update version in `app.json`
- [ ] Test on iOS simulator + Android emulator
- [ ] Test on physical devices
- [ ] Generate release notes
- [ ] Tag the release in git

---

## 14. Quick-Reference for AI Tools

### One-Paragraph Context

```
EdumentX is a React Native (Expo SDK 54) tutor-finding mobile app using 
Firebase. Light theme "Night & Sand" palette: primary #0F172A (Night Slate), 
page bg #F1F5F9 (Sand), surface #FFFFFF, accent #B45309 (Copper). Currently 
has 7 auth/onboarding screens (Splash, Onboarding, Phone, OTP, Password, 
Role, Profile) but NO Firebase integration yet. 2 roles only: Student/Parent 
and Tutor. Design tokens live in constants/theme.ts (master) with re-exports 
in colors.ts, typography.ts, spacing.ts. Uses Expo Router v6 (file-based, 
typed routes), New Architecture enabled, React Compiler experimental. 
Ionicons for all icons (no emoji). Path alias @/* → ./*. Components/forms/ 
and services/firebase/ directories are empty. NPM scripts: start, android, 
ios, web, lint, typecheck.
```

### Key Technical Facts

```yaml
Framework:      Expo SDK 54, React 19.1, React Native 0.81.5
Language:       TypeScript 5.9 (strict)
Navigation:     Expo Router v6 (Stack, typed routes)
Backend:        Firebase (Auth, Firestore, Storage) — not connected
State:          Local useState (no global store)
Styling:        StyleSheet.create, no LinearGradient
Icons:          @expo/vector-icons (Ionicons)
Theme:          Light only
Platform:       iOS + Android, portrait, edge-to-edge Android
Path alias:     @/* → ./*
```

### Token Quick-Reference

```
Primary:     #0F172A (Night)        Accent:    #B45309 (Copper)
Verify:      #059669 (Emerald)      AI:        #4F46E5 (Indigo)
Page BG:     #F1F5F9 (Sand)         Surface:   #FFFFFF
Text:        #0F172A / #475569 / #94A3B8
Border:      #E2E8F0 / #94A3B8
Semantic:    success #059669, warning #D97706, danger #DC2626

Typography:  hero=28/500, screen=22/500, body=14/400, button=14/500
Spacing:     xs=4, sm=8, page=16, screen=20, xxxl=24, huge=32
Radius:      sm=8, md=10, card=12, lg=14, hero=18, circle=999
Button:      height 52px, radius 12
Input:       height 52px, radius 10-12
```

### Common Screen Pattern (Template)

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { theme } from '@/constants/theme';
import { typography } from '@/constants/typography';

export function ScreenName() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.surface }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Pressable hitSlop={12} onPress={() => router.replace('/prev')}>
            <Ionicons name="chevron-back" size={18} color={colors.brand.primary} />
            <Text style={{ ...typography.body, color: colors.brand.primary }}>Back</Text>
          </Pressable>
          {/* Content */}
          <Pressable style={{ minHeight: 52, borderRadius: 12, backgroundColor: colors.brand.primary }}>
            <Text style={{ ...typography.button, color: colors.text.inverse }}>Continue</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

---

## 15. Appendix

### Appendix A: Full File Inventory

```
app/_layout.tsx                          24 lines   Root Stack
app/index.tsx                            20 lines   Entry + splash timer
app/onboarding.tsx                       ~5 lines   Route wrapper
app/phone-entry.tsx                      ~5 lines
app/otpverify.tsx                        ~5 lines
app/create_password.tsx                  ~5 lines
app/role-selection.tsx                   ~5 lines
app/profile.tsx                          ~5 lines

screens/onboarding/SplashScreen.tsx      98 lines
screens/onboarding/OnboardingScreen.tsx  195 lines
screens/auth/PhoneEntryScreen.tsx        385 lines
screens/auth/OtpVerify.tsx               397 lines
screens/auth/Password.tsx                357 lines
screens/auth/RoleSelection.tsx           323 lines
screens/auth/ProfileScreen.tsx           458 lines

constants/theme.ts                       248 lines  ★ Master
constants/colors.ts                      39 lines
constants/typography.ts                  27 lines
constants/spacing.ts                     12 lines

firebase/firestore.rules                 ~20 lines
firebase/storage.rules                   ~15 lines
firebase/indexes.json                    empty {}

Total source lines (screens + app + constants): ~2300
```

### Appendix B: Existing Documentation Reference

| Document | Purpose |
|----------|---------|
| `Documentation/COMPREHENSIVE_PROJECT_ANALYSIS.md` | Previous comprehensive analysis (June 2026) |
| `Documentation/PROJECT_SUMMARY.md` | High-level project overview |
| `Documentation/PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md` | Directory structure and workflows |
| `Documentation/FEATURE_IMPLEMENTATION_GUIDE.md` | Step-by-step implementation |
| `Documentation/INITIAL_PROJECT_SETUP.md` | Initial Expo + Firebase setup |
| `Documentation/PROJECT_SETUP.md` | Developer setup and environment |
| `Documentation/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md` | Common issues/fixes |
| `Documentation/design-context/EdumentX-Design-Extraction.md` | Extracted design tokens |
| `Documentation/Prompts/EDUMENTX_DESIGN_PROMPTS.md` | Design generation prompts |
| `Documentation/Prompts/MASTER_FIGMA_PROMPT_GUIDE.md` | Master Figma guide |
| `Documentation/Prompts/PROFESSIONAL_REDESIGN_STRATEGY.md` | Redesign strategy |
| `Documentation/Prompts/FIREBASE_SETUP_DETAILS.md` | Firebase config details |

### Appendix C: Improvement Priority Matrix

| Priority | Improvement | Effort | Impact |
|----------|------------|--------|--------|
| 🔴 P0 | Wire up Firebase Auth + Firestore | 2-3 days | Critical |
| 🔴 P0 | Build Student/Tutor dashboards | 3-5 days | Critical |
| 🔴 P0 | Map-based tutor discovery | 5-7 days | Critical |
| 🔴 P0 | Registration data persistence (Zustand) | 0.5 day | Critical |
| 🟡 P1 | Extract component library (PrimaryButton, etc.) | 1-2 days | High |
| 🟡 P1 | Country picker + auto-detect | 1 day | High |
| 🟡 P1 | Onboarding swipe gestures | 0.5 day | High |
| 🟡 P1 | Add step indicator across auth flow | 0.5 day | High |
| 🟡 P1 | Replace `Image` with `expo-image` | 0.5 day | Medium |
| 🟡 P1 | Add loading + error states everywhere | 1 day | High |
| 🟡 P1 | Use react-hook-form + zod for forms | 1 day | High |
| 🟡 P1 | Add custom fonts (Inter) | 0.5 day | Medium |
| 🟢 P2 | AI tutor matching | 1-2 weeks | Future |
| 🟢 P2 | Tutor verification (Blue Tick) | 1 week | Future |
| 🟢 P2 | Push notifications | 1-2 days | Future |
| 🟢 P3 | Dark mode | 2-3 days | Future |
| 🟢 P3 | Internationalization (Nepali) | 1 week | Future |
| 🟢 P3 | Storybook for components | 1 day | Future |

### Appendix D: Suggested Milestone Roadmap

| Sprint | Duration | Goals |
|--------|----------|-------|
| **Sprint 1: Auth Foundation** | 1 week | Firebase Auth, registration store, persist data, country picker |
| **Sprint 2: Component Library** | 1 week | Extract `PrimaryButton`, `FormInput`, `OTPInput`, `RoleCard`, `Chip` |
| **Sprint 3: Dashboards** | 2 weeks | Student/Tutor dashboards with role-based routing, navigation tabs |
| **Sprint 4: Map & Discovery** | 2 weeks | Google Maps, tutor list, filters, tutor detail screen |
| **Sprint 5: Enrollments & Chat** | 2 weeks | Request flow, in-app messaging, notifications |
| **Sprint 6: Polish & Beta** | 1 week | Onboarding polish, animations, accessibility audit, EAS build |
| **Sprint 7: Verification & Trust** | 1 week | Tutor document upload, admin verification flow |
| **Sprint 8: AI Matching** | 2 weeks | AI-powered recommendations, prompt engineering |
| **Sprint 9: Launch Prep** | 1 week | App Store assets, store listing, ASO, beta testing |

---

*This document was generated by analyzing the actual codebase as of June 5, 2026. Update it whenever significant features are added or design tokens change.*
