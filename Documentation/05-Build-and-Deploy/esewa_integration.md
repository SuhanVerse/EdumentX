# EdumentX — eSewa Integration (ePay v2 WebView flow)

> **What this doc covers:** the eSewa payment integration EdumentX
> actually ships — the **web-based ePay v2 form flow inside a React
> Native WebView**, signed and verified by a Supabase Edge Function,
> with a Postgres transaction ledger for replay protection.
>
> **What it replaces:** the previous version of this file was a raw
> scrape of eSewa's **Android SDK** page (`ESewaConfiguration` /
> `ESewaPayment` intents). That native-SDK path is **deprecated by
> eSewa** — their docs point new builds at the web form flow, which is
> what we use. The `.aar`-based SDK is not part of this project.
>
> The full architecture write-up (data model, trust model, Pro-tier
> gates) lives in `Documentation/04-Advanced-Features.md` §3. This
> file focuses on how to run, deploy, and debug it.

---

## 1. Architecture at a glance

```
Tutor taps "Upgrade" (ProUpgradeScreen — src/screens/tutor/ProUpgradeScreen.tsx)
        │
        ▼
create-esewa-order  (Supabase Edge Function — supabase/functions/create-esewa-order/)
  • Firebase JWT verified (Bearer token, _shared/firebase-auth.ts)
  • price looked up SERVER-SIDE (_shared/esewa.ts PRODUCTS) — client
    never sends an amount
  • INSERTs a PENDING row in the `transactions` Postgres ledger
    (migration 015) — the replay-protection anchor
  • HMAC-SHA256 signs "total_amount,transaction_uuid,product_code"
    and returns the eSewa form fields
        │
        ▼
ProUpgradeScreen renders an AUTO-SUBMITTING HTML form in a WebView
  (react-native-webview; real-mobile user agent to dodge CAPTCHA)
        │
        ▼
eSewa sandbox → redirects to edumentx://payment-success?data=<base64>
  (intercepted in onShouldStartLoadWithRequest — the deep link never
  actually opens)
        │
        ▼
Client calls create-esewa-order again with { verify: data } — the
server runs FOUR checks before allowing the grant:
  1. HMAC signature over the payload (raw-JSON-text rebuild, so
     amounts like 1000.0 verify exactly)
  2. `transactions` lookup by transaction_uuid → must exist AND
     belong to the caller (a uuid reconciles exactly once)
  3. amount + product_code cross-check vs the stored row
  4. server-to-server GET /api/epay/transaction/status/ → COMPLETE
     (the docs' anti-fraud step — the signed callback alone can be
     replayed; the status API proves the transaction happened)
  → marks the row COMPLETE with eSewa's ref id
        │
        ▼
Client writes the Pro grant (FirebaseSubscriptionRepository.applyProGrant):
  users/{uid}/tutorProfile/default + tutors/{uid} discovery mirror
  (skipped when the verify response reports alreadyGranted — a
  replayed callback never stacks the grant)
```

### Key files

| File | Role |
|---|---|
| `src/screens/tutor/ProUpgradeScreen.tsx` + `src/app/pro-upgrade.tsx` | Plan picker + eSewa WebView + deep-link intercept |
| `src/services/subscription/*` | `SubscriptionRepository` interface, Firebase/Mock impls, `dataSource` selector |
| `supabase/functions/create-esewa-order/index.ts` | ORDER mode (sign + ledger insert) and VERIFY mode (4-check reconcile) |
| `supabase/functions/_shared/esewa.ts` | HMAC signing, callback verification, GET status check, base64 normalization |
| `supabase/functions/_shared/firebase-auth.ts` | Firebase ID-token verification for edge functions |
| `supabase/migrations/015_create_transactions.sql` | `transactions` ledger (service-role-only RLS) |
| `Documentation/04-Advanced-Features.md` §3 | Full trust model + Pro gates |

---

## 2. Why WebView, not the Android SDK

eSewa's own developer docs mark their **native mobile SDKs as
deprecated** and direct new integrations to the web-based flow. The
ePay v2 form flow (POST to `/api/epay/main/v2/form`) works identically
from any client that can host a web view:

- **No `.aar` SDK, no `client_id`/`client_secret` intents, no
  `ESewaConfiguration`.** The merchant credentials that matter are
  `product_code` + `secret_key`, used to sign the form server-side.
- The HMAC **secret key never touches the device** — signing and
  verification run in the Supabase Edge Function, so the key can't be
  extracted from the app binary.
- The pattern matches the BasoBas reference project
  (`Documentation/98-Reference-BasoBas/basobas-app/app/(tenant)/esewa-webview.tsx`),
  which this port was adapted from.

---

## 3. Sandbox credentials & URLs

> ⚠️ **SANDBOX ONLY.** Merchant code `EPAYTEST` + the public test
> secret. This is a college demo without a registered business —
> pointing at live merchant credentials requires an explicit,
> separate decision.

