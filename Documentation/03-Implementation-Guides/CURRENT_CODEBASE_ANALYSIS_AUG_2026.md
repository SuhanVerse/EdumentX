# EdumentX — Current Codebase Analysis (9 August 2026)

> **Scope:** the local working tree, not only the last commit. This is the
> current implementation baseline for release planning. It supersedes the
> feature-status claims in `FULL_REPO_AUDIT_AUG2026.md`, which predates the
> local map, enrollment, capacity, and client-AI work.
>
> **Important:** this is a source review and static-validation audit. It does
> not prove that Firebase rules are deployed, Supabase migrations/functions are
> deployed, or that native Android/iOS builds have run.

## Executive assessment

EdumentX is a substantial Expo / React Native tutor marketplace MVP. The app
has a real multi-role foundation: Firebase Auth, Firestore-backed profiles and
verification, native map discovery, repository-based enrollments, and a
Supabase Edge Function design for RAG-assisted tutor search. The TypeScript
application currently passes its compiler check.

It is **not safe to release to real users yet**. Three P0 issues must be
resolved first:

1. any authenticated client can promote its own `users/{uid}.role` to
   `admin`, while that field is accepted by `isAdmin()`;
2. Groq / Hugging Face secrets are designed to be embedded in the mobile
   bundle via `EXPO_PUBLIC_*` variables; and
3. signed-in users can read other tutors' full profiles and all enrollment
   requests / rosters, which carry student identity and schedule data.

There is also no automated test suite or CI workflow, and the Edge Function
and migration code are excluded from the root TypeScript and ESLint checks.

## Evidence and validation

| Check | Result |
|---|---|
| Local working tree | Dirty: map, enrollment/capacity, AI, and UI changes are uncommitted; this report evaluates those changes. |
| Application type check | `npm run typecheck` passed (`tsc --noEmit`). |
| Application lint | `npm run lint` passed with **0 errors and 31 warnings**. |
| Edge Function checks | Not run: no Deno/Supabase CLI executable or project deployment config is present; `supabase/**` is excluded from root `tsconfig.json` and ESLint. |
| Automated tests / CI | No project test files, test script, or `.github` workflow found. |
| Code volume reviewed | About 50,204 lines across `src/`, `supabase/`, and scripts; 1,709 Markdown files exist, most under archives/reference material. |

No values from the ignored local `.env` were read or recorded. The committed
Firebase configuration files are normal mobile client configuration, not proof
that a private server credential is committed.

## Current system shape

```text
Expo Router app (src/app)
  └─ feature screens (src/screens) + shared/domain UI (src/components)
       ├─ Firebase Auth + Firestore
       │    ├─ users/{uid} and role profiles
       │    ├─ tutors/{uid} public directory
       │    ├─ verification + notifications
       │    └─ enrollment, roster, batch, review subcollections
       ├─ Supabase Storage
       │    ├─ public avatars
       │    └─ verification documents
       ├─ Native map stack
       │    └─ expo-maps + expo-location + supercluster + Nominatim
       └─ AI search
            ├─ mock client pipeline (development)
            └─ Supabase Edge Function → Postgres/pgvector + Groq/HF
```

The intended data ownership is sensible: Firestore is the operational source
of truth, Supabase Storage holds files, and the Supabase `tutors` table is a
search-oriented replica for chat. The main architectural risk is that the
replica is seeded by a script, with no observable scheduled or event-driven
sync in this repository; live Firestore changes can therefore make chat search
stale.

## Feature status from the code

