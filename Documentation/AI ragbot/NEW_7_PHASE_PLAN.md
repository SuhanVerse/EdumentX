# EdumentX AI Assistant — New 7-Phase Implementation Plan

> **Goal**: Fix all 23 bugs through 7 phases.  
> **Ordering**: Mock-data-friendly phases first → Real Firebase/Supabase data phases later.  
> **Each phase ends with a test checkpoint** — you test, I fix if anything's wrong.  
> **Design principle**: Changes must work on mock data AND real Firebase/Supabase data.

---

## Phase 1 — Constraint Extraction Polish 🎯

**Scope**: Pure client-side, mock-compatible. Fixes constraint parsing edge cases.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **C4** — `min_rating`, `min_experience` never populated | 🟡 | Add keyword extraction for "4+ stars", "highly rated", "experienced", "3+ years" |
| **C10** — Budget parsing regex fragile | 🔵 | Handle commas (5,000), "Rs." vs "Rs", "NPR 5000", "Rs.5000", decimals |
| **C11** — Radius fallback dead code | 🔵 | Remove unused `radius_km` or wire it to "nearby" / "within X km" phrases |

### Files to Change

- `lib/ai/clientConstraintParser.ts` — add rating/experience extraction, fix budget regex
- `ai/agents/constraintExtractor.ts` — add rating/experience extraction, fix budget regex (mirror)
- `ai/types/constraints.types.ts` — clean up `radius_km` if unused
- `lib/ai/minimumConstraints.ts` — ensure budget regex fix is reflected

### Test Checklist

| # | Say | Expected |
|---|-----|----------|
| 1 | **"I need a maths tutor with 3+ years experience"** | Extracts `min_experience: 3` |
| 2 | **"I need a high-rated physics tutor"** | Extracts `min_rating` or mentions rating |
| 3 | **"Rs. 5,000 budget"** | Correctly parses 5000 (handles comma + "Rs.") |
| 4 | **"NPR 5000"** | Correctly parses 5000 |
| 5 | **"nearby tutors"** | If radius is kept, extracts `radius_km`. If removed, no crash. |
| 6 | **Existing Phase 1 & 2 flows still work** | FAQ, greetings, off-topic, budget flow |

---

## Phase 2 — Prompt Library + Unify Keywords 🎯

**Scope**: Pure client-side, mock-compatible. Eliminates duplicate code and fixes off-topic patterns server-side.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **W2** — No shared prompt library | 🟡 | Create single `ai/domain/keywords.ts` as the canonical keyword source |
| **W3** — 4 copies of keyword tables | 🟡 | All 4+ keyword tables import from `ai/domain/keywords.ts` |
| **C7** — `quickOffTopicCheck` too aggressive (server-side) | 🟡 | Fix patterns in `ai/domain/intentClassifier.ts` to match what we did in mock pipeline |

### Files to Change

- `ai/domain/keywords.ts` — **NEW** — canonical subject keywords + off-topic patterns
- `ai/agents/constraintExtractor.ts` — import from keywords.ts instead of inline table
- `lib/ai/clientConstraintParser.ts` — import from keywords.ts
- `ai/retrieval/sqlFilterBuilder.ts` — import from keywords.ts
- `ai/domain/intentClassifier.ts` — fix `quickOffTopicCheck` to use new shared patterns
- `ai/domain/prompts.ts` — import subject list from keywords.ts for LLM context

### Test Checklist

| # | Say | Expected |
|---|-----|----------|
| 1 | **All Phase 1 tests still pass** | No regressions |
| 2 | **"Explain calculus"** | ✅ Should search (was blocked before by aggressive `/^explain/`) |
| 3 | **"I need a python tutor"** | ✅ Should find CS tutors (not blocked) |
| 4 | **"Write a program"** | ❌ Should refuse (off-topic) |
| 5 | **"Generate a python script"** | ❌ Should refuse |
| 6 | **"I need explanation of photosynthesis"** | ✅ Should search for Biology tutor |
| 7 | Check terminal | No import errors from keyword consolidation |

---

## Phase 3 — Guardrails + Ranking Efficiency 🎯

**Scope**: Pure client-side, mock-compatible. Adds safety and reduces API costs.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **W4** — Mock pipeline skips all guardrails | 🟡 | Add post-generation guardrails (hallucination check, contact info leak check) |
| **W19** — 3 LLM calls per turn | 🟡 | Combine intent + constraint extraction into single LLM call |
| **C13** — Groq ranker adds extra LLM call | 🔵 | Only call groq ranker for explicit re-ordering ("sort by rating", "cheapest") |

