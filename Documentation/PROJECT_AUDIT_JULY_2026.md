# EdumentX — Project Audit & Current State

> **Document version:** 2.0  
> **Date:** July 24, 2026  
> **Audience:** Developers, project evaluators, AI assistants  
> **Purpose:** Complete audit of the current project state — what's built, what's pending, architecture decisions, security model, and a verified inventory of every screen, service, and component.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Inventory](#2-project-inventory)
3. [Authentication System](#3-authentication-system)
4. [Firestore Data Model](#4-firestore-data-model)
5. [Screen-by-Screen Audit](#5-screen-by-screen-audit)
6. [Service Layer](#6-service-layer)
7. [Component Library](#7-component-library)
8. [Design System](#8-design-system)
9. [Motion System](#9-motion-system)
10. [Security Model](#10-security-model)
11. [Zero-Budget Architecture Validation](#11-zero-budget-architecture-validation)
12. [Phase Completion Audit](#12-phase-completion-audit)
13. [Known Issues & Technical Debt](#13-known-issues--technical-debt)
14. [Recommended Next Steps](#14-recommended-next-steps)

---

## 1. Executive Summary

### What is EdumentX?

EdumentX is a **location-based home tutoring marketplace** for Kathmandu Valley, Nepal. It connects **students/parents** with **document-verified home tutors** through a React Native (Expo SDK 54) mobile application. The app features:

- **Map-based tutor discovery** (Phase 5.2 — OpenStreetMap tiles pending install)
- **Document verification pipeline** with admin review queue (Complete)
- **AI assistant** for tutor matching (Chat UI complete, RAG backend pending in Phase 7.1)
- **Three-role system**: Student, Tutor, Admin
- **Zero-budget architecture**: Firebase Auth + Firestore (Spark plan) + Supabase Storage (free tier)

### Current Phase Status

| Phase | Feature | Status | Date |
|-------|---------|--------|------|
| 1.5 | NativeWind Design System | ✅ Complete | June 8 |
| 2 | Native Firebase Auth (Email/Password + Google) | ✅ Complete | June 21 |
| 3 | Onboarding 3D + Reanimated 4 Splash | ✅ Complete | June 27 |
| 3a | Micro-interactions Motion System | ✅ Complete | July 2026 |
| 3b | Tutor Verification Queue (Admin) | ✅ Complete | July 2026 |
| 4a | Student Dashboard + Sub-screens | ✅ Complete | July 2026 |
| 4b | Tutor Dashboard + Sub-screens | ✅ Complete | July 2026 |
| 4c | Admin Dashboard + Sub-screens | ✅ Complete | July 2026 |
| 4d | Supabase Storage Integration | ✅ Mostly Complete | July 2026 |
| 5.1 | Real Tutor Discovery (Firestore) | ✅ Complete | July 2026 |
| 5.2 | OpenStreetMap Tiles | ⏳ Pending | — |
| 5.3 | Nominatim Geocoding | ⏳ Pending | — |
| 5.4 | Client-side KNN Ranking | ⏳ Pending | — |
| 7.1 | Groq/HuggingFace RAG Chatbot | ⏳ Pending | — |
| 7.2 | Payment (eSewa) Integration | ⏳ Pending | — |
| 7.3 | Real-time Messaging | ⏳ Pending | — |

### Key Metrics

- **Total screens**: 23 (across 5 role groups: auth, onboarding, student, tutor, admin, shared)
- **Total components**: 40+ (UI primitives, forms, motion, illustrations, premium, domain, shared)
- **Service modules**: 7 (auth, Firestore, Supabase client, Supabase storage, errors + supporting lib)
- **Router routes**: 23 file-based routes in `app/`
- **Firestore collections**: 6 root collections (`users`, `tutorVerifications`, `tutorProfileUpdates`, `tutors`, `admins`, `notifications`) + profile subcollections under `users/{uid}/`
- **External services**: Firebase Auth (Spark), Firestore (Spark), Supabase Storage (free)
- **Dependencies**: ~40 direct dependencies, all MIT/open-source, zero paid services

---

## 2. Project Inventory

### 2.1 Directory Structure

```
EdumentX/
├── app/                           # 23 route files (Expo Router)
│   ├── _layout.tsx               # Root: auth guard + navigation
│   ├── index.tsx                  # Splash → onboarding redirect
│   ├── onboarding.tsx            # Onboarding carousel
│   ├── email-signup.tsx          # Auth: email/password + Google
│   ├── role-selection.tsx        # Role picker
│   ├── profile-student.tsx       # Student profile setup
│   ├── profile-tutor.tsx         # Tutor profile setup
│   ├── student-home.tsx          # Student dashboard
│   ├── tutor-home.tsx            # Tutor dashboard
│   ├── admin-home.tsx            # Admin dashboard
│   ├── map-search.tsx            # Map search (placeholder)
│   ├── AI-chat.tsx               # AI assistant (UI only)
│   ├── enrollment.tsx            # My Enrollments (mock data)
│   ├── stu-profile.tsx           # Student profile tab
│   ├── tutor-inbox.tsx           # Tutor enrollment inbox
│   ├── batches.tsx               # Tutor batch management
│   ├── tutor_edit_profile.tsx    # Tutor profile edit
│   ├── tutor_edit_teaching_details.tsx  # High-risk field edit
│   ├── tutor-pending.tsx         # Under-review screen
│   ├── notification.tsx          # Notification center
│   ├── filters-sheet.tsx         # Map search filters
│   ├── platform-statistics.tsx   # Admin analytics
│   ├── verification-queue.tsx    # Admin verification queue
│   ├── user-management.tsx       # Admin user management
│   ├── admin-profile.tsx         # Admin profile setup
│   └── tutor/[id].tsx            # Tutor detail page
│
├── screens/                       # 24 screen components
│   ├── auth/                     # 4 screens
│   │   ├── EmailSignUp.tsx
│   │   ├── RoleSelection.tsx
│   │   ├── StudentProfileScreen.tsx
│   │   └── TutorProfileScreen.tsx
│   ├── onboarding/               # 2 screens
│   │   ├── SplashScreen.tsx
│   │   └── OnboardingScreen.tsx
│   ├── student/                  # 6 screens
│   │   ├── StudentHome.tsx
│   │   ├── MapSearch.tsx
│   │   ├── AIChat.tsx
│   │   ├── Enrollment.tsx
│   │   ├── StudentProfile.tsx
│   │   └── FiltersSheet.tsx
│   ├── tutor/                    # 6 screens
│   │   ├── tutor_home.tsx
│   │   ├── tutor_inbox.tsx
│   │   ├── edit_profile.tsx
│   │   ├── EditTeachingDetails.tsx
│   │   ├── PendingReview.tsx
│   │   └── batch_creation.tsx
│   ├── admin/                    # 5 screens
│   │   ├── AdminHome.tsx
│   │   ├── AdminProfile.tsx
│   │   ├── PlatformStatistics.tsx
│   │   ├── UserManagement.tsx
│   │   └── VerificationQueue.tsx
│   └── shared/                   # 1 screen
│       └── Notification.tsx
│
├── components/                    # 40+ reusable components
│   ├── ui/                       # 7 primitives
│   ├── forms/                    # 10 form components
│   ├── motion/                   # 8 motion/hooks files
│   ├── illustrations/            # 5 SVG/3D illustrations
│   ├── premium/                  # 2 premium 3D components
│   ├── domain/                   # 1 domain component (TutorCard)
│   └── shared/                   # 4 shared layout components
│
├── services/                      # 5 service modules
│   ├── firebase/
│   │   ├── authService.ts
│   │   └── errors.ts
│   └── supabase/
│       ├── client.ts
│       └── storage.ts
│
├── store/
│   └── authStore.ts               # Zustand auth store
│
├── lib/                           # 8 library modules
│   ├── registration.ts
│   ├── motion.ts
│   ├── validation.ts
│   ├── mock/tutors.ts
│   ├── verification/
│   │   ├── discovery.ts
│   │   ├── documents.ts
│   │   ├── editableFields.ts
│   │   └── notifications.ts
│   └── tutor/
│       ├── types.ts
│       ├── firestoreTutorService.ts
│       ├── seedProfile.ts
│       ├── backfillTutors.ts
│       └── cleanupTutors.ts
│
├── constants/
│   ├── colors.ts                  # Hex colors (illustrations only)
│   └── theme.ts                   # Legacy theme tokens
│
├── firebase/
│   ├── firestore.rules            # Production security rules
│   ├── firestore.indexes.json
│   └── storage.rules              # Unused (Supabase handles storage)
│
├── data/
│   ├── adminStats.ts              # Mock admin statistics
│   └── mockData.ts                # Mock enrollment/batch data
│
├── types/
│   └── onboarding.ts              # Onboarding type definitions
│
├── scripts/
│   └── seedAdmin.ts               # Admin seeding script (Admin SDK)
│
├── Documentation/                  # 60+ documentation files
│
└── Configuration files:
    ├── package.json               # ~40 direct dependencies
    ├── app.json                   # Expo SDK 54 configuration
    ├── tsconfig.json              # TypeScript strict
    ├── babel.config.js            # NativeWind + worklets
    ├── metro.config.js            # Custom resolver for css-interop
    ├── tailwind.config.js         # Design tokens (source of truth)
    ├── global.css                 # Tailwind directives
    └── .env.example               # Required env vars
```

### 2.2 Files Removed Since Phase 2

The following screens and components were removed during the Clerk pivot reversion (June 21, 2026):

| File | Reason |
|------|--------|
| `screens/auth/PhoneEntryScreen.tsx` | Phone OTP removed (requires Blaze plan) |
| `screens/auth/OtpVerify.tsx` | Phone OTP removed |
| `screens/auth/Password.tsx` | Replaced by EmailSignUp's inline password |
| `app/phone-entry.tsx` | Route removed |
| `app/otpverify.tsx` | Route removed |
| `app/create_password.tsx` | Route removed |
| `components/ClerkFirebaseBridge.tsx` | Clerk integration reverted |

---

## 3. Authentication System

### 3.1 Methods

| Method | Status | Implementation | Email Verification Required | Spark Plan |
|--------|--------|---------------|---------------------------|------------|
| **Email + Password** | ✅ Live | `createUserWithEmailAndPassword` → `sendEmailVerification` → `auth.currentUser.reload()` | ✅ Yes | ✅ Free |
| **Google Sign-In** | ✅ Live | `GoogleSignin.signIn()` → `signInWithCredential(googleCredential)` | ❌ Auto-verified by Google | ✅ Free |
| **Phone OTP** | ❌ Removed | Requires Firebase Blaze plan (paid) | N/A | ❌ Requires card |

### 3.2 Auth Flow

```
App Launch → SplashScreen (1.8s)
  → Onboarding (3 slides)
    → EmailSignUp (email/password form OR Google button)
      → [if signup]: sendEmailVerification → "Check your inbox" pending panel
        → User clicks email link → taps "I've verified — continue"
          → auth.currentUser.reload() pulls fresh claim
      → [if login]: signInWithEmailAndPassword → check emailVerified
        → If not verified → same "Check your inbox" panel
    → RoleSelection (pick Student or Tutor)
      → StudentProfileScreen or TutorProfileScreen
        → writeBatch writes user doc + profile subcollection + verification doc
    → Matching dashboard (StudentHome / TutorHome / AdminHome)
```

### 3.3 Routing Guard (`app/_layout.tsx`)

The routing guard runs a 5-step decision tree on every render where `user`/`role`/`segments` change, with a **150ms debounce** to prevent overlapping `router.replace()` calls:

1. Wait for root navigator to mount (`useRootNavigationState()`)
2. `!user` → `/email-signup`
3. `user + !emailVerified (password provider)` → `/email-signup` (pending panel)
4. `user + verified + !role` → `/role-selection`
5. `user + verified + role` → matching dashboard (`/student-home`, `/tutor-home`, `/admin-home`)

**Edge cases handled:**
- **Amnesia Login Loop**: Role read inside `onAuthStateChanged` callback, written to store *before* redirect runs
- **Admin override**: `admins/{uid}` doc check overrides `users/{uid}.role` on every auth state change
- **Tutor verification gating**: When `tutorVerificationStatus === "pending"`, routes to `/tutor-pending` instead of dashboard
- **First-time admin**: New admin with no `adminProfile` doc is routed to `/admin-profile` for setup
- **Legacy role normalization**: Maps display labels (`"Tutor"`, `"Student / Parent"`) → canonical enum
- **Doc healing**: Auto-fixes missing `uid` field or stale role values on `users/{uid}`

### 3.4 Auth State Management (Zustand)

```typescript
interface AuthState {
  user: FirebaseAuthTypes.User | null;
  role: 'student' | 'tutor' | 'admin' | null;
  hasAdminProfile: boolean;
  hasExistingRole: boolean;
  tutorVerificationStatus: 'pending' | 'approved' | 'rejected' | 'more_info' | null;
  isLoading: boolean;
  // + setters and reset()
}
```

---

## 4. Firestore Data Model

### 4.1 Collections Layout

```
Root collections:
├── users/{uid}                        # User metadata (uid, email, role, displayName, status, timestamps)
│   ├── studentProfile/default         # Student profile fields
│   ├── tutorProfile/default           # Tutor profile fields (including verification status)
│   └── adminProfile/default           # Admin profile fields
│
├── tutorVerifications/{uid}           # Source of truth for verification pipeline
├── tutorProfileUpdates/{uid}          # Pending edit queue (high-risk field changes)
├── tutors/{uid}                       # Denormalized tutor directory (student discovery)
├── admins/{uid}                       # Admin grants (seed-only, no client creation)
└── notifications/{uid}/{autoId}       # Notification inbox (per-user subcollection)
```

### 4.2 Document Schemas

**`users/{uid}`**:
```typescript
{
  uid: string;          // == Firebase Auth UID
  email: string | null;
  displayName: string | null;
  username: string | null;
  role: 'student' | 'tutor' | 'admin' | null;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`users/{uid}/tutorProfile/default`**:
```typescript
{
  fullName: string;
  email: string;
  username: string;
  phone: string;
  headline: string;
  bio: string;
  subjects: string[];
  gradesTeaching: string[];
  yearsExperience: number;
  monthlyRateNpr: number;
  location: { neighborhood: string; city: string };
  photoUrl: string | null;
  degree: string;
  institution: string;
  documents: TutorDocument[];        // { kind, path, bytes, name, uploadedAt }
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'more_info';
  isVerifiedProfessional: boolean;
  hasPendingUpdate: boolean;
  rejectionReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`tutorVerifications/{uid}`**:
```typescript
{
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  subjects: string[];
  gradesTeaching: string[];
  yearsExperience: number;
  monthlyRateNpr: number;
  location: { neighborhood: string; city: string };
  headline: string;
  bio: string;
  degree: string;
  institution: string;
  documents: TutorDocument[];
  photoUrl: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'more_info';
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 5. Screen-by-Screen Audit

### 5.1 Authentication Screens

| Screen | Route | Status | Key Features | Data Source | Live Data? |
|--------|-------|--------|-------------|-------------|------------|
| EmailSignUp | `/email-signup` | ✅ Complete | Signup/login toggle, Google Sign-In, password strength bar, pending verification panel | Firebase Auth | ✅ Yes |
| RoleSelection | `/role-selection` | ✅ Complete | Role cards (Student/Tutor), atomic writeBatch (metadata only, NOT role) | Firestore | ✅ Yes |
| StudentProfileScreen | `/profile-student` | ✅ Complete | Avatar upload, name/email/username/phone, grade/subject chips, location picker | Firestore + Supabase | ✅ Yes |
| TutorProfileScreen | `/profile-tutor` | ✅ Complete | Extended profile + 3 verification documents + avatar upload, atomic writeBatch | Firestore + Supabase | ✅ Yes |

### 5.2 Onboarding Screens

| Screen | Route | Status | Key Features |
|--------|-------|--------|-------------|
| SplashScreen | `/` | ✅ Complete | Reanimated 4 progress bar, 24-particle ambient field, 1.8s auto-nav |
| OnboardingScreen | `/onboarding` | ✅ Complete | 3-slide carousel with 3D illustrations (R3F), spring-snap pagination dots, Skip/Get started |

### 5.3 Student Screens

| Screen | Route | Status | Key Features | Live Data? |
|--------|-------|--------|-------------|------------|
| StudentHome | `/student-home` | ✅ Complete | Live profile greeting, search bar, live tutor listing from `tutors` collection, logout | ✅ Yes |
| MapSearch | `/map-search` | ✅ Complete | Search bar, filter button → FiltersSheet, OSM placeholder, skeleton hint cards | ❌ Placeholder |
| AIChat | `/AI-chat` | ✅ Complete | Chat UI with bubbles, quick chips, "Thinking..." indicator, naive keyword router | ❌ No RAG backend |
| Enrollment | `/enrollment` | ✅ Complete | 3 tabs (Active/Pending/Past), batch invitations, enrollment cards with subject chips | ❌ Mock data |
| StudentProfile | `/stu-profile` | ✅ Complete | Avatar upload, editable name/phone, read-only email, logout dialog, menu rows | ✅ Partial (Firestore read) |
| FiltersSheet | (inline Modal) | ✅ Complete | Subject/Level/Mode/Distance/Budget/Verification filters, custom range sliders, drag-to-dismiss | ❌ UI only |

### 5.4 Tutor Screens

| Screen | Route | Status | Key Features | Live Data? |
|--------|-------|--------|-------------|------------|
| TutorHome | `/tutor-home` | ✅ Complete | 2×2 metrics, capacity bar, profile completion, sessions, pending requests, availability toggle, ReviewBanner | ✅ Partial (profile live, metrics mock) |
| TutorInbox | `/tutor-inbox` | ✅ Complete | Pending enrollment request cards, expand/collapse, Accept/Decline/Counter-offer, map preview placeholder | ❌ Mock data |
| EditProfile | `/tutor_edit_profile` | ✅ Complete | Live-editable fields (name/headline/bio/photo), verification docs list, verification banners, resubmit flow | ✅ Partial |
| EditTeachingDetails | `/tutor_edit_teaching_details` | ✅ Complete | High-risk fields (subjects/rate/location), 3-way writeBatch, diff helpers, PendingReview redirect | ✅ Yes |
| PendingReview | `/tutor-pending` | ✅ Complete | "Under review" static screen, live `onSnapshot` watches for admin decision, auto-advance on approval | ✅ Yes |
| BatchCreation | `/batches` | ✅ Complete | Batch management for tutors | ❌ Mock data |

### 5.5 Admin Screens

| Screen | Route | Status | Key Features | Live Data? |
|--------|-------|--------|-------------|------------|
| AdminHome | `/admin-home` | ✅ Complete | 3 section cards (Statistics, Verification, Users), live display name, count badges | ✅ Partial |
| VerificationQueue | `/verification-queue` | ✅ Complete | 4 sections (New/Pending Edits/Info Requested/Decided), live `onSnapshot`, approve/reject/info actions, diff view, document preview, image/video lightbox, `writeBatch`, notifications | ✅ Yes |
| UserManagement | `/user-management` | ✅ Complete | All users list, status/role filters, search, suspend/reinstate, soft delete, dev fallback | ✅ Partial |
| PlatformStatistics | `/platform-statistics` | ✅ Complete | Analytics (mock data) | ❌ Mock data |
| AdminProfile | `/admin-profile` | ✅ Complete | First-time setup + view/edit for admin display name, role title, phone | ✅ Yes |

### 5.6 Shared Screens

| Screen | Route | Status | Key Features | Live Data? |
|--------|-------|--------|-------------|------------|
| Notification | `/notification` | ✅ Complete | Notification center with inline pills (not ActivePill — horizontally scrolling) | ❌ Mock/pending |

---

## 6. Service Layer

### 6.1 Firebase Auth Service (`services/firebase/authService.ts`)

| Function | Input | Output | Usage |
|----------|-------|--------|-------|
| `signUpWithEmail(email, password)` | string, string | UserCredential | Creates account + sends verification email |
| `loginWithEmail(email, password)` | string, string | UserCredential | Authenticates existing user |
| `sendVerificationAgain()` | — | void | Re-sends email verification |
| `signInWithGoogle()` | — | UserCredential | Google Sign-In via GoogleSignin SDK |
| `logout()` | — | void | Signs out of Firebase Auth |
| `getSignInMethodsForEmail(email)` | string | string[] | Detects existing providers for email |

### 6.2 Firebase Error Service (`services/firebase/errors.ts`)

- `formatFirebaseError(error, fallback)` — Maps Firebase error codes to user-friendly messages
- `authErrorSuggestsModeFlip(error)` — Auto-detects when user is on wrong auth mode (signup vs login)

### 6.3 Supabase Client (`services/supabase/client.ts`)

- Singleton `getSupabase()` — lazy initialization, fails loudly if env vars missing
- `persistSession: false` — Supabase Auth is NOT used (Firebase owns identity)
- Proxy `supabase` export — convenience wrapper for direct calls

### 6.4 Supabase Storage (`services/supabase/storage.ts`)

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `uploadAvatar(uid, uri)` | string, string | `{ publicUrl, path }` | Uploads to `public-avatars/{uid}.jpg`, upsert |
| `uploadVerificationDoc(uid, kind, uri)` | string, VerificationKind, string | `{ path }` | Uploads to `private-verification-docs/{uid}/{kind}.{ext}` |
| `getVerificationDocPublicUrl(path)` | string | string | Returns public URL for stored file |

**Bucket configuration:**
| Bucket | Read Access | Write Access | Max Size |
|--------|-------------|-------------|----------|
| `public-avatars` | Public (anyone) | Owner (anon key + RLS) | 5 MB |
| `private-verification-docs` | Public (workaround — no signed URLs on free tier) | Owner (uid-validated) | 25 MB |

### 6.5 Verification Library (`lib/verification/`)

| Module | Purpose |
|--------|---------|
| `discovery.ts` | Tutor discovery filter — `tutorMeetsDiscoveryCriteria()` checks `verificationStatus === "approved"` AND `hasPendingUpdate === false` |
| `documents.ts` | Document upload helpers — `pickAndUploadTutorDoc()`, type definitions, MIME validation, size caps |
| `editableFields.ts` | Field edit policy — `LIVE_EDITABLE_FIELDS` (name/headline/bio/photo) vs high-risk fields requiring re-review |
| `notifications.ts` | Notification helpers — `writeNotification()`, `notificationCopy` templates for approve/reject/edit |

### 6.6 Tutor Service (`lib/tutor/`)

| Module | Purpose |
|--------|---------|
| `types.ts` | `TutorProfile` domain model — full type with reviews, sessions, category ratings, builder helper |
| `firestoreTutorService.ts` | `subscribeTutors()` — live `onSnapshot` on `tutors` collection with discovery filter. `fetchTutorProfile()` — 3-path fallback read for detail page |
| `seedProfile.ts` | Backup seed utility |
| `backfillTutors.ts` | Backfill utility for `tutors` collection |
| `cleanupTutors.ts` | Cleanup utility for stale tutor entries |

---

## 7. Component Library

### 7.1 UI Primitives (`components/ui/`)

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| PrimaryButton | `PrimaryButton.tsx` | ✅ Complete | 3 variants (primary/accent/ghost), 2 sizes (md/lg), Reanimated spring press, loading spinner |
| SecondaryButton | `SecondaryButton.tsx` | ✅ Complete | Outline button variant |
| SearchBar | `SearchBar.tsx` | ✅ Complete | Search input with optional right icon |
| Avatar | `Avatar.tsx` | ✅ Complete | Initials-first circular avatar |
| PaginationDots | `PaginationDots.tsx` | ✅ Complete | Onboarding dots with spring-snap width |
| ImageViewer | `ImageViewer.tsx` | ✅ Complete | Image lightbox with Reanimated enter animation |
| VideoViewer | `VideoViewer.tsx` | ✅ Complete | In-app video player modal |

### 7.2 Form Components (`components/forms/`)

| Component | Status | Description |
|-----------|--------|-------------|
| AvatarUploader | ✅ Complete | Image picker + Supabase upload + preview |
| AvatarBubble | ✅ Complete | Avatar display with edit affordance |
| ChipGroup | ✅ Complete | Multi-select chip group |
| ConfirmDialog | ✅ Complete | Confirmation modal with fade+scale enter animation |
| DocumentUploader | ✅ Complete | Verification doc picker + size validation + upload |
| EditableField | ✅ Complete | Inline edit field with save/cancel |
| inputs.ts | ✅ Complete | Shared input ClassName presets |
| LocationField | ✅ Complete | City/neighborhood picker (MIN_CITY_LENGTH = 3) |
| MenuRow | ✅ Complete | Settings-style menu row with chevron |
| NameEmailFields | ✅ Complete | Name + Email input pair |

### 7.3 Motion System (`components/motion/`)

| Component | Status | Description |
|-----------|--------|-------------|
| `hooks.ts` | ✅ Complete | `usePressScale`, `useSwitchThumb`, `useActiveIndicator`, `useShake` |
| `AnimatedPressable.tsx` | ✅ Complete | `Animated.createAnimatedComponent(Pressable)` re-export |
| `Skeleton.tsx` | ✅ Complete | Skeleton / SkeletonRow / SkeletonText loading placeholders |
| `SwitchThumb.tsx` | ✅ Complete | Animated switch thumb (useSwitchThumb consumer) |
| `ActivePill.tsx` | ✅ Complete | Sliding-pill background for segmented controls |
| `FieldShell.tsx` | ✅ Complete | Form-field wrapper with focus/error/valid states, shake on error |
| `FloatingEmptyIcon.tsx` | ✅ Complete | Gently floating empty-state icon |
| `index.ts` | ✅ Complete | Barrel export |

### 7.4 Design Tokens (`lib/motion.ts`)

| Token Category | Entries | Description |
|----------------|---------|-------------|
| Durations | 3 | `fast` (120ms), `medium` (220ms), `slow` (340ms) |
| Easings | 4 | `standard`, `decelerate`, `accelerate`, `emphasized` |
| Springs | 4 | `press` (d:18, s:320, m:0.6), `gentle`, `indicator`, `pop` |
| Scales | 5 | `pressed` (0.96), `cardPressed` (0.98), `chipPressed` (0.94), `iconPressed` (0.85), `rowPressed` (0.99) |

### 7.5 Illustrations (`components/illustrations/`)

| Component | Type | Description |
|-----------|------|-------------|
| DiscoverIllustration | SVG | Onboarding slide 1 — map illustration |
| AiMatchIllustration | SVG | Onboarding slide 2 — AI match illustration |
| VerifiedIllustration | SVG | Onboarding slide 3 — verified tutors illustration |
| DiscoverScene3D | R3F | 3×3 sand-tile grid + tutor-pin cones + amber beacon |
| AiOrb3D | R3F | Float-wrapped indigo sphere + highlight + sparkle particles |

### 7.6 Premium/3D Components (`components/premium/`)

| Component | Description |
|-----------|-------------|
| `PremiumHero3D.tsx` | Transparent R3F Canvas wrapper with lighting rig and Suspense boundary |
| `SplashParticleField.tsx` | 24-particle ambient drift behind splash logo (no GL — pure Reanimated) |

### 7.7 Shared Layout Components (`components/shared/`)

| Component | Description |
|-----------|-------------|
| `BottomNav.tsx` | 5-tab student bottom nav with ActivePill sliding indicator |
| `AdminNav.tsx` | 5-tab admin bottom nav with amber ActivePill |
| `TutorBottomBar.tsx` | 4-tab tutor bottom bar with sliding underline |
| `ScreenLayout.tsx` | Screen wrapper with padding/variant handling |
| `ReviewBanner.tsx` | Verification status banner (pending/rejected/more_info) |

### 7.8 Domain Components

| Component | Description |
|-----------|-------------|
| `TutorCard.tsx` | `wide` + `compact-h` variants over live tutor data |

---

## 8. Design System

### 8.1 Color Palette

Source of truth: `tailwind.config.js`

| Token | Hex | Usage |
|-------|-----|-------|
| `night` / `ink` | `#26302B` | Primary text, dark backgrounds |
| `ink-muted` | `#6B7268` | Secondary text |
| `sand` / `surface-muted` | `#F1ECE0` | Light backgrounds, disabled surfaces |
| `surface` | `#FFFFFF` | Cards, inputs |
| primary DEFAULT | `#2F5D50` | Chalkboard green — main CTA, tabs |
| primary dark | `#254B41` | Darker variant |
| primary light | `#F1ECE0` | Active pill backgrounds |
| accent DEFAULT | `#E5A03B` | Amber — ratings, highlights |
| accent light | `#FBEBCF` | Amber tint |
| verification DEFAULT | `#3F8A5A` | Green — verified tutors |
| verification dark | `#2D6B44` | Dark verification |
| verification light | `#DCF0E4` | Light verification tint |
| ai DEFAULT | `#4A7FA5` | Indigo — AI surface |
| ai dark | `#2D5F80` | Dark AI |
| ai light | `#EBF3F9` | Light AI tint |
| ai border | `#B8D4E8` | AI border |
| success | `#3F8A5A` | Success states |
| warning | `#E5A03B` | Warning states |
| danger | `#C1503D` | Error states |
| background DEFAULT | `#FBF8F2` | Page background |
| border DEFAULT | `#E7E1D3` | Card/input borders |

### 8.2 Typography

| Token | Size | Line Height | Weight | Usage |
|-------|------|------------|--------|-------|
| `display` | 28px | 34px | 700 | Hero/screen titles |
| `heading` | 20px | 26px | 600 | Section headings |
| `body` | 15px | 22px | 400 | Body text |
| `body-sm` | 13px | 19px | 400 | Small body |
| `caption` | 13px | 18px | 500 | Captions/badges |
| `label` | 12px | 16px | 600, 0.4px letter-spacing | Form labels |
| `micro` | 10px | 13px | 500 | Tiny text |
| `button` | 14px | 20px | 500 | Button labels |

### 8.3 Spacing & Sizing

4px-based scale with named tokens: `touch` (44px), `input` (48px), `btn` (52px), `btn-lg` (56px), `bottom-nav` (64px), `avatar` (40px), `avatar-card` (60px), `avatar-profile` (96px).

### 8.4 Border Radius

`xs` (6px), `sm` (8px), `md` (12px), `card` (14px), `lg` (18px), `xl` (24px), `pill` (9999px).

---

## 9. Security Model

### 9.1 Firestore Rules Summary

| Collection | Read | Write | Notes |
|------------|------|-------|-------|
| `users/{uid}` | Owner, Admin | Owner (with uid guard) | No delete |
| `users/{uid}/{subcollection}` | Owner, Admin (tutorProfile: all signed-in) | Owner, Admin | |
| `tutors/{uid}` | Public (no auth) | Admin only | |
| `admins/{uid}` | Owner only | Server-only (seed script) | |
| `tutorVerifications/{uid}` | Owner, Admin | Owner (pending only), Admin (all statuses) | Owner can resubmit from rejected/more_info |
| `tutorProfileUpdates/{uid}` | Owner, Admin | Owner (pending only), Admin (all) | |
| `notifications/{uid}` | Owner, Admin | Admin (create), Owner (read flag only) | |
| `{document=**}` | Denied | Denied | Catch-all default deny |

### 9.2 Supabase Storage Rules

- `public-avatars`: Public read, authenticated write (image/* only, 5 MB cap)
- `private-verification-docs`: Public read (workaround — no signed URLs on free tier), authenticated write (uid-validated, all MIME, 25 MB cap)

### 9.3 Admin Bootstrapping

Admin accounts are created via `scripts/seedAdmin.ts` using the Firebase Admin SDK (service account). There is no client-side path to create an admin document. Current admin emails: `asimdkt63@gmail.com`, `khsuhan100@gmail.com`.

---

## 10. Zero-Budget Architecture Validation

| Layer | Service | Free Tier | Card Required | Status |
|-------|---------|-----------|---------------|--------|
| Auth | Firebase Auth (Spark) | Unlimited MAU (Email + Google) | No | ✅ Wired |
| Database | Cloud Firestore (Spark) | 1 GiB stored, 50K reads/day, 20K writes/day | No | ✅ Wired |
| Object Storage | Supabase Storage | 1 GB across all buckets | No | ✅ Wired |
| Map Tiles | OpenStreetMap (`tile.openstreetmap.org`) | Unlimited, keyless | No | ⏳ Pending install |
| Geocoding | Nominatim | ~1 req/sec, no key | No | ⏳ Pending |
| Location Math | Client-side Haversine + KNN | Free (just CPU) | No | ⏳ Pending |
| RAG/Chatbot | Groq API (Llama 3) or HuggingFace | Free dev tier | No | ⏳ Pending |
| Push (future) | Firebase Cloud Messaging | Unlimited | No | ⏳ Pending |
| Analytics (future) | Firebase Analytics | Unlimited | No | ⏳ Pending |
| 3D/Animations | expo-gl + R3F + drei + three | MIT (all 4 packages) | No | ✅ Wired |

### Anti-patterns (NOT in use)

| Service | Reason Excluded |
|---------|----------------|
| Firebase Cloud Storage | Requires Blaze (card) |
| Firebase Cloud Functions | Requires Blaze (card) |
| Google Maps SDK / Places API | Requires Cloud Billing (card) |
| OpenAI / Anthropic / Cohere | Paid only |
| Mapbox | Paid above hobby free tier |
| Algolia / Elasticsearch | Paid for our usage |
| Clerk | `integration_firebase` template discontinued |

---

## 11. Phase Completion Audit

| Phase | Feature | Status | Verified Against Code? | Notes |
|-------|---------|--------|----------------------|-------|
| 1.5 | NativeWind tokens in `tailwind.config.js` | ✅ Complete | ✅ | Source of truth for all colors, spacing, typography |
| 2 | Native Firebase Auth | ✅ Complete | ✅ | Email + Google, no Clerk, no OTP |
| 2a | Routing guard in `_layout.tsx` | ✅ Complete | ✅ | 150ms debounce, 5-step redirect tree |
| 2b | Auth store (Zustand) | ✅ Complete | ✅ | `useAuthStore` with user, role, verification status |
| 3 | 3D onboarding (R3F) | ✅ Complete | ✅ | `DiscoverScene3D`, `AiOrb3D`, `PremiumHero3D` |
| 3a | Reanimated 4 splash | ✅ Complete | ✅ | `SplashScreen.tsx`, `SplashParticleField` |
| 3b | Motion system (presses, switches, pills, shells, skeletons) | ✅ Complete | ✅ | `lib/motion.ts` + `components/motion/*` |
| 3c | Tutor profile with documents | ✅ Complete | ✅ | 3 doc types (citizenship, certificate, demo video) |
| 3d | Verification queue (admin) | ✅ Complete | ✅ | 4 sections, live `onSnapshot`, approve/reject/info |
| 4a | Student dashboard (live profile + tutors) | ✅ Complete | ✅ | `StudentHome.tsx` — live Firestore reads |
| 4b | Tutor dashboard (metrics + sessions) | ✅ Complete | ✅ | `tutor_home.tsx` — live profile, mock metrics |
| 4c | Admin dashboard + sub-screens | ✅ Complete | ✅ | 5 admin screens with admin nav |
| 4d | Avatar upload to Supabase | ✅ Complete | ✅ | `AvatarUploader.tsx` + `supabase/storage.ts` |
| 5.1 | Real tutor discovery from Firestore | ✅ Complete | ✅ | `firestoreTutorService.ts` — `subscribeTutors()` |
| 5.2 | OpenStreetMap tiles | ⏳ Pending | — | `react-native-maps` not yet installed |
| 5.3 | Nominatim geocoding | ⏳ Pending | — | Static LocationField used instead |
| 5.4 | Client-side KNN ranking | ⏳ Pending | — | Haversine + ranking not implemented |
| 6 | Tutor edit flow (live + reviewed fields) | ✅ Complete | ✅ | `editableFields.ts`, `EditTeachingDetails.tsx` |
| 6a | Admin user management | ✅ Complete | ✅ | Filter, search, suspend, delete |
| 7.1 | AI chatbot (RAG) | ✅ Partial | ✅ | Chat UI complete, naive keyword router only |
| 7.2 | eSewa payment integration | ⏳ Pending | — | Documentation only |
| 7.3 | Real-time messaging | ⏳ Pending | — | Not started |

---

## 12. Known Issues & Technical Debt

### 12.1 Code Issues

| Issue | Location | Severity | Status |
|-------|----------|----------|--------|
| `@ts-expect-error` pre-existing type error | `lib/verification/notifications.ts:66` | 🟡 Medium | Open (noted in motion.md) |
| Tutor home metrics still use mock data | `screens/tutor/tutor_home.tsx` | 🟡 Medium | Pending live Firestore aggregation |
| Enrollments use mock data | `screens/student/Enrollment.tsx`, `data/mockData.ts` | 🟡 Medium | No real `enrollments` collection |
| Tutor inbox uses mock data | `screens/tutor/tutor_inbox.tsx` | 🟡 Medium | No real enrollment requests |
| Batches screen uses mock data | `screens/tutor/batch_creation.tsx` | 🟡 Medium | No real `batches` collection |
| Admin statistics uses mock data | `screens/admin/PlatformStatistics.tsx`, `data/adminStats.ts` | 🟡 Medium | No real aggregation queries |
| AIChat naive keyword router | `screens/student/AIChat.tsx` | 🟡 Medium | Real Groq API not yet integrated |
| MapSearch is placeholder | `screens/student/MapSearch.tsx` | 🟡 Medium | `react-native-maps` not installed |
| `constants/theme.ts` legacy values | `constants/theme.ts` | 🟢 Low | Deprecated — `tailwind.config.js` is source of truth |
| `constants/colors.ts` duplicate hex | `constants/colors.ts` | 🟢 Low | Only used by SVG illustrations per CLAUDE.md rule 3 |
| No test suite | — | 🔴 High | No Jest configuration found |
| No CI/CD pipeline | — | 🟡 Medium | Only Firebase rule deployment scripts |
| CssInterop `printUpgradeWarning` | Metro surface | 🟢 Low | Known issue with NativeWind + `:active` classes |

### 12.2 Architecture Debt

| Issue | Description | Priority |
|-------|-------------|----------|
| **No offline persistence** | Firestore offline cache not enabled | 🟡 Medium |
| **No pagination** | Tutor queries fetch all docs at once | 🟡 Medium |
| **No error boundaries** | React error boundaries not implemented | 🟡 Medium |
| **No loading skeletons** on all screens | Only MapSearch has Skeleton primitives wired | 🟢 Low |
| **`lib/registration.ts` shim** | Module-level mutable state — should be replaced with Zustand+AsyncStorage | 🟢 Low |
| **Icon inconsistency** | Most surfaces use Ionicons via `@expo/vector-icons`; TutorCard imports `lucide-react-native` | 🟢 Low |
| **No dark mode** | Design is light-only; `userInterfaceStyle: "automatic"` in app.json but no dark tokens | 🟢 Low |

### 12.3 Security Considerations

| Issue | Description | Priority |
|-------|-------------|----------|
| Public read on `private-verification-docs` bucket | Free Supabase tier has no Cloud Functions for signed URLs | 🟡 Medium (known trade-off) |
| No Firestore rate limiting | Rules allow unlimited reads/writes per user | 🟢 Low (Spark plan limits apply) |
| No email verification throttle | Users can request verification resend repeatedly | 🟢 Low |

---

## 13. Recommended Next Steps

### Priority — Must Fix

1. **Set up testing framework** — Jest + React Native Testing Library for critical paths (auth, verification queue, routing guard)
2. **Wire tutor metrics to live Firestore** — Replace mock data in `tutor_home.tsx` (rating, reviews, response rate, earnings)
3. **Wire enrollments to Firestore** — Create `enrollments` collection and connect `Enrollment.tsx`

### Priority — Phase 5 Completion

4. **Install `react-native-maps`** and implement OSM tile rendering for MapSearch
5. **Implement Nominatim geocoding** — Upgrade `LocationField` from static list to live autocomplete
6. **Implement client-side KNN** — Haversine distance + weighted ranking for tutor discovery

### Priority — Phase 7 Foundation

7. **Connect AI Chat to Groq API** — Replace naive keyword router with real Llama 3 inference
8. **Set up `enrollments` and `batches` Firestore collections** — Replace all remaining mock data
9. **Implement real-time messaging** — Chat between students and tutors

### Quality of Life

10. **Add Firestore offline persistence** — Enable `initializeFirestore` with `{ localCache: persistentSingleTabCache() }`
11. **Add pagination** to tutor queries — Limit + cursor for large collections
12. **Add error boundaries** — Graceful fallback UI for crash recovery
13. **Consolidate icon library** — Standardize on Ionicons (remove lucide-react-native)

---

## Appendix A: Dependency Inventory

```json
{
  "core": ["react", "react-native", "expo"],
  "routing": ["expo-router"],
  "styling": ["nativewind", "tailwindcss", "react-native-css-interop"],
  "firebase": ["@react-native-firebase/app", "@react-native-firebase/auth", "@react-native-firebase/firestore"],
  "supabase": ["@supabase/supabase-js"],
  "auth-google": ["@react-native-google-signin/google-signin"],
  "state": ["zustand"],
  "icons": ["@expo/vector-icons", "lucide-react-native"],
  "animations": ["react-native-reanimated", "react-native-worklets", "react-native-gesture-handler"],
  "3d": ["expo-gl", "three", "@react-three/fiber", "@react-three/drei"],
  "video": ["expo-video", "expo-video-thumbnails"],
  "file-system": ["expo-file-system", "base64-arraybuffer"],
  "image-picker": ["expo-image-picker"],
  "safe-area": ["react-native-safe-area-context"],
  "screens": ["react-native-screens"],
  "svg": ["react-native-svg"],
  "web-support": ["react-dom", "react-native-web"],
  "dev-admin": ["firebase-admin"],
  "dev-tools": ["typescript", "eslint", "prettier", "babel-preset-expo", "eslint-config-expo"]
}
```

---

## Appendix B: Reference Documents

| Document | Location | Description |
|----------|----------|-------------|
| CLAUDE.md | `./CLAUDE.md` | System directives for AI coding assistants |
| Master Project Guide | `Documentation/00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` | 15-section product/design guide |
| Architecture | `Documentation/01-Architecture/ARCHITECTURE.md` | Canonical stack + anti-patterns |
| Project Summary | `Documentation/01-Architecture/project_summary_so_far.md` | Comprehensive study guide (16 parts) |
| Implementation Roadmap | `Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md` | Sprint-by-sprint build plan |
| Motion System | `Documentation/02-Design-System/motion.md` | Micro-interactions reference |
| Premium UI/UX Guide | `Documentation/02-Design-System/premium_ui_ux_guidelines.md` | Design psychology principles |
| Firebase Phase 3 Notes | `Documentation/04-Firebase/phase-3-notes.md` | Auth/Firestore operations doc |
| eSewa Integration | `Documentation/05-Build-and-Deploy/esewa_integration.md` | Payment integration plan |
| Zero-Cost Architecture | `Documentation/01-Architecture/zero_cost_architecture.md` | Free-tier justification |
| Firestore Rules | `firebase/firestore.rules` | Live security rules |
| Clerk Revert Archive | `Documentation/99-Archive/2026-06-21-clerk-revert/` | History of Clerk pivot |

---

*Audit generated July 24, 2026 · Maintained by SuhanVerse · Based on codebase analysis of app/, screens/, components/, services/, lib/, store/, and Documentation/*
