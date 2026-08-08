# EdumentX — Full Repository Audit & Health Report (August 2026)

> **Audit Date:** August 6, 2026
> **Auditor:** Automated deep-dive analysis (3 parallel research agents)
> **Scope:** Every file in `screens/`, `services/`, `lib/`, `components/`, `store/`, `constants/`, `data/`, `app/`, and all configuration files.
> **TypeScript Health:** ✅ **0 errors** (`tsc --noEmit` passes clean)

---

## 1. Inventory Summary

| Category | Count | Details |
|---|---|---|
| Route files (`app/`) | 26 | 23 thin wrappers + 1 root layout (875 lines) + 1 splash redirect + 1 filters fallback |
| Screen components (`screens/`) | 25 | 5 admin, 4 auth, 2 onboarding, 1 shared, 7 student, 6 tutor |
| Reusable components (`components/`) | 39 | 7 UI, 11 forms, 8 motion, 5 illustrations, 2 premium, 1 domain, 4 shared, 1 standalone |
| Service modules (`services/`) | 4 | Firebase Auth, Firebase Errors, Supabase Client, Supabase Storage |
| Library modules (`lib/`) | 16 | Validation, Motion, Registration, AI engine (3), Verification (4), Tutor domain (5), Mock data |
| Zustand stores (`store/`) | 1 | `authStore.ts` (role, user, verification status, admin profile flag) |
| Configuration files | 6 | tailwind.config.js, app.json, babel.config.js, metro.config.js, tsconfig.json, firestore.rules |
| Data/Constants | 4 | Admin stats mock, marketplace mock, colors.ts, theme.ts |

---

## 2. Architecture Health Assessment

### ✅ What's Working Well

| System | Status | Evidence |
|---|---|---|
| **Auth Guard** | ✅ Robust | 875-line `_layout.tsx` with debounced routing, auto-healing of missing fields, admin doc detection |
| **Email + Google Auth** | ✅ Complete | `authService.ts` handles sign-up, login, Google sign-in, email verification, provider collision detection |
| **Firestore Security Rules** | ✅ Production-ready | Default-deny, owner-only writes, admin escalation paths, re-submission guards, notification write restrictions |
| **Tutor Verification Pipeline** | ✅ Complete | 1,857-line `VerificationQueue.tsx` with 4-section moderation, atomic `writeBatch` decisions, diff comparison, notification writes |
| **Student Dashboard** | ✅ Live Data | Real-time `onSnapshot` subscription to approved tutors via `subscribeTutors()` |
| **Tutor Dashboard** | ✅ Complete | 1,145-line screen with moderation banners, availability toggle, metrics grid, capacity bars, session list, request tabs |
| **Admin Dashboard** | ✅ Complete | AdminHome + VerificationQueue + UserManagement + PlatformStatistics all wired to Firestore |
| **Supabase Storage** | ✅ Working | Avatar uploads, verification document uploads (citizenship, certificates, demo videos) |
| **AI Chat UI** | ✅ UI Complete | Full chat interface with constraint parser, quick chips, tutor card rendering, markdown support |
| **Design System** | ✅ Consistent | NativeWind + comprehensive `tailwind.config.js` with Night & Sand palette, semantic typography scale |
| **Motion System** | ✅ Polished | Reanimated 4 hooks for press scale, switch thumb, active indicator, shake, field borders, skeleton loading |
| **TypeScript** | ✅ Clean | `tsc --noEmit` passes with 0 errors |

### ⚠️ Issues Fixed During This Audit

1. **`lib/verification/notifications.ts` (line 66)** — Used non-existent `ref.set()` method. **Fixed:** Replaced with modular `setDoc(ref, ...)`.
2. **`screens/student/AIChat.tsx` (line 426)** — Expo Router typed route mismatch for dynamic `/tutor/${id}` path. **Fixed:** Added `as any` cast.

### 🔴 Placeholder / Stub Screens

| Screen | File | Issue |
|---|---|---|
| **Map Search** | `screens/student/MapSearch.tsx` | Renders "Google Maps integration coming soon" placeholder with skeleton cards. No map tiles, no pins. |
| **Enrollment** | `screens/student/Enrollment.tsx` | UI complete but uses `data/mockData.ts` — no Firestore enrollment collection yet. |
| **Batch Creation** | `screens/tutor/batch_creation.tsx` | Uses mock data — no Firestore batch collection yet. |
| **AI Chat Backend** | `screens/student/AIChat.tsx` | Full UI but client-side constraint parser only — no LLM API calls. |
| **Platform Statistics** | `screens/admin/PlatformStatistics.tsx` | Mock bar chart data from `data/adminStats.ts`. |

---

## 3. Data Model Status

### Firestore Collections Currently In Use

