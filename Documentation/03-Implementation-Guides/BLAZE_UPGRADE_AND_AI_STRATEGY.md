# Blaze Upgrade & AI Strategy Plan (Aug 2026)

**Scope:** Analyze the Minor Proposal + Mid-Term report's AI requirements against the
current codebase, evaluate the Gemini "deep research" plan, decide which Blaze features
are worth using at $0 for demo traffic, and define the publishing path for the defense.

**Sources read:** `EdumentX_Proposal_Minor/main.tex`, `EdumentX_Mid_Defense/main.tex`,
`RAGBOT_DOCS.md`, `RAGBOT_IMPLEMENTATION_GUIDE.md`, `FULL_REPO_AUDIT_AUG2026.md`,
`supabase/functions/chat/*`, `supabase/ai/**`, `src/services/ai/**`, `src/components/map/TutorMap.tsx`,
`src/screens/shared/Notification.tsx`, `package.json`, `app.json`, firebase.google.com
pricing + AI Logic docs, rnfirebase.io/ai, expo.dev/pricing.

---

## 1. What the reports actually require (extracted)

**Proposal, R.4 — AI Chatbot Assistant:**
- Natural-language tutor queries; extract subject, location, budget, plan duration.
- Personalized recommendations from **live** platform data (RAG), multi-turn follow-ups.

**Proposal architecture (original):** "OpenAI API accessed via Firebase Cloud Functions."
→ **Already replaced** by the team: Groq (LLM) + HuggingFace (embeddings) via a Supabase
Edge Function. This is a documented, working deviation — keep it.

**Mid-Term report:** describes client-side retrieval (bounding-box + Haversine + KNN on
device, free-tier LLM endpoint). **This is stale.** The codebase has since moved the
retrieval + LLM server-side (see §2).