### Files to Change

- `services/ai/mockChatService.ts`:
  - Integrate `checkResponse()` from `ai/domain/guardrails.ts` after generating response
  - Combine constraint extraction into the groqRank call (already 1 call, but verify)
- `services/ai/groqRanker.ts`:
  - Simplify: only re-rank when user explicitly asks for re-ordering
  - For default search, return results in deterministic order
- `ai/domain/guardrails.ts`:
  - Verify `checkHallucinatedTutors` works with the mock pipeline's data shape

### Test Checklist

| # | Say | Expected |
|---|-----|----------|
| 1 | **"I need a maths tutor" → "12" → "Rs 5000"** | Shows tutors normally — no extra LLM call |
| 2 | **"Sort by highest rated"** | Re-ranks by rating (uses groqRanker) |
| 3 | **"Show cheapest first"** | Re-ranks by price |
| 4 | **Check terminal** | Should show `[guardrails] passed` or similar log |
| 5 | **"Rs 9999999 budget"** | If no results → guardrail check still runs, no invented tutors |
| 6 | **Response doesn't include phone/email** | Guardrail blocks it if it does |

---

## Phase 4 — Embedding + Database Schema 🎯

**Scope**: Supabase PostgreSQL + embedding pipeline. Real data setup work.  
**Note**: These are setup operations — SQL migrations and embedding logic. They don't change user-facing behavior yet.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **C5** — Embedding query missing budget/gender/location | 🟡 | Include all active constraints when generating query embeddings |
| **W11** — Embeddings don't include key constraints | 🟡 | Add budget range, gender, location to tutor embedding text |
| **W12** — No gender index | 🔵 | Add B-tree index on `gender` column in migration SQL |
| **W13** — IVFFlat index commented out | 🔵 | Uncomment and tune the IVFFlat index for pgvector |

### Files to Change

- `ai/embeddings/buildEmbeddingText.ts`:
  - Tutor embedding: include `monthly_rate_npr`, `gender`, `city`, `neighborhood`
  - Query embedding: include all active constraints (budget, gender, location, mode)
- `supabase/migrations/*.sql`:
  - Add gender index: `CREATE INDEX idx_tutors_gender ON tutors (gender);`
  - Uncomment IVFFlat index, tune `lists` parameter
- `scripts/seedSupabaseTutors.ts`:
  - Update to include the new embedding fields

### Test Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | **Run the SQL migrations** | No errors, indexes created |
| 2 | **Re-seed tutor embeddings** | Embeddings now include budget/gender/location |
| 3 | **Search for "patient maths tutor under 5000"** | Semantic similarity includes budget context |
| 4 | **Check pgvector query speed** | IVFFlat index is being used (check with `EXPLAIN ANALYZE`) |
| 5 | **Mock mode still works** | No regressions — mock pipeline doesn't use embeddings |

---

## Phase 5 — State Machine + RPC Audit 🎯

**Scope**: Real data — Supabase Edge Function + PostgreSQL RPC.  
**Note**: This is where the mock pipeline and the real Edge Function converge.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **C3** — Gender filter silently lost in RPC | 🔴 | Audit `hybrid_search_tutors` RPC — add gender to WHERE clause |
| **W10** — Hybrid search RPC is a black box | 🔴 | Document the RPC, add TypeScript wrapper with type safety |
| **W1** — Dual codebase divergence | 🔴 | Consolidate `ai/` as canonical, make `supabase/ai/` a thin wrapper |
| **C2** — State machine differences | 🟡 | Reconcile `ai/state/stateMachine.ts` and `supabase/ai/state/stateMachine.ts` |

### Files to Change

- `supabase/migrations/*.sql`:
  - Update `hybrid_search_tutors` function: add `p_gender` parameter and WHERE clause
- `ai/retrieval/sqlFilterBuilder.ts`:
  - Add gender filter to SQL template
  - Document all filter fields
- `ai/retrieval/hybridSearch.ts`:
  - Add TypeScript wrapper for the RPC call
- `ai/state/stateMachine.ts` vs `supabase/ai/state/stateMachine.ts`:
  - Diff both files, merge into single canonical version in `ai/`
  - `supabase/ai/` becomes thin re-export or build-time copy
- `ai/memory/constraintMerger.ts` vs `supabase/ai/memory/constraintMerger.ts`:
  - Same consolidation

