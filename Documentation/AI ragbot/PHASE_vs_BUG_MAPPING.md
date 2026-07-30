# Phase vs Bug Mapping

> **Question**: Will completing all 7 phases fix all 23 bugs?  
> **Short answer**: **No** — about 12 bugs are outside the scope of the 7 phases.

---

## Coverage Map

| Bug | Severity | P1 | P2 | P3 | P4 | P5 | P6 | P7 | Covered? |
|-----|----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---------|
| **C1** — getNextQuestion called twice | 🔴 | - | ✅ | - | - | - | - | - | ✅ Covered |
| **C3** — Gender filter lost in RPC | 🔴 | - | - | ✅ | - | - | - | - | ✅ Covered |
| **C4** — min_rating/min_experience never populated | 🟡 | ✅ | - | ✅ | - | - | - | - | ✅ Covered |
| **C5** — Embedding query missing fields | 🟡 | - | - | - | ✅ | - | - | - | ✅ Covered |
| **C7** — Off-topic too aggressive | 🟡 | ✅ | - | ✅ | - | - | - | - | ✅ Covered |
| **W2** — No shared prompt library | 🟡 | - | - | - | - | - | - | ✅ | ✅ Covered |
| **W3** — 4 copies of keyword tables | 🟡 | - | - | - | - | - | - | ✅ | ✅ Covered |
| **W4** — Mock skips guardrails | 🟡 | - | - | - | - | - | - | ✅ | ✅ Covered |
| **W11** — Embeddings missing constraints | 🟡 | - | - | - | ✅ | - | - | - | ✅ Covered |
| **W19** — 3 LLM calls per turn | 🟡 | - | - | - | - | - | ✅ | - | ✅ Covered |
| **C13** — Groq ranker extra call | 🔵 | - | - | - | - | - | ✅ | - | ✅ Covered |
| **C10** — Budget regex fragile | 🔵 | ✅ | - | - | - | - | - | - | ✅ Covered |
| **—** | | | | | | | | | |
| **C6** — Deno.env crashes in RN | 🔴 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **W1** — Dual codebase divergence | 🔴 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **W10** — Hybrid search RPC black box | 🔴 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **W17** — Service role key exposed | 🔴 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **C2** — State machine differences | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **W14-16** — Conversation memory fragile | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **C11** — Radius fallback dead code | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **C12** — No GPS location extraction | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **C17** — Rate limiting resets | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **W12** — No gender index | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |
| **W13** — IVFFlat index commented out | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **GAP** |

---

## What the 7 Phases Cover (11 bugs)

| Phase | Bugs It Fixes | Status |
|-------|--------------|--------|
| **P1** — Prompt Engineering | C4 (partial), C7 (partial), C10 | ✅ Mostly done |
| **P2** — Min Constraints | C1 | ✅ Done |
| **P3** — Follow-up Refinements | C3, C4, C7 | ⬜ |
| **P4** — Remove lang/mode from embeddings | C5, W11 | ⬜ |
| **P5** — Fix FAQ Recognition | FAQ edge cases | ⬜ (mostly done in Phase 1 already) |
| **P6** — Simplify Re-ranking | W19, C13 | ⬜ |
| **P7** — Remove Unused Code | W2, W3, W4 | ⬜ |

**11 out of 23 bugs covered** by the 7 phases.

---

## What Falls Through the Cracks (12 bugs)

| Bug | Severity | Why It's Not Covered |
|-----|----------|---------------------|
| **C6** — Deno.env in RN | 🔴 | Infrastructure issue — need to split client/server builds |
| **W1** — Dual codebase divergence | 🔴 | Architectural — need consolidation strategy |
| **W10** — RPC black box | 🔴 | SQL/DB — need to audit PostgreSQL migrations |
| **W17** — Service role key exposed | 🔴 | Security — need to remove from client env |
| **C2** — State machine differences | 🟡 | Architectural — need to pick canonical version |
| **W14-16** — Memory fragile | 🟡 | Feature — session persistence not in any phase |
| **C11** — Radius dead code | 🔵 | Cleanup — orphaned field |
| **C12** — No GPS extraction | 🔵 | Feature — depends on map module (Phase 6 of architecture doc) |
| **C17** — Rate limiting resets | 🔵 | Infrastructure — database-backed rate limiting |
| **W12** — No gender index | 🔵 | DB — add SQL index |
| **W13** — IVFFlat index commented | 🔵 | DB — uncomment SQL index |

---

## Recommendation

Add an **Phase 8: Infrastructure & Security** to cover the 6 uncovered critical/moderate bugs:

| Step | Bug | Effort |
|------|-----|--------|
| 8.1 | **C6** — Split groqClient into client/server | Small (1 file) |
| 8.2 | **W17** — Remove service role key from client env | Tiny (1 line) |
| 8.3 | **W1** — Consolidate ai/ and supabase/ai/ | Medium (file audit) |
| 8.4 | **W10** — Document the hybrid_search_tutors RPC | Medium (SQL audit) |
| 8.5 | **C2** — Reconcile state machine versions | Medium (diff + merge) |
| 8.6 | **W14-16** — Add session persistence | Medium (store impl) |
| 8.7 | **C11** — Remove or wire radius_km | Tiny (1 field) |
| 8.8 | **W12, W13** — Add missing SQL indexes | Tiny (2-3 lines) |