| Item | Sandbox value |
|---|---|
| Form (POST) URL | `https://rc-epay.esewa.com.np/api/epay/main/v2/form` |
| Status (GET) URL | `https://uat.esewa.com.np/api/epay/transaction/status/` (see note below) |
| Production form URL | `https://epay.esewa.com.np/api/epay/main/v2/form` |
| Product code | `EPAYTEST` |
| Secret key | `8gBm/:&EnhH.1/q(` (public UAT key from the docs) |
| Test eSewa IDs | `9806800001` … `9806800005` (password `Nepal@123`) |
| Test MPIN / token | `1122` / `123456` |

> **Status-host note:** eSewa's docs have been inconsistent about the
> sandbox status host (`rc.esewa.com.np`, `uat.esewa.com.np`, and
> `rc-epay.esewa.com.np` all appear in different pages/generations).
> The env var is the single place to fix it — confirm against the
> live `developer.esewa.com.np/pages/Epay-V2 §Status Check` page for
> the current sandbox host before first live test.

**Signature format** (must match exactly — no spaces):

```
base_string = "total_amount=<total>,transaction_uuid=<uuid>,product_code=<code>"
signature   = Base64(HMAC_SHA256(base_string, secret_key))
```

`signed_field_names` sent with the form is
`total_amount,transaction_uuid,product_code` — the field order above
is mandatory.

**Form fields** (all required; unused charges must be `0`):
`amount`, `tax_amount`, `total_amount`, `transaction_uuid`,
`product_code`, `product_service_charge`, `product_delivery_charge`,
`success_url`, `failure_url`, `signed_field_names`, `signature`.

---

## 4. Environment variables

Supabase Edge Function secrets (`supabase secrets set ...`):

| Var | Purpose |
|---|---|
| `ESEWA_FORM_URL` | `https://rc-epay.esewa.com.np/api/epay/main/v2/form` |
| `ESEWA_STATUS_URL` | sandbox status endpoint (see note above) |
| `ESEWA_PRODUCT_CODE` | `EPAYTEST` |
| `ESEWA_SECRET_KEY` | the matching sandbox secret |
| `SUCCESS_URL` | `edumentx://payment-success` |
| `FAILURE_URL` | `edumentx://payment-failed` |
| `FIREBASE_PRODUCT_ID` | Firebase project id (JWT verification) |
| `EDUMENTX_SERVICE_KEY` | Supabase service role (ledger writes; already set for the chat function) |

The app-side `.env` needs `EXPO_PUBLIC_SUPABASE_URL` +
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (already present for storage/chat).

---

## 5. Deploy

```bash
# 1. Create the transactions ledger table
supabase db push

# 2. Deploy the edge function (order + verify modes)
supabase functions deploy create-esewa-order

# 3. Set/verify secrets (only if not already set)
supabase secrets set ESEWA_FORM_URL=... ESEWA_STATUS_URL=... \
  ESEWA_PRODUCT_CODE=EPAYTEST ESEWA_SECRET_KEY='8gBm/:&EnhH.1/q(' \
  SUCCESS_URL=edumentx://payment-success \
  FAILURE_URL=edumentx://payment-failed
```

Deploy order matters: the function's ledger reads/writes need migration
`015` to exist first.

---

## 6. Testing in the sandbox

1. **Start the app** and open the Pro Upgrade screen
   (`/pro-upgrade` — "Go Pro" row in the tutor profile).
2. Pick a plan and tap Upgrade. The WebView opens eSewa's test login.
3. Log in with `9806800001` / `Nepal@123`, confirm with MPIN `1122`
   and token `123456`.
4. On success you land back on the app with the Pro banner live.

**Things to verify in a live test** (these are the failure modes the
ledger + status API guard against):

- Payment succeeds once → Pro granted, `transactions` row = `COMPLETE`
  with `esewa_ref_id`.
- Replaying the same `edumentx://payment-success` URL → verify returns
  `alreadyGranted: true` and **no second grant / no stacked expiry**.
- Tampering with the `data` payload → `signature_mismatch` (no grant).
- The status API is unreachable → `status_check_unavailable`; the
  client shows a retry message, the row stays `PENDING` and can still
  be reconciled.

**Known sandbox quirks:**

- The session times out after ~5 minutes of inactivity — re-initiate
  the payment.
- eSewa's published *example output signatures* in their docs don't
  reproduce with the published UAT secret (their samples were
  generated with a rotated key). The format above is what the docs
  specify; trust a live sandbox payment as the real end-to-end check.
- The WebView uses a real mobile user-agent to avoid eSewa's
  CAPTCHA/bot detection — don't "fix" it back to a stock WebView UA.

---

## 7. Security model (summary)

1. **Secret never on the client** — HMAC signing + verification both
   run in the edge function.
2. **Server-side price** — the client sends a plan id, never an
   amount; a tampered client can't pay Rs 1 for a Rs 249 pass.
3. **Replay protection** — every order inserts a PENDING
   `transactions` row keyed by a unique `transaction_uuid`; verify
   reconciles it exactly once, and only for the tutor who created it.
4. **Anti-fraud status check** — grants happen only after eSewa's own
   status API reports `COMPLETE` (never auto-success on
   verification-API failure).
5. **Idempotent client** — `alreadyGranted` responses skip the re-grant
   (no stacking).

Full rationale in `Documentation/04-Advanced-Features.md` §3 ("Trust
model").
