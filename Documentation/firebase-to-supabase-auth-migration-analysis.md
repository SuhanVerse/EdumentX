# EdumentX — Firebase-to-Supabase Auth Migration Analysis

> **Author:** Architecture Audit  
> **Date:** July 20, 2026  
> **Status:** Analysis Document (Pre-Decision)  
> **Scope:** Firebase Authentication → Supabase Auth migration feasibility  
> **Audience:** EdumentX student team (3–5 members, limited backend experience)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Dependency Audit](#3-dependency-audit)
4. [Migration Feasibility](#4-migration-feasibility)
5. [Admin Seeding Impact](#5-admin-seeding-impact)
6. [Recommended Target Architecture](#6-recommended-target-architecture)
7. [Step-by-Step Migration Plan (if we choose Supabase Auth)](#7-step-by-step-migration-plan-if-we-choose-supabase-auth)
8. [Estimated Effort](#8-estimated-effort)
9. [Risk Assessment](#9-risk-assessment)
10. [Final Recommendation](#10-final-recommendation)

---

## 1. Executive Summary

### What the Firebase Warning Actually Means

The Firebase Console warning states:

> "The following Authentication features will stop working when Firebase Dynamic Links shuts down: email link authentication for mobile apps, as well as Cordova OAuth support for web apps."

**Firebase Dynamic Links (FDL) was shut down on August 25, 2025** — roughly 11 months ago from today (July 20, 2026). The warning applies to **only two specific authentication features**:

1. **Email link (passwordless) authentication** — a sign-in method where the user receives a "magic link" in their email and clicks it to sign in without a password.
2. **Cordova OAuth support** — OAuth login flows in Apache Cordova web apps.

### Is Email/Password Authentication Affected?

**No.** The traditional email/password flow (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`) does **not** use Dynamic Links. It is a direct API call from your mobile app to the Firebase Auth backend. This feature is completely unaffected by the FDL shutdown.

### Is Google Sign-In in Expo React Native Affected?

**No.** Standard Google Sign-In on mobile apps (Android/iOS) uses the native Google Mobile SDK (`GoogleSignin`), not Dynamic Links. The warning specifically calls out **Cordova** OAuth support — Expo React Native is not Cordova, and the flow through `@react-native-google-signin/google-signin` + `signInWithCredential` is not affected.

### Is This Warning an Immediate Reason to Migrate?

**No.** This warning is **not** a reason to migrate away from Firebase Auth. Here is why:

- EdumentX uses **email/password** and **Google Sign-In** — neither of which rely on Dynamic Links.
- The FDL shutdown happened on **August 25, 2025**. If the app's auth was going to break, it would have broken already.
- The warning is a **static notice** shown to all Firebase projects with Authentication enabled, regardless of which sign-in methods are actually configured. It is a broad informational banner, not a project-specific error.

### The Real Question

The real migration question is not about the FDL shutdown. It is about:

- **Vendor consolidation**: We currently maintain Firebase Auth + Firestore + Supabase Storage + Supabase Postgres. Could we reduce this to one vendor?
- **Long-term cost risk**: Firebase Spark plan is genuinely free, but Firebase has a history of moving features behind Blaze. Supabase's free tier is also generous but also subject to change.
- **Architecture complexity**: The hybrid setup (Firebase for identity, Supabase for data/storage) creates synchronization points and potential consistency issues.

---

## 2. Current Architecture Analysis

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Expo React Native App                        │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Auth Screens    │  │  Dashboards  │  │  AI Chat / Map / Etc  │ │
│  │  - EmailSignUp   │  │  - Student   │  │  (Phase 5-7)          │ │
│  │  - RoleSelection │  │  - Tutor     │  │                        │ │
│  │  - Profile*      │  │  - Admin     │  │                        │ │
│  └────────┬────────┘  └──────┬───────┘  └───────────┬────────────┘ │
│           │                  │                      │              │
│           └──────────────────┼──────────────────────┘              │
│                              │                                      │
│  ┌───────────────────────────┴──────────────────────────────┐      │
│  │                   Zustand Auth Store                      │      │
│  │  (user, role, hasAdminProfile, tutorVerificationStatus)   │      │
│  └───────────────────────────┬──────────────────────────────┘      │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               │ (network calls)
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                              ▼                                      │
│                    ┌─────────────────┐                             │
│                    │  Firebase Auth  │  ◄── Email/Password + Google │
│                    │  (Spark Plan)   │      Sign-In                 │
│                    └────────┬────────┘                             │
│                             │                                       │
│                    ┌────────▼────────┐                             │
│                    │   Firestore     │  ◄── users/{uid}             │
│                    │  (Spark Plan)   │      admins/{uid}            │
│                    │                 │      profiles (subcollections)│
│                    └────────┬────────┘                              │
│                             │                                       │
│  ┌──────────────────────────┴──────────────────────────────┐      │
│  │                   Sync Points                            │      │
│  │  - Tutor profiles synced from Firestore → Supabase PG   │      │
│  │  - Avatar URLs written to Firestore from Supabase       │      │
│  │  - Verification doc paths stored in Firestore           │      │
│  └──────────────────────────┬──────────────────────────────┘      │
│                             │                                       │
│                    ┌────────▼────────┐                             │
│                    │   Supabase      │                             │
│                    │   Postgres      │  ◄── Tutor search data      │
│                    │                 │      pgvector embeddings    │
│                    │                 │      RAG structured data    │
│                    └────────┬────────┘                             │
│                             │                                       │
│                    ┌────────▼────────┐                             │
│                    │   Supabase      │  ◄── Avatars                │
│                    │   Storage       │      Verification docs      │
│                    └─────────────────┘                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │             Supabase Edge Functions                       │     │
│  │  - Verification workflows                                 │     │
│  │  - Notification triggers                                  │     │
│  │  - Embedding generation                                   │     │
│  └──────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘

External:
  Groq API ─── LLM for RAG chatbot
  OpenStreetMap ─── Map tiles + Nominatim geocoding
```

### Duplicated Responsibilities

| Data | Firestore | Supabase Postgres | Issue |
|------|-----------|-------------------|-------|
| Tutor profiles | `users/{uid}/tutorProfile/default` | `tutors` table (planned) | Dual source of truth — must sync |
| Avatar URLs | `users/{uid}/*/avatarUrl` | Supabase Storage object | URL stored in Firestore, file in Supabase |
| Verification docs | `tutorVerifications/{uid}` + `tutorProfileUpdates/{uid}` | Supabase Storage | Doc paths in Firestore, files in Supabase |
| User role | `users/{uid}.role` | Not yet in PG | Currently single source in Firestore |

### Synchronization Points

1. **Tutor profile data**: When architecture doc §5 (Phase 5) ships tutor discovery, tutor data must be synced from Firestore → Supabase Postgres for pgvector + structured search. The AI_TUTOR_RECOMMENDATION_RAG_SYSTEM.md proposes a 5-minute sync interval.

2. **Uploaded file URLs**: When a user uploads an avatar or verification doc to Supabase Storage, the resulting public URL is written into a Firestore profile document. These writes must be atomic with the upload (currently handled by the same `writeBatch`).

3. **Admin verification status**: Admin approval/rejection writes to both `tutorVerifications/{uid}` (Firestore) and potentially triggers Supabase Edge Functions for notifications — the two systems must agree on the current status.

### Potential Consistency Problems

- **Stale sync data**: If the Firestore → Postgres sync fails, the RAG system could recommend tutors with outdated profiles or availability.
- **Partial write failures**: An avatar upload to Supabase could succeed, but the Firestore URL write could fail, leaving the avatar orphaned.
- **Race conditions**: Concurrent profile updates from multiple devices could leave Firestore and Postgres out of sync until the next sync cycle.
- **No transaction across services**: Firestore and Supabase are separate systems with no cross-service transaction support. An operation that touches both (e.g., "upload doc to Supabase, record path in Firestore") cannot be atomic.

---

## 3. Dependency Audit

### Files Dependent on Firebase Auth

| File | Dependency | What It Uses |
|------|-----------|--------------|
| `services/firebase/authService.ts` | Direct | `getAuth`, `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendEmailVerification`, `GoogleAuthProvider`, `GoogleSignin` |
| `services/firebase/errors.ts` | Direct | Firebase error code constants (`auth/email-already-in-use`, `auth/invalid-email`, etc.) |
| `app/_layout.tsx` | Direct | `onAuthStateChanged`, `getAuth`, `getFirestore`, user doc reads, admin doc reads |
| `store/authStore.ts` | Type-level | `FirebaseAuthTypes.User` type for store state |
| `screens/auth/EmailSignUp.tsx` | Direct | `signUpWithEmail`, `loginWithEmail`, `signInWithGoogle`, `formatFirebaseError`, `auth.currentUser.reload()` |
| `screens/auth/RoleSelection.tsx` | Direct | `getFirestore`, `doc`, `setDoc`, `serverTimestamp` — writes user role to Firestore |
| `screens/auth/StudentProfileScreen.tsx` | Direct | `getFirestore`, writes profile to Firestore subcollection |
| `screens/auth/TutorProfileScreen.tsx` | Direct | `getFirestore`, writes tutor profile + verification docs to Firestore |
| `screens/student/StudentHome.tsx` | Direct | `logout` from authService, `getFirestore` for profile reads |
| `screens/student/StudentProfile.tsx` | Direct | `logout`, `getFirestore`, `getAuth` for uid |
| `screens/tutor/tutor_home.tsx` | Direct | `getFirestore`, `logout`, `useAuthStore` |
| `screens/tutor/tutor_inbox.tsx` | Direct | `getFirestore` (planned queries) |
| `screens/tutor/edit_profile.tsx` | Direct | `logout`, `getFirestore`, `useAuthStore` |
| `screens/tutor/EditTeachingDetails.tsx` | Direct | `getFirestore`, `useAuthStore` |
| `screens/tutor/PendingReview.tsx` | Direct | `logout`, `getFirestore`, `useAuthStore` |
| `screens/tutor/batch_creation.tsx` | Placeholder | TODO(firebase) comments — not yet implemented |
| `screens/admin/AdminHome.tsx` | Direct | `getFirestore` |
| `screens/admin/AdminProfile.tsx` | Direct | `logout`, `getFirestore` |
| `screens/admin/PlatformStatistics.tsx` | Direct | `getFirestore` |
| `screens/admin/UserManagement.tsx` | Direct | `getFirestore` for user CRUD |
| `screens/admin/VerificationQueue.tsx` | Direct | `getFirestore` for verification doc reads |
| `screens/shared/Notification.tsx` | Direct | `getFirestore` |
| `lib/verification/documents.ts` | Direct | `getAuth` for uid |
| `lib/verification/discovery.ts` | Direct | `getFirestore` |
| `lib/verification/notifications.ts` | Direct | `getFirestore` |
| `components/forms/AvatarUploader.tsx` | Direct | `getAuth` for uid |
| `components/forms/DocumentUploader.tsx` | Direct | `getAuth` for uid |
| `scripts/seedAdmin.ts` | Direct | `firebase-admin` SDK — Firestore writes |

### Files Already Dependent on Supabase

| File | What It Uses |
|------|-------------|
| `services/supabase/client.ts` | Supabase client singleton (anon key, Storage-only mode) |
| `services/supabase/storage.ts` | `uploadAvatar`, `uploadVerificationDoc`, `getVerificationDocPublicUrl` |
| `components/forms/AvatarUploader.tsx` | `uploadAvatar` from supabase/storage |
| `components/forms/DocumentUploader.tsx` | `getVerificationDocPublicUrl` from supabase/storage |
| `screens/auth/TutorProfileScreen.tsx` | Writes Supabase public URL into profile after upload |
| `screens/tutor/edit_profile.tsx` | `uploadAvatar` from supabase/storage |
| `screens/student/StudentProfile.tsx` | `uploadAvatar` from supabase/storage |
| `screens/admin/VerificationQueue.tsx` | `getVerificationDocPublicUrl` |

### Summary

- **~27 files** depend directly on Firebase Auth or Firestore APIs.
- **~8 files** already use Supabase (for Storage only).
- The `useAuthStore` (Zustand) is the central state hub and would need a type-level change to work with Supabase Auth's `User` type.

---

## 4. Migration Feasibility

### Is Migration "Just Changing API Keys"?

**Absolutely not.** Moving from Firebase Auth to Supabase Auth involves:

1. **Different SDK**: `@react-native-firebase/auth` → `@supabase/supabase-js` (with `react-native` adapter)
2. **Different API surface**: Method names change (`createUserWithEmailAndPassword` → `supabase.auth.signUp`), return types change, error handling changes.
3. **Different session model**: Firebase Auth manages native tokens automatically. Supabase Auth uses JWTs that the client must refresh.
4. **Different auth persistence**: Firebase Auth persists natively on each platform. Supabase Auth uses expo-secure-store or AsyncStorage.
5. **Different OAuth flow**: Google Sign-In with Supabase requires configuring Google as an OAuth provider in the Supabase dashboard, then using Supabase's `signInWithOAuth()` — the `@react-native-google-signin` approach changes significantly.
6. **User identity changes**: Firebase Auth uses a project-scoped UID (`users/{uid}` pattern). Supabase Auth generates a UUID. Users would get new IDs unless you create a mapping table.

### Code Areas Requiring Refactoring

| Area | Effort | Details |
|------|--------|---------|
| `services/firebase/authService.ts` | **Rewrite** | Entire file replaced with Supabase Auth calls |
| `services/firebase/errors.ts` | **Rewrite** | Error codes change (Supabase → Postgres error codes) |
| `app/_layout.tsx` | **Heavy refactor** | `onAuthStateChanged` → Supabase `onAuthStateChange`; user doc reads from Postgres instead of Firestore |
| `store/authStore.ts` | **Type changes** | `FirebaseAuthTypes.User` → Supabase's `User` type |
| `screens/auth/EmailSignUp.tsx` | **Heavy refactor** | Auth calls, email verification flow, Google Sign-In all change |
| `screens/auth/RoleSelection.tsx` | **Refactor** | Role write → Postgres `profiles` table instead of Firestore |
| Profile screens (x4) | **Refactor** | Profile reads/writes → Postgres instead of Firestore |
| Dashboard screens (x6) | **Refactor** | Data sources change, `logout` calls change |
| Admin screens (x5) | **Refactor** | Firestore queries → Postgres queries |
| `scripts/seedAdmin.ts` | **Rewrite** | Admin SDK → Supabase Admin API |
| Verification lib (x3) | **Minor** | Auth uid resolution changes |
| Components using `getAuth` | **Minor** | Import path + call changes |

### Database Changes Required

| Current (Firestore) | Target (Supabase Postgres) |
|---------------------|---------------------------|
| `users/{uid}` (doc per user) | `profiles` table (row per user, linked to `auth.users` via `id` foreign key) |
| `users/{uid}/studentProfile/default` | Part of `profiles` table (nullable student columns) |
| `users/{uid}/tutorProfile/default` | Part of `profiles` table (nullable tutor columns) OR separate `tutor_profiles` table |
| `users/{uid}/adminProfile/default` | Part of `profiles` table OR separate `admin_profiles` table |
| `admins/{uid}` | `admin_roles` table (join table: user_id + role) |
| `tutorVerifications/{uid}` | `tutor_verifications` table |
| `tutorProfileUpdates/{uid}` | `tutor_profile_updates` table |
| `notifications/{id}` | `notifications` table |

### Password Migration

**User passwords CANNOT be migrated automatically.** Firebase Auth stores password hashes using a proprietary format (Scrypt with Firebase-specific parameters). Supabase Auth uses bcrypt. There is no standard way to migrate hashed passwords between these systems.

### Realistic Options for Password Migration

1. **Force password reset** (recommended for student projects): All existing users must reset their passwords on first sign-in after migration. Supabase's `forgotPassword` flow handles this.
2. **Firebase-to-Supabase password migration tool**: Supabase offers a [migration tool](https://supabase.com/docs/guides/auth/migrations/firebase-auth) that can migrate Firebase password hashes — but it requires exporting from Firebase (Blaze plan needed for the export, see below) and is complex to configure.
3. **Leave users in Firebase Auth, create Supabase users via SSO**: Not practical for this project.

**Important**: Firebase's Auth export (`firebase auth:export`) works on the **Blaze** (paid) plan only. On the **Spark** (free) plan, you cannot export password hashes. This means:
- **If we stay on Spark**: We cannot export Firebase users at all. Migration means **all users reset passwords**.
- **If we upgrade to Blaze**: We can export users and use Supabase's migration tool, but this costs money.

### What Happens to Existing Firestore User Documents?

Firestore data can be migrated to Postgres via a script, but:
- The `uid` field in Firestore matches the Firebase Auth UID. Under Supabase Auth, the new user ID is a different UUID.
- A **mapping table** (`firebase_uid → supabase_uuid`) is needed to link old data to new users.
- All Firestore queries currently filter by `uid` or `auth.uid`. These must be rewritten to use the new Supabase user ID.

---

## 5. Admin Seeding Impact

### Current Admin Seed Script (`scripts/seedAdmin.ts`)

The current script:
- Uses `firebase-admin` SDK with a Google service account key
- Looks up `users` collection by email to find the user's UID
- Writes `admins/{uid}` with `{ email, grantedAt, grantedBy }`
- Requires the user to have signed in at least once (so the Firestore doc exists)

### How It Would Change Under Supabase Auth

**Approach A — Supabase Admin API (Recommended)**

```typescript
// Current (Firebase Admin SDK)
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const db = getFirestore();
await db.collection("admins").doc(uid).set({ email, grantedAt });

// Target (Supabase Admin API)
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(url, serviceRoleKey); // service_role key
// 1. Look up user by email in auth.users
const { data: user } = await supabaseAdmin.auth.admin.getUserByEmail(email);
// 2. Insert admin role in public.admin_roles
await supabaseAdmin.from("admin_roles").insert({
  user_id: user.id,
  granted_at: new Date(),
});
```

The Supabase Admin API uses the **`service_role` key** (NOT the anon key). This key must be kept secret and used only in backend scripts or Edge Functions — never in the client app.

**Approach B — Supabase Edge Function**

Instead of a CLI script, an Edge Function could handle admin seeding:
```typescript
// supabase/functions/seed-admin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { email } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  // ... similar logic
});
```

This avoids the need to install the Supabase Admin SDK locally.

### Should Role Data Move to Postgres?

**Yes.** If we migrate to Supabase Auth, the `profiles` table should store the user's role directly (as a column). This eliminates the need for a separate `admins` collection — admin status can be a boolean column or a separate `admin_roles` table.

**Recommended schema:**
```sql
-- profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text check (role in ('student', 'tutor', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- admin_roles (separate from profiles for clean admin management)
create table public.admin_roles (
  user_id uuid references auth.users on delete cascade primary key,
  granted_at timestamptz default now(),
  granted_by text
);
```

### Can Firestore Still Be Retained for Some Metadata?

**Yes, but it adds complexity.** You could keep Firestore for:
- Notification records (lightweight, don't need Postgres joins)
- Session/activity logs (high-write, Firestore is good at this)

However, if you're already migrating auth to Supabase, the incremental effort to also migrate the ~5 Firestore collections to Postgres tables is relatively small. A clean break is simpler for a 3–5 person team.

---

## 6. Recommended Target Architecture

### Option A — Keep Firebase Auth + Firestore + Supabase (Current)

| Dimension | Assessment |
|-----------|-----------|
| **Complexity** | ⚠️ **Medium-High** — 2 vendors (Firebase + Supabase), 2 databases, manual sync |
| **Migration Effort** | **None** — already implemented |
| **Monthly Cost** | **$0** — Spark plan + Supabase free tier |
| **Long-term Maintainability** | ⚠️ **Moderate** — sync logic between Firestore and Postgres is fragile; two security models to maintain |
| **Risk Level** | ⚠️ **Low-Medium** — Firebase could change Spark plan terms; Firestore daily quotas could be hit |

**Best for**: Teams that want to ship now and refactor later. The current setup works.

### Option B — Firebase Auth + Supabase Only (Remove Firestore)

| Dimension | Assessment |
|-----------|-----------|
| **Complexity** | ⚠️ **Medium** — Firebase for auth only, Supabase for everything else |
| **Migration Effort** | **High** — migrate all Firestore data + queries to Postgres, but keep Firebase Auth unchanged |
| **Monthly Cost** | **$0** — Firebase Spark (auth only) + Supabase free tier |
| **Long-term Maintainability** | ✅ **Good** — single data store (Postgres), one security model (RLS) |
| **Risk Level** | ⚠️ **Medium** — still dependent on Firebase Auth long-term; auth migration effort separate from data migration |

**Best for**: Teams that want Postgres for everything but don't want the risk of migrating auth right now.

### Option C — Full Supabase (Auth + Postgres + Storage + Edge Functions)

| Dimension | Assessment |
|-----------|-----------|
| **Complexity** | ✅ **Low** — single vendor, single SDK, single auth model |
| **Migration Effort** | **Very High** — auth (all screens, store, layout), data (Firestore → Postgres), admin scripts, route guards |
| **Monthly Cost** | **$0** — Supabase free tier (50,000 monthly active users, 500 MB database, 1 GB storage, 2 million Edge Function invocations) |
| **Long-term Maintainability** | ✅ **Excellent** — one vendor, one SDK, one security system, one set of credentials |
| **Risk Level** | ⚠️ **Low-Medium** — Supabase could change free tier; but less vendor lock-in than Firebase (Postgres is portable) |

**Best for**: Teams early enough in development that a full rewrite is feasible, or teams experiencing active pain with the current hybrid setup.

### Recommendation: Option C (Full Supabase) — **But Not Yet**

#### Why Option C is the Right Long-Term Target

1. **Single vendor** eliminates sync problems between Firestore and Postgres.
2. **Supabase free tier** is generous: 50,000 MAU, 500 MB database, 1 GB storage — enough for a college demo.
3. **Postgres is portable**: Unlike Firestore (proprietary), Postgres can be self-hosted or migrated to any provider if Supabase changes terms.
4. **Unified RLS**: One security model (Postgres Row Level Security) instead of Firestore rules + Supabase RLS.

#### Why We Should NOT Do It Now

1. **Working code**: The current Firebase Auth + Firestore flow is **shipped and tested**. Auth, role selection, profile creation, admin flows — all working. Rewriting working code is never urgent.
2. **Massive refactor**: ~27+ files touch Firebase Auth or Firestore. A migration would take 2–4 weeks for a 3–5 person student team — that's most of a semester.
3. **No current pain**: The Firebase Dynamic Links warning does **not** affect us. The Spark plan is still free. Firestore daily quotas (50K reads/day) are not an issue for a demo project.
4. **Opportunity cost**: Time spent migrating auth is time not spent on the RAG chatbot, map search, tutor verification, or UI polish — features that actually differentiate the project.

#### The Pragmatic Middle Path

**Short-term (this week): Accept Option A and move on.**

The Firebase Dynamic Links warning is a red herring for this project. Document this analysis, close the audit, and focus on feature work.

**Medium-term (before production launch): Plan for an Option B migration.**

When the project is ready for real users:
1. Keep Firebase Auth (it works, costs $0).
2. Migrate Firestore data to Supabase Postgres (this is valuable regardless of auth).
3. Use Supabase exclusively for data (profiles, tutor data, notifications, admin records).
4. Retain Firebase only for the auth layer.

This split is clean: Firebase owns identity, Supabase owns all data. No sync needed because there's no data in Firestore.

**Long-term (if Firebase changes Spark terms): Migrate to Option C.**

If Firebase ever gates Auth behind Blaze, the Option B → Option C migration is just the auth layer — the data is already in Postgres.

---

## 7. Step-by-Step Migration Plan (if we choose Supabase Auth)

*This section provides a concrete plan if the team decides to proceed with Option C. Estimated effort is in Section 8.*

### Phase 1: Setup (Days 1–2)

1. **Create Supabase project** (if not already done):
   - Sign up at https://supabase.com (free, no card).
   - Create project in Mumbai region (closest to Nepal).
   - Note the project URL and `anon` + `service_role` keys.

2. **Configure Auth providers**:
   - Go to Authentication → Providers.
   - Enable **Email/Password** (built-in, no config needed).
   - Enable **Google**:
     - Get OAuth 2.0 credentials from Google Cloud Console (Web client type).
     - Enter Client ID and Client Secret in Supabase dashboard.
     - Configure redirect URIs (Supabase provides these).

3. **Install dependencies**:
   ```
   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
   ```
   - `@supabase/supabase-js` — the Supabase client library.
   - `@react-native-async-storage/async-storage` — for session persistence.

4. **Create database schema** (run in Supabase SQL Editor):
   ```sql
   -- Profiles table (mirrors current Firestore users/{uid})
   create table public.profiles (
     id uuid references auth.users on delete cascade primary key,
     email text,
     full_name text,
     username text,
     phone text,
     role text check (role in ('student', 'tutor', 'admin')),
     avatar_url text,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );

   -- Enable Row Level Security
   alter table public.profiles enable row level security;

   -- Users can read their own profile; admins can read all
   create policy "Users can read own profile"
     on public.profiles for select
     using (auth.uid() = id);

   create policy "Users can update own profile"
     on public.profiles for update
     using (auth.uid() = id);

   -- Admin roles
   create table public.admin_roles (
     user_id uuid references auth.users on delete cascade primary key,
     granted_at timestamptz default now(),
     granted_by text
   );

   alter table public.admin_roles enable row level security;
   ```

5. **Create remaining tables** for student/tutor profiles:
   ```sql
   -- Extend profiles with a JSON field for role-specific data,
   -- or create separate tables for student/tutor details.
   alter table public.profiles add column if not exists
     role_data jsonb default '{}'::jsonb;
   ```

### Phase 2: Supabase Client Setup (Days 2–3)

6. **Create Supabase auth client** (`services/supabase/auth.ts`):
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
     },
   });
   ```

   Note: This is **different** from the existing `services/supabase/client.ts`, which disables auth. We either extend that file or create a separate auth client.

7. **Update existing Supabase client** (`services/supabase/client.ts`):
   - Enable auth persistence (change `persistSession: false` → `true`).
   - OR create a parallel client for auth operations only.

### Phase 3: Replace Auth Service (Days 3–5)

8. **Replace `services/firebase/authService.ts`**:
   ```typescript
   // BEFORE (Firebase)
   import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
   const auth = getAuth(getApp());
   const credential = await createUserWithEmailAndPassword(auth, email, password);

   // AFTER (Supabase)
   import { supabase } from '@/services/supabase/auth';
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
   });
   ```

   **Key API surface changes:**
   | Firebase | Supabase |
   |----------|----------|
   | `createUserWithEmailAndPassword(auth, email, password)` | `supabase.auth.signUp({ email, password })` |
   | `signInWithEmailAndPassword(auth, email, password)` | `supabase.auth.signInWithPassword({ email, password })` |
   | `signInWithCredential(googleCredential)` | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
   | `sendEmailVerification(user)` | Configure auto-confirm OR trigger via Edge Function |
   | `auth.currentUser` | `supabase.auth.getSession()` then `session.user` |
   | `onAuthStateChanged(auth, callback)` | `supabase.auth.onAuthStateChange((event, session) => ...)` |
   | `auth.signOut()` | `supabase.auth.signOut()` |
   | `auth.fetchSignInMethodsForEmail(email)` | `supabase.auth.getUserByEmail(email)` (requires admin key) |

9. **Update `services/firebase/errors.ts`**:
   ```typescript
   // Before: Firebase error codes
   "auth/email-already-in-use": "This email is already registered.",
   "auth/invalid-email": "Please enter a valid email address.",

   // After: Supabase error messages
   "User already registered": "This email is already registered.",
   "Invalid email": "Please enter a valid email address.",
   ```

10. **Handle Google Sign-In** (significant change):
    ```typescript
    // Supabase Google Sign-In is URL-based
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // On mobile, this opens a browser for OAuth
    });
    ```
    
    For Expo, you may need `expo-auth-session` or `expo-web-browser` to handle the redirect flow. This is more complex than the current `@react-native-google-signin` approach.

### Phase 4: Update Auth Store and Layout (Days 5–7)

11. **Update `store/authStore.ts`**:
    - Change `FirebaseAuthTypes.User | null` → `import { User } from '@supabase/supabase-js'` → `User | null`.
    - Update types that reference Firebase-specific fields.

12. **Update `app/_layout.tsx`**:
    - Replace `onAuthStateChanged` with `supabase.auth.onAuthStateChange`.
    - Replace Firestore user doc reads with Supabase profile queries.
    - The routing logic (5-step tree) stays the same — just the data source changes.

    ```typescript
    // Before
    const subscriber = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      const userDocRef = doc(firebaseDb, "users", nextUser.uid);
      const snap = await getDoc(userDocRef);
      // ...
    });

    // After
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        // ...
      }
    );
    ```

### Phase 5: Update Screens (Days 7–12)

13. **Update `screens/auth/EmailSignUp.tsx`**:
    - Replace all `signUpWithEmail` / `loginWithEmail` calls with Supabase equivalents.
    - Replace `auth.currentUser.reload()` with Supabase session refresh.
    - Update Google Sign-In button to use `signInWithOAuth`.

14. **Update profile screens** (StudentProfileScreen, TutorProfileScreen, AdminProfile):
    - Replace Firestore writes with Supabase `profiles` table inserts/updates.
    - The `writeBatch` pattern becomes a single `supabase.from('profiles').upsert(...)`.

15. **Update dashboard screens**:
    - Replace `onSnapshot` (Firestore realtime listener) with Supabase `subscribe` or manual refetch.
    - Update `logout` calls to `supabase.auth.signOut()`.

16. **Update admin screens**:
    - Replace Firestore queries for user management with Supabase `profiles` queries.
    - Admin check becomes: check if user has a row in `admin_roles`.

### Phase 6: Update Seed Script (Days 12–13)

17. **Rewrite `scripts/seedAdmin.ts`**:
    ```typescript
    // New Supabase-based seed script
    import { createClient } from '@supabase/supabase-js';
    
    const supabaseAdmin = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // ← Must be kept secret!
    );
    
    async function seedAdmin(email: string) {
      // Look up user by email via admin API
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users.users.find(u => u.email === email);
      if (!user) throw new Error(`User ${email} not found`);
      
      // Insert admin role
      await supabaseAdmin.from('admin_roles').upsert({
        user_id: user.id,
        granted_at: new Date(),
        granted_by: 'seed-script',
      });
    }
    ```

### Phase 7: Database Migration (Days 13–15)

18. **Write a migration script** that:
    - Reads all Firestore collections via the Firebase Admin SDK.
    - Maps Firebase UIDs to Supabase UIDs (using email as the join key).
    - Inserts records into the Supabase Postgres tables.
    - Creates entries in a `migration_log` table for auditing.

19. **Migrate existing users**:
    - Since password hashes cannot be migrated (Spark plan limitation), trigger a mass password reset email.
    - Or leave Firebase running until all users have voluntarily migrated (parallel operation).

### Phase 8: Testing (Days 15–18)

20. **Test each auth flow**:
    - [ ] Email signup (new user)
    - [ ] Email login (existing user)
    - [ ] Google Sign-In
    - [ ] Password reset
    - [ ] Session persistence across app restarts
    - [ ] Session timeout/refresh
    - [ ] Sign out

21. **Test route guards**:
    - [ ] Unauthenticated user → /email-signup
    - [ ] Unverified email → pending screen
    - [ ] Verified + no role → /role-selection
    - [ ] Verified + student → /student-home
    - [ ] Verified + tutor (pending) → /tutor-pending
    - [ ] Verified + tutor (approved) → /tutor-home
    - [ ] Verified + admin (no profile) → /admin-profile
    - [ ] Verified + admin (has profile) → /admin-home

22. **Test profile flows**:
    - [ ] Create student profile
    - [ ] Create tutor profile with verification docs
    - [ ] Edit profile
    - [ ] Upload avatar
    - [ ] Upload verification documents
    - [ ] Admin approves/rejects tutor

### Phase 9: Rollback Plan (Day 18)

23. **Prepare rollback**:
    - Keep the Firebase project active (do not delete until migration is confirmed stable).
    - Keep an export of all Firestore data.
    - Keep a script that can reverse the migration: read Supabase `profiles` and write back to Firestore.
    - Feature-flag the auth provider so the app can switch between Firebase and Supabase at build time.

### Phase 10: Cleanup (Day 19–20)

24. Once migration is verified:
    - Remove `@react-native-firebase/auth` dependency.
    - Remove Firebase Auth configuration.
    - Remove Firestore rules and indexes (if no other data remains).
    - Archive the Firebase project (do not delete immediately — safety net).
    - Update all documentation (ARCHITECTURE.md, README, env templates).

---

## 8. Estimated Effort

Estimates assume a **3–5 member student team** with:
- Basic React Native knowledge
- Some Firebase experience (currently using it)
- No Supabase experience
- Limited backend/infrastructure experience
- Working part-time (10–15 hours/week per person)

| Phase | Activity | Hours | Calendar Days | Parallelizable? |
|-------|----------|-------|---------------|-----------------|
| 1 | Supabase project setup + schema | 4 | 1 | Yes (one person) |
| 2 | Supabase client setup | 3 | 1 | Yes (one person) |
| 3 | Replace auth service | 12 | 2 | No (blocks everything) |
| 4 | Update auth store + layout | 16 | 3 | No (blocks screens) |
| 5 | Update all screens (21 files) | 40 | 5 | Yes (split by screen) |
| 6 | Update seed script | 4 | 1 | Yes (parallel with Phase 5) |
| 7 | Database migration | 12 | 2 | No (after schema is stable) |
| 8 | Testing | 20 | 4 | Yes (split by flow) |
| 9 | Rollback prep | 4 | 1 | Yes (one person) |
| 10 | Cleanup + docs | 6 | 2 | Yes (one person) |
| **Total** | | **121 hours** | **~22 days** | |

### Adjusted for Student Team Realities

| Factor | Adjustment | Effective |
|--------|-----------|-----------|
| Learning curve (first Supabase project) | +25% | 151 hours |
| Bug fixes + edge cases | +20% | 181 hours |
| Coordination overhead (3 people) | +15% | 208 hours |
| **Realistic total** | | **~210 hours** |

**Calendar estimate**: 4–6 weeks (working 10–15 hrs/wk per person, 3 people = 90–135 hrs/month).

**One-person estimate**: 7–10 weeks if one person does the entire migration.

### Escrow Contingency

Add 2 extra weeks for:
- Unexpected issues with Google OAuth redirects on mobile
- Session persistence bugs
- Firestore-to-Postgres data type mismatches
- RLS policy mistakes that block admin flows

---

## 9. Risk Assessment

### Risk Table

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | **Login failures during migration** | Users cannot access the app | **High** | Run Firebase + Supabase in parallel during transition; feature-flag auth provider |
| 2 | **Broken sessions after migration** | Users get logged out on every app restart | **Medium** | Test session persistence extensively; use `expo-secure-store` for token storage |
| 3 | **Lost user records** | Firebase UIDs don't map to Supabase UIDs | **Medium** | Build email-based mapping table; test with real user data before cutover |
| 4 | **Inconsistent roles** | Users lose student/tutor/admin role assignment | **High** | Test the role migration script against a snapshot of Firestore data; add a manual override in admin panel |
| 5 | **Storage access issues** | Supabase Storage RLS policies block avatar/doc reads | **Medium** | Document and test all RLS policies before deploying; use Supabase's built-in policy tester |
| 6 | **RLS policy mistakes** | Users can read/write other users' data | **Critical** | Write and review RLS policies in a SQL script (not manually in dashboard); test with multiple test accounts |
| 7 | **Google OAuth redirect fails on mobile** | Google login breaks for all users | **High** | Test on both Android and iOS physical devices; configure all redirect URIs in both Google Console and Supabase dashboard |
| 8 | **Firebase becomes paid before migration is complete** | Unexpected cost | **Low** | Monitor Firebase pricing blog; prioritize migration if Spark plan changes announced |
| 9 | **Supabase free tier limits exceeded** | Service degradation or downtime | **Low** | Monitor Supabase dashboard; database is < 500 MB for a demo project; 50K MAU is plenty |
| 10 | **Team members leave before migration is complete** | Migration stalls, half-migrated state | **Medium** | Document every step; keep migration scripts in version control; maintain a decision log |
| 11 | **Password reset forced on all users** | Friction for existing users, support requests | **High** | Communicate migration clearly to test users; send email reminders before cutover |
| 12 | **Expo build issues** | New native deps break the EAS build | **Medium** | Test build in EAS Build with a feature branch before merging to main |

### Risk Matrix

```
Likelihood
    ^