### Test Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | **Deploy updated Edge Function** | No deploy errors |
| 2 | **"Female physics tutor" via Edge Function** | Only returns female tutors |
| 3 | **"Male maths tutor, Rs 5000" via Edge Function** | Only returns male tutors under budget |
| 4 | **Mock mode still works** | No regressions — mock pipeline unchanged |
| 5 | **Run the RPC directly in SQL editor** | `SELECT * FROM hybrid_search_tutors(...)` with gender param works |
| 6 | **Compare ai/ and supabase/ai/ files** | No meaningful differences anymore |

---

## Phase 6 — Infrastructure + Security 🎯

**Scope**: Mixed — touches env vars, client/server split, and rate limiting.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **C6** — `groqClient.ts` uses `Deno.env` (crashes in RN) | 🔴 | Split into `ai/utils/groqClient.ts` (server, Deno) and `lib/ai/groqClient.ts` (client, `process.env`) |
| **W17** — Service role key exposed to client | 🔴 | Remove `EXPO_PUBLIC_` prefix from `SUPABASE_SERVICE_ROLE_KEY` in `.env.example` |
| **C17** — Rate limiting resets on cold start | 🔵 | Add PostgreSQL-backed rate limiting (tokens table + cleanup cron) |
| **C12** — No location extraction for GPS queries | 🔵 | Add phrase detection for "near me", "nearby" — store as `location_preference: "gps"` for future map integration |

### Files to Change

- `ai/utils/groqClient.ts`:
  - Remove Deno dependency — use a conditional: `typeof Deno !== 'undefined' ? Deno.env.get(...) : process.env.EXPO_PUBLIC_GROQ_API_KEY`
  - OR: Create `lib/ai/groqClient.ts` as the client-side version
- `.env.example`:
  - Change `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=` → `SUPABASE_SERVICE_ROLE_KEY=` (remove public prefix)
- `supabase/migrations/*.sql`:
  - Add `rate_limits` table
  - Add cleanup function for expired rate limit entries
- `ai/agents/constraintExtractor.ts`:
  - Add "near me", "nearby" detection → `location_preference: "gps"`
- `lib/ai/clientConstraintParser.ts`:
  - Same GPS phrase detection

### Test Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | **Check .env.example** | No `EXPO_PUBLIC_` prefix on service role key |
| 2 | **Build app** | No `Deno is not defined` crash |
| 3 | **"near me" or "nearby"** | Stores `location_preference: "gps"` but doesn't block search |
| 4 | **Rapid-fire 30 messages in 1 minute** | Rate limit kicks in after threshold |
| 5 | **Restart app, check rate limit** | Still enforced (persistent storage) |

---

## Phase 7 — Conversation Memory + Final Cleanup 🎯

**Scope**: Mixed — session persistence, type safety, final polish.

### Bugs Covered

| Bug | Severity | What We'll Fix |
|-----|----------|----------------|
| **W14** — Session state not persisted across restarts | 🟡 | Persist session to AsyncStorage (client) and PostgreSQL (server) |
| **W15** — Message history cap not enforced | 🟡 | Enforce consistent 6-message cap in both pipelines |
| **W16** — No session expiration/cleanup | 🟡 | Add 30-minute inactivity timeout |
| **All remaining** | Various | Final typecheck + cleanup pass |

### Files to Change

- `store/aiChatStore.ts`:
  - Add AsyncStorage persistence for session state and message history
  - Enforce 6-message cap consistently
  - Add inactivity timer (30 min → auto-reset)
- `services/ai/mockChatService.ts`:
  - Read/write session from the store instead of losing it between turns
- `ai/memory/sessionStore.ts`:
  - Add expiration logic
- `ai/memory/messageStore.ts`:
  - Enforce message cap
- **Final cleanup pass across all files**:
  - Remove unused imports
  - Remove commented-out code (except SQL migrations)
  - Verify all exported functions have consumers
  - Ensure `ai/` and `supabase/ai/` are truly in sync

### Test Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | **Start search, close app, reopen** | Session state still there, conversation continues |
| 2 | **Send 10 messages** | Only last 6 are kept in history |
| 3 | **Wait 31 minutes, send message** | Session auto-resets (new conversation) |
| 4 | **Full regression: all Phase 1-6 tests** | Everything still works |
| 5 | **Run full typecheck** | `npx tsc --noEmit` — zero errors |
| 6 | **Check terminal for warnings** | No unused import warnings, no runtime warnings |

---

## Summary: Phase vs Bug Coverage

