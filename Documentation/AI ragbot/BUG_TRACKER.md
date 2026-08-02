# EdumentX AI Assistant — Bug Tracker

> **Last updated**: July 31, 2026 (Phase 6 complete)  
> **Source**: Comprehensive audit of the AI subsystem

---

## Status Tracking

| Issue | Severity | Status | Phase Fixed | Notes |
|-------|----------|--------|-------------|-------|
| C1 | 🔴 | ✅ Fixed | P2 | Mock pipeline has single clean call |
| C2 | 🟡 | ✅ Fixed | **P5** | State machines reconciled (location opt-out synced to supabase copy; root copy got contact-guard/ack/sort/FAQ/single-getNextQuestion) |
| C3 | 🔴 | ✅ Fixed | **P5** | RPC already filters gender (migration 010 `AND t.gender = $5`); seed syncs gender; typed RPC wrapper added |
| C4 | 🟡 | ✅ Fixed | **P1** | Rating/experience extraction added |
| C5 | 🟡 | ✅ Fixed | **P4** | Query embedding now includes budget/location/gender |
| C6 | 🔴 | ✅ Fixed | **P6** | groqClient now runtime-agnostic (`globalThis.Deno` guard + `process.env` fallback) — no more RN crash |
| C7 | 🟡 | 🟡 Partial | P1+P2 | Mock fixed; server-side intentClassifier.ts still has old patterns (will fix in P2) |
| C10 | 🔵 | ✅ Fixed | **P1** | Budget regex upgraded (commas, Rs., NPR, decimals) |
| C11 | 🔵 | ✅ Fixed | **P1** | radius_km now populated by parser; stored in filters |
| C12 | 🔵 | ✅ Fixed | **P6** | "near me"/"nearby" → `location_preference: "near_me"` in client parser + both server extractors (map-ready hook) |
| C13 | 🔵 | ✅ Fixed | **P3** | groqRank only called when reorder intent detected |
| C17 | 🔵 | ✅ Fixed | **P6** | Migration 012: PostgreSQL `rate_limits` table + `rate_limit_check()` RPC + cleanup fn; middleware now DB-backed (survives cold starts) |
| W1 | 🔴 | ✅ Fixed | **P5** | Root `ai/` state machine + ranking engine synced to match supabase copy; only `domain/` shared files imported by client are the live client path |
| W2 | 🟡 | ✅ Fixed | **P2** | Shared keyword table created at ai/domain/keywords.ts |
| W3 | 🟡 | ✅ Fixed | **P2** | 3 of 4 copies consolidated; supabase/ai mirror kept for Phase 5 |
| W4 | 🟡 | ✅ Fixed | **P3** | Pre-gen + post-gen guardrails added to mock pipeline |
| W10 | 🔴 | ✅ Fixed | **P5** | Typed `invokeHybridSearchTutors()` wrapper + full contract docs added to both hybridSearch copies |
| W11 | 🟡 | ✅ Fixed | **P4** | Tutor embedding text includes budget + gender |
| W12 | 🔵 | ✅ Fixed | **P4** | Already present in migration 008 (idx_tutors_gender) — verified |
| W13 | 🔵 | ✅ Fixed | **P4** | Migration 011 creates the IVFFlat index (lists=10) |
| W14-16 | 🟡 | ✅ Fixed | **P7** | Chat store persisted to AsyncStorage (messages/sessionId/constraints) with 6-message cap + 30-min inactivity auto-reset; server sessionStore/messageStore already enforced TTL + cap |
| W17 | 🔴 | ✅ Fixed | **P6** | Removed `EXPO_PUBLIC_` prefix from `SUPABASE_SERVICE_ROLE_KEY` in `.env.example` (never bundle secrets) |
| W19 | 🟡 | ✅ Fixed | **P3** | Mock uses 0 calls for normal searches (conditional groqRank) |

---

## Deferred Tests — run at the "go-live" checkpoint (end of Phase 5)

> These changes live in the real-data path (Supabase RPC / embeddings / Edge
> Function) and **cannot be exercised in mock mode**. Test them together when
> we flip `EXPO_PUBLIC_USE_MOCK_DATA=false`.

### Phase 4 (Embedding + DB Schema)

| # | Test | Expected |
|---|------|----------|
| 1 | Run SQL migrations (001–011) against Supabase | No errors; `idx_tutor_embeddings_ivfflat` created |
| 2 | `npm run seed:supabase` | Embeddings include budget + gender in source text; no `model` column error |
| 3 | Search *"patient maths tutor under 5000"* | Semantic similarity reflects budget context |
| 4 | `EXPLAIN ANALYZE` a vector search | IVFFlat index is used (no seq scan on embeddings) |
| 5 | Mock mode still works | No regressions (mock doesn't use embeddings) |

### Phase 5 (State Machine + RPC)

| # | Test | Expected |
|---|------|----------|
| 6 | Deploy updated Edge Function | No deploy errors |
| 7 | *"Female physics tutor"* via Edge Function | Only female tutors returned |
| 8 | *"Male maths tutor, Rs 5000"* via Edge Function | Only male tutors under budget |
| 9 | `SELECT * FROM hybrid_search_tutors(...)` in SQL editor | Works with gender param; returns rows |
| 10 | Diff `ai/` vs `supabase/ai/` behavior | No meaningful divergence left |

---

## Phase Completion Log

| Phase | Description | Bugs Fixed | Status | Date |
|-------|-------------|------------|--------|------|
| 1 | **Constraint Polish** — budget regex, rating/experience/radius extraction | C4, C10, C11 | ✅ **DONE** | July 29, 2026 |
| 2 | Prompt Library + Keywords | W2, W3, C7 | ✅ **DONE** | July 29, 2026 | |
| 3 | Guardrails + Ranking | W4, W19, C13 | ✅ **DONE** | July 29, 2026 |
| 4 | Embedding + DB Schema | C5, W11, W12, W13 | ✅ **DONE** | July 31, 2026 |
| 5 | State Machine + RPC | C3, W10, W1, C2 | ✅ **DONE** | July 31, 2026 |
| 6 | Infrastructure + Security | C6, W17, C17, C12 | ✅ **DONE** | July 31, 2026 |
| 7 | Memory + Cleanup | W14, W15, W16 | ✅ **DONE** | Aug 2, 2026 |
