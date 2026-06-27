# EdumentX — Zero-Budget Hybrid Architecture

> **Status**: Source of truth for the production stack.
> **Last updated**: June 22, 2026 — locked in after the Firebase Blaze-plan
> gate was confirmed unshippable (College demo project; no international
> credit card available in Nepal).
> **Read this first** if you are about to add a new backend dependency.

This document is the canonical reference for every service the EdumentX
app talks to. The single design rule is **zero-budget**:

> Every dependency must be usable on a free tier with **no credit card
> required**. If a service starts gating its free tier behind a card or
> billable plan, we replace it before shipping the next phase.

The architecture is a **hybrid**: we keep the parts of Firebase that work
on the Spark plan (Auth + Firestore) and use other free services for the
parts Firebase gates behind Blaze (Cloud Storage, Cloud Functions,
Maps SDK). This avoids rewriting the auth + database layer that has
been working since Phase 2.

---

## TL;DR — The Stack at a Glance

| Layer | Service | Free Tier | Card Required |
|-------|---------|-----------|---------------|
| **Auth** | Firebase Authentication (Spark) | Unlimited MAU (Email + Google) | No |
| **Database** | Cloud Firestore (Spark) | 1 GiB, 50K reads/day, 20K writes/day | No |
| **Object Storage** | Supabase Storage | 1 GB across all buckets | No |
| **Map Tiles** | OpenStreetMap (`tile.openstreetmap.org`) | Unlimited, keyless | No |
| **Geocoding** | Nominatim (OpenStreetMap) | ~1 req/sec, no key | No |
| **Location Math** | Client-side Haversine + KNN (in-app) | Free (just CPU) | No |
| **RAG / Chatbot** | Groq Cloud API (Llama 3) **or** HuggingFace Serverless | Free dev tier | No |
| **Push (future)** | Firebase Cloud Messaging | Unlimited | No |
| **Analytics (future)** | Firebase Analytics | Unlimited events | No |

If a future feature needs a service not on this list, **stop and add a
row to this table before writing any code**. Do not introduce a paid
dependency without explicit approval.

---

## 1. Auth — Firebase Authentication (Spark)

**Why**: We use `@react-native-firebase/auth` v24.x. Email + Password
and Google Sign-In are wired up. The Clerk pivot (June 20) was reverted
because Clerk discontinued its `integration_firebase` template for new
accounts — see `Documentation/99-Archive/2026-06-21-clerk-revert/`.

**Phone SMS OTP is intentionally NOT used.** Firebase Phone auth needs
the Blaze plan to send SMS even on the free MAU quota.

**Code map**:
- `services/firebase/authService.ts` — modular RNFirebase API
  (`getAuth(getApp())`, `createUserWithEmailAndPassword`,
  `signInWithEmailAndPassword`, `signInWithCredential` for Google).
- `screens/auth/EmailSignUp.tsx` — single auth surface, "Sign up" /
  "Log in" toggle, "Continue with Google" button, "I've verified —
  continue" pending panel.
- `app/_layout.tsx` — Source-of-Truth routing: 5-step redirect tree
  driven by `useAuthStore` (`user`, `role`, `isLoading`).
- `firebase/firestore.rules` — owner-only access to `users/{uid}` and
  its subcollections. Publish via `npm run deploy:rules`.

**Hard rule**: do not introduce any other identity provider without
checking that it works on Firebase Spark.

---

## 2. Database — Cloud Firestore (Spark)

**Why**: Already shipped, already has rules, already deployed to
`edumentx-dev`. The `users/{uid}` doc + `users/{uid}/{student,tutor}Profile/default`
subcollection pattern is the source of truth.

**Collection layout** (unchanged from the original Phase 2 design):

```
users/{uid}                        # structural metadata (uid, email,
                                   #   role, displayName, createdAt,
                                   #   updatedAt)
users/{uid}/studentProfile/default # student-only profile fields
users/{uid}/tutorProfile/default   # tutor-only profile fields
```

When we add tutor-discovery in Phase 5, the candidate collection will be
`tutors/{uid}` (denormalized for read efficiency), but write access
stays owner-only.

**Hard rule**: do not call Cloud Functions from the client. There is no
Cloud Function runtime on Spark. All server-side logic (KNN, Haversine,
prompt assembly) runs in-app.

---

## 3. Object Storage — Supabase Storage (free tier)

**Why**: Firebase Cloud Storage requires Blaze (billing account + credit
card) as of February 2026. Supabase gives us 1 GB of object storage
with Row Level Security (RLS) policies, public avatars, and private
verification docs — all without a card.

