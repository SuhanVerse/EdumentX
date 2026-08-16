# 04 — Firebase

Firebase-specific notes: rules, admin setup, deploy workflow, and the
Firebase ↔ Supabase auth migration analysis.

## Files

| File | Purpose |
|---|---|
| `phase-3-notes.md` | Deploy workflow, rules, Firestore conventions |
| `adminsetup.md` | Making an account an admin (service-account key walkthrough) |
| `firebase-to-supabase-auth-migration-analysis.md` | Migration analysis (moved from the `Documentation/` root) |

The canonical security rules live in `firebase/firestore.rules` (deployed
via `npm run deploy:rules`; verified by `npm run test:rules`).
