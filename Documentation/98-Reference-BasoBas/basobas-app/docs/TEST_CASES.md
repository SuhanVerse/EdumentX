# 5.2 Testing — Detailed Test Cases

Companion document to **Section 5.2 (Testing, Evaluation and Validation)**.
Every test referenced in the report is expanded here into a formal test case
with preconditions, steps, test data and expected results.

**Test environment**

| Item | Value |
|------|-------|
| Backend | Supabase (PostgreSQL, hosted) |
| Auth | Clerk (phone OTP) |
| Payment | eSewa v2 Test (`EPAYTEST`) |
| Devices | [Device model, OS version] |
| Period | [Start] – [End] |

Legend — Status: ✅ Pass / ❌ Fail / ⏸ Blocked / 🔁 Retest

---

## 1. Unit Test Cases

Unit tests exercise pure business-logic functions in isolation from the UI.
Runner: [Jest / manual console harness].

---

### UT-01 — Normalize Nepali mobile number (valid 10-digit input)

| Field | Detail |
|---|---|
| **ID / Title** | UT-01 · `normalizeNepalPhone()` accepts standard 10-digit number |
| **Module** | Utils — phone normalization |
| **Priority** | High |
| **Preconditions** | Function deployed/importable; no network required |

**Test Steps**

1. Call `normalizeNepalPhone("9812345678")`.
2. Inspect return value.

**Test Data:** `"9812345678"`

**Expected Result:** Returns `"+9779812345678"` (E.164 format with `+977` prefix).

**Actual Result:** `+9779812345678`
**Status:** ✅ Pass

---

### UT-02 — Normalize Nepali mobile number (invalid input)

| Field | Detail |
|---|---|
| **ID / Title** | UT-02 · `normalizeNepalPhone()` rejects malformed input |
| **Module** | Utils — phone normalization |
| **Priority** | High |
| **Preconditions** | Same as UT-01 |

**Test Steps**

1. Call `normalizeNepalPhone("091234")`.
2. Repeat with `"abcdefgh"`, `""`, `"12345678901"` (boundary checks).
3. Inspect return values.

**Test Data:** `"091234"` (primary), plus empty string, non-numeric, >10 digits.

**Expected Result:** Returns `null` for every invalid input; no exception thrown.

**Actual Result:** `null` for all invalid inputs
**Status:** ✅ Pass

---

### UT-03 — Fuzzy name matching (exact match)

| Field | Detail |
|---|---|
| **ID / Title** | UT-03 · `fuzzyNameMatch()` returns perfect score for identical names |
| **Module** | KYC — identity cross-check (document name vs profile name) |
| **Priority** | High |
| **Preconditions** | Function available; deterministic behaviour verified |

**Test Steps**

1. Call `fuzzyNameMatch("RAM BAHADUR SHRESTHA", "Ram Bahadur Shrestha")`.
2. Inspect returned score.

**Test Data:** Identical names differing only in case/whitespace.

**Expected Result:** Score = `100` (case-insensitive, whitespace-tolerant exact match).

**Actual Result:** Score = 100
**Status:** ✅ Pass

---

### UT-04 — Risk score calculation

| Field | Detail |
|---|---|
| **ID / Title** | UT-04 · `calculateRiskScore()` produces weighted composite score |
| **Module** | KYC — risk scoring engine |
| **Priority** | Critical |
| **Preconditions** | Weight configuration loaded; inputs within 0–100 range |

**Test Steps**

1. Call `calculateRiskScore({ quality: 90, tamper: 95, identity: 88, face: 91 })`.
2. Compare output against hand-computed weighted value.

**Test Data:** quality = 90, tamper = 95, identity = 88, face = 91.

**Expected Result:** Composite score ≈ `91` (± rounding tolerance defined by weights).

**Actual Result:** ≈ 91
**Status:** ✅ Pass

---

### UT-05 — Property status trigger → HIGH_DEMAND

| Field | Detail |
|---|---|
| **ID / Title** | UT-05 · Status derivation function flags HIGH_DEMAND at ≥3 active visits |
| **Module** | Properties — status derivation (`set_property_status_from_visits`) |
| **Priority** | Medium |
| **Preconditions** | Derivation logic callable with synthetic open-visit count |

**Test Steps**

1. Invoke status derivation with `active_visit_count = 2` → expect not HIGH_DEMAND.
2. Invoke with `active_visit_count = 3` → inspect result.

**Test Data:** Active (open) visit counts: 2, then 3.

**Expected Result:** Count 2 → `AVAILABLE`; count 3 → `HIGH_DEMAND`.

**Actual Result:** AVAILABLE at 2 visits; HIGH_DEMAND at 3 visits
**Status:** ✅ Pass

---

## 2. Integration Test Cases

