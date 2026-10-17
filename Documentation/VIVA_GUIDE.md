# EdumentX — Viva Preparation Guide

> **Purpose:** One document to make any team member fully prepared for the
> final minor-project viva. Read this end-to-end and you will know *what* we
> built, *how* every feature works internally, *why* each technology was
> chosen, how the tests work and what results to expect, and how to answer
> the hard questions (including from AI experts and senior app developers).
>
> **Last verified against codebase:** August 25, 2026 (branch `test` @ `b8cd7da`)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Why Each Choice](#2-tech-stack--why-each-choice)
3. [System Architecture](#3-system-architecture)
4. [Feature-by-Feature Deep Dive](#4-feature-by-feature-deep-dive)
   - 4.1 Authentication & Role Flow
   - 4.2 Tutor Discovery & Map Search
   - 4.3 Tutor Details, Reviews & Saved Tutors
   - 4.4 Enrollment System (requests, slots, roster)
   - 4.5 Group Batches
   - 4.6 In-App Messaging & Push Notifications
   - 4.7 AI RAG Chatbot (Tutor Matching)
   - 4.8 AI Verification Pipeline (documents + face)
   - 4.9 eSewa Pro Subscription Payments
   - 4.10 Admin Panel
   - 4.11 Design System & Custom Lint Rules
5. [Testing — Everything You Must Know](#5-testing)
6. [Limitations (Be Honest, Be Ready)](#6-limitations)
7. [Future Enhancements](#7-future-enhancements)
8. [Anticipated Viva Questions & Model Answers](#8-anticipated-viva-questions)
9. [Live Demo Script](#9-live-demo-script)
10. [Key File Map](#10-key-file-map)

---

## 1. Project Overview

**EdumentX** is a cross-platform (Android-first) mobile application that
connects students with private tutors in the Kathmandu Valley, Nepal. It is a
**two-sided marketplace**: students discover, verify, message, and enroll with
tutors; tutors manage capacity, availability, batches, enrollment requests,
and earnings.

### The Problem (memorize these five)

Nepal's private-tuition ("shadow education") market suffers from:

1. **No trust layer** — anyone can claim to be a tutor; no identity or
   document verification.
2. **No discovery tooling** — parents rely on word-of-mouth; there is no way
   to search tutors by subject, grade, location, or budget.
3. **No structured scheduling/enrollment** — everything happens over phone
   calls and paper.
4. **Payment friction** — cash only, no records.
5. **Information asymmetry** — students cannot see reviews, rates, or
   availability before committing.

### The Solution

A verified tutor marketplace with: Firebase-native auth + role system, live
map/list discovery, an AI RAG chatbot that recommends tutors from a curated
knowledge base, an **AI-powered verification pipeline** (OCR name match +
face detection on citizenship documents), structured enrollment with slot
management, real-time messaging with push notifications, group batches, and
eSewa-based Pro subscription payments.

### Team & Scope Facts

- Minor project (final defense), built by 4 team members.
- **Zero-budget constraint was deliberate and central**: no international
  credit card was available, so every service had to run on free tiers.
  This constraint shaped the entire architecture (see §2).
- Later in the project a Blaze (pay-as-you-go) plan was acquired; free-tier
  quotas still apply and costs remain ~$0 at demo scale.

---

## 2. Tech Stack & Why Each Choice

| Layer | Technology | Why this and not X? |
|---|---|---|
| Mobile framework | **React Native via Expo SDK 54** | Cross-platform from one TypeScript codebase; Expo dev-client gives native modules without managing Xcode/Gradle manually. We compile native Android builds (`expo run:android`). |
| Styling | **NativeWind 4.2 (Tailwind for RN)** | Utility-first styling with **design tokens** in `tailwind.config.js`. No inline hex colors anywhere — enforced by our own ESLint rules (§4.11). |
| Navigation | **Expo Router (file-based)** | Routes mirror `src/app/*.tsx` files; redirect guards live in `src/app/_layout.tsx`. |
| Auth | **@react-native-firebase/auth (native SDK)** + Google Sign-In | Native Firebase SDK works offline, has no JS-bridge latency, and supports `signInWithCredential` for Google. **We deliberately avoid Clerk** (a one-day pivot in June 2026 was reverted after Clerk discontinued its Firebase integration template). Phone/SMS auth was rejected because Firebase SMS OTP requires the paid Blaze plan. |
| Primary database | **Cloud Firestore** | Realtime `onSnapshot` listeners power live dashboards without websockets/polling; security rules give per-collection authorization at the database layer. |
| Object storage + vector DB + serverless logic | **Supabase (free tier)** | Supabase Storage (1 GB) holds verification docs & demo videos; **Postgres + pgvector** powers embeddings for the RAG chatbot (Firestore has no vector search on the free tier); **Edge Functions (Deno)** host business logic that must hide API keys. |
| LLM chat | **Groq API (`llama-3.3-70b-versatile`)** | Free dev tier, extremely fast inference, OpenAI-compatible API. Called only through a proxy Edge Function so the key never ships in the app binary. |
| Vision OCR / face checks | **Groq vision (`qwen/qwen3.6-27b`)** + HuggingFace Inference (YOLOv8 face model) | Free tiers again; the vision model extracts names from citizenship certificates, HF detects human faces in profile photos. |
| Payments | **eSewa (sandbox)** | The dominant Nepali e-wallet; official sandbox (`EPAYTEST`) needs no merchant agreement. Implemented as WebView flow (see §4.9). |
| Maps | **react-native-maps + OpenStreetMap UrlTile** + Nominatim geocoding | OSM tiles need **no API key** (Google Maps SDK required billing); Nominatim is keyless geocoding with a 1 req/sec fair-use policy. After acquiring Blaze, a Google Maps key exists in `.env`, but OSM remains the default tile source. |
| Push notifications | **Firebase Cloud Function trigger → Expo Push API** | A v1 Firestore trigger fires on new chat messages and pushes via Expo's free push endpoint using tokens stored on `users/{uid}.pushTokens`. No FCM plumbing needed client-side. |
| CI | **GitHub Actions** (`.github/workflows/ci.yml`) | Typecheck + lint + unit tests + Firestore-emulator rule suites on every push to `main`. |

**The one-sentence architecture pitch:** *"Identity, primary data, and
security rules live in Firebase; files, vectors, and key-holding logic live
in Supabase; AI runs on Groq/HuggingFace free tiers; payments ride eSewa's
sandbox — all orchestrated from a single React Native codebase."*

---

## 3. System Architecture

```
┌─────────────────────────── React Native App (Expo) ───────────────────────────┐
│  src/app (expo-router routes)                                                 │
│  src/screens (student / tutor / admin / auth / shared)                        │
│  src/services/*  ← repository pattern, each domain has:                       │
│      Interface.ts  ·  Firebase*Repository.ts  ·  Mock*Repository.ts           │
│      dataSource.ts (selector gated by EXPO_PUBLIC_USE_MOCK_DATA)              │
└──────┬────────────────────────┬───────────────────────────┬──────────────────┘
       │                        │                           │
       ▼                        ▼                           ▼
  Firebase                  Supabase                    Third-party AI
  ─────────                 ─────────                   ──────────────
  Auth (email+Google)       Postgres + pgvector         Groq (chat LLM +
  Firestore (users,         hybrid_search_tutors()       vision OCR)
    tutors, enrollments,    Storage buckets:            HuggingFace (face
    roster, requests,         private-verification-docs  detection YOLOv8)
    batches, conversations,   (PRIVATE, signed-URL only) Expo Push API
    messages, reviews,        tutor-demo-videos (public) (notifications)
    transactions)           Edge Functions:
  Cloud Functions             chat, groq-proxy,
    onNewChatMessage          create-esewa-order,
    (push trigger)            verify-identity,
                              upload-verification-doc,
                              verification-doc-url
```

### Architectural patterns you should be able to name

1. **Repository pattern with data-source switching** — every domain
   (`enrollments`, `messages`, `batches`, `tutors`, `subscription`,
   `savedTutors`) defines an interface plus Firebase and Mock
   implementations. `dataSource.ts` picks one based on
   `EXPO_PUBLIC_USE_MOCK_DATA`. Benefit: UI is testable without network, and
   swapping backends touches one file.
2. **Derived state over duplicated collections** — "today's sessions" is not
   stored anywhere; it's computed from the live roster by matching each
   enrollment's `slotKey` day against today's Asia/Kathmandu weekday and the
   `[startDate, endDate]` window (`services/enrollments/derived.ts`).
   Single source of truth, zero write amplification.
3. **Server-side authority everywhere sensitive** — Firestore security rules
   enforce ownership; Edge Functions verify Firebase JWTs before touching
   storage or secrets; payment verification re-checks signatures server-side.
4. **Realtime-first UI** — dashboards subscribe via `onSnapshot`; there are
   no manual refresh buttons because data pushes itself.

---

## 4. Feature-by-Feature Deep Dive

For each feature: **what it does → how it's implemented → why it matters**.
These are exactly the three questions examiners ask.

---

### 4.1 Authentication & Role Flow

**What:** Email+password signup with email verification, Google Sign-In,
role selection (student/tutor), and role-specific profile onboarding.

**How:**

- Entry point: `src/screens/auth/EmailSignUp.tsx` hosts signup/login toggle
  AND the Google button. On signup it calls
  `createUserWithEmailAndPassword` then `sendEmailVerification`, and shows a
  "check your inbox" panel whose **"I've verified — continue"** button calls
  `auth.currentUser.reload()` — this is essential because the cached User
  object keeps a stale `emailVerified=false` otherwise.
- Routing ("Source of Truth"): `src/app/_layout.tsx` runs a 5-step redirect
  tree whenever `user`/`role`/segments change:
  1. wait for root navigator mount (`useRootNavigationState()`),
  2. no user → `/email-signup`
  3. user but unverified (password provider) → stay on email-signup panel
  4. verified but no role doc → `/role-selection`
  5. role present → matching dashboard.
- The role is read **inside** the `onAuthStateChanged` callback and written
  into the Zustand store (`src/store/authStore.ts`) *before* the redirect
  effect runs — this fixed the "Amnesia Login Loop" bug where existing users
  were bounced back to role-selection on every login.
- Profiles write to subcollections:
  `users/{uid}/studentProfile/default` (username, phone, grade, subjects,
  location) and `users/{uid}/tutorProfile/default` (headline, bio,
  `monthlyRateNpr`, capacity).

**Why:** Native Firebase SDK avoids bridge overhead and works with Google
Sign-In credentials directly. Reading the role inside the auth callback
guarantees the guard sees consistent state on first render.

**Known bug stories (great viva material):**
- *Bug #4:* without `reload()`, `emailVerified` stays stale forever.
- *Bug #1:* role read in a separate effect raced the redirect effect.
- *Location field:* minimum city length had to be 3 chars, not 2
  (`components/forms/LocationField.tsx`).

---

### 4.2 Tutor Discovery & Map Search

**What:** Live list of available tutors + an interactive map with custom
pins, distance ranking, and place search.

**How:**

- `subscribeTutors` (in `services/tutors/FirebaseTutorRepository.ts`) queries
  `tutors/{uid}` filtered `where("isAvailableForNewStudents", "==", true)`.
  That flag is written by the tutor dashboard toggle through a **rules
  carve-out**: the owner may update ONLY that field (+updatedAt), enforced
  with `affectedKeys().hasOnly(...)` in `firebase/firestore.rules`.
- **Live rating overlay:** discovery docs mirror `rating`/`reviewCount` only
  at admin approval time (docs are admin-write-only). So the repository adds
  ONE `collectionGroup("reviews")` subscription (status=="active") grouped by
  `tutorUid`, and overlays fresh aggregates onto every listing card. One
  listener covers all tutors — no extra indexes needed since the query has no
  filters.
- **Map:** `react-native-maps` with `<UrlTile>` rendering OpenStreetMap tiles
  (no API key). Pins are custom markers rendering the tutor's photo in a
  styled circle, with `tracksViewChanges={false}` set after image load so
  panning stays smooth (a known RN maps perf technique).
- **Ranking:** tutors sorted by **Haversine great-circle distance** from the
  student's location, with stable promotion of Pro-tier tutors to the front.
  Distance math lives in `src/lib/location/distance.ts`.
- **Geocoding/place search:** Nominatim (keyless), throttled to respect its
  1 req/sec fair-use limit.

**Why:** OSM tiles keep us keyless/zero-cost; Haversine is O(n) per render
with n ≈ dozens of tutors, so client-side KNN-style nearest-neighbor ranking
is appropriate — no backend geo-index needed.

---

### 4.3 Tutor Details, Reviews & Saved Tutors

- `TutorDetailsScreen` fetches the profile, then subscribes to
  `reviews/{tutorUid}/reviews` and merges live rating, count, star breakdown,
  category averages and the review LIST over the mirrored aggregates
  (`mergeLiveReviews`). Review docs carry optional `categoryRatings`.
- Writing a review updates the student's own review doc; rules ensure a
  student can only write reviews tied to real enrollments.
- **Saved tutors** (`services/savedTutors/`): stored as a uid-keyed map on
  `users/{uid}/studentProfile/default`. `toggleSavedTutor` flips one key with
  `deleteField()` in a single `setDoc(merge)`. Both the heart button on
  TutorDetails and the `/saved-tutors` list subscribe to it. No rules change
  was needed — the owner-subcollection wildcard already covered it.

---

### 4.4 Enrollment System

**What:** Student sends an enrollment request → tutor accepts (picking a
concrete weekly slot) → student lands on the tutor's roster.

**How (know these collection paths):**

- Requests: `enrollmentRequests/{tutorUid}/requests/{id}` (status: pending /
  accepted / declined).
- Roster: `enrollments/{tutorUid}/roster/{enrollmentId}` — active enrollments
  with `slotKey`, `[startDate, endDate]`, seats info.
- **slotKey format is `"<day>:<slot>"`**, e.g. `mon:5-7`. Built by `slotKey()`
  and parsed by `parseSlotKey` in `services/enrollments/types.ts`. A malformed
  key (like `mon-5-7`) parses to `null` and is silently excluded from derived
  views; `derived.ts` logs a warn-once. **Writers must use colons.**
- Accept flow: `TutorInbox` shows pending cards; accept opens a slot-picker
  sheet fed by `subscribeAvailability` + `subscribeEnrollments` +
  `subscribeBatches` (so already-booked slots show disabled); calling
  `acceptRequest` requires a concrete slotKey and runs a transaction that
  creates the roster entry and deletes the request. Decline hard-deletes.
- Capacity: `tutorProfile.capacity` + booked-map gives remaining seats;
  `deriveTodaySessions` computes today's teaching schedule (KTM timezone).

**Why transactions:** accepting concurrently from two devices could double-
book a slot or lose a request; the Firestore transaction makes read-check-
write atomic.

---

### 4.5 Group Batches

- `services/batches/` mirrors the repository pattern. Batch creation is a
  3-step wizard in `BatchCreation.tsx`; the student picker reads the live
  active roster (only enrolled students can join a batch).
- Creation goes through a `createBatch` transaction (capacity check);
  member add/remove and `endBatch` use direct document paths (no expensive
  `collectionGroup` scans).
- Students browse joinable batches via `/browse-batches`.

---

### 4.6 In-App Messaging & Push Notifications

**Schema:** `conversations/{conversationId}` with a `messages` subcollection.

- **conversationId = sorted participant UIDs joined by `__`**
  (`conversationKey(a,b)`). Either side addresses the same thread with no
  lookup query — this kills race conditions where two threads get created.
- Each participant self-writes their own display `meta` (name/avatar) into
  the conversation doc, so listing the inbox needs **no cross-user reads**
  (which rules would forbid).
- Rules caveat worth mentioning: list-membership ops (`in`, `hasAny`) and
  bare `auth` checks fail the local emulator with "Null value error", so the
  conversation rules use scalar `participantA`/`participantB == request.auth.uid`
  comparisons; the hub inbox query filters with a composite `or()` on those
  scalars — NOT `array-contains` on a participants array (that shape is
  unprovable against the scalar rules and 403'd until the Aug 2026 fix;
  locked in by `messagesRulesTest.mjs` §1b).
- Messages have read receipts: `status`/`readAt` fields with their own rules
  carve-out (recipient may flip status only).
- Unread badge: `useUnreadCount` hook counts unread per conversation.
- **Push when app is closed:** `functions/src/index.ts` deploys
  `onNewChatMessage` — a Firestore trigger that reads the recipient's
  `pushTokens` and POSTs to the **Expo Push API** (free). It skips self-echo
  and read-receipt writes. Cost: ≤2 reads + 1 write per message.

**Why this design:** the sorted-pair ID and self-written meta remove every
cross-document permission dependency, which keeps security rules simple and
provably correct.

---

### 4.7 AI RAG Chatbot (Tutor Matching)

**What:** `/AI-chat` — students describe what they need ("grade 10 maths
tutor near Baneshwor under 4000/month") and get tutor recommendations
grounded in real database rows.

**Pipeline (RAG — Retrieval-Augmented Generation):**

1. **Embedding:** the student query is embedded (Supabase-hosted embedding
   endpoint) into a pgvector vector.
2. **Hybrid retrieval:** Postgres function `hybrid_search_tutors()`
   (migration 010, IVFFlat index from migration 011) combines:
   - **semantic similarity** (cosine distance between query embedding and
     tutor embeddings),
   - **keyword/full-text match** (subject names etc.),
   - structured filters (grade, rate ceiling, gender, tutoring mode,
     languages).
   Called via `supabase.rpc("hybrid_search_tutors", ...)` from
   `supabase/ai/retrieval/hybridSearch.ts`.
3. **Generation:** retrieved tutor rows are injected into the prompt; Groq's
   `llama-3.3-70b-versatile` composes the answer **citing only retrieved
   tutors** (grounding). Client entry: `src/services/ai/chatService.ts`.
4. **Guardrails:** rate limiting (migration 012 adds rate-limit tables),
   embedding cache (migration 006) to cut repeated embedding cost, and the
   whole thing is proxied through the `chat`/`groq-proxy` Edge Functions so
   API keys never reach the client.

**Why RAG instead of fine-tuning:** the tutor catalog changes constantly;
fine-tuning would freeze knowledge at training time. RAG retrieves live rows
so answers always reflect current availability/rates, and hallucination risk
drops because the model is instructed to ground claims in provided context.

**If asked "why hybrid search?":** pure vector search misses exact keywords
("SEE", subject codes); pure keyword search misses paraphrases ("maths
teacher near me"). Hybrid union of both scores handles both failure modes.

---

### 4.8 AI Verification Pipeline (the flagship feature)

**What:** When a tutor uploads a citizenship/ID document and a profile
photo, an automated pipeline pre-screens them before an admin ever looks.

**Flow:**

1. **Upload:** client calls `uploadVerificationDoc` Edge Function with the
   file + Firebase ID token. The function verifies the JWT, derives the
   path `${uid}/${kind}.${ext}` **from the token only** (never the request
   body), and writes to the PRIVATE bucket `private-verification-docs` with
   the service role. Clients have NO direct write access anymore
   (migration 017 dropped all anon write policies). Path isolation means a
   malicious client cannot overwrite another user's documents.
2. **Analysis — `verify-identity` Edge Function:**
   - **Name extraction:** crops of the ID go to Groq vision
     (`qwen/qwen3.6-27b`); extracted name is fuzzy-compared to the profile
     name (normalized Levenshtein-style similarity, tolerant of OCR typos
     like "KHADEKA" vs "KHADKA").
   - **Face detection:** profile photo checked for a real human face via
     HuggingFace inference (YOLOv8 face model) — rejects cartoons/pets/blank
     images.
   - **Verdict:** `approved` (both checks pass, auto-approved straight into
     the admin flow), else `manual_review` with reasons. If any external
     service fails, it fails OPEN to manual_review (never silently approves).
3. **Reads:** PII documents are readable ONLY through short-lived (~10 min)
   **signed URLs** minted by `verification-doc-url` (which itself verifies
   admin/owner claims). The bucket has public=false; no anon SELECT policy
   exists.
4. **Admin queue:** `/verification-queue` shows submissions with the AI
   pre-screen verdict attached; clear passes are auto-approvable, doubtful
   ones surface reasons to the admin.

**Honest war stories (excellent viva answers):**
- The original vision model (`llama-3.2-11b-vision-preview`) got
  decommissioned by Groq mid-project → migrated to `qwen/qwen3.6-27b` and
  added `reasoning_effort:"none"` because Qwen emitted `<think>` tokens into
  extracted text (we saw literally `"The user wants the full name..."` as an
  "extracted name"). Lesson: parse defensively around LLM output.
- Nepali citizenship certificates carry both Devanagari and English text;
  early runs picked the wrong script and failed matching → prompt now
  prefers the English field.
- HuggingFace DNS failures taught us fail-open design: verification degrades
  to manual review rather than erroring the user out.

---

### 4.9 eSewa Pro Subscription Payments

**What:** Tutors buy a "Pro" subscription via eSewa, which promotes them in
discovery ranking.

**Flow (WebView, documented in
`Documentation/05-Build-and-Deploy/esewa_integration.md`):**

1. Client asks `create-esewa-order` Edge Function → creates a row in the
   `transactions` table (Supabase Postgres, migration 015) and returns the
   signed eSewa form payload (amount, product code, unique transaction UUID,
   HMAC-SHA256 signature with the secret key).
2. App opens eSewa's hosted payment page in a **react-native-webview**
   (sandbox: https://rc.esewa.com.np, credential `EPAYTEST`).
3. eSewa redirects back with the signed response; the app calls the verify
   path, which:
   - re-verifies the HMAC signature (tamper detection),
   - performs the documented **GET status check** against eSewa's status API
     (server-side confirmation — never trusts the client redirect alone),
   - enforces **replay protection** via the `transactions` table: each
     transaction UUID can complete once; duplicate callbacks are idempotent.
4. On success the subscription repo flips the tutor's pro flag in Firestore.

**Why WebView and not the deprecated Android SDK:** eSewa's official Android
SDK approach is deprecated; the WebView form-post flow is the currently
documented integration and works identically on any platform.

**Security points to name-drop:** server-side order creation, signature
verification, independent status polling, idempotency/replay protection,
and the fact that success is never inferred from the client URL alone.

---

### 4.10 Admin Panel

- `/admin-home`: **Platform Statistics** uses `getCountFromServer` for real
  counts (users, approved tutors, pending requests) with loading/error/retry
  states — the fabricated mock-stats module was deleted.
- `/verification-queue`: sees AI pre-screen verdicts + documents via signed
  URLs; approve/reject flips `verificationStatus` and mirrors the tutor into
  the public `tutors/{uid}` collection (defaulting
  `isAvailableForNewStudents: true`).
- `/user-management`, AdminNav shared bottom bar.

---

### 4.11 Design System & Custom Lint Rules

- All colors/radii come from tokens in `tailwind.config.js`
  (`bg-night`, `text-amber`, `border-border`, `rounded-card`, …).
  Dark surfaces use `text-glass-secondary`/`text-glass-muted` for contrast.
- **Five custom ESLint rules** (`eslint-rules/design-tokens.js`, registered
  in `eslint.config.js`) enforce this mechanically:
  1. `no-raw-hex-placeholder` — placeholderTextColor must use tokens,
  2. `no-raw-hex-color-prop` — `color="#…"` props (Ionicons, indicators),
  3. `no-raw-hex-inline-color` — inline backgroundColor/border colors
     (pure-black scrims exempt),
  4. `no-non-token-radius` — only token radii allowed (`rounded-2xl`,
     `rounded-[12px]` etc. are violations),
  5. `no-non-token-color-class` — Tailwind default palette shades
     (`text-slate-300`) banned in classNames, including inside template
     literals/ternaries.
- Why an examiner should care: it demonstrates we engineered *maintainability
  and consistency* into the codebase, and even wrote meta-tests for our lint
  rules (21 tests) so the rules themselves can't regress.

---

## 5. Testing

### Why we test (the framing examiners want)

- **Regression safety:** this project went through major pivots (Clerk→native
  Firebase, mock→production data sources). Tests are what let us refactor
  aggressively without breaking derived logic like slot parsing or timezone
  math.
- **Pure-function coverage:** the riskiest logic (timezone conversion, slot
  keys, distance math, seat arithmetic) is extracted into pure functions —
  cheap to test exhaustively, no emulator needed.
- **Security-as-tests:** Firestore rules are code; if they're not tested,
  they're unverified. Our rule suites act as adversarial clients against the
  emulator.
- **CI enforcement:** `.github/workflows/ci.yml` runs typecheck → lint
  (incl. custom rules) → unit tests → emulator rule suites on push to main.

### Suite 1 — `npm run test:derived` (64 tests, all passing)

File: `scripts/testDerived.ts` run with Node's built-in test runner
(`node --test`). Covers every pure helper in
`services/enrollments/derived.ts` + `types.ts`:

| Area | Example case | Expected result |
|---|---|---|
| Asia/Kathmandu date helpers | `todayIsoInKtm` near midnight UTC+5:45 | Returns the KTM calendar date, not UTC's |
| slotKey parsing | `"mon:5-7"` → `{day:"mon", slot:"5-7"}`; `"mon-5-7"` → `null` | Malformed keys excluded silently, warn-once logged |
| Today-sessions derivation | enrollment whose slot day == today's KTM weekday AND start≤today≤end | Appears in today's sessions; others don't |
| Booked-map / capacity | overlapping accepted enrollments on same slot | Seat count decrements correctly; full slots flagged unavailable |
| Haversine distance | two known Kathmandu coordinates | ~5.32 km matches hand-computed great-circle value |

**Expected console output:** `ℹ tests 64 · ℹ pass 64 · ℹ fail 0`.

### Suite 2 — `npm run test:lint-rules` (21 tests, all passing)

Meta-tests for the five design-token ESLint rules above: feed valid/invalid
className strings and props, assert each rule flags exactly the right cases
(including template-literal-nested classes). Expected: `tests 21, pass 21`.

### Suite 3 — `npm run test:rules` (two stages)

**Stage 1 — drift check:** `checkDeployedRules.mjs` fetches the LIVE
ruleset from the Firebase Rules API and diffs against local
`firebase/firestore.rules`. Fails on any drift (needs
`GOOGLE_APPLICATION_CREDENTIALS`).

**Stage 2 — emulator suites:** boots the Firestore emulator with LOCAL rules
(`firebase emulators:exec --only firestore --project demo-edumentx`) and
speaks raw REST as adversarial clients across EIGHT suites:

| Suite | What it proves |
|---|---|
| `userRulesTest` | users/{uid} ownership boundaries |
| `rulesEmulationTest` | tutors/{uid} availability carve-out (owner can touch ONLY that flag) |
| `batchesRulesTest` | batch CRUD permissions |
| `acceptRequestRulesTest` | acceptRequest transaction paths incl. legacy profile carve-out + student fast-forward endDate QA carve-out |
| `messagesRulesTest` | conversation participant gates incl. hub `or()` scalar query (§1b locks the fix) + read-receipt carve-out |
| `reviewsListRulesTest` | reviews list rule (via parent-query form — emulator can't do collectionGroup queries) |
| `removeEnrollmentRulesTest` | cascade deletion permissions |
| `tutorDetailsRulesTest` | read paths on the details screen |

Note the honest caveat: the local emulator's `runQuery` cannot execute
`collectionGroupId` queries (HTTP 400), so the reviews suite exercises the
same underlying `list` rule via the document-parent query form instead.

### Suite 4 — Smoke tests (live, credentialed)

`smokeTest{Enrollments,Reviews,BatchesBrowse,Messages,TutorDetails}.ts`
act as REAL signed-in clients against deployed rules — end-to-end proof the
shipped configuration permits legitimate flows. Four of them also run in CI
(credentialed job, gated on GitHub secrets, skips PRs).

### How to answer "are your reported numbers real?"

Every number in the report was audited against actual runs: 64 unit tests,
21 lint tests, 8 rule suites, 5 smoke scripts — rerun any of them live in
front of the examiner with the commands above. Observed AI-verification
behaviors quoted in the report (exact-match auto-approval with confidence
1.0, the deliberate-typo case scoring 0.615 → manual review, face score 0.9)
come from real Supabase Edge Function logs.

---

## 6. Limitations

State these proactively — owning limitations reads far better than being caught:

1. **Android-first QA.** An iOS project exists (`ios/` generated, pods
   installed, compiles) but systematic on-device iOS testing hasn't been
   done. iOS maps would fall back to Apple Maps since Google Maps
   credentials are Android-only.
2. **eSewa is sandbox-only.** Real settlement requires merchant onboarding
   with eSewa; demo uses `EPAYTEST` credentials.
3. **In-person focus.** Sessions are physical; there's no online tutoring
   mode (video/whiteboard).
4. **Kathmandu Valley coverage.** Seed/discovery data is KTM-centric;
   Nominatim's fair-use (~1 req/s) limits geocoding throughput.
5. **Push delivery variance.** Background notification delivery depends on
   vendor battery optimization (Realme/Xiaomi aggressively kill background
   processes); the pipeline is deployed and probe-verified but per-device
   behavior varies.
6. **Storage-layer upload isolation is functional, not per-user at RLS
   level.** Because the app authenticates with Firebase (not Supabase
   auth), `auth.uid()` is null in storage policies — isolation is enforced
   by the JWT-verifying gateway function instead (defense moved up a layer).

---

## 7. Future Enhancements

1. **iOS release** — complete on-device QA of the existing build,
   provision Google Maps for iOS, TestFlight distribution.
2. **Production payments** — real eSewa/Khalti merchant credentials,
   receipts, refund flows.
3. **Online tutoring mode** — integrate video sessions + digital whiteboard.
4. **Nepali language support** — i18n across all screens.
5. **Tutor analytics** — earnings trends, demand heatmaps from search data.
6. *(Removed deliberately: generic "cloud push notifications" — it's already
   implemented via the Cloud Function + Expo push pipeline.)*

---

## 8. Anticipated Viva Questions

### Architecture & General

**Q: Why two backends (Firebase AND Supabase)? Isn't that complexity?**
A: Deliberate division of strengths under a zero-budget constraint. Firebase
gives best-in-class native mobile auth and realtime Firestore listeners.
Supabase provides what Firebase's free tier cannot: Postgres with pgvector
for semantic search, SQL for hybrid retrieval joins, and Edge Functions to
hold secrets. Each piece does what it's uniquely good at; the seam is hidden
behind repository interfaces so either could be swapped.

**Q: Why not move everything to Firebase now that you're on Blaze?**
A: Working RAG infrastructure (pgvector, hybrid search SQL, migrations
001–015) is battle-tested; migrating mid-project buys no user-visible value
before the deadline. Consolidation is planned future work, not a necessity.

**Q: How do you handle offline / poor connectivity?**
A: Firestore persists cache and queues writes offline automatically; the UI
reads from snapshots so cached data still renders. Supabase-backed features
(chat, uploads) require connectivity and surface explicit error states.

**Q: Walk me through what happens when the app cold-starts.**
A: `_layout.tsx` mounts GestureHandlerRootView → SafeAreaProvider → Stack.
`onAuthStateChanged` fires; role is read inside that callback into Zustand;
once `useRootNavigationState()` reports mounted, the redirect tree routes to
signup / role-selection / dashboard. Meanwhile `dataSource.ts` logs which
repository implementation activated.

### React Native / UI questions

**Q: Why NativeWind over StyleSheet or a component library like Tamagui?**
A: Tokens-in-Tailwind gives us a documented, enforced design language
without pulling a heavy dependency; we actually removed Tamagui in an early
cleanup. Inline styles are banned by convention and partially by lint.

**Q: How do you keep map scrolling smooth with photo pins?**
A: Marker content is rendered once, then `tracksViewChanges={false}` stops
the native marker from re-rendering every frame — the standard fix for RN
maps marker jank.

**Q: How do you prevent jank in lists?**
A: FlatList virtualization, memoized card components, and derived values
computed outside render paths.

### Firebase / Firestore

**Q: What are Firestore security rules and show me a nontrivial one.**
A: Server-enforced conditions attached to document paths. Nontrivial example:
the tutors availability carve-out allows the owner to update only
`isAvailableForNewStudents` + `updatedAt` using
`request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`.
Any other field in the update → denied.

**Q: What's a composite index and did you need any?**
A: Firestore requires indexes for queries filtering+ordering on multiple
fields; ours are declared in `firestore.indexes.json` (deployed via
`deploy:indexes`).

**Q: Why `onSnapshot` instead of `getDocs`?**
A: Snapshots push deltas — dashboards update live (new request appears
instantly) with no polling loop; getDocs would need manual refresh and waste
reads.

**Q: What's a collectionGroup query and where do you use it?**
A: Queries across all subcollections sharing a name — we use
`collectionGroup("reviews")` once, centrally, to overlay live ratings onto
every tutor listing.

**Q: Why did array-contains break your messages inbox?**
A: Our rules validate scalar `participantA`/`participantB`; an
array-contains-on-participants query shape can't be authorized by those
scalar checks (emulator returned Null-value errors / 403s), so the inbox
queries with a composite `or()` on the scalars — and we wrote a regression
rule-test locking that in.

### AI / ML (expect depth here)

**Q: Explain RAG in one minute.**
A: Retrieval-Augmented Generation: embed the user query, retrieve relevant
records (hybrid vector + keyword search over the tutor table), inject them
into the LLM prompt, and instruct the model to answer using only that
context. Grounding reduces hallucination and keeps answers current with the
live database.

**Q: Why Groq's llama-3.3-70b? Why not GPT-4/Claude/local models?**
A: Zero budget → free-tier constraint; Groq offers fast inference on strong
open models at no cost for dev volume, behind an OpenAI-compatible API.
GPT-4-class APIs need cards; local models on-device can't fit 70B quality.

**Q: What is hybrid search and why not pure vector search?**
A: Combined cosine-similarity (pgvector) + PostgreSQL full-text/keyword
scoring, fused in the `hybrid_search_tutors()` SQL function (migrations
007→013→014 refined it). Vectors catch paraphrases; keywords catch exact
terms neither embedding nor the other alone handles reliably.

**Q: What's an IVFFlat index?**
A: An approximate-nearest-neighbor index for pgvector — clusters vectors
into lists and searches only the closest clusters, trading a little recall
for large speedups (migration 011).

**Q: How do you stop the LLM from hallucinating tutors that don't exist?**
A: Strict grounding instructions + the retrieved-row contract; the model
composes from supplied JSON rows only. Rate limiting and caching protect
against abuse/cost (migration 006/012).

**Q: Tell me about a real AI failure you debugged.** ⭐
A: After switching vision models, Qwen emitted `<think>…</think>` reasoning
tokens into the "extracted name" field — our similarity check compared the
entire reasoning trace against the profile name and failed everyone. Fixed
by disabling reasoning output (`reasoning_effort:"none"`) and sanitizing
extraction. Also: decommissioned Groq vision model (400 model_decommissioned
errors) forced a mid-project migration, and Nepali/Devanagari script mixing
taught us to prefer the English fields on citizenship certificates.

**Q: Is auto-approval safe? What if someone uploads someone else's ID?**
A: Auto-approve requires BOTH a confident name match AND a detected human
face; anything ambiguous goes to manual_review with printed reasons, and the
admin sees the AI verdict plus the actual documents (signed URLs). External
service failures fail open to manual review — automation accelerates the
queue, it doesn't bypass it.

### Security

**Q: Where are your API keys?**
A: Never in the client bundle. Groq/HF/eSewa secrets live in Supabase Edge
Function environment variables; the app talks to our functions, which talk
to providers. Only public anon keys ship in `.env` (placeholders in
`.env.example`).

**Q: How is document privacy enforced?**
A: Bucket is private (public=false, migration 016); zero anon SELECT
policies; reads only via ~10-minute signed URLs minted by an admin-gated
function; writes only through the JWT-verifying upload gateway (017 dropped
anon writes entirely).

**Q: What prevents replaying a successful payment callback?**
A: Every order has a unique UUID recorded in `transactions` before redirect;
completion transitions are idempotent per UUID, and the server independently
confirms status with eSewa's GET status API — a replayed callback finds the
transaction already finalized.

**Q: JWT vs session cookies for a mobile app?**
A: Stateless bearer tokens fit REST/function calls, survive app restarts via
secure refresh-token rotation handled by the native Firebase SDK, and verify
cheaply server-side (jose in Edge Functions).

### Testing

**Q: Why node:test instead of Jest?**
A: Zero dependencies, first-class TS-friendly runner via compiled output,
perfectly adequate for pure-function suites — fewer moving parts in CI.

**Q: What CAN'T your tests cover?**
A: True device behavior (touch latency, vendor battery managers),
collectionGroup queries in the emulator, and live third-party model
behavior — those are covered by smoke tests against production and manual
device QA instead.

**Q: Your report mentions specific AI confidence numbers — where from?**
A: Real Supabase invocation logs: exact-name-match approval at confidence
1.0, and a deliberately-introduced typo case ("KHADEKA" vs "KHADKA")
scoring 0.615 → manual_review. Happy to pull the logs live.

### Payments / Product

**Q: Why subscriptions instead of commission per session?**
A: Predictable tutor-facing pricing, no need to broker money between
student and tutor (cash remains normal in Nepal), aligns with zero-budget
(no payment aggregation license needed).

**Q: What does Pro actually change?**
A: Stable promotion ahead of non-pro tutors in discovery ranking — visible,
honest value, implemented in the ranking step of map/list search.

---

## 9. Live Demo Script (≈7 minutes)

1. **Auth (60s):** sign up with email → verification panel → login with an
   existing account (mention the reload()/amnesia-loop bugs as you go).
2. **Student discovery (90s):** student home live data → map search with
   photo pins, distance ordering → open a tutor detail (live reviews,
   heart/save).
3. **AI chat (60s):** ask "grade 10 science tutor near Koteshwor" — point
   out grounded recommendations.
4. **Enrollment round-trip (90s):** send request as student → switch to the
   tutor account → inbox → accept with slot picker → back to student, show
   enrollment + today's sessions derived live.
5. **Verification (60s):** tutor uploads citizenship + selfie → show the
   Supabase function log verdict → admin queue with AI pre-screen.
6. **Payments (30s):** Pro upgrade → eSewa sandbox WebView → success screen
   → Pro badge in discovery.
7. **Tests (30s):** run `npm run test:derived` live — 64/64 green.

Backup plan: screen-record the full flow beforehand in case of network
failure.

---

## 10. Key File Map

| Area | Path |
|---|---|
| Routing guards / auth listener | `src/app/_layout.tsx` |
| Auth screens | `src/screens/auth/EmailSignUp.tsx`, `RoleSelection.tsx`, `*ProfileScreen.tsx` |
| Auth service | `src/services/firebase/authService.ts` |
| Enrollment domain | `src/services/enrollments/` (types.ts = slotKey, derived.ts = pure logic) |
| Messaging domain | `src/services/messages/` (+ `useUnreadCount.ts`) |
| Batches domain | `src/services/batches/` |
| Tutors domain + live ratings | `src/services/tutors/FirebaseTutorRepository.ts` |
| Subscription domain | `src/services/subscription/` |
| Saved tutors | `src/services/savedTutors/` |
| Distance / geo math | `src/lib/location/distance.ts` |
| Tutor availability writer | `src/lib/tutor/firestoreTutorService.ts` |
| AI chat client | `src/services/ai/chatService.ts`, `supabase/ai/**` (retrieval in `supabase/ai/retrieval/hybridSearch.ts`) |
| Verification client | `src/services/verification/aiReview.ts` |
| Upload gateway client | `src/services/supabase/storage.ts` |
| Edge Functions | `supabase/functions/` — `chat`, `groq-proxy`, `create-esewa-order`, `verify-identity`, `upload-verification-doc`, `verification-doc-url` |
| Push trigger | `functions/src/index.ts` |
| Security rules | `firebase/firestore.rules` (+ `firebase/firestore.indexes.json`) |
| DB migrations | `supabase/migrations/001…017` |
| Unit tests | `scripts/testDerived.ts`, `scripts/testLintRules.ts` |
| Rule suites | `scripts/*RulesTest.mjs` |
| Smoke tests | `scripts/smokeTest*.ts` |
| Custom lint rules | `eslint-rules/design-tokens.js` |
| Design tokens | `tailwind.config.js`, `src/constants/colors.ts` |
| CI | `.github/workflows/ci.yml` |
| Final report | `Documentation/97-Educational_Contents/EdumentX_Final_Minor_Report/main.tex` |
| eSewa integration doc | `Documentation/05-Build-and-Deploy/esewa_integration.md` |
| Known runtime issues | `Documentation/01-Architecture/KNOWN_RUNTIME_ISSUES.md` |

---

*Good luck — you built something genuinely non-trivial: a verified,
realtime, AI-assisted tutoring marketplace running at effectively zero cost.
Own the story, including the bugs you fixed along the way.*