**Supervisor's additional requirements (already implemented, Aug 2026):**
- Zero-trust location privacy (tutor reads student coords only with an active enrollment).
- Contextual open batches (student sees only enrolled tutors' batches).
- Pro Tutor subscription (eSewa, sandbox-only, transactions ledger).
- AI image verification (Groq vision OCR + HF face check, human-reviewed) → `aiReview`
  pre-screen surfaced in the admin queue. **Do not re-plan this — it exists.**

---

## 2. Current RAG state vs. the research plan's assumptions

| Assumption in the research plan | Reality (Aug 2026 code) |
|---|---|
| "Current client-side AI architecture" (step 3) | **Already server-side.** `supabase/functions/chat/` runs intent classification → constraint extraction → hybrid search → ranking → response generation. |
| Retrieval = client query + Haversine | **pgvector hybrid search** in Supabase Postgres (`hybrid_search_tutors` RPC, `bge-small-en-v1.5` embeddings, SQL filters + vector similarity). |
| "Migrate client-side RAG to Firebase AI Logic" (step 5) | The migration target is **server-side Supabase** today, not the client. Moving a working, $0 pipeline to Firestore-vector would cost real effort with no demo-visible gain. |
| "Hybrid on-device/cloud inference" (step 7) | Gemini Nano on-device is **not available** through Firebase AI Logic in React Native. Factually wrong premise. |
| "Automated verification using multimodal AI" (step 7) | **Already built** — `verify-identity` edge function (Groq vision OCR + HF face check), human-in-the-loop. |

**Conclusion:** the research plan was written from the reports, not from the code. Its
centerpiece (migrate RAG to Firebase AI Logic) is the **wrong priority** for this project.

---

## 3. Verdict on the 8-step research plan

**Good steps (keep):**
- **1** — Extract AI requirements from the reports. ✅ (done in §1 above)
- **2** — Research AI Logic / Vertex / Dotprompt capabilities under Blaze. ✅ Useful.
- **4** — App Check + AI Logic SDKs in RN. ✅ Valid — `@react-native-firebase/ai`
  exists (pure JS, Android/iOS/Web, no native module). Note: **App Check enforcement
  becomes required for AI Logic on Nov 2, 2026.**
- **8** — Produce an implementation guide. ✅ Fine as an output format.

**Weak / wrong steps (rewrite or drop):**
- **3** — Premise stale: retrieval is already server-side. Replace with "audit the
  *actual* current pipeline" (done in §2).
- **5** — Don't migrate working Groq+Supabase RAG to Firebase AI Logic. On Blaze, the
  Gemini **Developer API is pay-as-you-go for everything** (no free tier once billing
  is linked); only the Vertex path keeps a rate-limited free quota (~1K req/day for
  Flash). Rewrite as "optional Gemini 3.x evaluation" (§5).
- **6** — Geospatial via Cloud Functions is filler. Firestore has no native geoqueries;
  the app's bounding-box + Haversine approach is correct and already shipped. Skip.
- **7** — Drop the "hybrid on-device" claim (unavailable in RN). Keep only the
  already-built verification pipeline; the useful new piece is a **scheduled sweep
  Cloud Function** (see §4).
- **Missing entirely:** Cloud Functions (biggest unlock), Firebase App Distribution +
  EAS free tier (publishing), Analytics/Crashlytics/Test Lab/Remote Config (defense
  polish), and the **Gemini 2.5 → 3.x shutdown timeline** (Oct 2026 — two months away).

**On "Google AI Pro plan":** that is a consumer subscription for Gemini apps, not an
API plan for production apps. It does not grant app API quota. Skip it; Vertex free
quota + pay-as-you-go cents are more than enough for a demo.

---

## 4. Blaze features actually worth using (all $0 at demo scale)

Ranked by value for the final defense. Quota math from the official pricing page.

1. **Cloud Functions** (2M invocations/mo, 400K GB-sec, 200K CPU-sec, 5 GB egress free)
   — the single biggest unlock. Three concrete functions:
   - **Scheduled nightly sweep** (`pubsub.schedule("every day 00:00")`): moves
     `sweepExpiredEnrollments` off the client — kills the client-side log storm from
     `KNOWN_RUNTIME_ISSUES.md` and runs it once server-side instead of on every student
     listener.
   - **Verification trigger** (`onUpdate` on the verification doc): runs the existing
     AI pre-screen (call the Supabase `verify-identity` function or inline Groq vision)
     and writes `aiReview` automatically — no client trigger needed.
   - **Custom claims on role selection**: set `role` as an auth claim at signup so the
     routing guard reads the claim instead of a Firestore read per launch. Faster startup
     and a strong "we use production auth patterns" defense point.
2. **Firebase App Distribution** (no-cost) — the publishing answer, see §8.
3. **Analytics + Crashlytics + Performance Monitoring** (no-cost) — real dashboards at
   the defense: installs, active users, crash-free sessions, slow screens. Massive
   "production-ready" signal for ~2 hours of work.
4. **Remote Config** (no-cost) — flag toggles without app updates: chatbot model name,
   Pro subscription prices, batch limits. Great demo of Blaze-class tooling.
5. **Test Lab** (60 min/day free) — run the instrumented E2E flow on real devices before
   the demo (and claim it in the report).
6. **Cloud Storage** (5 GB free) — available if verification docs ever move off Supabase.
   **Not worth migrating now** — Supabase Storage works; don't churn before the defense.
7. **Google Places API** (10K free calls/mo) — optional autocomplete for location fields,
   if time permits; restricted key + debounce required. Nice-to-have only.
8. **App Check** (no-cost) — protect the chat edge function (prevent anonymous API-key
   mining of your Groq quota). Also required for AI Logic from Nov 2026 if adopted.

**Not useful here:** Realtime Database, App Hosting/Cloud SQL (you already run Supabase
Postgres + native Firebase), BigQuery exports, Phone Auth (10 free SMS/day, not needed).

**Cloud Messaging (FCM) — no-cost, and in scope:** see §7. The app already has
expo-notifications installed and `google-services.json`/`GoogleService-Info.plist` in
the build, but no messaging package and a **mock-only** in-app notification center.

---

## 5. AI strategy: keep Groq, optionally evaluate Gemini 3.x

**Recommendation: keep the current pipeline.** It is already server-side, already free
(Groq ~1K req/day, HF embeddings free), already shipped and demoed. Don't rewrite it
for Firebase AI Logic.

**Optional single-day experiment (do only if chat quality feels weak in the demo):**
- A/B the response-generation leg only: Gemini **3.x Flash** (e.g. `gemini-3.1-flash-lite`
  / `gemini-3.7-flash`) via the **Vertex** provider (free quota ~1K req/day) vs the
  current Groq `llama-3.3-70b`.
- **Never target `gemini-2.5-*`**: those models shut down in October 2026.
- Adopt only if it clearly wins on the ~20 demo queries. Keep Groq as default and add
  Gemini as a fallback when Groq rate-limits (429) — that's a genuinely demo-worthy
  resilience story.
- If adopted via Firebase AI Logic: `@react-native-firebase/ai` (pure JS) + App Check
  (required Nov 2026 anyway). Otherwise call Vertex from the existing Supabase function.

---

## 6. Map styling improvements (expo-maps, not react-native-maps)

**Current state (already shipped):** `expo-maps ~0.12.10` renders native Google Maps
(Android) / Apple Maps (iOS). A **POI-free base layer** is live in `src/components/map/TutorMap.tsx`:
Android uses a raw Google style JSON via `properties.mapStyleOptions`
(`MapStyleOptions(json)` — no paid mapId needed), iOS uses `pointsOfInterest:
{ including: [] }`. Custom amber teardrop pins + tutor photos + clustering + selection
ring are also done.

**What can still be added (all supported by expo-maps 0.12, all $0):**
1. **Branded style JSON (highest visual win)** — extend the Android style JSON to match
   the EdumentX palette: desaturate the base map (`saturation: -60`), tint roads toward
   the sand/amber family, mute park/water fills, lighten labels. Same file location as
   the existing `GOOGLE_POI_FREE_STYLE` — just add more `featureType`/`stylers` blocks.
   This is the single biggest "premium" signal on the map and is pure JSON.
2. **Map type toggle** — `properties.mapType` supports NORMAL / HYBRID / SATELLITE /
   TERRAIN. A small segmented control (Map / Satellite) makes the demo feel polished;
   satellite + amber pins photographs well.
3. **Clutter reduction** — confirm `isBuildingEnabled: false` and `isIndoorEnabled:
   false` so the map stays flat and pin-first (the audit doc flagged this; verify the
   current props at `TutorMap.tsx:271`).
4. **Traffic layer** — `isTrafficEnabled` as a toggleable demo nicety (Kathmandu traffic
   is a recognizable demo moment). Not essential.
5. **Camera polish** — set `minZoomPreference`/`maxZoomPreference` so users can't zoom
   out of the Kathmandu Valley context; use `contentPadding` so the bottom card carousel
   doesn't cover the Google logo/labels; a slow bearing/tilt intro animation on first
   load is a cheap cinematic touch via the existing `setCameraPositionSafe`.
6. **POI-aware extras** — `onPOIClick` is exposed; a future "tap a landmark → see tutors
   near it" is possible, but low priority for the defense.

**Do NOT:** try react-native-maps props (`tracksViewChanges`, `showsPointsOfInterest`)
— they don't exist in expo-maps and silently no-op or crash. The style JSON on Android
and `pointsOfInterest` on iOS are the only styling paths.

### 6.1 Face pins — they exist in code; they show glyphs because tutors lack photos

The teardrop pins DO carry the tutor's face: `TutorAvatarPin` renders the avatar inside
the pin head, and `lib/map/avatarPins.tsx` rasterizes each (photoUrl × verified) combo
offscreen to a PNG that expo-maps can consume. **If pins render as the generic person
glyph on device, the cause is `avatarUri === null`** — the demo/seed tutors have no
`photoUrl`, or the onboarding avatar step was skipped. Fixes, in order:
1. **Seed real avatars** — point test tutors at public demo face images (e.g. `i.pravatar.cc`
   or Unsplash URLs) in the seed script so the map demos with faces, not glyphs.
2. **Enforce avatar at onboarding** — make the avatar step required (or default to an
   auto-generated initial-based avatar stored as a data URL) so every live tutor has a photo.
3. **Rasterization safety net** — the pipeline already falls back to a PNG teardrop until
   the capture lands; verify `react-native-view-shot` works on your Android device (it
   needs the view actually mounted — a known flicker source on first map render).

### 6.2 Location input — the map search box filters names, it does NOT geocode

Confirmed: `MapSearch`'s TextInput only filters tutor names; typing "Baneshwor" or
"Lalitpur" moves nothing. The geocoders that exist are (a) Nominatim **reverse**
geocode (GPS fix → label) and (b) the LocationPickerModal map pin. There is **no
forward geocoding / place autocomplete** — this is the "map doesn't show places when
I input" gap. Two options:
1. **Nominatim search (keyless, $0, works today)** — call `nominatim.openstreetmap.org/search`
   with the typed query, show a dropdown of matches (name + lat/lon), fly the camera there
   via `setCameraPositionSafe`. Reuse the existing `NOMINATIM_BASE` in `lib/location/geocoder.ts`.
2. **Google Places Autocomplete (10K free calls/mo on Blaze)** — far better results for
   Kathmandu (landmarks, neighborhoods), but needs the Places API enabled + restricted key.
   Recommended if the demo demos "search a place".

Either way: wire the pick → camera flight, and add a "search nearby" behavior so the
map recenters and the tutor list re-ranks around the chosen place.

---

## 7. Push notifications — what "Firebase messaging" actually is, and the plan

**Direct answer to the question:** Firebase Cloud Messaging (FCM) is the **push-notification
delivery service** — yes, it is exactly what puts a notification on the device, even
when the app is backgrounded or killed. It's the transport (Google Play Services on
Android, APNs on iOS); the *display* is handled locally (expo-notifications, already
installed `~0.32.17`). FCM itself is **no-cost** on Blaze.

