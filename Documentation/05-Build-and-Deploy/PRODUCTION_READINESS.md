# EdumentX production readiness

Reviewed on 21 October 2026. This is a source-based release plan for the current React Native/Expo app. Android and iOS can share product behavior, but both need their own signing, permissions, store review, and device checks.

EdumentX has working discovery, enrollment, scheduling, messaging, reviews, and verification flows. A premium release now depends on account safety, reliable recovery, bounded data access, and native testing as much as visual polish. The source review found unresolved release blockers; this document does not certify the app for publication.

Use the [production release guide](./PRODUCTION_RELEASE_GUIDE.md) for build and submission commands, and [iOS on Linux with xtool](./IOS_ON_LINUX_XTOOL.md) for the supported scope of that tool. For development, start with [project setup](../03-Implementation-Guides/PROJECT_SETUP.md). Existing [UI study and device checks](../02-Design-System/REFERENCE_RECONSTRUCTION.md) explain the recent design changes.

## Automated source work — 22 October 2026

These fixes are implemented in the working tree and tested locally. Nothing in this pass deployed rules/functions, sent a reset email/payment/push, built a signed native candidate or submitted a store listing. Local source results do not close the live/device gates.

| Area | Implemented source change | Remaining evidence/work |
|---|---|---|
| Chat authorization | Immutable identities; caller/peer map boundaries; atomic message/preview proof; recipient receipts; orphan reads denied; parent-first subscriptions | Coordinated updated-client/rules rollout, deployed negative tests and real cross-client/device checks |
| Password recovery | Email-only recovery on the existing login screen, neutral account-existence response and safe retry errors | Configured template/domain, inbox/expired-link/new-password round-trip on a device |
| Push cleanup | Serialized registration and explicit logout detachment; rotation and recipient guards; generic remote/local OS content | Full server-owned single-owner registration, unknown legacy/reinstall/forced signout, receipts and cold-start destinations remain engineering work |
| Sandbox Pro | Default-off client routes/actions/demo grants and a separate development-project server gate; live eSewa hosts/products rejected | Deploy the reviewed server changes; verify production binary/backend paths. Production billing remains a separate decision |
| Account state | UID-bound AI persistence, guarded auth/request generations and reset/hydration-race protection implemented | Independent review and integrated local tests passed; native account-switch observation remains |
| Local checks | `npm run verify:local` runs fixed static/unit/demo-emulator suites and optional Swift source/core checks; sanitized JSON evidence under `.expo/release-check` | Final combined run passed after review corrections. Native, live/deployed, signing and store results remain separately pending |

See [owner-only steps](PERSONAL_RELEASE_STEPS.md) for decisions, private account interactions and physical checks. Missing implementation is engineering work, not something the owner is being asked to code.

### Recorded local verification

The final `npm run verify:local` run passed on 22 October against the working tree. Its evidence records HEAD plus `sourceDirty: true`, the fixed command statuses and explicit native/live/store limits; it does not attribute uncommitted source to a clean commit.

- TypeScript, lint, all named helper/unit suites, all eight demo Firestore emulator suites and the separate Swift source/core checks passed.
- The messaging-specific scoped run recorded 151 checks; all eight rule suites together recorded 240. The new repository suite has four passing subscription/transaction tests.
- Password/push/payload tests: 23 passed after correcting a sticky failed-registration logout latch. Account/session isolation: 16 passed after correcting a reset-versus-pending-hydration continuation race. Both fixes were observed failing before implementation and passed scoped re-review.
- Sandbox policy: seven tests; release configuration: eight; local runner: twelve. The policy/runner review found no material issues.
- `npm --prefix functions run build` passed. The production-flagged Android Hermes/JavaScript export passed to `.expo/release-check/android-export`; this is **not an APK/AAB or a signed/native device build**.
- The actual production configuration doctor still exits 1: required production public values are not supplied in its environment and the native Firebase files select development. In the later SDK trial, the Swift native doctor passed after installing the owner's Xcode 27.1 SDK, and the unsigned ARM64 SwiftUI app built successfully. Signing, device operation and live native integrations remain unverified. No device was attached when checked with adb.

Independent chat, auth/session and sandbox/tooling reviews approved their source scopes after fixes. The updated live messaging smoke source compiled; it was not executed. Existing earlier UI changes were preserved, and no original-repository files were staged or committed by this automation pass.

### Coordinated backend rollout

