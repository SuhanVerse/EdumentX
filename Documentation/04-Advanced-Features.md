# Advanced Features — Architecture

> Phase "Advanced Architecture" (Aug 2026). This document explains the
> implementation of the four supervisor-requested features so a reader
> (professor, teammate, future maintainer) can understand the data
> flow, the security model, and the zero-budget decisions behind each.

| # | Feature | Files |
|---|---|---|
| 1 | Zero-trust location privacy | `firebase/firestore.rules`, `FirebaseEnrollmentRepository.ts`, `TutorHome.tsx` |
| 2 | Contextual open batches | `BrowseBatchesScreen.tsx`, `BatchesRepository.ts` + impls, `firestore.indexes.json` |
| 3 | Pro Tutor subscription (eSewa sandbox) | `services/subscription/*`, `ProUpgradeScreen.tsx`, `supabase/functions/create-esewa-order/*`, `_shared/esewa.ts` |
| 4 | Automated AI image verification | `supabase/functions/verify-identity/*`, `services/verification/aiReview.ts`, `VerificationQueue.tsx` |

---

## 1. Zero-Trust Location Privacy

### The requirement

> A tutor can only read a student's precise location when an ACTIVE
> enrollment exists between them. Without one, the tutor's view masks
> the location ("Location hidden until enrolled").

### The problem with naive rules

A student's precise location lives on
`users/{studentUid}/studentProfile/default` → `location` (neighborhood,
city, and `coordinates`). We could not simply write
`allow read: if <tutor>` on that doc — Firestore security rules cannot
*query* ("does an active enrollment exist for this pair?"). Rules can
only `get()` / `exists()` a **known path**.

### The design: a per-pair `locationAccess` marker

The roster row (`enrollments/{tutorUid}/roster/{enrollmentId}`) already
proves enrollment, but its document id is the auto-generated
`enrollmentId` — a tutor reading the rules cannot construct that path
from `(studentUid, tutorUid)` alone. So we add a deterministic marker:

```
users/{studentUid}/locationAccess/{tutorUid}
```

**Lifecycle** (all in `FirebaseEnrollmentRepository`):

| Event | Marker action | Where |
|---|---|---|
| `acceptRequest` commits the roster row | **Create** the marker inside the SAME transaction | `acceptRequest` |
| `removeEnrollment` soft-removes the row | **Delete** the marker in the same transaction | `removeEnrollment` |
| `sweepExpiredEnrollments` expires the row | **Delete** the marker in the same batch | `sweepExpiredEnrollments` |

**Rules** (`firebase/firestore.rules`):

```text
match /users/{userId}/studentProfile/default {
  allow read: if isOwner(userId) || isAdmin()
    || exists(users/{userId}/locationAccess/{request.auth.uid});
}

match /users/{userId}/locationAccess/{tutorUid} {
  allow create, update: if request.auth.uid == tutorUid
    && request.resource.data.studentUid == userId
    && request.resource.data.status == "active"
    && request.resource.data.enrollmentId is string
    && existsAfter(enrollments/{tutorUid}/roster/{enrollmentId})
    && getAfter(enrollments/{tutorUid}/roster/{enrollmentId}).data.studentUid == userId
    && getAfter(enrollments/{tutorUid}/roster/{enrollmentId}).data.status == "active";
  allow delete: if isOwner(userId) || isAdmin() || request.auth.uid == tutorUid;
}
```

Why this is safe:

- **A forged marker is impossible.** The create rule re-reads the
  roster row the tutor just wrote in the same transaction
  (`existsAfter` / `getAfter`) and demands it is real, points at the
  same student, and is `active`. A tutor cannot write a marker for an
  arbitrary student — there is no active roster row to reference.
- **Access expires with enrollment.** Deleting the marker on
  removal/expiry immediately re-locks the student profile read.
- **The marker itself is not the secret.** It merely proves
  enrollment; the actual location stays on the profile doc, which is
  owner/admin-readable and now enrolled-tutor-readable.

### UI masking

