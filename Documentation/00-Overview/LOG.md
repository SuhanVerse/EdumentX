# EdumentX — Project Documentation

> A condensed look at what EdumentX is, how it's being built, and why the team made the calls it did.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Development Phases](#3-development-phases)
4. [Architecture & Folder Structure](#4-architecture--folder-structure)
5. [The Styling System: Tamagui → NativeWind](#5-the-styling-system-tamagui--nativewind)
6. [Core Features](#6-core-features)
7. [Screens & Components](#7-screens--components)
8. [State Management & Data](#8-state-management--data)
9. [Authentication, Roles & Routing](#9-authentication-roles--routing)
10. [Current Status & Roadmap](#10-current-status--roadmap)

---

## 1. Project Overview

EdumentX is a location-based home-tutor marketplace built for the Nepal market (NPR). It connects students and parents with verified home tutors nearby, using Expo SDK 54, React Native 0.81, and strict TypeScript, styled with NativeWind + Tailwind CSS and backed by Firebase Auth and Firestore through the native `@react-native-firebase` SDK.

A few things set it apart from a typical e-learning app:

- **Map-first discovery** rather than search-first
- A **"Blue Tick Pro" trust system** for tutors who've gone through document verification
- **AI-powered, natural-language tutor matching** on the roadmap
- A focus on **in-person tutoring** — this isn't a livestream-classroom app

Inside the app, users pick one of two roles at sign-up: **Student/Parent** or **Tutor**, each leading to its own profile flow. A third role, **Admin**, exists but isn't part of the regular sign-up — it's granted out-of-band through a seed script.

The flow itself is simple: sign up with a phone number or Google, pick a role, fill out a profile. Students land on a dashboard meant to surface nearby tutors; tutors land on one for managing sessions and requests. Both dashboards currently run on mock data while the real Firestore queries are built out.

---

## 2. Technology Stack

The stack stays deliberately small — one styling system, one state library, and a tight Expo toolchain.

| Layer      | Technology                                                           |
| ---------- | -------------------------------------------------------------------- |
| Runtime    | Expo SDK 54, React Native 0.81 (Fabric + TurboModules)               |
| Language   | TypeScript 5.9, strict mode                                          |
| Navigation | Expo Router v6, file-based routing, typed routes                     |
| Styling    | NativeWind 4.2 + Tailwind CSS 3.4                                    |
| State      | Zustand 5 (global); a temporary shim for the multi-step signup draft |
| Backend    | `@react-native-firebase` — Auth (Phone OTP + Google) and Firestore   |
| Planned    | Firebase Storage; Google Maps SDK for tutor discovery                |

**Worth flagging:** Firebase config isn't read from environment variables at runtime. The native RNFirebase SDK pulls its keys from `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) at build time instead, so `.env` is mostly there for tooling — aside from a couple of values, the emulator flag and the Maps API key, that do get read at runtime.

---

## 3. Development Phases

The project has worked through five completed phases so far, and is partway through a sixth.

### Phase 0 — Project Bootstrap

The repo started as a standard Expo Router scaffold, with Firebase project files added early on. Security rules for Firestore and Storage were written before any app code actually touched the database — security came first here, not as an afterthought. Shared type definitions and the role-based folder structure (`admin`, `common`, `forms`, `map`, `student`, `tutor`) were also established at this stage.

### Phase 1 — Onboarding + Authentication UI

Contributor documentation was created early to standardize development practices and environment setup. The first screens went up in order: splash, onboarding, phone entry (with the `+977` country code baked in), OTP verification, password creation, and role selection. There was also an early generic profile screen, later replaced by separate student and tutor versions. The initial design system (color, spacing, typography constants) was established during this phase too.

### Phase 1.5 — NativeWind Migration

Then came a pivot. The team tried Tamagui first, then backed out and rebuilt the whole styling layer on NativeWind 4.2 + Tailwind 3.4 instead. `tailwind.config.js` became the single source of truth for design tokens, and the palette was tightened up to hit WCAG AA contrast on its key colors. All production screens and shared components were re-styled using NativeWind utility classes, and the project's internal guidelines were updated with an explicit rule against reintroducing Tamagui. See [§5](#5-the-styling-system-tamagui--nativewind) for the full story.

### Phase 2 — Babel Fix + RNFirebase Pivot

Authentication moved from the Firebase JS SDK to the native `@react-native-firebase` SDK. The JS SDK needs an invisible reCAPTCHA running inside a webview — a workaround that adds a network round trip to every SMS send. RNFirebase skips that entirely, verifying the device natively through Google Play Integrity on Android and APNs on iOS.

### Phase 3 — Firebase Auth + Role-Routed Dashboards (in progress)

Phone OTP and Google sign-in are wired end to end now. The root layout enforces an auth-state redirect guard, and role selection writes straight to each user's Firestore document. Both dashboards render their full intended UI against mock data — the remaining Firestore queries are next sprint's work, not an open question.

---

## 4. Architecture & Folder Structure

EdumentX follows a layered, feature-based structure. Routes in `app/` are thin wrappers pointing to the real screen implementations in `screens/`. Shared UI lives in `components/`. Business logic that isn't tied to one screen sits in `services/` — today that's just the Firebase auth wrapper. Global state lives in a single Zustand store, and design tokens live in `constants/`, mirrored from the canonical `tailwind.config.js`. Security rules get their own `firebase/` folder, kept separate from app code.

Splitting `app/` from `screens/` keeps the routing layer easy to scan — each route file is just a short re-export — while screen implementations can be organized however fits the feature best. Inside `screens/`, things are grouped by area: `onboarding/`, `auth/`, `student/`, and `tutor/`.

Most of the codebase follows this layering fairly closely. The one documented exception is the root layout and the role-selection screen, which import Firebase directly instead of going through a service module. It's an intentional, thin seam for now, and the plan is to close it once the Firestore service layer exists.

A small set of other folders round out the structure:

- `store/` — Zustand state management
- `lib/` — shared business logic (e.g. the registration draft shared between phone and Google sign-up flows)
- `types/` — shared TypeScript definitions
- `hooks/` — reusable React hooks

A separate `Documentation/` folder works as the project's second brain — a canonical master guide, the sprint-by-sprint roadmap, Firebase operations notes, the auth plan and its audit, reusable AI prompts, and a reference web app kept purely for UX inspiration. None of it touches the TypeScript build or the Metro bundler.

---

## 5. The Styling System: Tamagui → NativeWind

This is probably the single biggest engineering call in the project so far — worth walking through what was tried, why it got rejected, and what replaced it.

### 5.1 Tamagui

Tamagui is a typed, compile-time CSS-in-JS framework for React Native and web. It provided a structured theme system and reusable component model, but introduced build complexity and abstractions that turned out to be unnecessary for the project's requirements. The team generated its config and migrated the form and illustration components over to Tamagui primitives, while studying a reference UX project on the side.

### 5.2 NativeWind + Tailwind CSS

NativeWind is essentially Tailwind for React Native — it compiles familiar utility classes into native style objects, with every design token sitting in one Tailwind config file. Screens kept using standard React Native components rather than switching to a custom component model. Developers style screens using utility classes for layout, spacing, typography, colors, and component sizing, reducing the need for separate stylesheet files while keeping styling predictable and maintainable.

### 5.3 Why NativeWind Won

NativeWind pulls colors, spacing, typography, radii, and sizing into one config file, getting rid of the duplicate sources of truth Tamagui had introduced. Because it works directly with standard RN components, nothing about accessibility props or platform behavior changes. The dependency list is much smaller too — five production packages cover the whole styling and animation surface, no extra build tooling required. To stop history from repeating itself, the project's internal guidelines now explicitly rule out bringing Tamagui back, and all Tamagui-related configuration has been removed from the codebase.

There's one exception: SVG illustrations can't read class-based styles, so they pull literal hex values from a small, purpose-built constants file instead — the only place in the codebase outside the Tailwind config where raw color values are allowed.

### The "Night & Sand" Palette

| Token        | Hex       | Used for                                                    |
| ------------ | --------- | ----------------------------------------------------------- |
| Night        | `#0F172A` | Brand primary — CTAs, headings                              |
| Amber        | `#B45309` | Brand accent — highlighted actions, links                   |
| Sand         | `#F1F5F9` | Page background                                             |
| Verification | `#047857` | "Verified Professional" badge, success states               |
| AI (indigo)  | `#4F46E5` | Reserved exclusively for AI features, to avoid "AI washing" |

---

## 6. Core Features

### 6.1 Authentication

Phone is the primary sign-in method for the Nepal market, with Google as a backup option; email/password is off for end users in v1. The phone flow sends an OTP through RNFirebase's native verification, confirms the code, then moves to password creation — a screen that's still part of the UI flow but doesn't actually save the password yet, since the plan is to drop it in favor of phone-only auth. Google sign-in commits the user right away and sends them to role selection.

### 6.2 Role Selection & Profile Setup

Picking a role happens on a simple two-card screen — Student/Parent or Tutor — and the choice gets written straight to Firestore. Both profile flows share avatar, name/email, and location fields; the tutor version adds subjects, grade levels, years of experience, and an hourly rate in NPR. Profile data is held in memory for now rather than saved to Firestore — that write is scoped for the current sprint.

### 6.3 Dashboards

Both dashboards are UI-complete and running on mock data, with the Firestore reads they still need clearly flagged, so the next sprint is mostly data plumbing rather than design work. The student dashboard surfaces nearby and verified tutors with a few quick-action tiles for features that aren't live yet. The tutor dashboard adds an availability toggle, performance metrics, and an inbox for enrollment requests with accept/decline actions.

### 6.4 Splash & Onboarding

A branded splash screen leads into a three-slide onboarding carousel — map-based discovery, AI matching, and tutor verification — each slide on its own tinted illustration panel.

---

## 7. Screens & Components

Ten routes make up the app right now, all built on NativeWind and Expo Router's typed routes.

| Screen          | Route              | Status                                     |
| --------------- | ------------------ | ------------------------------------------ |
| Splash          | `/`                | Stub timer, no logic                       |
| Onboarding      | `/onboarding`      | Functional                                 |
| Phone Entry     | `/phone-entry`     | Functional OTP + Google; login tab stubbed |
| OTP Verify      | `/otpverify`       | Functional                                 |
| Create Password | `/create_password` | UI-only, no persistence                    |
| Role Selection  | `/role-selection`  | Functional — writes to Firestore           |
| Student Profile | `/profile-student` | Functional — in-memory draft only          |
| Tutor Profile   | `/profile-tutor`   | Functional — in-memory draft only          |
| Student Home    | `/student-home`    | UI complete, mock data                     |
| Tutor Dashboard | `/tutor-home`      | UI complete, mock data                     |

A handful of shared components get reused across the profile and onboarding screens:

| Component                                    | Role                                             |
| -------------------------------------------- | ------------------------------------------------ |
| Avatar Uploader                              | Round avatar picker                              |
| Chip Group                                   | Selectable chip-style options (subjects, grades) |
| Location Field                               | Location input with map-pin affordance           |
| Name & Email Fields                          | Stacked name and email inputs                    |
| Discover / AI Match / Verified Illustrations | Onboarding slide artwork (1–3)                   |

---

## 8. State Management & Data

There's one Zustand store, `authStore`, holding the signed-in user, their role, a loading flag, and the in-flight OTP confirmation object. The role is stored as the same lowercase string that gets written to Firestore, so nothing needs translating between client and database. A `reset()` action is documented in the team's internal notes but hasn't actually been built yet — signing out today takes three separate calls instead of one.

The multi-step signup draft — phone number, password, role, profile fields — lives in a lightweight in-memory store rather than Zustand, kept deliberately out of persistent storage so a password never touches disk. It's shaped to match the Zustand store that will eventually take its place.

Firestore has one collection actually in use right now: `users/{uid}`, holding identity fields, role, and timestamps. The data model already anticipates several collections the app will need soon — role-specific profiles, public tutor listings, enrollment and batch requests, sessions, reviews, messaging threads — though none of them exist yet. Security rules default-deny everything, with `/users/{userId}` scoped to owner-only access.

---

## 9. Authentication, Roles & Routing

Routing runs on Expo Router's flat stack — no nested route groups yet. A redirect guard in the root layout checks on every render: signed-out users are kept to the onboarding and sign-up screens; signed-in users without a role get sent to role selection; signed-in users with a role get routed to their profile or dashboard. The guard always renders the full navigation stack and overlays a loading spinner rather than swapping out screen trees, which sidesteps a class of remount errors Expo Router would otherwise throw.

There's also a planned, not-yet-wired admin path that will check a password against a salted hash in a dedicated `admins` collection instead of using Firebase Auth at all — the only place email/password is meant to show up in v1.

---

## 10. Current Status & Roadmap

### What Works

| Capability                    | Status                                    |
| ----------------------------- | ----------------------------------------- |
| Onboarding + auth screens (7) | Complete, NativeWind-styled               |
| Student & tutor profile setup | Complete (UI); Firestore write pending    |
| Student & tutor dashboards    | UI complete; backed by mock data          |
| Phone OTP + Google sign-in    | Wired end to end                          |
| Role selection → Firestore    | Wired end to end                          |
| Auth-state redirect guard     | Wired in the root layout                  |
| Design-token system           | Single source of truth in Tailwind config |
| Security rules                | Default-deny, written ahead of schedule   |

The dashboards still lean on mock data behind a few clearly marked TODOs, and three small loose ends — a superseded generic profile screen, a password screen that doesn't do anything yet, and the missing store `reset()` action — are flagged for cleanup rather than buried.

### Roadmap

- **Phase C** — finish wiring Firestore for profiles and dashboards, add validation, and verify the three end-to-end sign-in paths (next up, 1–2 weeks)
- **Phase D** — map-based tutor discovery, in-app chat, and enrollments (2–3 weeks)
- **Phase E** — admin console and the Blue Tick Pro verification flow (1 week)
- **Phase F** — pull out a shared component library and move the signup draft into a real Zustand store (1 week)
- **Phase G** — polish: accessibility audit, gesture-based onboarding, haptics, and the EAS build pipeline (1 week)
- **Phase H** — AI-powered tutor matching (2 weeks)
- **Phase I** — app store launch prep (1 week)
- **Stretch** — dark mode, Nepali localization, push notifications, analytics

---
