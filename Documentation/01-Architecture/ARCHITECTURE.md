# EdumentX architecture and service policy

Reviewed against repository source on **17 October 2026**. This document defines the intended architectural constraints and maps the current implementation. It does not assert that all cloud resources are deployed, all security paths have been audited, or the app is ready for public release.

Read [AGENTS.md](../../AGENTS.md) for project directives and the [learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) for detailed code walkthroughs.

## 0. Service and dependency policy

The project uses Firebase Blaze with a **$0 usage target at demo scale**. Billing being enabled does not authorize introducing recurring costs. Provider prices, free quotas, and acceptable-use policies must be verified before a deployment or service change; historical quota numbers are not a price guarantee.

| Layer | Current implementation | Cost and exposure controls |
| --- | --- | --- |
| Identity | Native Firebase Auth; email/password and Google | No SMS provider; no Clerk; do not expose privileged Auth credentials |
| Application data | Cloud Firestore | Minimize listeners and repeated reads; use scoped queries and existing indexes |
| Object storage | Supabase Storage | Control size and retention; private verification files require authorized reads |
| Maps | Native `expo-maps`: Google Android, Apple iOS | Restrict the Android key to the appropriate app/signing identity; review current Maps quota/pricing |
| Geocoding | Existing Nominatim client and optional Google paths | Respect provider usage policy; avoid unnecessary requests |
| AI retrieval | Supabase PostgreSQL/pgvector and Edge Functions | Use real search data; limit requests; distinguish database search from model inference |
| Model access | Server-mediated Groq/HuggingFace integrations | No public LLM keys; no paid OpenAI/Anthropic/Cohere integration |
| Notifications | Firebase Gen1 triggers plus Expo push service | Current triggers use `maxInstances: 5`; bound fan-out and review delivery/usage |
| Payment demonstration | eSewa sandbox through an Edge Function | Default off. Explicit development-only client/server opt-in and `edumentx-dev` auth project; `EPAYTEST`/reviewed test hosts only. No live merchant credentials; server-authorized grants |
| Mobile UI | React Native, NativeWind, Reanimated, SVG | Reuse installed dependencies and tokens; do not reintroduce Tamagui or the removed GL stack |
| Ubuntu Swift lab and separate iOS trial | User-local xtool, SwiftUI and Foundation core at `~/Projects/EdumentX-iOS` | Xcode 27.1 SDK installed; unsigned ARM64 trial builds on Ubuntu. No external runtime packages or live backend calls in the app; fixture discovery/session tests run locally. Native Firebase/Google and push adapters remain pending. Cannot build the React Native/CocoaPods target. Signing and device/account prompts need the owner; see the [Ubuntu guide](../05-Build-and-Deploy/IOS_ON_LINUX_XTOOL.md). |

**Build-tool decision, 21 October 2026:** EdumentX keeps its existing EAS/macOS route for iOS. One Android and one iOS cloud build consume two build jobs and no application Firestore/Edge traffic; check the account's current free allowance before running either. No paid build, new subscription, live merchant setup, or cloud publication was initiated for the guide. Usage beyond the available free allowance requires an explicit budget decision. Verify current [EAS pricing](https://expo.dev/pricing); store developer memberships are separate from the application's $0 demo-traffic target.

**Approved staged split, 21 October 2026:** The existing React Native iOS target/configuration remains until the separate Swift/xtool trial passes native feasibility and integration. The native client's selected route is Linux/xtool; it does not automatically fall back to EAS/macOS. Its initial source/core checks add zero Firestore reads/writes, Edge invocations or storage objects. A proposed Linux CI run is one source/core job using the official Swift 6.4.1 container and Python; no workflow has been published or triggered. Check account runner allowance before remote use. Both future clients share the same backend quotas; provider adapters and any push schema/sender changes require their own documented quota/control decision. See the [approved design](./2026-10-21-ANDROID-SWIFT-SPLIT-DESIGN.md).

Before adding a dependency or service, add a row or an explicit change note here covering:

1. The user problem and why installed tools cannot solve it.
2. Expected requests, reads/writes, storage, or compute at demo traffic.
3. Current official quota/pricing evidence and its verification date.
4. Restrictions, limits, retention, and the behavior when the quota is reached.
5. The expected bill and any owner decision required.

A budget alert is a notification, not a hard spending cap. A function instance limit bounds concurrency, not every possible cost. Verify actual safeguards instead of describing them as guaranteed zero spending.