**Current app state:** ❌ No messaging package installed (`@react-native-firebase/messaging`
is absent — only `expo-notifications`), and the in-app notification center
(`src/screens/shared/Notification.tsx`) renders **mock rows**. The native plumbing is
mostly ready (`expo-notifications` plugin in `app.json`, `google-services.json` +
`GoogleService-Info.plist` already in the build).

**The 4 pieces needed (roughly 1–1.5 days):**
1. **Token registration** — install `@react-native-firebase/messaging` (native Firebase
   fits the project's AGENTS.md rule; it's the natural pair with the existing native
   Auth/Firestore). Request notification permission, fetch the device FCM token, store
   it on `users/{uid}` (per-device map) with `messaging().onTokenRefresh`.
2. **Cloud Function sender** — a Firestore-triggered function (fits the 2M invocations/mo
   free quota) that sends FCM messages on the high-value events: tutor receives an
   enrollment request, student's request is accepted/declined, new chat message, tutor
   verification status change, Pro grant. Tokens come from step 1.
3. **Foreground handling** — FCM silently delivers to a foregrounded app; route it
   through expo-notifications' presentation handler so a banner appears, and update the
   in-app center badge.
4. **Wire the mock center to real data** — the notification center already has tabs,
   prefs, and read-state; swap mock rows for a `notifications/{uid}` subcollection
   (or derive from enrollments/messages events) so the bell badge and FCM tell the same
   story.