**Setup** (already complete on `edumentx-storage`):
- Region: South Asia (Mumbai) — matches the Firebase database region.
- Bucket `public-avatars` — public read, image/* MIME only, 5 MB cap.
- Bucket `private-verification-docs` — owner + admin read, all MIME
  types, 25 MB cap.

**Code map**:
- `.env` — `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `services/supabase/client.ts` — singleton `createClient` instance
  (to be created in Phase 5.1).
- `services/supabase/storage.ts` — `uploadAvatar`, `uploadVerificationDoc`,
  `getPublicUrl` helpers (to be created).
- `components/forms/AvatarUploader.tsx` — calls `uploadAvatar` and
  writes the returned URL into the user doc's profile subcollection.

**Flow** (tutor uploads avatar):
1. User picks image in `expo-image-picker`.
2. `expo-image-manipulator` compresses to ≤ 1 MB and strips EXIF.
3. `uploadAvatarToSupabase(uri, uid)` uploads to `public-avatars/{uid}.jpg`.
4. Supabase returns a public URL string.
5. URL is written into `users/{uid}/{role}Profile/default.avatarUrl` via
   the existing `writeBatch` in `screens/auth/*ProfileScreen.tsx`.

**Hard rule**: never write a Supabase URL into a Firestore doc that the
user can later rename or delete; the URL must be stable for the lifetime
of the bucket.

---

## 4. Maps — OpenStreetMap via `react-native-maps`

**Why**: Google Maps SDK requires a Cloud Billing account to remove
the "for development purposes only" watermark. OSM tiles are free,
keyless, and have excellent coverage of Kathmandu Valley.

**Setup**:
- `react-native-maps` is already in the dependency tree (Phase 1.5).
- No API key needed; we use the `<UrlTile>` component to point at
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.

**Code map** (Phase 5.2):
- `components/map/TutorMap.tsx` — base map container with `<UrlTile>`.
- `components/map/TutorMarker.tsx` — single pin + popup.
- `app/(student)/discover.tsx` — map screen wiring.

**Hard rule**: never call `googleMapsApiKey` from the JS layer. The
`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` env var is kept for backwards compat
but should remain empty. If a future feature needs Google Places
(geocoding, autocomplete), use Nominatim instead.

---

## 5. Geocoding — Nominatim (OpenStreetMap)

**Why**: Free, keyless, returns neighborhood + city + country in one
call. The current `LocationField` component hand-rolls a fixed list of
Nepal locations — Nominatim upgrades that to live reverse-geocoding
without adding cost.

**Usage limits**: Nominatim's free service is rate-limited to ~1
request/second per IP. Heavy batch geocoding should use the
`/search?q=...&format=json` endpoint with a `User-Agent` header.

**Code map** (Phase 5.3):
- `services/nominatim/reverse.ts` — `reverseGeocode(lat, lon)`.
- `components/forms/LocationField.tsx` — upgrades from static list to
  Nominatim-driven autocomplete.

**Hard rule**: respect the 1 req/sec rate limit. Debounce all
autocomplete keystrokes to 800 ms minimum.

---

## 6. Location Math — Client-Side Haversine + KNN

**Why**: The original proposal calls for bounding-box pre-filtering,
Haversine distance, and weighted KNN ranking. There is no Cloud
Functions runtime on Spark, so we run the math in-app. The dataset is
small (a few hundred tutors), so the O(n) loop is fine on mid-range
Android devices.

**Code map** (Phase 5.4):
- `lib/location/haversine.ts` — `haversineMeters(a, b)`.
- `lib/location/bbox.ts` — `boundingBox(lat, lon, radiusKm)`.
- `lib/location/knn.ts` — `rankTutors(query, tutors, k=5)` — applies
  the weights from the proposal:
  `wd=0.35, wr=0.25, wq=0.20, wrating=0.15, we=0.05`.

**Hard rule**: never POST tutor coordinates to a server endpoint. The
query device is the only thing that needs them.

---

## 7. RAG Chatbot — Groq (preferred) or HuggingFace Serverless

**Why**: The original proposal mentions an OpenAI-powered tutor-matching
chatbot. OpenAI requires a paid key. Groq gives free Llama 3 inference
for hobby projects, and HuggingFace Serverless Inference has a free
monthly quota.

**Setup**:
- Get a free Groq API key at https://console.groq.com (login with
  Google, no card).
- Add `EXPO_PUBLIC_GROQ_API_KEY` to `.env` (the "anon" env var here
  means the key is safe to ship in the client because we rate-limit
  per uid in Firestore).

**Code map** (Phase 7.1):
- `services/llm/groq.ts` — `chatWithContext(systemPrompt, messages)`.
- `lib/rag/promptBuilder.ts` — assembles the system prompt from the
  top-K Firestore tutor matches (uses `lib/location/knn.ts`).
- `screens/chat/ChatbotScreen.tsx` — chat UI + free-text input.

**Fallback to HuggingFace**: if Groq is rate-limited or goes paid,
swap the `groq.ts` module for `huggingface.ts`. The prompt builder
and UI are provider-agnostic.

**Hard rule**: never embed an OpenAI / Anthropic / Cohere API key in
the client. They all require paid keys. Free providers only.

---

## 8. Anti-Patterns (what NOT to introduce)

- ❌ **Firebase Cloud Storage** — gates everything behind Blaze.
- ❌ **Firebase Cloud Functions** — same. Plus the free quota on Blaze
  is "perpetual free", but the plan itself requires a card.
- ❌ **Firebase Cloud Messaging on Blaze** — actually free on Spark,
  OK to use.
- ❌ **Google Maps SDK / Places API** — both require Cloud Billing.
- ❌ **OpenAI / Anthropic / Cohere** — paid only.
- ❌ **Mapbox** — paid above the hobby free tier; OSM is sufficient.
- ❌ **Algolia / Elasticsearch** — paid for our usage; use Firestore
  client-side filters instead.

If a future feature needs one of these, **replace the feature** before
adding the dependency.

---

## 9. Project Layout (zero-cost-relevant files)

```
.env                        # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
                            # EXPO_PUBLIC_FIREBASE_*, EXPO_PUBLIC_GROQ_API_KEY

firebase/
  firestore.rules           # owner-only access; deploy via `npm run deploy:rules`
  storage.rules             # unused — Supabase handles storage rules
  indexes.json
.firebaserc                 # pins project alias to `edumentx-dev`
firebase.json               # no emulators block (we don't use local emulators)

services/
  firebase/
    authService.ts          # @react-native-firebase/auth (modular API)
    errors.ts               # formatFirebaseError, authErrorSuggestsModeFlip
  supabase/                 # TO CREATE in Phase 5.1
    client.ts
    storage.ts
  nominatim/                # TO CREATE in Phase 5.3
    reverse.ts
  llm/                      # TO CREATE in Phase 7.1
    groq.ts

lib/
  location/                 # TO CREATE in Phase 5.4
    haversine.ts
    bbox.ts
    knn.ts
  rag/                      # TO CREATE in Phase 7.1
    promptBuilder.ts

components/
  forms/AvatarUploader.tsx  # rewires to Supabase in Phase 5.1
  map/                      # TO CREATE in Phase 5.2
    TutorMap.tsx
    TutorMarker.tsx
```

---

## 10. What's Done and What's Next

| Phase | Status | Notes |
|-------|--------|-------|
| 1.5 Foundation (NativeWind) | ✅ Done | Source-of-truth tokens in `tailwind.config.js` |
| 2 Native Firebase Auth | ✅ Done | `EmailSignUp.tsx` + `RoleSelection.tsx` + `StudentProfileScreen.tsx` + `TutorProfileScreen.tsx` |
| 3 Firestore rules + deploy | ✅ Done | `firebase/firestore.rules`, `npm run deploy:rules` |
| 4 Dashboards | ✅ UI shipped | Live Firestore reads wired in Phase 2 |
| 5.1 Supabase Storage | ⏳ Next | Keys already in `.env`; create `services/supabase/storage.ts` |
| 5.2 OpenStreetMap tiles | ⏳ Next | Create `components/map/TutorMap.tsx` |
| 5.3 Nominatim geocoding | ⏳ Pending | Upgrade `LocationField` |
| 5.4 Client-side KNN | ⏳ Pending | `lib/location/knn.ts` |
| 6 Admin + Verification | ⏳ Pending | Supabase `private-verification-docs` bucket |
| 7.1 RAG chatbot | ⏳ Pending | Groq integration |
| 7.2 Polish + beta | ⏳ Pending | |

See `Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`
for the full step-by-step checklist.

---

## 11. Why we are NOT rewriting on Supabase

We considered rewriting the backend on Supabase (Postgres + PostGIS +
Storage) to consolidate vendors. Reasons we kept Firebase for auth +
database:

1. **Working code**: the auth + Firestore flow is shipped and tested.
   Rewriting it would set the project back 2–3 weeks.
2. **Spark plan is genuinely free**: Auth + Firestore never required a
   card. The Blaze gate only hits Storage + Functions + Maps, which
   we are bypassing anyway.
3. **Two-project complexity**: a Supabase rewrite would introduce a
   second set of credentials, second client SDK, second security-rule
   language (Postgres RLS vs Firestore rules), and a migration path
   for the existing `users/{uid}` data.
4. **Supabase Auth is fine but not better** than Firebase Auth for our
   shape (email + Google). No clear win on switching.

The hybrid keeps what works and only swaps the parts that hit the
Blaze gate.

---

## 12. References

- Firebase Spark pricing: https://firebase.google.com/pricing
- Supabase pricing: https://supabase.com/pricing
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Groq free tier: https://console.groq.com (Llama 3 inference)
- HuggingFace Serverless Inference: https://huggingface.co/docs/api-inference

---

**If you are about to add a dependency, add it to the table in §0
first. If you can't justify it as zero-budget, find a free alternative
or remove the feature.**