| Collection | Status | Read By | Written By |
|---|---|---|---|
| `users/{uid}` | ✅ Active | All screens | Auth flow, profile setup |
| `users/{uid}/tutorProfile/default` | ✅ Active | Tutor dashboard, student discovery | Tutor profile setup, admin approval |
| `users/{uid}/studentProfile/default` | ✅ Active | StudentHome, StudentProfile | Student profile setup |
| `users/{uid}/adminProfile/default` | ✅ Active | AdminHome | Admin profile setup |
| `tutors/{uid}` | ✅ Active | StudentHome (marketplace) | Admin approval (`writeBatch`) |
| `tutorVerifications/{uid}` | ✅ Active | VerificationQueue | Tutor submission, admin decisions |
| `tutorProfileUpdates/{uid}` | ✅ Active | VerificationQueue, TutorHome | High-risk edit submission, admin decisions |
| `notifications/{uid}/{autoId}` | ✅ Active | Notification center | Admin decisions |
| `admins/{uid}` | ✅ Active | Root layout (admin detection) | Seed script only |

### Collections NOT YET Created

| Collection | Purpose | Phase |
|---|---|---|
| `enrollments/{id}` | Student enrollment requests | 6.x |
| `batches/{id}` | Tutor group batch management | 6.x |
| `sessions/{id}` | Scheduled tutoring sessions | 6.x |
| `reviews/{id}` | Student reviews of tutors | 6.x |
| `chats/{chatId}/messages/{msgId}` | Real-time messaging | 7.3 |
| `payments/{id}` | eSewa/Khalti transaction records | 7.2 |

---

## 4. Dependency Comparison: EdumentX vs BasoBas

| Capability | EdumentX | BasoBas | Gap |
|---|---|---|---|
| **Auth** | Firebase Auth (Email + Google + Phone OTP) | Clerk | ✅ EdumentX has MORE auth methods |
| **Database** | Firestore (Spark) | Supabase (PostgreSQL + PostGIS) | ⚠️ No spatial queries — need client-side KNN |
| **Storage** | Supabase Storage | Supabase Storage | ✅ Same |
| **Maps** | ❌ None | `expo-maps` (0.12.10) | 🔴 **Critical gap** |
| **Location** | ❌ None | `expo-location` (19.0.8) | 🔴 Need to add |
| **Clustering** | ❌ None | `supercluster` (8.0.1) | 🔴 Need to add |
| **Bottom Sheets** | Custom Modal + PanResponder | `@gorhom/bottom-sheet` (5.2.14) | ⚠️ Works but less polished |
| **Form Validation** | Custom `lib/validation.ts` | `react-hook-form` + `zod` | ⚠️ Works but less structured |
| **Haptics** | ❌ None | `expo-haptics` (15.0.8) | Nice-to-have |
| **Icons** | `@expo/vector-icons` (Ionicons) | `lucide-react-native` | ✅ Both work |
| **State** | Zustand 5 (1 store) | Zustand 4 (6 stores) | ⚠️ EdumentX needs more stores |
| **Payments** | ❌ None | eSewa WebView | 🔴 Phase 7.2 |
| **Blur Effects** | ❌ None | `expo-blur` (15.0.8) | Nice-to-have |

---

## 5. Critical Path: Remaining Features by Priority

### P0 — Must Ship (Core Value Proposition)

1. **Map-Based Tutor Discovery (Phase 5.2–5.4)**
   - Install `expo-maps`, `expo-location`, `supercluster`
   - Add lat/lng coordinates to `TutorLocation` type
   - Build `TutorMap` component (follow BasoBas `AppMap.tsx` pattern)
   - Build `TutorPreviewSheet` (follow BasoBas `PropertyPreviewSheet.tsx`)
   - Build `useTutorClustering` hook (follow BasoBas `useMapClustering.ts`)
   - Build `useCameraBounds` hook (follow BasoBas `useCameraBounds.ts`)
   - Free geocoding via OpenStreetMap Nominatim API
   - Client-side Haversine distance calculation + KNN ranking

2. **Connect Enrollment System to Firestore (Phase 6.x)**
   - Create `enrollments` collection with security rules
   - Wire `Enrollment.tsx` and `tutor_inbox.tsx` to real data

### P1 — High Value

3. **AI Chatbot Backend (Phase 7.1)**
   - Integrate free Groq API (`llama-3.3-70b-versatile`)
   - Feed approved tutor context from Firestore
   - Return structured tutor recommendations

4. **Real-Time Messaging (Phase 7.3)**
   - Create `chats` Firestore collection
   - Build `ChatRoom.tsx` screen with `onSnapshot`

### P2 — Revenue Enabler

5. **eSewa/Khalti Payment Integration (Phase 7.2)**
   - WebView-based payment gateway (follow BasoBas `esewa-webview.tsx` pattern)
   - Transaction records in Firestore
