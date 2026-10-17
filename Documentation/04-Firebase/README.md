# Firebase operations

Start with the [codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) and [project setup](../03-Implementation-Guides/PROJECT_SETUP.md). Firebase provides native authentication, Firestore and notification triggers; Supabase provides object storage and Edge Functions.

| Page | Use it for |
|---|---|
| [Auth and profile contract](./phase-3-notes.md) | Sign-in, routing, atomic onboarding and authorization boundaries |
| [Admin access](./adminsetup.md) | Approved owner grants, custom claims and the admin ledger |
| [Deployment runbook](../05-Build-and-Deploy/DEPLOYMENT_GUIDE.md) | Rules/index publication, functions and release checks |

Source authorities:

- [`firebase/firestore.rules`](../../firebase/firestore.rules) and [`firestore.indexes.json`](../../firebase/firestore.indexes.json)
- [`src/app/_layout.tsx`](../../src/app/_layout.tsx) and [`authService.ts`](../../src/services/firebase/authService.ts)
- [`scripts/seedAdmin.ts`](../../scripts/seedAdmin.ts) and [`functions/src/index.ts`](../../functions/src/index.ts)

Admin claims authorize backend access; profile roles and the `admins` ledger choose client screens. Cloud mutation commands are maintenance operations, not prerequisites for reading or building the project.