| Area | Current state | Assessment |
|---|---|---|
| Authentication and role routing | Email/password verification and Google sign-in flow; a central layout guard loads Firestore role/profile state. | Implemented, but role authorization is currently unsafe. |
| Tutor onboarding and verification | Tutor profile uploads, verification queue, admin decisions, public tutor-directory projection, notifications. | Broadly implemented; needs rule hardening and emulator tests. |
| Student discovery | Real-time approved-tutor subscription, tutor details, map markers, GPS recentering, clustering, avatar-pin fallbacks. | Map is implemented, not a placeholder. Search and filters are UI-only. |
| Enrollment and capacity | Interfaces plus Firebase and mock repositories; requests, roster, reviews, batches, availability, capacity transactions. | Strong domain modelling; needs authorization testing and end-to-end tests. |
| Administration | Dashboard, verification moderation, user management and lifecycle scripts. | Implemented surface, but impacted by the role-escalation finding. |
| AI assistant | Persistent Supabase session/message design, pgvector migrations, hybrid search, Edge Function JWT verification/rate limit; mock fallback. | Advanced but not release-verified; client/server copies have begun to drift. |
| Design system | NativeWind tokens, shared components, motion primitives, SVG onboarding assets. | Consistent direction. Several screens are very large and would benefit from decomposition. |

## Release blockers (P0)

### 1. Privilege escalation through `users/{uid}.role`

`isAdmin()` accepts either an admin allow-list document **or** the caller's
own root user document with `role == "admin"` ([`firebase/firestore.rules`](../../firebase/firestore.rules)).
However, the owner can create and update their whole `users/{uid}` document
without a field allow-list or an immutable-role constraint.

```text
isAdmin(): admins/{uid} exists OR users/{uid}.role == "admin"
users/{uid}: owner may create/update any field while uid matches
```

An authenticated attacker can therefore write `role: "admin"` to their own
user document and obtain every `isAdmin()` permission: moderation, user reads,
and destructive deletes.

**Required fix:** make `admins/{uid}` (or a verified custom claim) the sole
authority for administrator access. Permit a client to set a role only during
initial registration to `student` or `tutor`, then make it immutable to the
owner. Add Firebase Rules Emulator tests proving that self-promotion and
admin-only reads/writes are rejected.

### 2. LLM API keys are public by design

`src/services/ai/groqRanker.ts` reads `EXPO_PUBLIC_GROQ_API_KEY`; its own
comment correctly notes that Expo embeds such variables in the JavaScript
bundle. `.env.example` similarly defines public Groq and Hugging Face keys.
Anyone with an APK/IPA can recover and spend these credentials.

**Required fix:** remove client-side direct LLM calls and public LLM-key
variables. Keep provider credentials only in Supabase Edge Function secrets;
route all model calls through the authenticated function and apply server-side
quota/error handling. Rotate any key previously placed in a public variable.

### 3. Cross-user profile and student-data exposure

The specific `users/{uid}/tutorProfile/default` rule allows every signed-in
user to read the complete tutor profile. That profile mapper includes phone,
email, documents, and a demo-video path. Separately, any signed-in user can
list every enrollment request, roster, batch, and batch member. Enrollment
records include `studentName`, `studentGrade`, schedule, dates, avatar, and a
free-text message.

**Required fix:** expose a minimal public tutor projection only in
`tutors/{uid}`. Restrict full tutor profiles to the owner/admin (and, if
needed, a narrowly designed contact/booking flow). Limit enrollment and roster
reads to the involved student, the tutor, and an admin; do the same for batch
members. Use the Rules Emulator to prove that an unrelated signed-in account
cannot read these documents.

## High-priority completion work (P1)

1. **Make the map controls truthful.** `MapSearch` stores `search`, but does
   not use it to derive displayed tutors. `FiltersSheet` explicitly owns
   UI-only state and only closes on “Show results”. Its nearby strip labels
   results “within 15 km” without filtering to that radius. Define a typed
   filter state in `MapSearch`, apply it before clustering/ranking, and make
   the result count derive from the same collection.
2. **Use the repository selector consistently.** Student Home uses
   `getTutorRepository()`, but Map Search imports the live Firestore service
   directly. With the default `.env.example` setting
   `EXPO_PUBLIC_USE_MOCK_DATA=true`, chat and home use mock tutors while the
   map can be empty. Route map reads through the selector or remove the global
   mock-mode promise.