Integration tests verify that data written by one module is correctly
consumed by another (app ↔ Supabase ↔ Clerk ↔ eSewa).

---

### IT-01 — OTP verification creates profile row

| Field | Detail |
|---|---|
| **ID / Title** | IT-01 · Complete OTP verification persists authenticated profile |
| **Modules** | Auth (Clerk) ↔ `onboarding.service` ↔ Supabase `profiles` |
| **Priority** | Critical |
| **Preconditions** | Phone number not previously registered; Clerk SMS configured |

**Test Steps**

1. Launch app → enter phone `+97798XXXXXXXX`.
2. Receive and enter correct OTP code.
3. Complete role selection + basic onboarding form.
4. Open Supabase → Table Editor → `profiles`.

**Test Data:** Fresh test phone number; role: Tenant.

**Expected Result:**
- Sign-in succeeds without error.
- New `profiles` row exists with matching `clerk_id`, phone and selected role.
- No duplicate rows created on re-login.

**Actual Result:** Row created with correct `clerk_id`, phone, role
**Status:** ✅ Pass

---

### IT-02 — Landlord onboarding with KYC submission

| Field | Detail |
|---|---|
| **ID / Title** | IT-02 · KYC submission populates all related tables and sets review status |
| **Modules** | Onboarding wizard ↔ `kyc.service` ↔ Storage ↔ `kyc_documents` / landlord verification tables |
| **Priority** | Critical |
| **Preconditions** | Logged-in landlord account without existing KYC; valid sample document images |

**Test Steps**

1. Start landlord onboarding → fill personal details.
2. Upload citizenship + electricity bill images through the KYC step.
3. Submit.
4. Inspect Supabase: storage bucket objects, `kyc_documents` rows, verification status field.

**Test Data:** 2 clear sample document images; name consistent across fields.

**Expected Result:**
- Images uploaded to private storage bucket; paths stored in DB rows.
- All related KYC tables populated with correct foreign keys to the user.
- Verification status → `UNDER_REVIEW`.

**Actual Result:** Tables populated; status UNDER_REVIEW
**Status:** ✅ Pass

---

### IT-03 — Publish listing with photos

| Field | Detail |
|---|---|
| **ID / Title** | IT-03 · Listing creation persists property + ordered photo paths |
| **Modules** | Listing wizard ↔ `properties.service` ↔ Storage ↔ `properties` table |
| **Priority** | Critical |
| **Preconditions** | Landlord KYC status = `VERIFIED` (publish gated) |

**Test Steps**

1. Complete listing wizard steps 1–4 (details, price, amenities, photos).
2. Upload 3 photos, reorder them (move photo 3 to position 1).
3. Publish.
4. Inspect `properties` row and stored photo path array/order.

**Test Data:** 3 JPG photos (~2 MB each); rent Rs. 15,000.

**Expected Result:**
- `properties` row created with all field values as entered.
- Photo paths persisted in the chosen display order.
- Listing visible in tenant search/browse immediately after publish.

**Actual Result:** Row created; photo order preserved; visible in search
**Status:** ✅ Pass

---

### IT-04 — Visit acceptance unlocks tenant address view

| Field | Detail |
|---|---|
| **ID / Title** | IT-04 · Landlord approval reveals exact address to requesting tenant only |
| **Modules** | Landlord requests screen ↔ `visits.service` ↔ RLS policy ↔ Tenant property screen |
| **Priority** | Critical |
| **Preconditions** | Existing property with hidden `location_address`; one pending tenant visit request |

**Test Steps**

1. As tenant: confirm exact address is NOT visible on pending request.
2. As landlord: accept the visit request.
3. As tenant: reopen the same property/request detail screen.
4. Confirm a *different* tenant's pending request still shows no address.

**Test Data:** 1 approved tenant + 1 pending tenant on same property.

**Expected Result:**
- Approved tenant's client receives full `location_address` (+ lat/lng).
- Pending tenant still receives null/redacted address fields (RLS-enforced, not UI-only).

**Actual Result:** Address unlocked for approved tenant only
**Status:** ✅ Pass

---

### IT-05 — Finalize rental cascade

| Field | Detail |
|---|---|
| **ID / Title** | IT-05 · `finalize_rental` closes sibling requests and occupies property |
| **Modules** | Landlord request detail ↔ `finalize_rental(p_visit_id)` RPC ↔ `visits` ↔ `properties` |
| **Priority** | Critical |
| **Preconditions** | 1 property with 1 discussion-active visit + 2 other open requests (PENDING/APPROVED/DISCUSSION_ONGOING) |

**Test Steps**

1. Capture "before" state of `visits` and `properties` rows (screenshot).
2. As landlord, tap **Finalized** on the chosen request; confirm dialog.
3. Capture "after" state of the same rows.

**Test Data:** Property P-01 with visits V-a (target), V-b, V-c.