The tutor-facing roster subscription already resolves student display
info from the profile doc via `backfillStudentDisplay` (name/avatar).
It now also resolves `location.neighborhood/city` into a
`studentLocationLabel` on each `Enrollment` row. The read succeeds
**only** when the rules permit it (i.e. the marker exists), so:

- **Enrolled student row** → label renders (e.g. "Baneshwor, Kathmandu").
- **Pending request row** (no enrollment yet) → the read is denied,
  the label stays `null`, and `TutorHome` renders
  **"Location hidden until enrolled"** with an `eye-off` icon.

The rules are the enforcement point; the UI is just the mask.

---

## 2. Contextual Open Batches

### The requirement

> A student only sees open batches from tutors they are CURRENTLY
> enrolled with — not the whole marketplace.

### The design

`BrowseBatchesScreen` now does two subscriptions:

1. `subscribeEnrollmentsByStudent(studentUid)` — the student's own
   roster rows (collectionGroup over `roster`, filtered by
   `studentUid`; index already declared).
2. `subscribePublicBatches(onData, onError, tutorUids)` — the batches
   repo's marketplace query, now accepting an optional `tutorUids`
   list. When provided, the Firebase impl adds a Firestore **`in`**
   filter: `where("status", "==", "active")` AND
   `where("tutorUid", "in", tutorUids)`.

Only ACTIVE enrollments contribute tutor uids — removed/expired
students lose access to that tutor's batches too. An empty list emits
`[]` without querying (Firestore rejects an empty `in` array
client-side).

**Index**: the compound query on the `classes` collectionGroup needs
`(status ASC, tutorUid ASC)` — added to `firestore.indexes.json`
(`collectionGroup: "classes"`). Deploy with
`firebase deploy --only firestore:indexes`.

**Mock parity**: `MockBatchesRepository` applies the same filter so
`EXPO_PUBLIC_USE_MOCK_DATA=true` behaves identically.

---

## 3. Pro Tutor Subscription (eSewa sandbox)

### The requirement

> Embed a payment subscription model ("Pro Tutor"). Free tutors are
> limited; Pro unlocks elevated limits + visibility. Use the eSewa
> method from the BasoBas reference project.

### The data model

```
users/{uid}/tutorProfile/default.subscriptionTier      "free" | "pro"
users/{uid}/tutorProfile/default.subscriptionExpiresAt  epoch ms
tutors/{uid}.subscriptionTier                           mirror (discovery doc)
tutors/{uid}.subscriptionExpiresAt                      mirror
```

The profile doc is owner-writable (existing rule). The `tutors/{uid}`
discovery doc is admin-write-only **except** a narrow owner carve-out
mirroring the `isAvailableForNewStudents` pattern:

```text
allow update: if isOwner(uid) && request.resource.data
  .diff(resource.data).affectedKeys()
  .hasOnly(['isAvailableForNewStudents', 'subscriptionTier',
            'subscriptionExpiresAt', 'updatedAt']);
```

### The payment flow (ported from BasoBas)

BasoBas's eSewa v2 flow was studied and ported to EdumentX:

```
Tutor picks a plan (monthly Rs 249 / 3-month Rs 549)
        │
        ▼
create-esewa-order (Supabase Edge Function, Firebase-JWT verified)
  • looks up the price SERVER-SIDE (client never sends an amount)
  • generates transaction_uuid
  • HMAC-SHA256 signs "total_amount,transaction_uuid,product_code"
  • INSERTs a PENDING row in the `transactions` ledger (Postgres,
    service role) — the replay-protection anchor
  • returns the eSewa form fields
        │
        ▼
ProUpgradeScreen renders an AUTO-SUBMITTING HTML form in a WebView
  (react-native-webview; real-mobile user agent to dodge CAPTCHA)
        │
        ▼
eSewa sandbox → redirects to edumentx://payment-success?data=…
        │  (intercepted in onShouldStartLoadWithRequest)
        ▼
Client calls the edge function again with { verify: data } — the
server runs FOUR checks before allowing the grant:
  1. HMAC signature over the payload (signed_field_names order,
     rebuilt from the RAW JSON text so numbers like 1000.0 verify)
  2. `transactions` lookup by transaction_uuid → must exist AND
     belong to the caller (replay: a uuid reconciles exactly once)
  3. amount + product_code cross-check vs the stored row
  4. server-to-server GET /api/epay/transaction/status/ → COMPLETE
     (the docs' anti-fraud step — the signed callback alone can be
     replayed; the status API proves the transaction happened)
  → marks the row COMPLETE with eSewa's ref id
        │
        ▼
applyProGrant(uid, months) → writes tier + expiry to profile AND
  discovery doc (owner carve-out) → Pro badge + limits go live
  (skipped when the verify response reports alreadyGranted — a
  replayed callback never stacks the grant)
```