3. **Validate the Edge Function as a deployable unit.** The mobile client sends
   `student_location`, `student_profile`, `current_constraints`, and recent
   messages, but the request validator / handler currently forwards only
   session ID, message, and removed constraints to the orchestrator. Either
   support those fields end-to-end or remove their client contract. Add a
   repeatable `supabase functions serve/test/deploy` workflow and type/lint
   checks for `supabase/**`.
4. **Eliminate source drift in the AI implementation.** `src/ai` and
   `supabase/ai` contain parallel copies of most agents, types, retrieval, and
   prompt logic. The server also contains session persistence that the client
   copy cannot share. Designate server modules as authoritative, share only
   pure types/parsers through one package, and test the contract at the HTTP
   boundary.
5. **Add behavior-focused tests and CI.** At minimum: Firebase Rules Emulator
   tests, enrollment transaction tests, repository tests, AI request/response
   contract tests, and a smoke navigation flow. Make `typecheck`, lint, and
   those tests required for pull requests.
6. **Verify Firestore indexes and deployments.** The repository needs the
   `tutors`, `roster`, and `requests` composite indexes from
   `firebase/firestore.indexes.json`. This review cannot confirm they are
   deployed. Validate production/staging with seeded data and denied-request
   cases.

## Medium-priority engineering work (P2)

- Split the largest modules before they become harder to test and review:
  `VerificationQueue` (1,856 lines), `TutorDetailsScreen` (1,363),
  `TutorHome` (1,125), `FirebaseEnrollmentRepository` (1,069), and root
  layout (925).
- Address the 31 lint warnings, particularly hook dependency warnings in the
  root layout and location hook, unused imports/variables, `require()` in
  operational scripts, and duplicate imports. The compiler currently passes,
  but warnings make regressions harder to spot.
- Add pagination/limits to marketplace-style subscriptions before the tutor
  directory grows. The current discovery subscription returns every approved
  tutor and the map clusters locally.
- Decide whether the Android `expo-maps` API-key requirement conforms to the
  documented “no card / zero-budget” constraint. Current `app.json` and the
  config plugin require `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, while several docs
  still prescribe keyless OpenStreetMap via `react-native-maps`.
- Separate runtime documentation from historical material. The root README
  still says Firebase is not wired, Tamagui is planned, and map discovery is
  pending; those claims conflict with the current code and canonical
  architecture document.

## Recommended release sequence

1. Stop any real-user rollout; rotate exposed model credentials.
2. Fix the admin authorization path, private-data rules, and enrollment update
   field constraints; deploy only after emulator coverage passes.
3. Make map filtering/search and repository mode coherent; test it on Android
   and iOS physical devices.
4. Establish the Supabase migration/function deployment procedure, seed/sync
   a representative tutor dataset, and validate authenticated Edge requests.
5. Add CI and the critical test suite; then conduct a role-by-role smoke test
   (new student, tutor application, administrator approval, enrollment,
   review, and AI search).
6. Refresh the root README and roadmap from this verified baseline, retaining
   older plans under `99-Archive` rather than treating them as current.

## What is working well

- Clear role-oriented routing and a feature-based source layout.
- A deliberate repository abstraction for tutor, enrollment, and review data,
  with mock implementations for development.
- Robust defensive mapping of Firestore fields into domain types.
- Thoughtful native-map details: Nepal bounds, camera cancellation avoidance,
  GPS fallback, pin rasterization fallback, and marker clustering.
- A more mature-than-average AI design for an MVP: authenticated Edge access,
  durable session/message tables, vector retrieval, cache/rate-limit
  migrations, and deterministic fallbacks.

These strengths make the remaining work tractable: prioritize authorization
and secrets first, then turn the implemented screens into verified end-to-end
flows.