## 1. Entry, identity, and navigation

[package.json](../../package.json) points to `expo-router/entry`. Route files live in [src/app](../../src/app). Many are small wrappers around [src/screens](../../src/screens); some shared features, including chat, contain their implementation in the route itself.

[src/app/_layout.tsx](../../src/app/_layout.tsx) mounts the navigation providers, subscribes to Firebase auth, loads role/profile state, and handles redirects. [authStore.ts](../../src/store/authStore.ts) holds session and routing state.

[authService.ts](../../src/services/firebase/authService.ts) uses native Firebase email/password and Google credentials. The pending verification panel explicitly refreshes the Firebase user. Profile setup writes the chosen role and profile data atomically; do not move role persistence back to an earlier optimistic screen.

**Routing is not authorization.** The current layout still reads user-role/admin-document state for screen selection. [Firestore rules](../../firebase/firestore.rules) use the `admin: true` custom claim for privileged access. These are distinct implementations; changing a route or an `admins` document does not grant or revoke server authority by itself. See [admin operations](../04-Firebase/adminsetup.md).

## 2. Application data and repositories

Firestore is the primary application datastore. Domain interfaces, Firebase implementations, mock implementations, and selectors live in [src/services](../../src/services).

Typical paths include:

```text
users/{uid}
users/{uid}/studentProfile/default
users/{uid}/tutorProfile/default
users/{uid}/adminProfile/default
tutors/{tutorUid}
tutorVerifications/{tutorUid}
tutorProfileUpdates/{tutorUid}
enrollmentRequests/{tutorUid}/requests/{requestId}
enrollments/{tutorUid}/roster/{enrollmentId}
batches/{tutorUid}/classes/{batchId}
conversations/{conversationId}/messages/{messageId}
reviews/{tutorUid}/reviews/{reviewId}
```

Confirm exact shapes in each domain's `types.ts` and repository before writing new data. Firebase rules and indexes are versioned under [firebase](../../firebase).

Tutor weekly availability is a nested field on `users/{uid}/tutorProfile/default`, read/written by the enrollment repository; it is not a separate root collection.

Live subscriptions return unsubscribe functions; screens must clean them up when identity or screen lifetime changes. Prefer an existing shared domain feed over an additional per-card listener.

`EXPO_PUBLIC_USE_MOCK_DATA` is a selector used by participating repositories and AI chat. Some screens call Firestore services directly. It is not a full backend replacement or an authentication bypass.

### Enrollment contracts

Use `slotKey` and `parseSlotKey` from [enrollment types](../../src/services/enrollments/types.ts). The format is `"<day>:<slot>"`, such as `mon:5-7`.

[derived.ts](../../src/services/enrollments/derived.ts) owns calendar/session and capacity calculations. Keep Asia/Kathmandu date behavior intact. Today's sessions are derived from active roster rows and their date window; do not invent a separate sessions collection without a deliberate design change.

Student subscriptions must not run tutor-owned expiry sweeps. Inspect `runSweep` at each call site.

Batch membership uses direct tutor/batch/member paths and counters. Do not replace these with unbounded collection-group scans without proving query/rule compatibility.

### Messaging contracts

[conversationKey](../../src/services/messages/types.ts) sorts the two UIDs and joins them with `__`. Preserve that deterministic identity.

Participant authorization uses scalar `participantA`/`participantB` fields. The hub query must remain compatible with those rules; an array query that appears equivalent in JavaScript may not be provable by Firestore rules.

## 3. Storage, documents, and privacy

[src/services/supabase/storage.ts](../../src/services/supabase/storage.ts) owns upload and document URL helpers. Firebase owns user identity; the app does not establish a matching Supabase Auth session.

The storage design distinguishes public avatars/demo media from private identity/education documents. [Migration 017](../../supabase/migrations/017_server_side_uploads.sql) changes upload authorization; inspect the relevant helper and function rather than following old anonymous-upload examples.

Verification uploads use [upload-verification-doc](../../supabase/functions/upload-verification-doc/index.ts), with the caller authenticated through the shared Firebase-token verifier. Private document reads use [verification-doc-url](../../supabase/functions/verification-doc-url/index.ts). [useSignedDocUrl](../../src/hooks/useSignedDocUrl.ts) handles signed reads in the UI.