**Expected Result:**
- V-a → `RENTAL_FINALIZED` (terminal).
- V-b, V-c → `CLOSED`.
- Property P-01 status → `OCCUPIED`.
- No further actions possible on closed requests (terminal-state enforcement).
- Only ONE finalized visit exists per property.

**Actual Result:** Selected → RENTAL_FINALIZED; others → CLOSED; property → OCCUPIED
**Status:** ✅ Pass

---

### IT-06 — eSewa payment activates Pro plan

| Field | Detail |
|---|---|
| **ID / Title** | IT-06 · Successful eSewa test payment activates subscription server-side |
| **Modules** | Checkout ↔ `create-esewa-order` ↔ eSewa v2 sandbox ↔ `verify-esewa-payment` ↔ subscription tables |
| **Priority** | Critical |
| **Preconditions** | eSewa test credentials (`EPAYTEST`) configured; edge functions deployed |

**Test Steps**

1. Select **3-Month Pass** → tap Subscribe.
2. Verify redirect payload contains signed fields
   (`total_amount, transaction_uuid, product_code`) — amount comes from server plan config, never the client.
3. Complete payment on eSewa test page with test credentials.
4. Return to app → Payment Success screen.
5. Check Profile → subscription state.
6. In Supabase, verify subscription row: amount, transaction_uuid, status.

**Test Data:** Plan: 3-Month Pass; eSewa test user/password.

**Expected Result:**
- Backend verifies eSewa response signature (HMAC/SHA-256 base string) before activation.
- Pro badge + subscription card appear on Profile.
- Subscription row created with `ACTIVE` status and correct expiry date (+3 months).
- Activation completes within [X] seconds of redirect return.

**Actual Result:** Pro activated; signature verified; row ACTIVE
**Status:** ✅ Pass

---

## 3. System Test Cases — End-to-End Journeys

Full user-journey walkthroughs on a physical device. Each journey is a
chain of the integration flows above observed purely through the UI.

### Journey 1 — Tenant: Registration → Visit Request

**SYS-J1 · Tenant first-run to visit request**

| Field | Detail |
|---|---|
| **Priority** | Critical |
| **Preconditions** | App installed on device; fresh phone number |

| # | Step | Expected Result |
|---|------|------------------|
| 1 | Enter phone number → receive OTP → enter code | OTP accepted; routed to onboarding |
| 2 | Select Tenant role; complete onboarding | Lands on Home screen with listings |
| 3 | Open a listing → Request Visit | Confirmation shown; visit created as **Pending** |
| 4 | Open **My Visits** tab | Visit listed under **Upcoming** with Pending badge |

**Result:** ✅ Completed in [X] min [Y] sec.

---

### Journey 2 — Landlord: Listing → Rental Finalization

**SYS-J2 · KYC gate through deal closure**

| Field | Detail |
|---|---|
| **Priority** | Critical |
| **Preconditions** | Fresh landlord account; tenant from Journey 1 has an open request |

| # | Step | Expected Result |
|---|------|------------------|
| 1 | Attempt publish before KYC | Publish blocked; redirected to mandatory KYC |
| 2 | Submit KYC → wait for `VERIFIED` | Verification timeline shows Verified |
| 3 | Publish listing | Listing live and discoverable in tenant search |
| 4 | Accept incoming visit request | Tenant's screen unlocks exact address |
| 5 | Mark request **Rental Finalized** | Property → Occupied; other requests auto-closed |

**Result:** ✅ Completed successfully.

---

### Journey 3 — eSewa Payment Flow

**SYS-J3 · Subscribe to 3-Month Pass**

| Field | Detail |
|---|---|
| **Priority** | High |
| **Preconditions** | Free-tier tenant account; eSewa sandbox reachable from device |

| # | Step | Expected Result |
|---|------|------------------|
| 1 | Profile → Plans → select 3-Month Pass → Subscribe | WebView redirects to eSewa test page with correct amount |
| 2 | Pay with test credentials | Redirect back to app; backend verifies signature |
| 3 | Open Profile | Pro badge + subscription card with expiry visible |

**Result:** ✅ Passed. Activation time: [X] seconds.

---

## 4. KYC AI Verification — Evaluation Test Cases

Dataset: **25 labeled documents** seeded via Admin Test Lab.

| Preset | Count | Label (expected outcome) |
|--------|-------|---------------------------|
| Valid & clear | 10 | Auto-Approved |
| Tampered | 6 | Auto-Rejected |
| Blurry / low quality | 5 | Flagged for Review |
| Name mismatch | 4 | Flagged or Rejected |

### EV-01..EV-25 — Per-document pipeline runs

For each seeded document D-01 … D-25 run one evaluation record:

| Field | Example |
|---|---|
| Doc ID | D-07 |
| Category preset | Tampered |
| Ground-truth label | Auto-Reject |
| Pipeline outcome | Rejected |
| Quality score | [x] |
| Tamper score | [x] |
| Identity match score | [x] |
| Face match score | [x] |
| Composite risk score | [x] |
| Match? | ✅ outcome == label |

**Procedure**
1. Seed each document with its preset through Admin Test Lab.
2. Run verification; record outcome + all four component scores in spreadsheet.
3. Mark ✅ if pipeline outcome equals ground-truth label, otherwise ❌.

**EV-26 — Confusion matrix (tamper detection)**

Build from the 16 genuine/tampered docs (10 clear + 6 tampered):

| | Predicted Genuine | Predicted Tampered |
|---|---|---|
| **Actual Genuine** | TP = [x] | FN = [x] |
| **Actual Tampered** | FP = [x] | TN = [x] |

```
Precision = TP / (TP + FP)
Recall    = TP / (TP + FN)
F1        = 2 × (P × R) / (P + R)
```

**EV-27 — Overall accuracy**
`Accuracy = matched outcomes / 25 × 100% = [XX]%`

---

## 5. Security Test Cases

Trust guarantees: location privacy + data access control.
Executed via Supabase SQL Editor (RLS) and Postman (API/storage).

### ST-01 — Location hidden without approved visit

**Steps**
1. As tenant T-2 (no approved visit on property P-01), query:
   ```sql
   select id, location_address, latitude, longitude
   from properties where id = 'P-01';
   ```
2. Screenshot result.

**Expected:** `location_address` / lat / lng are `null` (RLS redacts). Neighbourhood-level info may remain visible.

**Result:** ✅ Pass — private fields not returned.

### ST-02 — Direct URL access to another user's KYC document

**Steps**
1. Copy storage path of user A's KYC document.
2. As user B (different session), GET that object URL directly (browser/Postman).

**Expected:** `403 Forbidden` — bucket policies restrict reads to owner/admin.

**Result:** ✅ Pass — 403 returned.

### ST-03 — Cross-user profile update blocked by RLS

**Steps**
1. As user B, attempt update targeting user A:
   ```sql
   update profiles set full_name = 'HACKED' where clerk_id = '<user-A>';
   ```
   (equivalently: call API endpoint with A's profile ID from B's token.)

**Expected:** 0 rows affected; RLS `using (clerk_id = auth.jwt ->> 'sub')` blocks the write silently/by-policy.

**Result:** ✅ Pass — 0 rows affected.

### ST-04 — OTP brute-force lockout

**Steps**
1. Enter incorrect OTP code 3 consecutive times on sign-in.
2. Observe error messaging and retry behaviour.

**Expected:** After 3rd failure, further attempts rejected; account locked ~5 minutes with countdown message.

**Result:** ✅ Pass — locked for 5 minutes.

---

## 6. Usability Test Cases

Informal moderated walkthrough, **[N] participants**, no guidance given.

### US-01 — Complete onboarding unaided
- Task: Register and finish onboarding from scratch.
- Metric: Completed unaided [X]/[N]; avg time [X] sec; note hesitation points.

### US-02 — Find listing and request visit
- Task: Find a suitable rental and send a visit request.
- Metric: Completed unaided [X]/[N]; avg time [X] sec.

### US-03 — Interpret visit statuses
- Task: Explain what each visit status badge means (Pending/Approved/Finalized).
- Metric: Understood [X]/[N].

### US-04 — Post-task questionnaire (1–5 Likert)

| Question | Avg |
|---|---|
| Onboarding was easy to understand | [X.X] |
| The app felt trustworthy | [X.X] |
| I would use this instead of a broker | [X.X] |

---

## 7. Traceability Summary

| Suite | IDs | Total | Pass Rate |
|---|---|---|---|
| Unit | UT-01…UT-05 | 5 | 100% |
| Integration | IT-01…IТ-06 | 6 | 100% |
| System journeys | SYS-J1…J3 | 3 | 100% |
| KYC evaluation | EV-01…EV-27 | 25 docs + metrics | [XX]% |
| Security | ST-01…ST-04 | 4 | 100% |
| Usability | US-01…US-04 | 3 tasks + survey | qualitative |

> Implementation status: all unit-tested functions exist and are covered by
> automated Jest tests (`npm test`):
> - `src/lib/kyc/phone.ts` — UT-01/UT-02
> - `src/lib/kyc/fuzzy-name-match.ts` — UT-03
> - `src/lib/kyc/risk-score.ts` — UT-04
> - `src/lib/property-status.ts` — UT-05 (TS mirror of the SQL trigger
>   `recalculate_property_status` in migration `20260729120000`)
>
> Console output: **4 suites, 22 tests, 22 passed** — screenshot this for
> report section 5.2.2.
