# Advanced feature implementation notes

Reviewed against repository source on 17 October 2026. This page describes call flows and intended boundaries; it is not a security audit or a claim that the remote environment matches local source.

## Location access after enrollment

The student profile stores location data. The enrollment implementation manages a deterministic marker at `users/{studentUid}/locationAccess/{tutorUid}` alongside roster changes.

Read:

- [Firebase enrollment repository](../src/services/enrollments/FirebaseEnrollmentRepository.ts): acceptance, removal, expiry, and identity backfill.
- [Firestore rules](../firebase/firestore.rules): actual profile and marker authorization.
- [Tutor dashboard](../src/screens/tutor/TutorHome.tsx): roster-derived information.

The marker is an authorization input, not a secret token. Test both marker writes and roster provenance, including all overlapping rules. Do not assume a marker is unforgeable from the existence check alone.

Keep student subscriptions from running tutor-owned sweeps. Preserve direct-path access and the colon-form slot key.

## Contextual group batches

[BrowseBatchesScreen](../src/screens/student/BrowseBatchesScreen.tsx) and [BatchDetailScreen](../src/screens/shared/BatchDetailScreen.tsx) use the [batches domain](../src/services/batches/BatchesRepository.ts).

The active marketplace feed and a direct-path detail read serve different purposes. An ended batch opened from an existing enrollment must not disappear simply because the marketplace feed filters to active batches.

Changes to membership must account for roster links, counters, capacity, and removal. Follow the Firebase/mock implementations and relevant emulator tests together.

## Pro subscription demonstration

The sandbox call flow is:

```text
Upgrade screen -> subscription repository -> create-esewa-order
    -> authenticated order creation and signed form
    -> eSewa sandbox WebView callback
    -> server verification and ledger checks
    -> server-side Firestore grant
    -> ledger COMPLETE
    -> subscription listener updates UI
```

Current authority is in [create-esewa-order](../supabase/functions/create-esewa-order/index.ts). There is no legitimate live client `applyProGrant` path. Server-granted tier fields must remain protected across creates, updates, and overlapping rule matches.

The order is deliberately grant-before-COMPLETE so a failed grant does not consume the order as successful. Inspect the implementation's retry and replay behavior before changing it; Firestore and PostgreSQL do not share one transaction.

Use `EPAYTEST` only. The [eSewa guide](05-Build-and-Deploy/esewa_integration.md) covers the current sandbox boundary. Public payments require a separate business and store-policy decision.

## AI-assisted verification

[aiReview.ts](../src/services/verification/aiReview.ts) connects verification assistance with [verify-identity](../supabase/functions/verify-identity/index.ts). [VerificationQueue](../src/screens/admin/VerificationQueue.tsx) provides the human review surface.

Private document upload/signing runs through authenticated functions. Provider tokens and storage signing credentials belong on the server. An AI pre-screen result is not the same as an administrator's approval.

Read the [learning guide](00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) for the complete feature map and [architecture](01-Architecture/ARCHITECTURE.md) for the shared service rules.