High │  1  3  4
     │
Med  │  2  7  10 12
     │
Low  │     8  9
     │
     └──────────────────> Impact
        Low  Med  High  Crit
```

---

## 10. Final Recommendation

### Should We Migrate Now, Later, or Not at All?

**Do NOT migrate now.** Here is the direct answer:

1. **The Firebase Dynamic Links warning is irrelevant** to EdumentX. Email/password and Google Sign-In are not affected. You can ignore this warning.

2. **Your current auth system works.** You have ~27 files wired to Firebase Auth + Firestore. All flows (signup, login, Google, role selection, profile creation, admin checks, route guarding) are tested and deployed. Rewriting working code is a poor use of limited student-team time.

3. **The Spark plan is still free.** Firebase has not changed the terms. If they do, you will have warning — and this document gives you a plan.

4. **Your team has limited backend experience.** A 210-hour/4-6 week migration is a significant risk for a 3–5 person student team. That time is better spent on features that matter for your final project: the RAG chatbot, tutor discovery, map integration, and UI polish.

### What Is the Safest Budget-Friendly Path?

**Keep the current architecture (Option A), but prepare for a data migration (Option B) later.**

| Timeline | Action | Why |
|----------|--------|-----|
| **This week** | ✅ Ignore the Firebase warning. Document this analysis. Close the audit. | It does not affect you. |
| **This semester** | ✅ Continue building features on the current stack. | Ship the RAG chatbot, map, and tutor discovery. |
| **Before production launch** | ⏳ Migrate data from Firestore to Supabase Postgres (Option B). Keep Firebase Auth. | One database is simpler than two. Postgres is better for the query-heavy RAG system. |
| **Only if Firebase changes Spark terms** | 🔄 Migrate auth to Supabase (Option C). | Auth is then the only Firebase dependency, and you can replace it cleanly. |

### What Should We Do This Week to Avoid Future Issues?

1. **Document this decision.** You're reading it. Save this file and move on.

2. **Export your Firestore data.** Go to Firebase Console → Firestore → Export. This gives you a safety copy if the data ever needs to move.

3. **Don't add more Firestore collections.** Any new features (notification history, chat logs, session data) should be written directly to Supabase Postgres. This way, you're naturally migrating data to the system that will own it long-term, without a formal migration project.

4. **Keep an eye on Firebase pricing announcements.** If Firebase announces changes to the Spark plan (e.g., reducing Firestore quotas or gating Auth), that is the trigger to start the Option B → Option C migration.

5. **If a team member wants to experiment:** Create a small proof-of-concept branch (2–3 days) that implements Supabase Auth for just the email signup flow. If it's harder than expected, you'll know firsthand why the migration estimate is 4–6 weeks. If it's easy, the estimate may be optimistic.

### The Honest Bottom Line

EdumentX is a **college demo project**, not a production SaaS. The current hybrid architecture works, costs $0, and has been through multiple pivots (Clerk → Firebase, phone → email, etc.). Another pivot right now risks project delivery.

**Your energy is better spent on the RAG chatbot and tutor discovery — those are the features that make EdumentX interesting. The auth provider is plumbing. Plumbing that works should not be replaced.**

---

## Appendix A: Firebase → Supabase API Quick Reference

### Email/Password

```typescript
// ─── Sign Up ───
// Firebase
const cred = await createUserWithEmailAndPassword(auth, email, password);
await sendEmailVerification(cred.user);

