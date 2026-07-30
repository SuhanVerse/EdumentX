# EdumentX AI Assistant — Bug Tracker

> **Last updated**: July 29, 2026 (Phase 1 complete)  
> **Source**: Comprehensive audit of the AI subsystem

---

## Status Tracking

| Issue | Severity | Status | Phase Fixed | Notes |
|-------|----------|--------|-------------|-------|
| C1 | 🔴 | ✅ Fixed | P2 | Mock pipeline has single clean call |
| C3 | 🔴 | ❌ Open | P5 | Audit PostgreSQL RPC for gender |
| C4 | 🟡 | ✅ Fixed | **P1** | Rating/experience extraction added |
| C5 | 🟡 | ❌ Open | P4 | Embedding query fix |
| C6 | 🔴 | ❌ Open | P6 | Split groqClient into client/server |
| C7 | 🟡 | 🟡 Partial | P1+P2 | Mock fixed; server-side intentClassifier.ts still has old patterns (will fix in P2) |
| C10 | 🔵 | ✅ Fixed | **P1** | Budget regex upgraded (commas, Rs., NPR, decimals) |
| C11 | 🔵 | ✅ Fixed | **P1** | radius_km now populated by parser; stored in filters |
| C12 | 🔵 | ❌ Open | P6 | GPS extraction prep |
| C13 | 🔵 | ✅ Fixed | **P3** | groqRank only called when reorder intent detected |
| C17 | 🔵 | ❌ Open | P6 | Rate limiting |
| W1 | 🔴 | ❌ Open | P5 | Dual codebase consolidation |
| W2 | 🟡 | ✅ Fixed | **P2** | Shared keyword table created at ai/domain/keywords.ts |
| W3 | 🟡 | ✅ Fixed | **P2** | 3 of 4 copies consolidated; supabase/ai mirror kept for Phase 5 |
| W4 | 🟡 | ✅ Fixed | **P3** | Pre-gen + post-gen guardrails added to mock pipeline |
| W10 | 🔴 | ❌ Open | P5 | RPC black box |
| W11 | 🟡 | ❌ Open | P4 | Embedding constraints |
| W12 | 🔵 | ❌ Open | P4 | Gender SQL index |
| W13 | 🔵 | ❌ Open | P4 | IVFFlat index |
| W14-16 | 🟡 | ❌ Open | P7 | Conversation memory |
| W17 | 🔴 | ❌ Open | P6 | Service role key exposed |
| W19 | 🟡 | ✅ Fixed | **P3** | Mock uses 0 calls for normal searches (conditional groqRank) |

---

## Phase Completion Log

| Phase | Description | Bugs Fixed | Status | Date |
|-------|-------------|------------|--------|------|
| 1 | **Constraint Polish** — budget regex, rating/experience/radius extraction | C4, C10, C11 | ✅ **DONE** | July 29, 2026 |
| 2 | Prompt Library + Keywords | W2, W3, C7 | ✅ **DONE** | July 29, 2026 | |
| 3 | Guardrails + Ranking | W4, W19, C13 | ✅ **DONE** | July 29, 2026 |
| 4 | Embedding + DB Schema | C5, W11, W12, W13 | ⬜ | |
| 5 | State Machine + RPC | C3, W10, W1, C2 | ⬜ | |
| 6 | Infrastructure + Security | C6, W17, C17, C12 | ⬜ | |
| 7 | Memory + Cleanup | W14, W15, W16 | ⬜ | |