New sends include `lastMessage.messageId`, bound by rules to a newly created message in the same atomic batch. Legacy previews remain readable, and legacy optional maps/participant-array order remain compatible. Older binaries that send the former standalone protocol will fail after hardened rules deployment. Ship/test the updated client and align the reviewed rollout before enabling those rules; do not deploy them incidentally while running local tests.

The updated messaging smoke source uses the same atomic protocol and server timestamp transforms. It was compiled, not run against live data. Generic push payload changes and server sandbox denial also take effect only after their reviewed Functions/Edge deployments. Review deployed drift and beta evidence explicitly rather than calling a skipped live job verified.

### Repository publication

The owner authorized source publication and repository updates on 22 October. The Android client/shared backend now live in [EdumentX-Android](https://github.com/SuhanVerse/EdumentX-Android); the independent native trial lives in [EdumentX-iOS](https://github.com/SuhanVerse/EdumentX-iOS). The existing local Android folder is unchanged so IDE paths keep working.

Ordinary CI runs type/lint/unit and demo-emulator checks. The credentialed `rules-deployed` job requires manual workflow dispatch with `run_live_checks=true`, because its smoke suites create real backend fixtures. Source publication does not deploy rules/functions or run those live checks. The [short owner guide](PERSONAL_RELEASE_STEPS.md) lists the remaining decisions and device prompts.

## What this review establishes

- Findings below come from source and configuration inspection. No production data was modified to investigate them.
- A passing TypeScript check, unit test, or JavaScript export does not prove native signing, Google login, Maps, push delivery, uploads, or store acceptance.
- Historical deployment notes are useful context, but do not establish the current deployed rules, SQL policies, provider settings, certificates, or secret values.
- Build-profile hardening can prevent some configuration mistakes. It cannot repair account lifecycle, security rules, or missing product features.

Priority means:

| Priority | Release decision |
| --- | --- |
| P0 | Close before opening public registration or submitting a consumer release. |
| P1 | Complete before a broad release; use internal testing to collect evidence. |
| P2 | Improve after the release foundations are proven; prioritize measured user problems. |

## P0: close the release blockers

| Item | Source evidence | Acceptance |
| --- | --- | --- |
| Protect conversation membership | [Conversation rules](../../firebase/firestore.rules) now pin identities and constrain atomic send/read/typing operations; local negative tests cover the old bypasses. Source changes are not deployed. | Participant identities and conversation identity are immutable. Rules reject unauthorized membership, metadata, counters, previews, and message changes. Add negative rules tests. |
| Provide account deletion | [Auth service](../../src/services/firebase/authService.ts) has no self-deletion/reauthentication flow. [Student profile](../../src/screens/student/StudentProfile.tsx) and [tutor profile](../../src/screens/tutor/EditProfile.tsx) expose logout, but no account-deletion entry. | A user can initiate deletion in the app, confirm identity, receive completion/status, and use a public deletion-request page. Cleanup is resumable and follows a documented retention policy. |
| Complete deletion across services | [Admin lifecycle](../../src/lib/admin/userLifecycle.ts) and [operator deletion script](../../scripts/deleteUser.ts) delete a limited path list. The script can print a complete-wipe message after partial failures. | Verify every owned record/object and relationship below. Failed steps remain visible and retryable. A parent Firestore delete must not leave forgotten subcollections. |
| Detach push tokens on account changes | [Push registration](../../src/services/notifications/pushService.ts) now detaches known current-device tokens before explicit logout and guards stale work. Server ownership, forced signout/reinstall and unknown legacy tokens remain open. | After A logs out and B signs in on the same phone, A's private notifications never reach B. Test failed/offline logout cleanup, token rotation, reinstall, and multiple devices. |
| Gate demo and sandbox features | Production EAS profiles explicitly set mock data false, and [dynamic app config](../../app.config.js) now rejects a recognized production build unless that value is exactly `false`. [Go Pro](../../src/screens/tutor/EditProfile.tsx), direct routes and repository mutation methods are now development opt-in only, with a separate default-off server gate. Running backends and signed binaries still need verification. | Keep the configuration guard tested, verify the actual signed release uses live data, and remove consumer sandbox routes/grants with backend enforcement. The build guard does not hide the Pro route or repair other release blockers. |
| Publish privacy and support information | No privacy/terms screen was found in the auth/profile routes. [Pending review](../../src/screens/tutor/PendingReview.tsx) still points to an `.example` support address; [Help](../../src/app/help-support.tsx) uses another address. | Working HTTPS privacy, support, and deletion pages exist and are linked from app/listings. Verify mailbox delivery. Match store declarations to actual collection and sharing. |
| Make messaging and reviews safe to operate | The app has user-generated messages/reviews; no complete reporting, blocking, or moderation flow was found in `src/`. | Users can report content/accounts, block unwanted contact, and reach support. Blocking is enforced by backend rules/API, with tests for direct writes. Moderators have an actionable queue and response process. |
| Resolve iOS sign-in requirements | [Auth screen](../../src/screens/auth/EmailSignUp.tsx) offers Google on iOS; no Sign in with Apple flow was found. | Review current Apple login-services rules and applicable exceptions. Implement a compliant equivalent if required; verify private email, linking, reauthentication, and revocation on deletion. Email login alone is not evidence of an exemption. |

### Account deletion inventory

Design a server-owned deletion job rather than asking a phone to perform a long sequence of privileged writes. Authenticate the request, require recent authentication where appropriate, and make retries safe. Keep any retained records only under a defined legal/product retention reason.

Check these areas explicitly:

- Firebase Auth identity, provider association, session/token revocation, and registered device push tokens.
- `users/{uid}` and all profile, availability, saved-tutor, and other subcollections; public `tutors/{uid}` discovery data.
- Verification/update queues, private identity files, public avatars, tutor demo videos, and review-uploaded images.
- Enrollment requests, roster rows, group batches/members, counters, and counterpart references.
- Conversation metadata and messages under the chosen deletion/anonymization policy; do not erase another participant's retained records accidentally.
- Reviews, reputation aggregates, notifications and their `items` subcollection.
- Supabase AI/search records and chat state associated with the account, plus local persisted state on logout/deletion.
- Sandbox subscription/order records and any future financial records under an explicit retention policy.

Tests should cover a student, tutor with active students/batches, account with files/messages, partially completed signup, repeated request, and a failure midway through cleanup. Never use a real user's identity to rehearse deletion.

### Pro upgrades and payment scope

The current Pro screen sells app capabilities such as increased limits, visibility, and a badge. That is a different product from paying a tutor directly for an in-person service. Review the current Apple/Google policies for each actual offering and market before choosing a payment path.

For an initial free release, disable the sandbox Pro entry and grant paths in the consumer app/backend. Keep eSewa sandbox-only under the repository's operating rules. A production payment decision needs a separate documented design, business setup, entitlement reconciliation, refund handling, and policy review. Merely replacing `EPAYTEST` is not a release plan.

## P1: make beta behavior dependable

| Item | Evidence or open question | Acceptance |
| --- | --- | --- |
| Final app identity and backend selection | [App config](../../app.json) uses `com.anonymous.edumentx`; [Firebase alias](../../.firebaserc) selects `edumentx-dev`; [Google auth](../../src/services/firebase/authService.ts) embeds a Web OAuth client ID. | Choose ownership/identifiers before the first listing. Register matching Firebase apps, certificates, OAuth clients and restricted Maps keys. Separate approved development/production resources. Confirm the signed beta connects to the intended backend. |
| Fresh native configuration and signing | Local generated `android/` and `ios/` folders are ignored and may be stale. Existing local Android release config uses debug signing; local iOS entitlements/permission strings do not prove release capabilities. | Use the release guide's deliberate CNG/EAS route. Inspect actual APK/AAB signing, merged Android manifest and IPA entitlements/usage strings. Preserve native customizations before regeneration. |
| Password recovery | The existing auth surface now has email-only recovery through modular `sendPasswordResetEmail`, with account-neutral responses and safe error handling. | A password user can request reset, handle expiry/network/rate limits, set a new password, then log in. Keep responses from disclosing whether an account exists. |
| Push delivery and navigation | [Server push](../../functions/src/index.ts) checks initial Expo tickets, not later delivery receipts; payloads now use generic content in source. [Client response handler](../../src/services/notifications/pushService.ts) routes to a generic page and can swallow cold-start navigation failure. | Process receipts, remove invalid tokens, and queue navigation until auth/root navigation is ready. Open the relevant conversation/enrollment from foreground, background, and terminated states. |
| Bounded reads and pagination | [Tutor repository](../../src/services/tutors/FirebaseTutorRepository.ts) subscribes to the global reviews collection group. [Messages](../../src/services/messages/FirebaseMessagesRepository.ts) loads the whole thread and conversation hub. | Use bounded first pages and cursors; compute/store trustworthy aggregates where appropriate. Verify a long conversation does not download every message. Measure reads for each important journey. |
| Recovery and diagnostics | Domain error states exist, but no configured crash-reporting integration or custom app recovery boundary was found. Many failures are console-only. | Release crashes have actionable, scrubbed diagnostics. Users get retry/recovery paths for failures. Never log identity scans, message content, credentials, tokens, or full signed URLs. Choose tooling within the documented $0 demo constraint. |
| Native device and release checks | [CI](../../.github/workflows/ci.yml) covers static/unit/rules checks. Native build/device journeys are not a demonstrated CI gate. Live checks skip when required credentials are absent. | Keep an explicit release record with signed builds, passed device scenarios, deployed-rule evidence and beta feedback. A skipped job is recorded as skipped, not verified. |
| AI/discovery consistency | Firestore drives discovery; Supabase also drives AI search. [Setup](../03-Implementation-Guides/PROJECT_SETUP.md) does not establish universal synchronization. | Approve/update/hide/delete a test tutor and verify both discovery paths agree within a defined freshness window. AI failure shows an honest recovery path, not fabricated tutor availability. |

The package identifier `com.anonymous.edumentx` is technically valid. Its weakness is unclear long-term ownership, not a guaranteed store rejection. Do not rename it casually after publication; signing, Firebase, OAuth, Maps, links and store identity must stay aligned.

### Build hardening status

The following source configuration was added during this documentation/setup session and inspected after the edit:

| Configuration | Current source value |
| --- | --- |
| EAS environment selection | Development, preview and production profiles select their corresponding environment explicitly. |
| Store production profile | `EXPO_PUBLIC_APP_ENV=production`, `EXPO_PUBLIC_USE_MOCK_DATA=false`, store distribution and automatic version increment. |
| Play artifact | Production uses `android.buildType=app-bundle`. |
| Direct/internal Android artifact | `production-apk` extends production and selects APK/internal distribution; preview also selects APK. |
| iOS build image | Production selects `sdk-54`; verify the resolved EAS image/toolchain still meets Apple's requirements at build time. |
| Android API | Both compile and target SDK are 36 in `app.json`. |
| Build-time mock guard | `app.config.js` recognizes the production environment label or `production`/`production-apk` EAS profile; it throws unless the mock flag is exactly `false`. This is a config-evaluation guard, not a runtime/backend authorization rule. |
| Native Firebase files | `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST` can override the base Android/iOS paths through `app.config.js`. They must contain registrations matching the native identifiers and intended environment. |
| Read-only preflight | `npm run release:doctor -- --profile production` checks profile settings, API level, required supplied public values, native Firebase file registrations and development-like backend names. Production checks also require Android/iOS Firebase files to select the same project. It prints no credential values and performs no cloud actions. |

Inspect [eas.json](../../eas.json), base [app.json](../../app.json), [dynamic config](../../app.config.js), and the resolved configuration as part of each release. The [preflight implementation](../../scripts/releasePreflight.mjs) reads base configuration plus the named EAS profile and supplied environment; it does not query EAS secrets or prove the final binary. Supply the selected environment as described in the [release guide](./PRODUCTION_RELEASE_GUIDE.md), and run the doctor explicitly. It is not automatically invoked by `eas build` or CI merely because the npm script exists.

These changes address build selection and a specific mock-mode mistake. Production config can still fall back to the base Firebase files when file overrides are absent; the doctor must reject the current development-like project and the owner must verify the actual destination. The doctor compares the two native Firebase project IDs, but the source's Google Web OAuth client must still be checked against that project. Backend separation, account lifecycle, API restrictions, store forms and native tests remain separate work.

### Permission and data review

Location selection currently requests foreground location. Verify a clear manual-city/map alternative when permission is denied; do not request background location for a feature that does not use it. Review the final binary's camera, microphone, photo-library and storage permissions, including those added by dependencies, and remove unnecessary ones through the app configuration.

Identity verification involves sensitive documents. Keep access short-lived, owner/admin authorized, and separate from public demo videos. Migration [017](../../supabase/migrations/017_server_side_uploads.sql) removes the earlier anonymous verification/demo write policies; do not treat migration 016 as the final policy. Verify the deployed migrations and all remaining avatar/review bucket policies independently.

Decide the intended age audience and guardian/safeguarding behavior before launching a tutor marketplace. Account verification, tutoring credentials and background/safety screening are different claims; UI and support copy should describe exactly what was checked.

## Local verification commands

From the repository root, use the Node version in `.nvmrc` and the installed lockfile:

```bash
nvm use
npm ci
npm run typecheck
npm run lint
npm run test:derived
npm run test:lint-rules
npm run test:discovery
npm run test:tutor-feed
npm run test:motion
npm run test:release-config
```

The previous UI pass recorded 110 automated tests; the release configuration suite adds six checks of the production mock guard and Firebase file-path selection. Re-run them against the actual release revision and record the observed counts/results. These are helper, repository-behavior, lint-rule, motion-preference and configuration checks, not device journeys.

For local Firestore rules tests, use Java 21 and the explicit demo project:

```bash
npx firebase emulators:exec --only firestore --project demo-edumentx "node scripts/rulesEmulationTest.mjs && node scripts/batchesRulesTest.mjs && node scripts/acceptRequestRulesTest.mjs && node scripts/messagesRulesTest.mjs && node scripts/reviewsListRulesTest.mjs && node scripts/removeEnrollmentRulesTest.mjs && node scripts/tutorDetailsRulesTest.mjs && node scripts/userRulesTest.mjs"
```

Add regression cases for conversation membership and other security changes before considering those blockers closed. The [setup guide](../03-Implementation-Guides/PROJECT_SETUP.md#local-firestore-rules-tests) explains why `npm run test:rules` also includes a credentialed deployed-rules check.

Do not replace `demo-edumentx` with a production project for emulator testing. Live `smoke:*` commands seed and clean up real records; rules deployment, backfills, account deletion and cloud publication are separate operator actions described in the release guide.

## Beta device checklist

Use release-like signed builds from Play internal testing and TestFlight, plus an installable Android APK when needed. A Metro export or development client is useful but does not replace this check.

Record device model, OS, app version/build number, commit, data environment and result for each test:

- [ ] Cold launch, upgrade from the preceding beta, force close/reopen, expired auth session and logout/account switch.
- [ ] Email signup, inbox verification, returning email login, Google selection/cancellation, password recovery, and the chosen iOS equivalent sign-in.
- [ ] Student/tutor onboarding resumes correctly; incomplete/pending/rejected/suspended accounts reach the right screen.
- [ ] Location denied, approximate location, disabled location services, manual location, and an Android Maps key restricted to the release signature.
- [ ] Discover/search/filter/save tutors; no results, no tutors, slow fetch, denied fetch and retry are distinct.
- [ ] Two students request the last slot concurrently; tutor accepts/declines; roster, capacity and dates stay correct.
- [ ] Batch create/join/end and ended-batch history; Asia/Kathmandu date boundaries are correct.
- [ ] Chat send failure/retry, reconnect, read receipts, long history, block/report, and notifications across app states.
- [ ] Push permission denied, two devices, invalid token, account switch, tap after cold start and sign-in redirect.
- [ ] Avatar/document uploads with large input, cancellation, interrupted network, expired signed URL and unauthorized user.
- [ ] Account deletion and retry after partial cleanup; former tokens stop receiving notifications.
- [ ] Sandbox Pro is unreachable in a consumer release, including direct navigation and backend calls.
- [ ] VoiceOver/TalkBack, large system text, reduced motion, keyboard overlap, back gesture and interrupted presses.
- [ ] Small iPhone, supported iPad layouts, a lower-end Android and a larger phone; long names and Nepali text remain readable.
- [ ] Airplane mode, flaky/slow network, app backgrounding during writes and successful recovery after reconnecting.

Use synthetic test identities and non-sensitive verification fixtures. Store review accounts must work without personal developer access and must explain any seeded/demo content honestly.

## P2: premium experience after the foundations

Keep EdumentX's existing forest/amber palette, type scale, radius tokens, React Native primitives and NativeWind classes. Do not add a new UI framework or a paid service to obtain polish.

| Improvement | Practical acceptance |
| --- | --- |
| Consistent information hierarchy | Each important screen has one clear primary action. Rate, location, availability, verification and reviews use the same order and wording across list/detail/booking. |
| Complete state design | Every remote screen covers loading, empty, error/retry and success. Optimistic actions roll back visibly on failure and prevent duplicate submission. |
| Accessible controls | Check at least 44pt on iOS / 48dp on Android for important touch targets; normal text meets 4.5:1 contrast. Selection is communicated beyond color. Screen-reader focus follows sheets and confirmations. |
| Purposeful motion | Press feedback confirms input; transitions preserve context. Reduced motion removes decorative movement. Animations do not delay booking or hide loading state. |
| Responsive layouts | Large text and narrow screens preserve actions; supported iPad layouts use space deliberately. Keyboard avoidance and safe areas work on both platforms. |
| Clear language and trust | Use real prices, truthful verification labels, visible cancellation consequences and confirmed support details. Remove placeholder text and unsupported service promises. |
| Better discovery | Measure search-to-profile and profile-to-request completion before changing rankings. Respect hidden/no-availability tutors and avoid revealing precise private locations. |

### Measure performance and read cost

Choose targets for named devices and scenarios, then record measurements. These are proposed release targets, not claims that the app already achieves them:

| Measure | Initial target and method |
| --- | --- |
| Startup | Record cold-start time to usable login/home on a named lower-end Android and iPhone; set a device-specific budget after the first baseline. Track regressions per beta. |
| Scroll and motion | Profile signed release builds, not debug-mode timing. Use the device refresh interval as the frame budget; investigate repeated long frames and visible stalls. Do not promise a universal frame rate from unit tests. |
| Tutor directory | A first page should be bounded, for example 20 tutors. Read no global review history to paint those cards; account separately for approved aggregates and filters. |
| Chat | Start with a bounded recent page, for example 30 messages, and page older content on demand. Opening a 1,000-message thread must not fetch all 1,000. |
| Firestore quota | Estimate daily reads as `active users × sessions/user × measured reads/session`, then add listeners, admin use and trigger reads. With a 30% headroom policy, plan below 35,000 reads/day against the documented 50,000 free allowance. |
| Other quotas | Track writes/deletes, function invocations, storage, egress and Maps SKU usage. A budget alert is an alert, not a hard billing cap. Document each service's actual limit/control. |

For example, 100 demo users × 3 sessions × 80 measured reads = 24,000 reads/day before background listeners and operations. This fits that planning budget only if the uncounted work also fits. Reconnects and repeated subscriptions can change the result significantly.

Before adding a dependency or service, update [architecture §0](../01-Architecture/ARCHITECTURE.md) with quota math and spend controls as repository instructions require. Free-at-demo-scale is a measured operating constraint, not a guarantee at every traffic level.

## First-release roadmap

1. **Secure the existing product.** Fix conversation rules, token ownership and account deletion; implement reporting/blocking, privacy/support surfaces and the iOS login decision. Disable consumer sandbox Pro. Prove the changes with negative tests and development accounts.
2. **Create a reproducible beta.** Finalize identifiers and environments, validate native permissions/signing/providers, run local checks and deployed-state review, then distribute Android/iOS betas. Keep a release evidence record and resolve every P0/P1 failure.
3. **Improve the experience from beta evidence.** Complete state/keyboard/accessibility behavior, measure startup/scrolling/read usage, and address the highest-friction journey. Keep visual effects subordinate to legibility and task completion.
4. **Submit a narrow, truthful first release.** Use accurate screenshots and feature descriptions, working review credentials, privacy forms and public support URLs. Roll out gradually and monitor crashes, login failures, failed uploads and support reports.

## Deployed state still to verify

The source audit did not establish these facts:

- The published Firestore rules and indexes match local files, and custom admin claims are present only on intended accounts.
- Supabase migrations, bucket policies, upload/signing Edge Functions, rate limits and secrets match this source.
- Firebase providers, OAuth clients, signing fingerprints, Maps restrictions, APNs/FCM credentials and EAS credentials match the final identifiers.
- Production resources are separate/approved, data synchronization is correct, quotas/alerts are configured and backups have a tested restore path.
- Privacy/support/deletion URLs and support mailboxes work, store accounts/contracts are active, and payment/login decisions meet current policy.
- An actual signed Android release and iOS beta pass the device checklist.

Keep these as explicit open checks until an owner records evidence. Documentation and build-profile changes alone do not close them.

## Release evidence record

For each candidate, keep a short record with:

- Commit/revision, app version, Android version code and iOS build number.
- Resolved profile/environment and the intended Firebase/Supabase project identities, without secrets.
- Artifact/build links, signing ownership and the exact distribution track.
- Local test results/counts, rules version verification, and any intentionally skipped checks.
- Completed device/OS checklist, known defects and the decision for each remaining issue.
- Privacy/support URLs, review-account instructions, release owner and rollback/incident contact.

A failed security or account-lifecycle check blocks that candidate. Record a new candidate after a fix so evidence cannot be confused across binaries.