// Supabase
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});
// Email verification is automatic if configured in Supabase dashboard

// ─── Sign In ───
// Firebase
const cred = await signInWithEmailAndPassword(auth, email, password);

// Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// ─── Sign Out ───
// Firebase
await auth.signOut();

// Supabase
await supabase.auth.signOut();

// ─── Auth State Listener ───
// Firebase
const unsub = onAuthStateChanged(auth, (user) => { ... });

// Supabase
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => { ... }
);
```

### Google Sign-In

```typescript
// ─── Firebase (current) ───
await GoogleSignin.signOut();
const { data } = await GoogleSignin.signIn();
const googleCredential = GoogleAuthProvider.credential(data.idToken);
const result = await auth.signInWithCredential(googleCredential);

// ─── Supabase ───
// Requires expo-auth-session or expo-web-browser for redirect
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectUrl: 'edumentx://auth/callback',
  },
});
```

### User Profile (Firestore → Postgres)

```typescript
// ─── Firebase / Firestore ───
const db = getFirestore(getApp());
const ref = doc(db, 'users', uid);
await setDoc(ref, { role: 'student', email }, { merge: true });

const snap = await getDoc(ref);
const data = snap.data();

// ─── Supabase / Postgres ───
await supabase.from('profiles').upsert({
  id: userId,  // matches auth.users.id
  role: 'student',
  email,
});

const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

---

## Appendix B: Glossary

| Term | Meaning |
|------|---------|
| **Firebase Auth** | Google's authentication service, part of Firebase. Used for email/password and Google Sign-In. |
| **Supabase Auth** | Supabase's built-in authentication, built on top of Postgres and GoTrue. |
| **Dynamic Links (FDL)** | Firebase service that creates smart links that work across app installs. Being shut down. |
| **Spark Plan** | Firebase's free tier. No credit card required. Limited to 50K reads/day on Firestore. |
| **Blaze Plan** | Firebase's pay-as-you-go tier. Requires a credit card. |
| **RLS** | Row Level Security — Postgres feature that restricts row visibility based on user authentication. |
| **service_role key** | Supabase's admin-level API key. Bypasses RLS. Must never be used on the client. |
| **anon key** | Supabase's public API key. Safe to use on the client. Respects RLS. |

---

*This document is intended to be saved as `documentation/firebase-to-supabase-auth-migration-analysis.md` and used as the basis for a real migration decision by the EdumentX team.*
