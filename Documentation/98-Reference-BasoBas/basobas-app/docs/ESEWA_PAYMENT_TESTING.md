# eSewa v2 (Test/UAT) Payment — Testing Guide

This document describes how to test the eSewa payment flow using `curl` and the Supabase CLI.

## Prerequisites

1. **Supabase CLI** installed and linked to your project
2. **Supabase secrets** set (or use local `.env` for local dev):

```bash
supabase secrets set ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
supabase secrets set ESEWA_PRODUCT_CODE=EPAYTEST
supabase secrets set ESEWA_FORM_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
supabase secrets set ESEWA_STATUS_URL=https://uat.esewa.com.np/api/epay/transaction/status/
supabase secrets set SUCCESS_URL=https://<your-project-ref>.functions.supabase.co/verify-esewa-payment
supabase secrets set FAILURE_URL=https://<your-project-ref>.functions.supabase.co/esewa-payment-failed
```

3. **Run the migration** to create the `products`, `transactions`, and `user_passes` tables.

## Flow Overview

```
┌─────────┐    POST /create-esewa-order     ┌─────────────────┐
│  App    │ ──────────────────────────────→  │ Edge Functions  │
│         │    { plan: "monthly" }           │                 │
│         │ ←──────────────────────────────  │  Returns form   │
│         │    { amount, total_amount,       │  fields needed  │
│         │      transaction_uuid,           │  for eSewa POST │
│         │      signature, ... }            │                 │
└─────────┘                                  └─────────────────┘
      │                                              │
      │ POST form to eSewa URL                       │
      ▼                                              │
┌─────────┐                                          │
│ eSewa   │ ── success → /verify-esewa-payment       │
│  UAT    │ ── failure → /esewa-payment-failed       │
└─────────┘                                          │
```

---

## End-to-End Test Flow

### 1. Create an eSewa Order

Requires a valid Clerk JWT. Replace `<clerk-jwt>` with an actual session token.

**Request:**
```bash
curl -i -X POST \
  'https://<project-ref>.functions.supabase.co/create-esewa-order' \
  -H 'Authorization: Bearer <clerk-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"plan": "monthly"}'
```

**Expected response (200):**
```json
{
  "amount": 249.00,
  "tax_amount": 0,
  "total_amount": 249.00,
  "transaction_uuid": "a1b2c3d4-...",
  "product_code": "EPAYTEST",
  "product_service_charge": 0,
  "product_delivery_charge": 0,
  "success_url": "https://.../verify-esewa-payment",
  "failure_url": "https://.../esewa-payment-failed",
  "signed_field_names": "total_amount,transaction_uuid,product_code",
  "signature": "Base64HMACSignature...",
  "form_action_url": "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
}
```

### 2. Verify the Database

Check that a `PENDING` transaction was created:

```bash
# Via Supabase API (requires service role key)
curl -i -X POST \
  'https://<project-ref>.supabase.co/rest/v1/rpc/check_db' \
  -H 'apikey: <service-role-key>' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json'

# Or directly query:
curl 'https://<project-ref>.supabase.co/rest/v1/transactions?select=*' \
  -H 'apikey: <service-role-key>' \
  -H 'Authorization: Bearer <service-role-key>'
```

### 3. Simulate the eSewa Callback (Verify Payment)

In the test/UAT environment, you can simulate the callback that eSewa would make. Here's a script to generate a valid callback payload:

```bash
# ── Generate a test callback payload ─────────────────────────────

TRANSACTION_UUID="<transaction-uuid-from-step-1>"
TOTAL_AMOUNT="249.00"
PRODUCT_CODE="EPAYTEST"
SECRET_KEY="8gBm/:&EnhH.1/q"

# Build the base string and compute HMAC-SHA256
# (Node.js example — adjust for your local env)
SIGNATURE=$(node -e "
  const crypto = require('crypto');
  const baseString = 'total_amount=${TOTAL_AMOUNT},transaction_uuid=${TRANSACTION_UUID},product_code=${PRODUCT_CODE}';
  const sig = crypto.createHmac('sha256', '${SECRET_KEY}').update(baseString).digest('base64');
  
  const payload = {
    transaction_code: 'TEST-REF-001',
    status: 'COMPLETE',
    total_amount: '${TOTAL_AMOUNT}',
    transaction_uuid: '${TRANSACTION_UUID}',
    product_code: '${PRODUCT_CODE}',
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature: sig
  };
  
  console.log(Buffer.from(JSON.stringify(payload)).toString('base64'));
")

echo "Callback data: $SIGNATURE"

# ── Hit the verify function with this payload ────────────────────
curl -i -X GET \
  "https://<project-ref>.functions.supabase.co/verify-esewa-payment?data=${SIGNATURE}"
```

**Expected result:** Redirect to `basobas://payment-success?transaction_uuid=...`

### 4. Simulate a Failure Callback

```bash
FAILURE_DATA=$(node -e "
  const payload = {
    transaction_uuid: '${TRANSACTION_UUID}',
    status: 'CANCELED'
  };
  console.log(Buffer.from(JSON.stringify(payload)).toString('base64'));
")

curl -i -X GET \
  "https://<project-ref>.functions.supabase.co/esewa-payment-failed?data=${FAILURE_DATA}"
```

**Expected result:** Redirect to `basobas://payment-failed?transaction_uuid=...`

### 5. Check Payment Status (Polling)

```bash
curl -i -X POST \
  'https://<project-ref>.functions.supabase.co/check-payment-status' \
  -H 'Authorization: Bearer <clerk-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"transaction_uuid": "<transaction-uuid>"}'
```

**Expected response (if completed):**
```json
{
  "status": "COMPLETE",
  "transaction_uuid": "...",
  "esewa_ref_id": "TEST-REF-001"
}
```

---

## Manual QA with eSewa UAT (via Browser/WebView)

For actual browser-based testing (e.g., via the React Native app's WebView):

1. Call `create-esewa-order` to get the form fields
2. Build an HTML form with those fields as hidden inputs, POSTing to `form_action_url`
3. Submit the form (or open it in a WebView)
4. Log in with test credentials:
   - **User ID:** `9806800001` (or `...002`–`...005`)
   - **Password:** `Nepal@123`
   - **MPIN:** `1122`
   - **Token:** `123456`
5. Complete the payment in the eSewa UI
6. eSewa redirects to `success_url` or `failure_url`

---

## Verifying the Database State

Check that the pass was properly granted with stacking:

```sql
-- View all transactions
SELECT t.transaction_uuid, t.status, t.total_amount, t.esewa_ref_id,
       t.created_at, t.updated_at
FROM transactions t
ORDER BY t.created_at DESC;

-- View all user passes with their transactions
SELECT up.clerk_id, up.status, up.starts_at, up.expires_at,
       p.name as product_name,
       t.transaction_uuid, t.status as transaction_status
FROM user_passes up
JOIN products p ON p.id = up.product_id
JOIN transactions t ON t.id = up.transaction_id
ORDER BY up.created_at DESC;
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` on create order | Invalid or expired Clerk JWT | Get a fresh session token |
| `SIGNATURE MISMATCH` log | Callback data was tampered with, or field order in base string is wrong | Check `signed_field_names` order matches `generateSignature` |
| `AMOUNT MISMATCH` log | Callback amount differs from stored amount | Possible tampering — investigate |
| Status check returns `status_check_unavailable` | eSewa UAT status API unavailable | Transient — retry via `check-payment-status` |
| `CRITICAL: ... user_pass NOT created` | Transaction is COMPLETE but pass insert failed | Manual intervention required — check the `user_passes` table |