**Costs/limits to note:** FCM no-cost on Blaze; Android works today; **iOS push needs
the paid Apple Developer account ($99/yr) for APNs** — so for the defense, demo push on
Android and leave the iOS caveat in the report.

### 7.1 In-app messaging already exists — don't rebuild it

The **chat feature is already live** (`services/messages/`): conversations keyed by the
sorted participant pair, `/chat` + `/messages` hub, Message CTAs from enrollment cards
and dashboards. What does NOT exist is **push** — a new message today only appears when
the app is open. FCM (§7) is the missing half: when a message doc is written, the
`notifyEvent` Cloud Function sends a data message to the recipient's token, which
triggers a local notification (Android) + badge update. So: keep the chat, add push.

**Android-first note:** foreground notification channels, icon, and permissions all work
without the Apple account — the whole push story is demoable on Android.

---

## 8. Publishing the app for the defense — is it free?

**Yes for Android, $0 end-to-end:**
1. **EAS Build free tier** (15 Android + 15 iOS builds/month, low priority) →
   `eas build -p android --profile preview` produces an installable dev-client APK
   (native Firebase, Google Sign-In, expo-maps are already in the build config).
2. **Firebase App Distribution (no-cost)** → upload the APK, add the supervisor's
   email/phone, they get an install link. Clean, versioned, no store needed.
   (Or just share the APK file directly — both work.)

**Android Play Store:** $25 one-time registration — optional, not required for a demo.

**iOS:** **not free** — Apple Developer account ($99/yr) is required for TestFlight or
the App Store. Skip; run the demo on an Android device, and record a 5-minute
walkthrough video as a backup (covers emulator/Apple-watching cases).