**Trust model**

- The eSewa **secret key never touches the client** — signing and
  callback verification both run in the Edge Function.
- Price is server-side (PRODUCTS table in `_shared/esewa.ts`) — a
  tampered client can't pay Rs 1 for a Rs 249 pass.
- **Replay protection** — every order creates a PENDING `transactions`
  row keyed by `transaction_uuid` (unique, owned by the tutor who
  created it). Verification reconciles that row exactly once: a
  replayed callback payload for an already-COMPLETE uuid reports
  `alreadyGranted` and the client skips the grant. No transaction
  row ⇒ `transaction_not_found` ⇒ no grant.
- **Server-to-server confirmation** — the callback HMAC proves the
  payload came from eSewa's secret, but the docs' anti-fraud step is
  the GET status API: verification never grants unless eSewa itself
  reports `COMPLETE`. If the status API is unreachable the client is
  told verification is unavailable (never auto-success), and the row
  stays PENDING so a retry can still reconcile it.
- ⚠️ **SANDBOX ONLY** — merchant code `EPAYTEST` with the public test
  secret. This is a college demo without a registered business;
  pointing at live merchant credentials requires an explicit,
  separate decision (the code comment in `_shared/esewa.ts` says so).

**Environment variables** (Supabase Edge Function secrets):

| Var | Purpose |
|---|---|
| `ESEWA_FORM_URL` | `https://rc-epay.esewa.com.np/api/epay/main/v2/form` |
| `ESEWA_STATUS_URL` | `https://rc-epay.esewa.com.np/api/epay/transaction/status/` |
| `ESEWA_PRODUCT_CODE` | `EPAYTEST` |
| `ESEWA_SECRET_KEY` | the matching sandbox secret |
| `SUCCESS_URL` / `FAILURE_URL` | `edumentx://payment-success` / `...-failed` |
| `FIREBASE_PRODUCT_ID` | Firebase project id (JWT verification) |
| `EDUMENTX_SERVICE_KEY` | Supabase service role (ledger writes; already set for the chat function) |

**Deploy**: `supabase db push` (runs `015_create_transactions.sql`),
then `supabase functions deploy create-esewa-order` (the function's
ledger reads/writes need the migration to exist first).

### The Pro gates

