# Gemini Deep Research Plan — EdumentX Final Defense (definitive, Aug 2026)

**How to use:** copy the fenced block at the bottom into Gemini (or any research agent)
verbatim. It is self-contained: it tells the agent which files to read, what to verify,
what to decide, and how to output. Update the date if reused later.

---

## Why this plan exists

EdumentX is a React Native (Expo SDK 54) tutor-marketplace demo for a college defense.
It runs on a **Firebase Blaze** project (billing on, budget $0 target) with a mixed
backend: Firebase (Auth, Firestore, rules) + Supabase (Storage, Edge Functions, Postgres
for the RAG chat + eSewa ledger) + Groq/HuggingFace (LLM/embeddings). The demo is
**Android-only**. A Pro-Tutor subscription with eSewa is **already implemented**.

The plan below consolidates every research question raised across planning sessions:
payments, backend consolidation, Blaze feature exploitation, map/pin/place UX, push
notifications, publishing, multi-agent execution, and report-grade testing.

---

## Fixed decisions (do NOT re-litigate)

1. **Android-only demo.** iOS is out (no Apple account). All work must be demoable on an
   Android device. FCM push is fine; APNs is not needed.
2. **RAG chat stays on Supabase** (Groq + pgvector hybrid search). It works and is
   LLM-bound — migrating gains nothing visible. Revisit **only if time allows**, after
   everything else.
3. **eSewa subscription is already built** — research deployment/testing, not architecture.
4. **All migration work happens on the `test` branch** (backup strategy: other branches
   keep the known-good state). Every change merges through CI (`npm run check` +
   `test:rules`).
5. **Cost must stay $0 at demo traffic.** Budget alert + spend caps in place. No live
   eSewa keys, no paid LLM, no `gemini-2.5-*` (shuts down Oct 2026).

---

## Research topics (in defense-value order)

### T1 — eSewa: deploy + sandbox verification (highest priority, already coded)
Read `Documentation/05-Build-and-Deploy/esewa_integration.md`,
`supabase/functions/create-esewa-order/index.ts`, `supabase/functions/_shared/esewa.ts`,
`supabase/migrations/015_create_transactions.sql`, `src/services/subscription/*`.
Research the exact steps and produce a test walkthrough proving: single grant on success,
replay → `alreadyGranted` (no stacking), tampered callback → `signature_mismatch`,
status-API down → retry-safe (`status_check_unavailable`). Verify the GET
`/api/epay/transaction/status/` call against eSewa's current docs (host has varied).

