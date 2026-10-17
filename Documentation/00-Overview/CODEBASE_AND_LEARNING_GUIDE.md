# EdumentX: Codebase and Learning Guide

**Audience:** a teammate learning programming, React Native, or this project.  
**Source review date:** October 17, 2026.  
**Scope:** the implementation present in this checkout. This guide does not certify a deployed backend, a successful native build, or behavior on a device.

EdumentX helps students discover tutors, discuss their needs, request enrollment, and manage ongoing tuition. Tutors manage availability, requests, students, batches, and public profiles. Administrators review tutor verification and manage accounts. The app also has a conversational tutor search assistant and an eSewa sandbox subscription flow.

Start with the learning sequence below. You do not need to understand every backend before changing a label or building a small component. Follow one visible interaction through the code, then widen your understanding.

## Contents

1. [Your first route through the project](#1-your-first-route-through-the-project)
2. [Learn the foundations in order](#2-learn-the-foundations-in-order)
3. [Run the current app](#3-run-the-current-app)
4. [Understand the architecture](#4-understand-the-architecture)
5. [Follow authentication and role routing](#5-follow-authentication-and-role-routing)
6. [Find each feature in the source](#6-find-each-feature-in-the-source)
7. [Trace real interactions end to end](#7-trace-real-interactions-end-to-end)
8. [Read the data model and security boundaries](#8-read-the-data-model-and-security-boundaries)
9. [Build UI with the design system](#9-build-ui-with-the-design-system)
10. [Practice a small feature](#10-practice-a-small-feature)
11. [Choose the right checks](#11-choose-the-right-checks)
12. [Troubleshooting and glossary](#12-troubleshooting-and-glossary)

## 1. Your first route through the project

Read these in order rather than browsing every folder at once:

1. [Project setup](../03-Implementation-Guides/PROJECT_SETUP.md): tools, environment, and native development client.
2. [Project directives](../../AGENTS.md): mandatory architecture, styling, auth, and cost constraints.
3. [Package scripts](../../package.json): the commands the project actually supports.
4. [Student home route](../../src/app/student-home.tsx): a short route component that renders a screen.
5. [StudentHome](../../src/screens/student/StudentHome.tsx): UI, effects, subscriptions, and navigation together.
6. [Tutor repository interface](../../src/services/tutors/TutorRepository.ts), then its [selector](../../src/services/tutors/dataSource.ts): what the screen asks for and how its data source is chosen.
7. [Firebase implementation](../../src/services/tutors/FirebaseTutorRepository.ts): how that request becomes backend reads.
8. [Architecture](../01-Architecture/ARCHITECTURE.md): service boundaries, decisions, and cost assumptions.

After that pass, answer: “Which file draws a tutor card, which file reads its data, and which database contains that data?” If the answer is unclear, trace one card before studying another feature.

## 2. Learn the foundations in order

The stages describe prerequisites, exercises, and visible evidence of understanding. Work through them at your own pace; a stage may take several sessions.

### Stage A — Tools and basic JavaScript

Learn files and folders, terminal working directories, Git changes, variables, strings, arrays, objects, functions, imports, and exports. Then learn `map`, `filter`, `find`, optional chaining (`?.`), and nullish coalescing (`??`). These appear throughout the screens and repositories.

Practice in a scratch file outside the app bundle:

```js
const tutors = [
  { name: "Asha", subjects: ["Maths"], rate: 3000 },
  { name: "Bikash", subjects: ["Science"], rate: 4500 },
];
const affordable = tutors.filter((tutor) => tutor.rate <= 3500);
console.log(affordable.map((tutor) => tutor.name));
```

**Exercise:** add a subject condition and explain each callback parameter.  
**Observable outcome:** the output changes predictably when you change the budget or subject.  
**Project connection:** filtering lists in [MapSearch](../../src/screens/student/MapSearch.tsx).

### Stage B — TypeScript and asynchronous work

Learn object types, interfaces, unions, optional properties, `null`, function parameter types, and `Promise`. A type describes what a value is allowed to contain; it does not automatically validate data arriving from a database.

Read [enrollment types](../../src/services/enrollments/types.ts). Find `EnrollmentRequest`, `Enrollment`, `slotKey`, and `parseSlotKey`. A request and an enrollment represent different stages of the same relationship.

**Exercise:** call `parseSlotKey` with `mon:5-7` and a malformed key such as `mon-5-7`; inspect the returned values. Describe how a caller should handle `null`.  
**Observable outcome:** you can explain why a malformed slot disappears from a derived schedule.  
**Next concept:** `async`/`await`, `try`/`catch`, and `finally`; saving can fail and must restore loading state.

### Stage C — React components and state

Learn JSX, props, event handlers, conditional rendering, list keys, `useState`, `useEffect`, and effect cleanup. A component renders from its current props and state; changing state requests another render.

Read a small [shared UI component](../../src/components/ui), then a [TutorCard](../../src/components/domain/TutorCard.tsx). Identify which values arrive through props and which actions are callbacks. Read the surrounding screen to see who owns the data.

**Exercise:** build a local expandable information panel using boolean state and `Pressable`.  
**Observable outcome:** pressing it expands and collapses text without navigating or touching a backend.  
**Checkpoint:** explain why a subscription belongs in an effect and why its unsubscribe function must run when the component unmounts.

### Stage D — React Native, layout, and navigation

Learn `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, Flexbox, keyboard behavior, safe areas, and accessibility labels. React Native renders native controls; browser elements such as `div`, `button`, and CSS stylesheets are not the app's UI building blocks.

Compare [the route](../../src/app/student-home.tsx) with [the screen](../../src/screens/student/StudentHome.tsx). Then compare `/tutor/[id]` with a fixed route: the brackets represent a dynamic route parameter.

**Exercise:** style a local panel with `bg-background`, `text-text-primary`, and `rounded-card`. Add a meaningful accessibility label to its action.  
**Observable outcome:** it uses the existing palette and remains understandable to a screen reader.  
**Checkpoint:** explain the difference between `/profile-student` (initial setup) and `/stu-profile` (the student's profile area).

### Stage E — Shared state and live data

Learn the difference between local state, a shared Zustand store, persisted local data, and backend data. An open/closed sheet belongs near its component; authentication identity and conversation state need broader coordination.

Read [authStore](../../src/store/authStore.ts), [useAiChat](../../src/hooks/useAiChat.ts), and [aiChatStore](../../src/store/aiChatStore.ts). The AI store persists a selected state slice through AsyncStorage; the auth store works with Firebase's native auth session.

**Exercise:** draw “screen mounts → subscribes → snapshot arrives → state updates → screen renders → cleanup unsubscribes.”  
**Observable outcome:** you can locate both the subscription and cleanup in an existing screen.  
**Checkpoint:** explain why changing a Zustand role does not grant Firestore administrator permissions.

### Stage F — Backends, rules, and transactions

Learn document paths, collections, subcollections, queries, snapshots, batched writes, transactions, and security rules. A batch groups writes atomically; a transaction also reads current data and can retry if those reads change.

Read [EnrollmentRepository](../../src/services/enrollments/EnrollmentRepository.ts), then find `acceptRequest` in [its Firebase implementation](../../src/services/enrollments/FirebaseEnrollmentRepository.ts). Read the matching [Firestore rules](../../firebase/firestore.rules) and [accept-request rules suite](../../scripts/acceptRequestRulesTest.mjs).

**Exercise:** write down the documents acceptance reads or changes and the actor allowed to perform each operation.  
**Observable outcome:** you can explain why capacity and roster changes must succeed together.  
**Checkpoint:** distinguish hiding a client button from a backend actually refusing an unauthorized write.

Once these stages are comfortable, study AI retrieval, native maps, payment verification, and cloud triggers separately. They are not prerequisites for your first UI contribution.

## 3. Run the current app

Use the full [setup guide](../03-Implementation-Guides/PROJECT_SETUP.md) for platform-specific steps. The checked-in app uses Expo SDK 54, React 19, React Native 0.81, NativeWind 4, native Firebase modules, native Google Sign-In, and `expo-maps`.

**Use a development build.** Expo Go does not contain this project's custom native modules. Browser preview is also not a substitute for exercising native auth, maps, and notifications.

From the repository root, the usual starting sequence is:

```bash
nvm use
npm ci
# Create .env only if you do not already have a configured local file.
if [ ! -f .env ]; then cp .env.example .env; fi
# Fill the required public configuration in your local .env.
npx expo start --dev-client
```

Copy `.env.example` only when creating a new local `.env`; preserve an existing configured file. Match the Node version in [.nvmrc](../../.nvmrc), currently 24. The package engine allows a broader range, but tooling dependencies and CI use the pinned version.

If no compatible development client is installed, use the setup guide to build or obtain one. `npm run android` builds locally with an Android toolchain; `npm run ios` requires macOS and Xcode. Adding or removing native dependencies requires a new native build; restarting Metro only updates JavaScript.

Native Firebase also needs platform configuration referenced by [app.json](../../app.json). An environment file alone does not replace native Google service files or Android signing configuration.

| Environment kind | Examples | Where it belongs |
| --- | --- | --- |
| Public app configuration | `EXPO_PUBLIC_SUPABASE_URL`, Firebase app identifiers, restricted Maps key | Local/build environment; assume values are visible in the app bundle |
| Development selector | `EXPO_PUBLIC_USE_MOCK_DATA` | Local/build environment; restart Metro after changing it |
| Server credentials | Service-role keys, Groq keys, storage signing keys | Edge Function secrets or explicitly authorized local tooling; never app imports or `EXPO_PUBLIC_*` |
| Administrative credentials | `GOOGLE_APPLICATION_CREDENTIALS` | Authorized local/CI administration; never mobile assets |

The [environment template](../../.env.example) includes server-side placeholders and older explanatory comments. Their presence does not authorize bundling them. Read the consuming source and current architecture for each value.

**Mock mode is selective.** Tutor, enrollment, batch, message, review, saved-tutor, subscription, and AI selectors support mock paths, but this does not turn the whole app into an offline sandbox. Authentication remains native Firebase, and `MapSearch` imports the Firestore tutor service directly. Inspect imports before assuming a feature is isolated.

## 4. Understand the architecture

Most features follow this direction:

```text
src/app/ route → src/screens/ screen → component / hook / store
                                      ↓
                              repository interface
                                      ↓
                          dataSource → Firebase or Mock
                                      ↓
                           Firestore + security rules
```

There are exceptions: some older screens read Firestore directly, the map uses a lower-level tutor service, and AI/subscription work calls Supabase Edge Functions. Follow imports rather than assuming every feature has identical layering.

| Location | Responsibility | Good first example |
| --- | --- | --- |
| [src/app](../../src/app) | Expo Router entry points and root navigation | `student-home.tsx`, `_layout.tsx` |
| [src/screens](../../src/screens) | Full screens and feature orchestration | `student/StudentHome.tsx` |
| [src/components](../../src/components) | Shared UI, domain cards, forms, map UI | `domain/TutorCard.tsx` |
| [src/hooks](../../src/hooks) | Reusable React behavior with lifecycle | `useAiChat.ts`, `useSignedDocUrl.ts` |
| [src/store](../../src/store) | Shared client state | `authStore.ts`, `aiChatStore.ts` |
| [src/services](../../src/services) | Backend operations and repository contracts | `enrollments/EnrollmentRepository.ts` |
| [src/lib](../../src/lib) | Helpers and lower-level services | `location/distance.ts` |
| [src/ai](../../src/ai) | Shared/client AI constraints and guardrails | `types/constraints.types.ts` |
| [firebase](../../firebase) | Firestore rules and index definitions | `firestore.rules` |
| [supabase/functions](../../supabase/functions) | Authenticated server endpoints | `chat`, `create-esewa-order` |
| [supabase/ai](../../supabase/ai) | Server AI state, memory, retrieval, generation | `state/stateMachine.ts` |
| [supabase/migrations](../../supabase/migrations) | SQL schema and storage policy history | Numbered migrations |
| [functions/src](../../functions/src) | Firebase-triggered push delivery | `index.ts` |
| [scripts](../../scripts) | Tests, maintenance, seeding, smoke checks | `testDerived.ts` |

Three kinds of state coexist: component state for immediate interaction, Zustand/AsyncStorage for shared or resumed client state, and Firestore/Supabase for durable shared records. Updating one does not automatically synchronize every other copy.

## 5. Follow authentication and role routing

The entry point is [EmailSignUp](../../src/screens/auth/EmailSignUp.tsx), backed by [authService](../../src/services/firebase/authService.ts). It supports email/password signup and login plus native Google Sign-In. There is no current Clerk or SMS OTP flow.

```text
Signed out → /email-signup
  Email signup → verification email → “I've verified — continue” → reload user
  Google login → Firebase credential → verified Google identity
      ↓
Root layout reads user metadata and resolves role before completing loading
      ↓
No role → /role-selection → /profile-student OR /profile-tutor
      ↓                             ↓
Student profile saved          Tutor profile submitted
      ↓                             ↓
/student-home                  pending → /tutor-pending
                               approved → /tutor-home

Admin routing branch → no admin profile: /admin-profile → /admin-home
```

The [root layout](../../src/app/_layout.tsx) waits for the navigator, loads auth and metadata, and coordinates redirects. It also handles account status, tutor verification routing, and notification initialization. Read this file before changing onboarding navigation.

Its navigator stays mounted while loading UI is layered above it. Do not replace the stack with a conditional loading return: Expo Router needs the root navigator to exist before redirecting. Only the tutor's `pending` verification state blocks access to the dashboard; rejected or more-information states can reach correction flows with review messaging.

[RoleSelection](../../src/screens/auth/RoleSelection.tsx) chooses a role locally and writes auth metadata; the final role and profile land together in the profile screens' batched writes. This prevents a partially completed profile from being treated as completed onboarding. Existing roles are loaded during auth initialization so returning users reach their dashboards.

For email/password users, clicking the email link outside the app does not by itself refresh the cached native user. “I've verified — continue” explicitly reloads that user before reevaluating routing.

**Current discrepancy:** the layout resolves administrator UI routing from `users/{uid}.role` and an `admins/{uid}` lookup, while Firestore's `isAdmin()` requires the Firebase Auth custom claim `admin: true`. UI routing and backend authorization therefore use different evidence. An admin-looking screen is not proof of privileged access; do not copy the UI check into security rules. This guide documents the discrepancy without changing it.

## 6. Find each feature in the source

Use this as a directory of reading starting points. A screen may delegate additional behavior to components and helpers.

| Feature and route | UI starting point | Implementation and backend |
| --- | --- | --- |
| Auth: `/email-signup`, `/role-selection` | [EmailSignUp](../../src/screens/auth/EmailSignUp.tsx), [RoleSelection](../../src/screens/auth/RoleSelection.tsx) | [authService](../../src/services/firebase/authService.ts), native Firebase Auth, auth store, root layout |
| Profile setup: `/profile-student`, `/profile-tutor` | [StudentProfileScreen](../../src/screens/auth/StudentProfileScreen.tsx), [TutorProfileScreen](../../src/screens/auth/TutorProfileScreen.tsx) | Firestore batched identity/profile writes; location and upload helpers |
| Tutor profile editing: `/tutor_edit_profile`, `/tutor_edit_teaching_details` | [EditProfile](../../src/screens/tutor/EditProfile.tsx), [EditTeachingDetails](../../src/screens/tutor/EditTeachingDetails.tsx) | Live editable fields versus proposed high-risk changes in `tutorProfileUpdates/{uid}`; admin review merges or rejects proposals |
| Discovery: `/student-home`, `/tutor/[id]` | [StudentHome](../../src/screens/student/StudentHome.tsx), [TutorDetailsScreen](../../src/screens/student/TutorDetailsScreen.tsx) | [TutorRepository](../../src/services/tutors/TutorRepository.ts), Firebase directory, live review overlays |
| Maps: `/map-search` | [MapSearch](../../src/screens/student/MapSearch.tsx), [TutorMap](../../src/components/map/TutorMap.tsx) | Direct [Firestore tutor service](../../src/lib/tutor/firestoreTutorService.ts), location, distance, camera, clustering; native `expo-maps` |
| AI search: `/AI-chat` | [AIChat](../../src/screens/student/AIChat.tsx), [useAiChat](../../src/hooks/useAiChat.ts) | AI store → [chatService](../../src/services/ai/chatService.ts) → Supabase `chat` → SQL retrieval and server AI pipeline |
| Requests: `/enroll`, `/tutor-inbox` | [EnrollmentFormScreen](../../src/screens/student/EnrollmentFormScreen.tsx), [TutorInbox](../../src/screens/tutor/TutorInbox.tsx) | Enrollment repository; request creation, pending edits, transactional accept, decline |
| Enrollments: `/enrollment`, `/tutor-home` | [MyEnrollments](../../src/screens/student/Enrollment.tsx), [TutorHome](../../src/screens/tutor/TutorHome.tsx) | Roster subscriptions, removals, expiry, [derived helpers](../../src/services/enrollments/derived.ts) |
| Availability: `/tutor-capacity` | [TutorCapacityScreen](../../src/screens/tutor/TutorCapacityScreen.tsx) | `saveAvailability`, profile availability map, directory visibility mirror |
| Batches: `/batches`, `/browse-batches`, `/batch/[tutorUid]/[batchId]` | [BatchCreation](../../src/screens/tutor/BatchCreation.tsx), [BrowseBatchesScreen](../../src/screens/student/BrowseBatchesScreen.tsx), [BatchDetailScreen](../../src/screens/shared/BatchDetailScreen.tsx) | [BatchesRepository](../../src/services/batches/BatchesRepository.ts), roster and member paths, enrollment transaction for creation |
| Messaging: `/messages`, `/chat` | [Messages route](../../src/app/messages.tsx), [Chat route](../../src/app/chat.tsx) | [MessagesRepository](../../src/services/messages/MessagesRepository.ts), Firestore conversations/messages, unread hook |
| Saved tutors: `/saved-tutors`, detail heart | [Saved tutors route](../../src/app/saved-tutors.tsx), TutorDetailsScreen | [SavedTutorsRepository](../../src/services/savedTutors/SavedTutorsRepository.ts), tutor-ID map in student profile |
| Reviews: tutor details, enrollment actions | [ReviewModal](../../src/components/domain/ReviewModal.tsx), TutorDetailsScreen | [ReviewRepository](../../src/services/enrollments/ReviewRepository.ts), review transaction and aggregates |
| Notifications: `/notification`, banner | [Notification](../../src/screens/shared/Notification.tsx), [InAppNotificationBar](../../src/components/notifications/InAppNotificationBar.tsx) | [pushService](../../src/services/notifications/pushService.ts), Firestore inbox and Expo push tokens |
| Verification: `/tutor-pending`, `/verification-queue` | [PendingReview](../../src/screens/tutor/PendingReview.tsx), [VerificationQueue](../../src/screens/admin/VerificationQueue.tsx) | Firestore review records, [document helpers](../../src/lib/verification/documents.ts), upload and signed-URL endpoints |
| Admin: `/admin-home`, `/user-management` | [AdminHome](../../src/screens/admin/AdminHome.tsx), [UserManagement](../../src/screens/admin/UserManagement.tsx) | Firestore counts, custom-claim rules, [user lifecycle operations](../../src/lib/admin/userLifecycle.ts) |
| Pro sandbox: `/pro-upgrade`, `/pro-success` | [ProUpgradeScreen](../../src/screens/tutor/ProUpgradeScreen.tsx), [success route](../../src/app/pro-success.tsx) | [SubscriptionRepository](../../src/services/subscription/SubscriptionRepository.ts), eSewa endpoint, server-only grant |
| Help: `/help-support` | [Help route](../../src/app/help-support.tsx) | FAQ and device email action |

## 7. Trace real interactions end to end

### A. Student opens Home and sees tutors

1. `/student-home` renders `StudentHome`.
2. The screen subscribes through the tutor data-source exports.
3. In live mode, `FirebaseTutorRepository` wraps `firestoreTutorService.subscribeTutors`.
4. The directory query requires approval, no pending profile update, `isAvailableForNewStudents === true`, and `hasAvailability === true`.
5. Snapshot data becomes typed listings. The repository overlays active review aggregates through a shared reviews listener.
6. Screen state updates; reusable tutor cards render the results.
7. Opening a card navigates to `/tutor/[id]`; the detail screen fetches richer profile data and subscribes to live reviews.

The map uses the lower-level Firestore service directly, then applies local filtering, coordinate handling, distance ranking, and clustering. Do not assume repository-only behavior, including mock selection or review overlays, applies to that path. `expo-maps` uses Google Maps on Android and Apple Maps on iOS; geocoding is a separate operation from drawing map tiles.

Read [distance helpers](../../src/lib/location/distance.ts), [clustering](../../src/hooks/useTutorClustering.ts), and [geocoding](../../src/lib/location/geocoding.ts) to separate those concerns. Distance/ranking math runs locally; the inspected geocoding helpers call Nominatim. A text location label and a valid coordinate pair are different data requirements. The architecture permits optional Google geocoding, but these helpers do not implement that provider switch.

### B. A student requests tuition and a tutor accepts

```text
Student /enroll → writeEnrollmentRequest → enrollmentRequests/{tutor}/requests/{id}
                                                ↓ live subscription
Tutor /tutor-inbox → choose concrete slot → acceptRequest transaction
                                                ↓
              request accepted + roster entry + profile/capacity changes
                                                ↓
               Student /enrollment and TutorHome update from snapshots
```

The request carries student identity and selected preferences; acceptance needs a concrete weekly slot key. Use helpers for keys such as `mon:5-7`, never a hand-built hyphen variant. Acceptance can also attach a student to the requested batch when applicable.

Decline hard-deletes the request. Removal and expiry have separate paths because their effects on roster, batch membership, counters, and location access differ. Read the repository operation instead of deleting a roster document directly.

Today's sessions are derived from active roster entries, their date window, and the weekday in Asia/Kathmandu. There is no separate `sessions` collection to seed. Student views pass `{ runSweep: false }` when subscribing to a tutor's roster because the tutor's expiry sweep performs writes.

Batch creation starts from active roster students and delegates to the existing enrollment transaction. Browsing uses an active marketplace feed, while opening an already-enrolled batch uses a direct-path subscription that can return an ended batch. These read paths serve different screens and should not be substituted for each other.

### C. A student asks the AI assistant for tutors

1. `/AI-chat` renders `AIChat`; `useAiChat` exposes Zustand conversation actions.
2. The store accumulates constraints, messages, loading state, and a session ID; a limited slice persists locally.
3. `chatService.sendChatMessage` selects a mock pipeline or sends a Firebase ID token with the request to the `chat` Edge Function.
4. Server middleware validates identity and rate limits; the orchestrator calls the state machine and session/message stores.
5. [Server retrieval](../../supabase/ai/retrieval/hybridSearch.ts) searches the Supabase SQL tutor corpus using constraints and embedding-related search; generation turns results into a response.
6. The client maps response fields into app shapes, updates the store, and renders tutor cards or a conversational reply.

The [conversation states](../../supabase/ai/state/states.ts) are `collecting`, `searching`, `presenting`, and `followup`. Subject, grade, and a positive monthly budget form the minimum search gate; location and other preferences can refine it. Retrieval tries vector-assisted search, then metadata search, then controlled constraint relaxation when needed. Follow the actual response/error path rather than assuming every answer required a successful model call.

The mobile discovery directory lives in Firestore; the AI search corpus lives in Supabase tables. These are separate datasets. A tutor appearing in one is not proof it exists in the other, and this review found no automatic Firestore-to-SQL synchronization. [The seed script](../../scripts/seedSupabaseTutors.ts) is a separate maintenance tool, not a live sync service.

Also inspect [groqRanker](../../src/services/ai/groqRanker.ts) and `groq-proxy` when following mock/client ranking. Provider keys stay server-side; never add an `EXPO_PUBLIC_*` LLM key to make a client request work.

### D. A user sends a chat message

The chat route identifies the peer. `conversationKey` sorts the two participant IDs and joins them with `__`, so either participant computes the same thread ID. Sending writes a message and updates thread metadata; snapshots redraw the thread and hub.

Hub queries use scalar participant fields with a composite `or()` because the rules authorize `participantA` and `participantB`. Replacing this with an `array-contains` query changes what the rules must prove and can cause permission failures. Each side writes its own display metadata; public tutor data can enrich missing peer identity.

[Firebase Functions](../../functions/src/index.ts) contains four Gen1 triggers for new messages, new enrollment requests, accepted requests, and deleted/declined requests. Each uses `asia-south1` and `maxInstances: 5`; the functions package targets Node 20. They deliver through the Expo push API and stored push tokens. This is separate from rendering a local banner or inbox row.

### E. A tutor submits documents and receives approval

The document UI picks a file and calls the storage helper. Verification documents and demo uploads go through `upload-verification-doc`, which verifies a Firebase token and derives the object path from that identity. [Migration 017](../../supabase/migrations/017_server_side_uploads.sql) removes older anonymous write policies for these buckets.

PII documents remain private. The UI requests a short-lived signed URL through `verification-doc-url` and [useSignedDocUrl](../../src/hooks/useSignedDocUrl.ts); demo videos use their public bucket. Avatar/review-photo uploads use separate public-media helpers, so do not apply the verification flow's assumptions to every storage call.

`VerificationQueue` reads submissions and profile updates. Approval batches verification status, private profile, and the public `tutors/{uid}` mirror. Discovery still requires actual availability: approval alone does not create slots or make `hasAvailability` true.

For later teaching-detail changes, follow [EditProfile](../../src/screens/tutor/EditProfile.tsx) → [EditTeachingDetails](../../src/screens/tutor/EditTeachingDetails.tsx) → `tutorProfileUpdates/{uid}`. The submission stores a proposed diff for review rather than immediately applying every high-risk field. The admin approval handler merges approved fields into the private profile and public tutor mirror; edit rejection leaves the existing live teaching values in place and records the reason.

**Manual check in an authorized test environment:**

1. Submit initial documents as a new tutor; review the pending state with a separate admin session.
2. Reject or request more information, then verify the tutor sees the reason and can correct/resubmit.
3. Approve the corrected initial application; configure availability and check discovery gates.
4. From an approved tutor, change a teaching detail such as subject or rate and submit the proposal. Compare the stored proposal with the unchanged live values before review.
5. Approve the proposal and check the private profile, public discovery values, and pending indicators. Repeat with a rejected proposal and verify prior live values remain.
6. Test document preview expiry/retry, cancellation, and a failed save. Record results; these steps were not executed as part of this documentation-only change.


### F. A tutor tries the Pro sandbox flow

The subscription repository requests an eSewa order from `create-esewa-order`; the UI opens the returned form in a WebView. Server-side verification must confirm the sandbox transaction before granting subscription fields. A client success screen is presentation, not authority to grant Pro.

Use `EPAYTEST` sandbox credentials only. Client writes cannot self-grant the live tier; the demo grant path is restricted to mock mode. Read the Edge Function and subscription repository together before changing this flow.

## 8. Read the data model and security boundaries

Firestore path segments alternate collection/document. For example, `users/alice/studentProfile/default` means collection `users`, document `alice`, subcollection `studentProfile`, document `default`.

| Store/path | Purpose |
| --- | --- |
| Firebase Auth user | Native identity, provider, email verification, ID token and custom claims |
| `users/{uid}` | App identity, role, lifecycle fields, push tokens |
| `users/{uid}/studentProfile/default` | Student profile and saved-tutor map |
| `users/{uid}/tutorProfile/default` | Full tutor profile, capacity, availability, verification and subscription mirrors |
| `users/{uid}/adminProfile/default` | Administrator display/profile setup |
| `users/{studentUid}/locationAccess/{tutorUid}` | Scoped student location access used by enrollment operations |
| `tutors/{uid}` | Denormalized public discovery record and visibility/availability flags |
| `tutorVerifications/{uid}`, `tutorProfileUpdates/{uid}` | Initial review and later profile-change review |
| `enrollmentRequests/{tutorUid}/requests/{requestId}` | Requests awaiting or recording a tutor decision |
| `enrollments/{tutorUid}/roster/{enrollmentId}` | Enrolled student relationship, slot, dates, status |
| `batches/{tutorUid}/classes/{batchId}` | Group batch definition; each class has a `members` subcollection |
| `reviews/{tutorUid}/reviews/{reviewId}` | Individual reviews feeding detail/card aggregates |
| `conversations/{conversationId}/messages/{messageId}` | Person-to-person messages; parent holds participants and summary metadata |
| `notifications/{uid}/items/{notificationId}` | Notification inbox/history, distinct from OS push delivery |
| `admins/{uid}` | Administrative ledger used by UI/tooling; rules authority is the Auth custom claim |
| Supabase SQL tutors, embeddings, conversations/messages | AI corpus and session memory; distinct from Firestore chat threads |
| Supabase SQL transactions | Server eSewa order/verification state |
| Supabase Storage buckets | Public media, private verification files, public tutor demo videos |

Exact field contracts are in repository/type files and migrations. Treat the table as a map, not a replacement for those contracts before writing data.

Security rules are part of the implementation. A query must be provable against the rules; rules do not fetch every record and then filter unauthorized results. Cross-user reads, partial updates, creates, and deletes can have different permissions.

Preserve these boundaries:

- Administrator authority is the Auth `admin` claim, read with a safe default; an owner-editable profile value is insufficient.
- Owners cannot grant protected account status or subscription fields. Tutor directory writes have narrowly constrained exceptions.
- Create and update rules are split where reading an existing resource during creation would fail in production.
- Use repository transactions for multi-document enrollment, batch, and review operations.
- Firebase tokens are validated inside relevant Edge Functions. Gateway settings do not remove application-level authentication.
- Service-role credentials and payment signing secrets stay on the server.

The project records emulator/production differences in [AGENTS.md](../../AGENTS.md). Passing emulator tests is not proof of a deployed ruleset or native client behavior.

## 9. Build UI with the design system

Use React Native primitives with NativeWind `className`. The palette and radius scale are in [tailwind.config.js](../../tailwind.config.js); raw color props use [colors.ts](../../src/constants/colors.ts). Do not reintroduce Tamagui.

```tsx
import { Pressable, Text, View } from "react-native";

export function StudyHint({ onOpen }: { onOpen: () => void }) {
  return (
    <View className="rounded-card border border-border bg-surface p-4">
      <Text className="text-heading text-text-primary">Plan your week</Text>
      <Text className="mt-2 text-body text-text-secondary">
        Check your tutor's available time before requesting a session.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        className="mt-4 min-h-touch items-center justify-center rounded-md bg-primary px-4"
      >
        <Text className="text-button text-text-inverse">View availability</Text>
      </Pressable>
    </View>
  );
}
```

Use `rounded-xs|sm|md|card|lg|xl|hero|pill`, including supported side variants. Defaults such as `rounded-full` and arbitrary radii violate the token scale. Palette shades such as `bg-blue-500` also bypass the design system. On dark surfaces, use `text-glass-secondary` and `text-glass-muted` for secondary text.

Five custom [ESLint rules](../../eslint-rules/design-tokens.js) enforce tokens in classes, placeholder colors, color props, and inline background/border colors. Layout belongs in NativeWind classes; study existing native API exceptions before reproducing them.

Current build configuration matters: [Babel](../../babel.config.js) includes NativeWind presets and `react-native-worklets/plugin`. [Metro](../../metro.config.js) wraps with `withNativeWind`, reads `global.css`, excludes reference/output folders, and contains a CSS interop resolver workaround. Do not replace these with older “default Expo config only” snippets.

The [BasoBas reference](../98-Reference-BasoBas/ANALYSIS.md) is for studying UX flow and composition. Translate ideas into EdumentX native components; do not copy its web markup or styling.

## 10. Practice a small feature

**Suggested first task:** add an expandable study hint to a student screen. Keep its state local and require no dependency, schema, or backend change.

1. Record the behavior: the collapsed card shows a title; pressing it reveals helpful text; pressing again hides it.
2. Find the screen through its route; read neighboring components for naming and spacing conventions.
3. Create a small component under `src/components/` using native primitives, token classes, and clear props.
4. Own the expanded boolean in the component unless the screen must coordinate it. Derive button text from that state.
5. Render it in the screen. Avoid changing auth/navigation to make a development route reachable.
6. Check both states on a development build, including a small screen and large text settings.
7. Run typecheck and lint. Review the diff for unrelated edits, raw colors, new packages, and environment files.
8. Describe the visible change and what you verified in the pull request.

**Completion evidence:** both states render correctly, the action is accessible, checks pass, and no persistent data changed. A reversible UI-only change does not need an artificial test that merely repeats its markup.

For a second task, change a pure helper with a meaningful unit test. For a backend feature, first write the route → screen → repository → document path → rule chain, then update the smallest relevant contract and checks.

Before a new dependency or service, update architecture §0 with quota math and spend-control notes. Demo usage must fit the project's $0 usage target; an alert or instance limit is a guardrail, not a guarantee that all usage is free.

## 11. Choose the right checks

Run these from the repository root. Listing a command here does not mean it was run for this guide.

| Command | What it tells you | Requirements/side effects |
| --- | --- | --- |
| `npm run typecheck` | TypeScript contracts compile | Dependencies installed; no device needed |
| `npm run lint` | Project conventions and design-token rules | Configured source, including Functions |
| `npm run test:derived` | Pure scheduling, key/date helpers, related behavior | Compiles test output into `dist` |
| `npm run test:lint-rules` | Custom lint rules accept/reject intended examples | Compiles test output into `dist` |
| `npm run test:rules:deployed` | Released Firestore rules match local source | Authorized Google credentials and network; no deployment |
| `npm run test:rules` | Drift check, then eight local emulator suites | Credentials for first stage; Java 21 and Firebase CLI |
| `npm run smoke:enrollments` and other `smoke:*` | Real signed-in client operations against deployed services | Creates/cleans live data; read scripts and use only the intended authorized project |

The eight emulator suites cover tutor directory rules, batches, request acceptance, messages, reviews, enrollment removal, tutor detail reads, and user privilege boundaries. Suite names are explicitly listed in [package.json](../../package.json).

For credential-free rules work, use the emulator-only command from [.github/workflows/ci.yml](../../.github/workflows/ci.yml), targeting `demo-edumentx`. Do not assume `npm run test:rules` is fully offline: its first stage checks deployed rules.

CI runs on pull requests, main-branch pushes, and manual dispatch. Check and emulator jobs run for PRs; the credentialed drift/live-smoke job skips PRs and skips credential-dependent steps when secrets are absent. A green workflow with skipped live steps does not prove those checks executed.

Device checks remain necessary for native auth, maps, keyboard handling, uploads, WebViews, and push notifications. “Typecheck passed” and “Google login worked on an Android development build” are different claims.

## 12. Troubleshooting and glossary

| Symptom | Start here |
| --- | --- |
| Native module missing or screen fails in Expo Go | Install/rebuild the matching development client; confirm native configuration |
| A native dependency changed but restart did not help | Rebuild the client; Metro cannot add native binaries |
| NativeWind styles or JSX runtime resolution fail | Inspect Babel/Metro and installed CSS interop layout; restart with `npx expo start --dev-client --clear` after configuration fixes |
| Verified email still returns to the inbox panel | Use “I've verified — continue”; inspect native user reload and store update |
| Returning user sees role/profile setup | Trace root auth initialization and persisted role before changing redirects |
| Approved tutor is absent from discovery | Check all query gates, especially availability, visibility, and pending-update flags |
| Mock tutors appear on Home but map still reads live data | MapSearch imports the lower-level Firestore service directly |
| AI and discovery show different tutors | Check Supabase corpus versus Firestore directory, seeding, and actual IDs |
| AI request/upload returns 401 | Inspect Firebase token, endpoint validator, and documented gateway configuration; preserve app-level authentication |
| Signed verification image stops loading | Request a fresh signed URL; preserve existing query parameters during cache-busting |
| Request exists but no session appears today | Check status, Kathmandu date window, and colon-format slot key |
| Student roster view produces write permission errors | Confirm its subscription uses `{ runSweep: false }` |
| Message hub returns permission denied | Compare scalar participant query with conversation rules |
| Admin UI opens but backend writes fail | Check the Auth admin claim and refresh session; UI role and rules authority differ |
| Rules command fails before emulator starts | Deployed-drift stage needs credentials; use CI's emulator-only command for local-only work |
| Tooling fails on an older Node version | Run `nvm use` and verify the pinned version before reinstalling |

| Term | Meaning in this project |
| --- | --- |
| Route | File under `src/app` naming a navigable destination |
| Screen | React component composing a full app view |
| Hook | Reusable React behavior, often including lifecycle and state |
| Store | Shared client state; not automatically a database |
| Repository | Contract for data operations with Firebase/mock implementations |
| Snapshot/subscription | Stream of backend changes; unsubscribe when no longer needed |
| Denormalized mirror | Second representation optimized for a read path, such as `tutors/{uid}` |
| Transaction | Read/write operation that retries on conflicting data changes |
| Batch | Writes committed together without transaction reads |
| Custom claim | Trusted token metadata set administratively for backend authorization |
| ID token | Short-lived Firebase identity proof sent to authenticated endpoints |
| Edge Function | Supabase-hosted server endpoint, distinct from a mobile helper |
| Cloud trigger | Server code reacting to Firestore changes, such as push delivery |
| RAG | Retrieval-augmented generation: find records before generating an answer |
| Embedding | Numeric representation used for AI similarity retrieval |
| Signed URL | Temporary authorized access to a private object |
| Development client | Custom native app containing the project's native modules and development tools |

When stuck, make the question concrete: name the route, the action performed, the expected result, the observed result, and the first relevant error. Trace that one interaction through the layers above.