```
                    P1    P2    P3    P4    P5    P6    P7
C1  ✅ (done)       -     -     -     -     -     -     -
C3  🔴              -     -     -     -     ✅    -     -
C4  🟡              ✅    -     -     -     -     -     -
C5  🟡              -     -     -     ✅    -     -     -
C6  🔴              -     -     -     -     -     ✅    -
C7  🟡              -     ✅    -     -     -     -     -
C10 🔵              ✅    -     -     -     -     -     -
C11 🔵              ✅    -     -     -     -     -     -
C12 🔵              -     -     -     -     -     ✅    -
C13 🔵              -     -     ✅    -     -     -     -
C17 🔵              -     -     -     -     -     ✅    -
W1  🔴              -     -     -     -     ✅    -     -
W2  🟡              -     ✅    -     -     -     -     -
W3  🟡              -     ✅    -     -     -     -     -
W4  🟡              -     -     ✅    -     -     -     -
W10 🔴              -     -     -     -     ✅    -     -
W11 🟡              -     -     -     ✅    -     -     -
W12 🔵              -     -     -     ✅    -     -     -
W13 🔵              -     -     -     ✅    -     -     -
W14 🟡              -     -     -     -     -     -     ✅
W15 🟡              -     -     -     -     -     -     ✅
W16 🟡              -     -     -     -     -     -     ✅
W17 🔴              -     -     -     -     -     ✅    -
W19 🟡              -     -     ✅    -     -     -     -
```

### Files by Phase

| Phase | Files Touched |
|-------|--------------|
| **P1** — Constraint Polish | `clientConstraintParser.ts`, `constraintExtractor.ts`, `constraints.types.ts` |
| **P2** — Prompt Library | `keywords.ts` (NEW), `intentClassifier.ts`, `prompts.ts`, `clientConstraintParser.ts`, `constraintExtractor.ts`, `sqlFilterBuilder.ts` |
| **P3** — Guardrails + Ranking | `mockChatService.ts`, `groqRanker.ts`, `guardrails.ts` |
| **P4** — Embedding + DB | `buildEmbeddingText.ts`, SQL migrations, seed script |
| **P5** — State Machine + RPC | SQL migrations, `sqlFilterBuilder.ts`, `hybridSearch.ts`, `stateMachine.ts`, `constraintMerger.ts` |
| **P6** — Infrastructure | `groqClient.ts`, `.env.example`, SQL migrations, `constraintExtractor.ts`, `clientConstraintParser.ts` |
| **P7** — Memory + Cleanup | `aiChatStore.ts`, `mockChatService.ts`, `sessionStore.ts`, `messageStore.ts` |

---

## Quick Reference: Bug → Phase Mapping

| Bug | Phase | Why There |
|-----|-------|-----------|
| C4 — Rating/experience extraction | **P1** | Pure client-side parsing fix |
| C10 — Budget regex | **P1** | Pure client-side parsing fix |
| C11 — Radius dead code | **P1** | Client-side type cleanup |
| W2 — Shared prompt library | **P2** | Code organization, no real data |
| W3 — Keyword consolidation | **P2** | Code organization, no real data |
| C7 — Off-topic patterns | **P2** | Fixes server-side intentClassifier.ts |
| W4 — Guardrails missing | **P3** | Client-side safety feature |
| W19 — 3 LLM calls | **P3** | Client-side efficiency fix |
| C13 — Groq ranker | **P3** | Client-side efficiency fix |
| C5 — Embedding constraints | **P4** | Affects real Supabase embeddings |
| W11 — Embedding text | **P4** | Affects real Supabase embeddings |
| W12 — Gender index | **P4** | SQL migration (setup, not live data) |
| W13 — IVFFlat index | **P4** | SQL migration (setup, not live data) |
| C3 — Gender in RPC | **P5** | Real data — Edge Function + SQL |
| W10 — RPC black box | **P5** | Real data — Edge Function + SQL |
| W1 — Dual codebase | **P5** | Real data — server-side code |
| C2 — State machine diff | **P5** | Real data — server-side code |
| C6 — Deno.env crash | **P6** | Infrastructure — client/server split |
| W17 — Exposed key | **P6** | Security — env variable |
| C17 — Rate limiting | **P6** | Infrastructure — database-backed |
| C12 — GPS extraction | **P6** | Prep for future map integration |
| W14 — Session persistence | **P7** | Client + server store |
| W15 — Message cap | **P7** | Client + server store |
| W16 — Session expiry | **P7** | Client + server store |