Never convert a private document path into a public URL. Preserve signed query parameters when adding cache-busting data. Never bundle storage service-role/signing credentials into the app.

Admin soft deletion, client cleanup, and an operator's Firebase Auth deletion are different operations. Existing lifecycle tools are not evidence of a complete user-facing account-deletion feature. See [userLifecycle.ts](../../src/lib/admin/userLifecycle.ts) and [deleteUser.ts](../../scripts/deleteUser.ts) before planning changes.

## 4. Native maps and location

[TutorMap.tsx](../../src/components/map/TutorMap.tsx) wraps the platform-native Google and Apple map views. [MapSearch.tsx](../../src/screens/student/MapSearch.tsx) connects discovery data, location, clustering, and interaction.

Distance/matching calculations stay client-side. Android key restrictions must match the actual package and signing certificate, including release builds. Native map rendering is distinct from forward/reverse geocoding.

Precise student locations are private data. The enrollment/location-access marker lifecycle describes an intended boundary, but its rule implementation must be tested for forged records, alternate matches, and expiry behavior; do not call it impossible to bypass merely because a diagram says so.

## 5. AI tutor search

The UI starts in [AIChat.tsx](../../src/screens/student/AIChat.tsx), with shared state/hooks and [chatService.ts](../../src/services/ai/chatService.ts). The server path enters the [chat function](../../supabase/functions/chat/index.ts), using the pipeline code and SQL retrieval.

Firestore discovery documents and the SQL AI-search corpus are separate data surfaces. Do not assume approval of a Firestore tutor automatically inserts the corresponding SQL row/embedding. Verify the actual seed/sync process before claiming synchronization.

[groq-proxy](../../supabase/functions/groq-proxy/index.ts) mediates client ranking requests. Keep provider keys on the server, authenticate callers, and use the existing rate limits. The presence of a mock fallback is not proof a live AI call succeeded.

## 6. Pro and eSewa

The subscription UI and repositories live in [src/services/subscription](../../src/services/subscription) and the tutor upgrade screen. [create-esewa-order](../../supabase/functions/create-esewa-order/index.ts) signs and verifies sandbox orders and performs the Firestore Pro grant server-side before consuming the order as COMPLETE.

Do not restore client `applyProGrant` writes or client-writable subscription fields. Demo grants belong only to the mock implementation. See the [sandbox guide](../05-Build-and-Deploy/esewa_integration.md).

## 7. Notifications and serverless boundaries

[pushService.ts](../../src/services/notifications/pushService.ts) handles client token/inbox behavior. [functions/src/index.ts](../../functions/src/index.ts) currently exports four Gen1 push triggers: new message, request creation, request decision, and request deletion. The separate Functions package declares Node 20; it has its own dependencies and build.

Supabase Edge Functions handle SQL/AI, storage authorization, verification assistance, and sandbox order processing. Firebase Functions handle Firestore events. Do not move client-side distance math into per-request cloud functions.

## 8. UI and excluded approaches

Use native primitives and NativeWind tokens. No Tamagui, Clerk, web markup in native UI, public LLM keys, unapproved paid providers, or live eSewa merchant credentials.

The [BasoBas source](../98-Reference-BasoBas/ANALYSIS.md) is a separate reference app. Its authentication, data model, styling, and markup are not EdumentX's implementation. Preserve its attribution and translate UX ideas into native code.

## 9. Development and verification

The actual build uses [babel.config.js](../../babel.config.js), [metro.config.js](../../metro.config.js), and NativeWind integration. Do not simplify Metro using an obsolete “default config only” note.

Use the [setup checks](../03-Implementation-Guides/PROJECT_SETUP.md#5-run-local-checks). The root unit pattern is TypeScript compilation followed by Node's test runner. Rules emulation and credentialed live checks are separate evidence levels.

See [CI](../../.github/workflows/ci.yml) for current triggers and suite lists. Credentialed deployed/live smoke checks require manual dispatch with `run_live_checks=true`; ordinary pushes do not create backend fixtures. A skipped credentialed job does not establish backend correctness.

## 10. Release status

A code path existing is not equivalent to a store-tested feature. Native release signing, SDK compatibility, privacy disclosures, account deletion, content safety, payment policy, reviewer access, and actual device testing need separate evidence. The [deployment guide](../05-Build-and-Deploy/DEPLOYMENT_GUIDE.md) organizes those checks.