**Web build:** not viable — `@react-native-firebase` and expo-maps are native modules
that don't run in a browser. Don't promise a web demo.

**Cost summary:** $0 (EAS free tier + App Distribution). The only money in the whole
plan is optional: Play Console $25, Apple $99/yr, and pennies of Vertex/AI-Logic usage
if the Gemini experiment is adopted.

### 8.1 Registering the app + branding verification (Play Console, 2026 rules)

**Android-first decision:** skip iOS entirely — no Apple account, no TestFlight. All
registration and branding work happens on the **Play Console** side:

1. **Developer account** — one-time **US$25** (2026 fee, personal account). Google now
   requires **developer identity verification** (gov ID) for new accounts.
2. **Personal-account testing requirement** — before production, a new personal account
   must run a **closed test with 12 testers for 14 days** (Google's 2026 rule). This is
   the real time cost; plan it as the pre-production step, not a surprise.
3. **App signing** — enable **Play App Signing** when uploading the AAB (Google manages
   the signing key; upload keys are separate). EAS produces the AAB; keep the upload key
   safe (in `credentials.json` / EAS).
4. **App identity + branding assets** — unique package name (already set, e.g.
   `com.edumentx.app`), app name, 512×512 icon, feature graphic (1024×500), screenshots,
   short/long description, and a privacy policy URL (required; GitHub Pages free is fine).
5. **Brand consistency for the defense** — before the demo, make the **app icon + splash
   match the EdumentX design tokens** (amber/sand/teal). A mismatched stock icon is the
   first thing reviewers notice. `eas build` bakes the icon from `app.json` — fix it once
   and every build inherits it.
6. **Firebase app registration** — the Android app is already registered (package + SHA-1
   in the Firebase console from the earlier setup); just verify the SHA-1 matches the
   Play signing certificate once Play App Signing is on, and restrict the Google Maps /
   Places API key to that package + SHA-1.

**Alternative if $25/14-day testing is unwanted:** skip Play entirely — Firebase App
Distribution + EAS (both free) already demo perfectly. The Play listing is only needed
for "it's on the Play Store" credibility.

---

## 9. Refined plan (replaces the 8-step research plan)

**Phase A — Cloud Functions (highest value, ~2–3 days):**
1. `scheduledSweep` nightly cron → move `sweepExpiredEnrollments` server-side.
2. `onVerificationDocUpdate` trigger → auto-run AI pre-screen, write `aiReview`.
3. Custom-claims role assignment (signup trigger) + routing guard reads claim.
4. Re-run `test:rules` (rules already tested; functions don't change Firestore rules).

**Phase B — Consolidation onto Firebase (optional, ~2–3 days):**
1. **Storage first** — port `services/supabase/storage.ts` to Firebase Cloud Storage
   (5 GB free, Google CDN); verification docs + profile photos; storage rules join
   `firestore.rules`. The item most likely to *feel* faster.
2. **Small functions** — port `create-esewa-order` + `verify-identity` to Cloud
   Functions; Postgres transactions ledger → Firestore `transactions` collection.
3. **RAG (stretch goal only)** — Cloud Function + Firestore vector search + HF/Gemini
   embeddings; keep Supabase chat until this lands.
4. Drop the Firestore→Supabase tutor-mirror seed; one source of truth.

**Phase C — Push notifications (FCM, ~1–1.5 days):**
1. `@react-native-firebase/messaging`: permission + FCM token → `users/{uid}`.
2. Firestore-triggered `notifyEvent` function: enrollment request / accept-decline /
   new chat / verification status / Pro grant → send to the right tokens.
3. Foreground presentation via expo-notifications + in-app center badge.
4. Replace the mock rows in `Notification.tsx` with real event data.

**Phase D — Map polish + pins + place search (~1 day):**
1. Extend the Android style JSON to the EdumentX palette (desaturated base, muted
   POI-free labels, tinted roads); confirm buildings/indoor off.
2. Map type toggle (Map / Satellite), zoom constraints, `contentPadding` for the card
   carousel, camera intro animation.
3. **Face pins** — seed real avatars for demo tutors; verify the view-shot rasterizer on
   device; avatar required (or initial-avatar default) at onboarding.
4. **Place search** — Nominatim search dropdown → camera flight + re-ranked list
   (upgrade to Places Autocomplete if the demo needs landmarks).

**Phase E — Telemetry + flags (~half a day):**
1. Add `@react-native-firebase/analytics`, `crashlytics`, `performance`.
2. Screen-view + enrollment events; crash-free session check.
3. Remote Config: chatbot model + Pro price flags (used by `ProUpgradeScreen`).

**Phase F — Demo distribution + registration (~1 day):**
1. Rebuild the EAS dev client (the AGENTS.md pending deliverable).
2. Upload APK to Firebase App Distribution; add supervisor + teammates.
3. Record a 5-minute walkthrough video as backup.
4. **Optional Play listing:** $25 account + identity verification, brand assets (icon,
   feature graphic, privacy policy), then the 12-tester/14-day closed test before
   production. Skip if App Distribution demo is enough.

**Phase G — Optional AI evaluation (~1 day, only if chat quality is weak):**
1. A/B Gemini 3.x Flash (Vertex, free quota) vs Groq on 20 demo queries.
2. Adopt as fallback on Groq 429 if it wins; never touch `gemini-2.5-*`.
3. If adopted via AI Logic: enable App Check enforcement.

**Phase H — Docs:**
1. Update `ARCHITECTURE.md` §0: Cloud Functions + App Distribution + Telemetry rows
   with quota math (Cloud Functions 2M/mo, Distribution no-cost, Analytics no-cost).
2. Note the Gemini 2.5 → 3.x shutdown constraint in the AI docs.
3. Update the mid-term → final report "Tasks Remaining" chapter to reflect the real
   current state (server-side RAG is done; Cloud Functions + distribution are new).

---

## 10. Can we drop Supabase and run 100% on Firebase Blaze?

**Short answer: yes, everything Supabase does has a Blaze equivalent — but only
Storage is a clear *speed* win; the rest is architecture consolidation.**

| Supabase piece today | Firebase Blaze replacement | Effort |
|---|---|---|
| Storage — profile photos, verification docs, demo videos (`services/supabase/storage.ts`) | **Firebase Cloud Storage** (5 GB free, Google CDN) | Medium — port the client, add storage rules |
| Chat RAG — Groq + pgvector hybrid search (`hybrid_search_tutors` RPC) | **Cloud Functions** (2M/mo) + **Firestore vector search** (GA; 1 read per 100 KNN entries) | **High — the big one** |
| eSewa order signing + Postgres ledger (15 migrations, `transactions` table) | Cloud Function + `transactions` Firestore collection | Medium |
| `verify-identity` (Groq vision OCR + HF face check) | Cloud Function trigger (same logic) | Medium |
| AI-chat session memory (`conversations`/`messages` in Postgres) | Firestore collections | Low |
| `rate_limits` table | Firestore counter or drop (rules + App Check) | Low |

**Is Supabase "slow for documents"?** Partly real: Supabase Storage serves from its
own edge; **Firebase Storage rides Google's CDN — typically faster in Nepal** — and
removes the anon-key client fetch. That's the one item that will *feel* faster after
migration. The RAG chat is **LLM-bound** (Groq/HF round-trip), not Supabase-bound — it
will not get faster either way.

**Does app load time improve?** Modestly: one less SDK/REST client to init, no anon-key
handshake, storage reads hit Google's CDN. Boot time stays dominated by native module
init (Firebase, expo-maps) — that doesn't change.

**Why consolidate anyway (the real wins, not speed):**
1. **One backend story** — "the app runs 100% on Firebase" beats "Firebase + Supabase +
   Groq + HF" in the defense, and matches the proposal's original architecture.
2. **One rules file** — storage rules join the already-tested `firestore.rules`.
3. **No anon-key exposure** — the client stops shipping a Supabase anon key in the bundle.
4. **No sync seed** — drop the Firestore→Supabase tutor-mirror script; one source of truth.

**Recommended order for the defense:** Storage first (simplest, biggest perceived-slow
fix) → port the two small functions (eSewa order, verify-identity) + ledger to Firestore
→ **RAG last and only if time allows** (working, LLM-bound, risky to churn pre-defense).

---

## 11. Traps to avoid

- **Don't migrate the working RAG to Firebase AI Logic.** Pay-as-you-go on Blaze for
  the Developer API; the current Groq pipeline is $0 and already server-side.
- **Don't use `gemini-2.5-*` models** — shut down Oct 2026.
- **Don't promise a web build** — native Firebase/maps modules don't run in browsers.
- **Don't buy Google AI Pro** — consumer subscription, not app API quota.
- **Don't add Cloud SQL / App Hosting / Realtime DB** — redundant with Supabase + Firestore.
- **Don't re-plan the verification pipeline** — it exists (human-reviewed by design).
- **Don't touch live eSewa keys** — sandbox-only stays in force.
- **Don't use react-native-maps props on expo-maps** (`tracksViewChanges`, POI booleans)
  — they don't exist; style JSON + `pointsOfInterest` are the only styling paths.
- **Don't demo FCM on iOS** — APNs needs the paid Apple account; push demo = Android.
- **Don't believe "Supabase is slow" wholesale** — profile first. Storage CDN is the only
  likely win; the chat is LLM-bound; boot time is native-module-bound. Migrate in the
  order in §10 (Storage → small functions → RAG last).

---

## 12. eSewa subscription — already built, don't rebuild it

**Status (verified in the repo):** the Pro Tutor subscription is fully implemented:
- `src/services/subscription/` — types, repository interface, Firebase + Mock impls, dataSource.
- `src/screens/tutor/ProUpgradeScreen.tsx` + `src/app/pro-upgrade.tsx` — plan picker + eSewa WebView flow.
- `supabase/functions/create-esewa-order/` + `_shared/esewa.ts` (HMAC signature, GET status check, replay-proof) + `_shared/firebase-auth.ts`.
- Tier gates in `FirebaseEnrollmentRepository.ts` + `types.ts`: `FREE_TIER_MAX_STUDENTS = 5`, `FREE_TIER_MAX_BATCHES = 1`; Pro removes both caps.
- Ledger: `supabase/migrations/015_create_transactions.sql` (service-role-only RLS).
- Docs: `Documentation/05-Build-and-Deploy/esewa_integration.md` (WebView flow, sandbox creds, deploy steps).

**What's left (not code):** ① `supabase db push` to apply migration 015 (needs your
Supabase access token), ② `supabase functions deploy create-esewa-order`, ③ a live
sandbox test with `EPAYTEST` credentials to prove the flow end-to-end.

**Does Blaze help?** No — payments already run on Supabase edge functions + Postgres.
Blaze only matters here if you choose the §10 consolidation (port the order function to
Cloud Functions + ledger to Firestore). That's optional; don't churn before the defense.

---

## 13. Multi-agent execution + test strategy (for the final report)

**Can multiple coding agents do the migration? Yes — with worktrees, not one shared tree.**
Four agents (Freebuff/DeepSeek, Antigravity CLI, Jules, local Ollama) editing the same
checkout will conflict. Instead:
1. **One git worktree per phase** — `git worktree add ../edumentx-phaseB -b feat/phaseB`
   (the repo's own tool stack already prescribes this pattern). Each agent owns one
   worktree + one phase and never touches the others.
2. **CI is the gate** — `npm run check` (typecheck + lint + tests) and `test:rules` run
   per worktree before any merge; whoever's diff is green merges. The user (you) does the
   integrating; agents don't push.
3. **Ollama/minimax-m3** — fine as a local assistant for small refactors/boilerplate,
   but it is NOT a runtime dependency; the app's LLM stays Groq/HF (free).
4. **Clean-code rule for every agent:** follow the repo's existing conventions — domain
   services with repository interfaces + `dataSource` selectors, design tokens (no raw
   hex in app code), pure helpers separated from UI, and the AGENTS.md rules verbatim.

**Test cases to add for the report's results/conclusion section:**
- **eSewa crypto unit tests** — `generateSignature`, `verifyCallbackSignature`,
  `normalizeBase64`, `rawJsonValue`, status-URL builder: pure functions, testable with
  `node --test` without a payment (mirrors `scripts/testDerived.ts` pattern). Counts
  toward a "unit tests passed" table row.
- **Tier-gate tests** — free tier = 5 students / 1 batch, Pro = unlimited (pure
  helper assertions, or extend `acceptRequestRulesTest.mjs`).
- Existing suites already give you report ammunition: `test:derived` (47), `test:lint-rules` (21),
  `test:rules` (7 emulator suites). The report's results chapter should quote these numbers
  plus the new eSewa + tier-gate suites.