| Gate | Free | Pro | Enforcement |
|---|---|---|---|
| Active students | ≤ 5 (`FREE_TIER_MAX_STUDENTS`) | existing `studentCapacity`/6 cap (raised, not removed) | client pre-check in `acceptRequest` + the roster **create rule** (reads `subscriptionTier` from the profile) |
| Active batches | ≤ 1 (`FREE_TIER_MAX_BATCHES`) | unlimited | client pre-check in `createBatch` (rules can't count subcollection docs) |
| Search ranking | normal | **promoted to the top** of the map's nearby list (stable sort — distance order preserved within each tier) | `MapSearch.tsx` |
| Badge | — | amber **PRO** pill on card + profile (deliberately NOT a second green verification tick — the Blue Tick keeps its meaning) | `TutorCard.tsx`, `TutorDetailsScreen.tsx` |

Why capacity is *raised, not removed* for Pro: the student-capacity
cap exists to protect teaching quality (a tutor overloaded with 40
students teaches worse). Selling "unlimited" would undo that design
intent; Pro buys a *higher* ceiling, not the removal of quality
protections.

Why the badge is not a Blue Tick: the platform already has one Blue
Tick that means *professional verification* — the core trust signal.
A second, similar-looking tick for *paid subscription* would muddy it.
The amber **PRO** pill is visually and semantically distinct.

---

## 4. Automated AI Image Verification

### The requirement

> When a tutor submits verification documents (citizenship/ID) or a
> profile picture, run an automated review: OCR the ID name and match
> it against the profile name (Groq vision); confirm the profile
> picture is a real human face (HuggingFace). High confidence →
> fast-track; low confidence → manual review. **STRICTLY NO VIDEO.**

### The pipeline

```
TutorProfileScreen submits (citizenship image + photoUrl + fullName)
        │  (fire-and-forget, non-blocking)
        ▼
verify-identity (Supabase Edge Function, Firebase-JWT verified)
        │
        ├─ 1. ID OCR  → Groq vision (llama-3.2-11b-vision-preview)
        │     extracts the name from the citizenship card
        │
        ├─ 2. Face check → HuggingFace serverless inference
        │     (keremberke/yolov8m-face) on the profile picture
        │     → rejects cartoons / pets / blank images
        │
        └─ 3. Decision engine:
              nameSimilarity(profileName, OCR) ≥ 0.8 AND face present
                → { decision: "approved", confidence }
              otherwise
                → { decision: "manual_review", reasons[] }
        │
        ▼
persistAiReview(uid, verdict) → users/{uid}/tutorProfile/default.aiReview
        │
        ▼
VerificationQueue reads aiReview → "AI pre-screen: PASS" chip on the
card; the admin still taps Approve (one click, human in the loop)
```

**Environment variables**: `GROQ_API_KEY` (free dev tier),
`HF_API_TOKEN` (free dev tier), `FIREBASE_PRODUCT_ID`.

### Why the human stays in the loop

The pipeline is an **accelerator, not an approval engine**. Two
deliberate decisions:

1. **Rules forbid self-approval.** `tutorVerifications/{uid}` status
   transitions are admin-only by design — a tutor cannot approve
   themselves, and we did not loosen that to make automation easier.
   The AI verdict is therefore a *pre-screen chip* that the admin
   queue surfaces on top of the same one-tap Approve flow.

2. **The platform's students include minors** (SEE/+2 level). Auto-
   approving an adult to teach minors based purely on OCR-vs-name
   string-match is a weak bar for a high-stakes decision. The AI
   catches the *obvious* cases (name mismatch, cartoon/blank photo,
   unreadable document) and the human decides the rest.

If this project ever moves to a paid plan with a proper Cloud
Function, the natural upgrade is: the function writes the verdict AND
auto-approves high-confidence matches server-side (with the Admin
SDK), keeping the human on everything below the threshold. The
decision point is documented here so that change is a small, explicit
one — not a silent policy shift.

### No video

The `demo` document kind is a teaching *video* — it is intentionally
excluded from the pipeline. The edge function rejects non-image URLs
(`.mp4`/`.mov`/`data:video/...`) at the boundary. Face detection and
OCR run on static images only, per the requirement.

---

## Deploy checklist (everything that touches live infra)

```bash
# 1. Firestore rules (location privacy + Pro tier carve-outs +
#    free-tier capacity gate) — then re-run the rules suites:
npm run deploy:rules
firebase emulators:exec --only firestore --project demo-edumentx \
  "node scripts/acceptRequestRulesTest.mjs && node scripts/rulesEmulationTest.mjs && node scripts/batchesRulesTest.mjs"

# 2. New composite index for the contextual batches `in` query:
firebase deploy --only firestore:indexes

# 3. Supabase Edge Functions (eSewa signing + AI verification):
#    set the env vars listed in §3/§4, then
supabase functions deploy create-esewa-order
supabase functions deploy verify-identity
```

The `test:rules` deployed-drift stage will flag the rules until step 1
runs — that is expected (it compares local vs deployed rulesets).
