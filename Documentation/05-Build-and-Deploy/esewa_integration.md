# eSewa sandbox operations


## Development-only gate (22 October 2026)

Purchases are default off. Production builds hide the menu, redirect direct upgrade/success routes and reject purchase/grant methods. Production EAS profiles pin `EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS=false`; config resolution rejects an enabled flag. Existing server-owned tier reads remain available.

A developer demonstration requires `EXPO_PUBLIC_APP_ENV=development` and `EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS=true` in the client. The server separately requires `APP_ENV=development`, `ALLOW_ESEWA_SANDBOX=true` and its Firebase auth project set to `edumentx-dev` through the existing `FIREBASE_PRODUCT_ID`/`FIREBASE_PROJECT_ID` selection. A request body/header cannot enable this gate. Do not set these opt-ins in production. Demo grants also require explicit mock mode.

The shared configuration rejects live hosts/products: only `EPAYTEST`, the documented `rc-epay` form endpoint and the documented `rc`/`uat` status endpoints are accepted. No live merchant credentials are introduced. These are source controls; the Edge Function must be deployed through the reviewed rollout before the running backend gains the protection. This session did not deploy or send a test payment.

Repository contract checked 2026-10-17. This is the ePay v2 WebView integration in this repository. It stays **sandbox-only (`EPAYTEST`)**; live merchant credentials require a separate documented decision and registered business. Ordinary project setup does not require a payment deployment.

Read the [codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md), [advanced features](../04-Advanced-Features.md) and [deployment runbook](./DEPLOYMENT_GUIDE.md) for context.

## Source map

| Source | Responsibility |
|---|---|
| `src/screens/tutor/ProUpgradeScreen.tsx` | Plan selection, WebView form and success/failure redirect interception |
| `src/services/subscription/FirebaseSubscriptionRepository.ts` | Authenticated order/verification calls and live subscription reads |
| `supabase/functions/create-esewa-order/index.ts` | Firebase-token authentication, order ledger, payment verification and privileged Pro grant |
| `supabase/functions/_shared/esewa.ts` | Server-side product prices, HMAC helpers and eSewa status query |
| `supabase/functions/_shared/firestore-rest.ts` | Server-side service-account OAuth and masked Firestore updates |
| `supabase/migrations/015_create_transactions.sql` | Service-role transaction ledger |

## Current order and verification flow

1. The signed-in client sends `{ plan: "monthly" }` or `{ plan: "3month" }`. The server looks up the amount in `PRODUCTS`; it does not trust a client-supplied price.
2. `create-esewa-order` creates a `PENDING` ledger row tied to the caller and transaction UUID, then returns HMAC-signed ePay form fields.
3. The screen submits those fields in a WebView and intercepts the configured HTTPS success/failure URLs. The success URL's base64 `data` is sent back as `{ verify: data }`.
4. The server verifies the callback HMAC, transaction ownership/state, amount and product code, then queries eSewa's status endpoint for `COMPLETE`.
5. **The server grants Pro first**, writing `subscriptionTier` and `subscriptionExpiresAt` to `users/{uid}/tutorProfile/default`, and to `tutors/{uid}` if its discovery mirror exists.
6. Only after the grant succeeds does the code update the SQL ledger to `COMPLETE`. A previously completed row returns `alreadyGranted: true` without another grant.

The live client does not call `applyProGrant`; Firestore rules reject owner changes to subscription fields. `applyDemoProGrant` belongs to mock mode only.

The current helper sets expiry to the verification time plus `durationMonths × 30 days`; it does not append months to an existing expiry. A grant failure leaves the row retryable. Firestore grants and SQL completion are separate writes, not one atomic transaction: retries before ledger completion may reapply the grant and shift that timestamp. Inspect both stores when diagnosing a partial failure; do not infer exact-once completion from a client success message alone.

## Sandbox configuration

The official [ePay v2 documentation](https://developer.esewa.com.np/pages/Epay-V2) lists the sandbox form/status endpoints and test account details. Verify them before a demo; use test credentials, never a personal wallet. Its signed input field order is `total_amount,transaction_uuid,product_code`.

| Edge Function secret | Purpose |
|---|---|
| `ESEWA_FORM_URL` | Sandbox form endpoint: `https://rc-epay.esewa.com.np/api/epay/main/v2/form` |
| `ESEWA_STATUS_URL` | Sandbox status endpoint: `https://uat.esewa.com.np/api/epay/transaction/status/` |
| `ESEWA_PRODUCT_CODE` | `EPAYTEST` |
| `ESEWA_SECRET_KEY` | Matching sandbox signing secret, held server-side |
| `SUCCESS_URL`, `FAILURE_URL` | HTTPS redirect URLs matching the screen's intercept paths (`/payment-success`, `/payment-failed`) |
| `FIREBASE_PRODUCT_ID` or `FIREBASE_PROJECT_ID` | Firebase project used by token validation and Firestore REST |
| `FIREBASE_SERVICE_ACCOUNT` | Server-side JSON credential for privileged Firestore grant writes |
| `EDUMENTX_SERVICE_KEY` | Supabase service-role access to the transaction ledger |

`SUPABASE_URL` is supplied to the server runtime. The app uses only its public Supabase URL/anon key plus a Firebase ID token; payment signing and service credentials must never enter `EXPO_PUBLIC_*` values.

## Owner deployment

An authorized owner must review the selected Supabase/Firebase projects, migration `015`, pending migrations and server secrets before applying changes. A blanket `supabase db push` can apply unrelated pending SQL; inspect the migration plan first.

Deploy the reviewed function with Firebase authentication retained inside the handler:

```bash
supabase functions deploy create-esewa-order --no-verify-jwt
```

The flag disables Supabase's gateway JWT check; it does not disable the function's Firebase-token validation. Verify that the deployed Firestore rules still block client tier writes and that the server credential can patch only the intended project. Deployment is not a beginner install step.

## Sandbox verification

Use an approved live-backend sandbox test account with an existing tutor profile and live repository mode:

- Successful callback: check profile tier/expiry, discovery mirror if present, and the corresponding ledger status/reference.
- Completed-callback replay: expect `alreadyGranted: true`; check that expiry is unchanged.
- Tampered payload/wrong owner: expect rejection and no grant.
- Unreachable status service: expect retryable failure; inspect ledger state before retrying.
- Failed/missing grant target: expect `grant_failed` or `grant_target_missing`, with no consumed completion marker.
- Client attempt to update tier/expiry directly: expect rules denial.

These tests write backend data. Record the transaction UUID and resulting state, and use the normal owner-approved cleanup process. Do not log service secrets or raw identity tokens.

## Diagnose failures

| Symptom | Inspect |
|---|---|
| Gateway 401 | Deployed `--no-verify-jwt`, Firebase token and function-side validation |
| Signature mismatch | Secret, signed-field order, raw numeric formatting and base64 normalization |
| Status check unavailable | Configured sandbox host, provider response and function logs |
| Payment verified but no Pro | Server grant errors, `FIREBASE_SERVICE_ACCOUNT`, project ID, tutor profile existence and ledger state |
| Profile Pro but discovery badge stale | Discovery mirror existence and privileged mirror write outcome |
| WebView does not return | HTTPS redirect configuration and the screen's intercept handlers |

This page documents repository behavior; it does not establish current deployment state or production payment readiness.