### T2 — Firebase Storage migration (the "slow documents" fix)
Read `src/services/supabase/storage.ts`, `src/lib/verification/documents.ts`,
`src/components/forms/DocumentUploader.tsx`, `src/components/forms/AvatarUploader.tsx`.
Research: Firebase Cloud Storage (5 GB free, Google CDN) vs Supabase Storage (1 GB) —
latency reality in South Asia, rules port into the existing `firestore.rules` file,
client swap (keep the same function signatures so screens don't change), and whether
verification-doc access rules get simpler on one platform. Give a concrete
`storage.rules` draft.

### T3 — Small-function ports to Cloud Functions (optional, if "100% Firebase" story matters)
Research porting `create-esewa-order` (HMAC + ledger) and `verify-identity` (Groq vision
+ HF face check) from Supabase Edge Functions to Firebase Cloud Functions (2M
invocations/mo free): Firebase JWT check already exists in `_shared/firebase-auth.ts` —
what changes, env vars, Firestore-based `transactions` collection instead of Postgres,
deploy steps, and trigger choice (HTTP vs Firestore event). Include the RAG port
(Firestore vector search, 1 read per 100 KNN entries) as a **stretch appendix only** —
it stays on Supabase per decision #2.

### T4 — Blaze features to exploit (beyond consolidation)
Research and spec, each verified against current free quotas:
- **Cloud Functions** (2M/mo): scheduled nightly sweep (move `sweepExpiredEnrollments`
  server-side), verification trigger (auto-run AI pre-screen), custom-claims role
  assignment at signup.
- **FCM push** (no-cost): `@react-native-firebase/messaging` token lifecycle → store on
  `users/{uid}`; Firestore-triggered `notifyEvent` sender for enrollment request /
  accept-decline / new chat / verification status / Pro grant; foreground via
  expo-notifications; notification channels + icon.
- **Analytics + Crashlytics + Performance** (no-cost): screen-view + enrollment events,
  crash-free session check, slow-screen reports — usable in the report.
- **Remote Config** (no-cost): flags for chatbot model + Pro prices + batch limits.
- **Places API** (10K calls/mo): autocomplete for the place-search UX (T6).
- **App Check** (no-cost): protect the chat edge function; required for AI Logic Nov 2026.
- **Test Lab** (60 min/day): instrumented E2E run before the defense.

### T5 — Map styling + face pins (expo-maps, not react-native-maps)
Read `src/components/map/TutorMap.tsx`, `src/lib/map/avatarPins.tsx`,
`src/components/map/TutorAvatarPin.tsx`. Research: Google Maps Android style JSON via
`MapStyleOptions` (no paid mapId) to match the EdumentX sand/amber palette; expo-maps
`mapType` toggle, zoom constraints, `contentPadding` for the bottom card carousel,
camera intro animation. Diagnose why pins render as glyphs: `avatarUri === null` in
demo/seed data + `react-native-view-shot` behavior on Android — spec the seed-avatar
fix and an onboarding avatar requirement (or initial-based default).

### T6 — Place search (the "map doesn't show places" gap)
Read `src/screens/student/MapSearch.tsx`, `src/lib/location/geocoder.ts`,
`src/components/forms/LocationField.tsx`. The search box only filters tutor names — no
forward geocoding. Research Nominatim `/search` (keyless, usage policy) vs Google Places
Autocomplete (10K free/mo, key restricted by package+SHA-1) for Kathmandu Valley
landmarks; recommend one for the demo; spec dropdown → camera flight → re-ranked list.

### T7 — In-app messaging + push (chat exists; push doesn't)
Read `src/services/messages/*`, `src/screens/shared/Notification.tsx`. Chat is live
(conversationKey threading, `/chat` + `/messages` hub). Research the missing half: FCM
data message on message-write → local notification + badge, and swapping the mock
notification-center rows for real event data. Keep the chat code untouched.

### T8 — Publishing + branding (Play Console 2026)
Research: $25 one-time personal account, developer identity verification, Play App
Signing (upload key via EAS), brand assets (icon matching EdumentX tokens, feature
graphic, privacy policy URL), and the mandatory 12-tester/14-day closed test before
production — vs Firebase App Distribution (free) as the defense alternative. Verify the
Firebase Android app registration (package + SHA-1) and restrict Maps/Places keys to it.

### T9 — Multi-agent execution + report-grade tests
Research the cleanest worktree-per-phase split (`git worktree add ../edumentx-test -b
feat/<phase>` on the `test` branch) so Freebuff/DeepSeek, Antigravity CLI (Google AI
Pro), Jules, and local Ollama work in isolation with CI as the gate. For the report's
results chapter: spec `node --test` suites for the eSewa crypto helpers
(`generateSignature`, `verifyCallbackSignature`, `normalizeBase64`, `rawJsonValue`) and
the tier gates (`FREE_TIER_MAX_STUDENTS = 5`, `FREE_TIER_MAX_BATCHES = 1`), plus how to
present the existing `test:derived` (47), `test:lint-rules` (21), `test:rules` (7
emulator suites) numbers.

---

## Constraints

- **Cost $0 at demo traffic.** Any recommendation that charges money must be flagged
  with quota math and an alternative.
- **Never `gemini-2.5-*`** (shut down Oct 2026); use `gemini-3.1-flash-lite` /
  `gemini-3.7-flash` if Gemini is referenced.
- **No OpenAI / Anthropic / Cohere / Mapbox / Algolia.** No live merchant credentials.
- **Follow repo conventions:** domain services with repository interfaces +
  `dataSource` selectors, design tokens (no raw hex in app code), AGENTS.md rules,
  `npm run check` + `test:rules` green before merge.
- **Do not rebuild what exists** — verify before recommending changes.

---

## Output format

A 9-section report (T1–T9), each with: **verdict**, **concrete implementation steps
ordered by demo value**, **effort/risk**, and **$0 quota math** where relevant. End with
a **2-week timeline** ending at the defense: deploy eSewa first, then map/place/FCM,
then optional Storage migration, small-function ports, RAG last (stretch). Flag anything
that costs money at demo scale.

---

## Paste-ready prompt

> **Gemini-variant note (Aug 18, 2026):** Gemini's auto-generated 10-step version of
> this plan drops the constraints block below. Always include it — it prevents
> re-litigating settled decisions (RAG on Supabase, eSewa already built, test branch,
> Android-only, $0 target).

```
### MISSION: EDUMENTX FINAL DEFENSE RESEARCH (Android-only, Blaze, $0 target)
Context: React Native + Expo SDK 54 app (expo-maps, native Firebase, Supabase Edge
Functions + Postgres + Storage, Groq RAG chatbot). Firebase Blaze plan, budget $0.
Android-only demo. eSewa Pro-Tutor subscription is ALREADY implemented — research
deployment/testing, not architecture. RAG stays on Supabase (fixed decision).
Migration work happens on the 'test' branch.

READ FIRST:
- Documentation/03-Implementation-Guides/BLAZE_UPGRADE_AND_AI_STRATEGY.md (§1–§13)
- Documentation/05-Build-and-Deploy/esewa_integration.md
- supabase/functions/create-esewa-order/ + _shared/{esewa,firebase-auth}.ts
- supabase/migrations/015_create_transactions.sql
- src/services/subscription/*  src/services/supabase/storage.ts
- src/services/messages/*  src/screens/shared/Notification.tsx
- src/components/map/{TutorMap,TutorAvatarPin}.tsx  src/lib/map/avatarPins.tsx
- src/screens/student/MapSearch.tsx  src/lib/location/geocoder.ts
- src/components/forms/LocationField.tsx  scripts/testDerived.ts
- package.json (test: scripts)  firebase/firestore.rules

RESEARCH 9 TOPICS (cite official docs; verify 2026 pricing/limits):
T1 eSewa deploy + sandbox verification (single grant, replay→alreadyGranted,
   tamper→signature_mismatch, status-API down→retry-safe; verify GET
   /api/epay/transaction/status/ host against current docs).
T2 Firebase Storage migration: Cloud Storage 5GB free + Google CDN vs Supabase 1GB,
   South-Asia latency, rules port to firestore.rules, client swap keeping signatures.
T3 Optional ports to Cloud Functions: create-esewa-order (ledger→Firestore collection),
   verify-identity; RAG port to Firestore vector search = stretch appendix only.
T4 Blaze exploitation: Cloud Functions (nightly sweep, verification trigger, custom
   claims), FCM push (token lifecycle + Firestore-triggered sender + expo-notifications
   foreground), Analytics/Crashlytics/Performance, Remote Config, Places 10K/mo,
   App Check, Test Lab 60min/day — each with quota math.
T5 Map styling: Google Maps Android style JSON (MapStyleOptions, no mapId) in EdumentX
   palette; mapType toggle, zoom constraints, contentPadding, camera intro; face-pin
   glyph diagnosis (avatarUri null + react-native-view-shot on Android) + seed-avatar fix.
T6 Place search: Nominatim /search vs Places Autocomplete (10K/mo, key restricted by
   package+SHA-1) for Kathmandu Valley; dropdown → camera flight → re-ranked list.
T7 Messaging: chat already live; spec FCM data-message push on message-write → local
   notification + badge; replace mock Notification.tsx rows with real events.
T8 Publishing/branding 2026: Play Console $25 + identity verification + Play App
   Signing + brand assets (icon matching design tokens, feature graphic, privacy policy)
   + 12-tester/14-day closed test; App Distribution as free alternative; verify Firebase
   Android registration + restrict Maps/Places key to package+SHA-1.
T9 Multi-agent execution + report tests: worktree-per-phase on 'test' branch for
   Freebuff/DeepSeek, Antigravity CLI (Google AI Pro), Jules, local Ollama, CI as gate;
   node --test suites for eSewa crypto helpers + tier gates; present existing
   test:derived/test:lint-rules/test:rules counts for the report.

HARD CONSTRAINTS (do not re-litigate):
- Android-only demo; iOS work is out of scope.
- The eSewa Pro subscription is ALREADY implemented — research deployment/testing
  only, never redesign it.
- RAG chat STAYS on Supabase (Groq + pgvector). A Firestore vector-search port is a
  stretch appendix only, last in the timeline.
- All migration work happens on the 'test' branch with known-good backups on other
  branches. Follow repo conventions; npm run check + test:rules must stay green.
- Cost stays $0 at demo traffic. Flag ANY charge with quota math + a free alternative.
- Never use gemini-2.5-* models (EOL Oct 2026); use gemini-3.1-flash-lite /
  gemini-3.7-flash only.
- No OpenAI/Anthropic/Cohere/Mapbox/Algolia. No live merchant keys (EPAYTEST only).
- Verify before recommending changes — do not rebuild what exists.
- READ FIRST: Documentation/03-Implementation-Guides/BLAZE_UPGRADE_AND_AI_STRATEGY.md
  (§1–§13) and GEMINI_RESEARCH_PLAN.md for the full context and fixed decisions.

OUTPUT: 9-section report (T1–T9): verdict + steps ordered by demo value +
effort/risk + $0 quota math. End with a 2-week timeline to the defense: deploy eSewa
first, then map/place/FCM, then Storage, small-function ports, RAG last (stretch).
```
