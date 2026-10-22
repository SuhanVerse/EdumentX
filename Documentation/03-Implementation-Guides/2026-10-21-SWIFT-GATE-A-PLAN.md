# Swift iOS Gate A Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement the tasks. Track checks below and record actual verification separately from unavailable iOS/device checks.

**Goal:** Create the approved independent Swift repository, a tested Linux-compatible domain/session core and a SwiftUI toolchain trial without retiring the existing iOS client prematurely.

**Architecture:** The Swift app is a SwiftPM library product bundled by xtool. A nested Foundation-only core has independent Linux tests. Live provider adapters remain gated on Apple SDK/dependency/device evidence; no REST replacement or backend schema migration is selected implicitly.

**Tech Stack:** Swift 6.4.1, xtool 1.22.2, SwiftUI, Foundation, MapKit, Security/Keychain; Python 3 and Bash for local read-only checks. No external runtime packages in this initial milestone.

**Spec:** [Approved Android/Swift split](../01-Architecture/2026-10-21-ANDROID-SWIFT-SPLIT-DESIGN.md), approved by the user on 21 October 2026.

## Global constraints

- New repository: `/home/xlegion/Projects/EdumentX-iOS`; independent local Git history, no remote push/publication.
- Preserve current Android and legacy iOS source/configuration until Gates A/B pass.
- Swift domain behavior follows the existing EdumentX enrollment, message identity and session-routing contracts.
- Core tests must run independently of SwiftUI or any Apple SDK.
- No live backend requests, account creation, Apple authentication, certificate creation, paid jobs or store submission in this milestone.
- No copied `.env`, Firebase service account, refresh token, signing key or private user data.
- Every sample is labelled; no fabricated authentication, enrollment success, push delivery or completed native validation.
- Native Apple SDK/device and distribution checks remain explicitly pending; Linux syntax/core checks cannot satisfy them.

## Review focus

1. Kathmandu midnight/date boundaries and invalid legacy slot keys must not create incorrect sessions.
2. Unicode UID sorting must match JavaScript UTF-16 order rather than Swift's default string comparison.
3. Concurrent token refresh and logout must not reintroduce a previous user's session.
4. Missing SDK/configuration must stop a build with an actionable result; release checks must fail closed.
5. Sample data and source-only SwiftUI must never be reported as a live or device-verified app.

## Task 1: independent scaffold and traceable contracts

**Files:** New repository `AGENTS.md`, `.gitignore`, `Package.swift`, `xtool.yml`, `Info.plist`, `LICENSE`, `Documentation/PROGRESS.md`; current design/index status only.

**Interfaces:** App target `EdumentXApp`, nested local package/product `EdumentXCore`, no third-party package downloads. `xtool.yml` uses released documented keys only. Initial development bundle ID `com.example.EdumentXiOS` is a clearly labelled placeholder.

- [x] Verify target directory does not exist; initialize a separate feature branch in the new repository.
- [x] Record original worktree snapshot without staging/resetting it; mark design approval and current SDK absence.
- [x] Use the installed xtool template as a reference and the released control-file documentation for resources/configuration.
- [x] Create root app manifest pointing at the local core package, minimal plist and ignored secret/build paths. Preserve the existing project's license for derived work.
- [x] Check manifest parsing and control-file/plist structure without dependency downloads or Apple authentication.

## Task 2: domain core with meaningful Linux tests

**Files:** `Packages/EdumentXCore/Package.swift`, `Sources/EdumentXCore/{Schedule,ConversationIdentity,Discovery}.swift`, corresponding test files and synthetic behavior fixtures.

**Interfaces:** Public Sendable/Codable domain values. Exact symbols consumed by the app are documented by the implementer before app integration. Core does not import SwiftUI, Firebase or Security.

- [x] Write failing tests for seven weekdays/six canonical slots, colon parsing, malformed values, UTF-16 conversation ordering and round-trip serialization.
- [x] Write failing tests for Kathmandu date/weekday boundaries, inclusive enrollment windows and chronological session derivation; exclude invalid/inactive rows and preserve authoritative roster behavior.
- [x] Write failing tests for discovery availability/verification gating, search/subject filtering and deterministic sorting without mutating input.
- [x] Run the tests and observe failure before adding each implementation unit.
- [x] Port only the pure required behavior from the current TypeScript source and run `swift test --package-path Packages/EdumentXCore`.
- [x] Report the actual assertions/counts and semantic differences, including stricter malformed-input handling. No backend parity claim.

## Task 3: session-routing and token lifecycle contracts

**Files:** `Sources/EdumentXCore/{SessionRouting,SessionTokenCoordinator}.swift`, matching tests in the nested core package.

**Interfaces:** Pure routing inputs distinguish loading/signed-out/password-unverified/profile-incomplete/student/tutor/admin states. Token coordinator accepts an injected async refresh provider and store; no live REST auth client is selected. Refresh credentials never appear in descriptions/logs.

- [x] Test loading before role resolution, verified Google vs unverified password routing, complete profiles and admin-claim authority.
- [x] Test fresh-token reuse, concurrent refresh coalescing, refresh failure, logout during an in-flight refresh and new-session replacement.
- [x] Implement Swift concurrency coordination with generation checks and cancellation so late work cannot overwrite or return stale credentials after logout.
- [x] Run tests under Swift 6 concurrency checks with deterministic test synchronization rather than timing-only sleeps.

## Task 4: configuration doctor and guarded build commands

**Files:** `scripts/{doctor.py,test-doctor.py,check.sh,build-ios.sh}`, `Configuration/README.md`, `Documentation/FEASIBILITY.md`.

**Interfaces:** `python3 scripts/doctor.py --source-only` validates repository structure without requiring an SDK. Default doctor checks installed toolchain and Apple SDK. `--release` fails until required live/backend/native/distribution evidence exists; it cannot certify a scaffold through user-supplied PASS strings.

- [x] Write isolated temporary-fixture tests for malformed/missing plist/config, missing tools/SDK, placeholder bundle ID, source-only success and blocked release state.
- [x] Implement secret-safe output and actionable exit codes. Do not scan/print the user's `.env` or credential stores.
- [x] Implement `check.sh` for core tests, manifest parsing, Swift source syntax, doctor regression tests and source-only doctor.
- [x] Implement `build-ios.sh` using the released unsigned `xtool dev build --configuration debug` command after doctor success. No auth/install/upload or distribution-signing flags.
- [x] Run the scripts. Record native build as blocked if the Apple SDK is absent; do not weaken the guard.

## Task 5: SwiftUI trial and platform integration source

**Files:** `Sources/EdumentXApp/{App,DesignSystem,Features,Platform}`, original project icon as a reviewed resource.

**Interfaces:** App consumes the core schedule/discovery values. Fixture content is visibly labelled. Native frameworks are imported only by the app target. Keychain adapter implements the core token-store contract if that contract is established; no password/token is entered by a user in this trial.

- [x] Create a native discovery/details preview with EdumentX tokens, Dynamic Type, accessible controls, deterministic sample tutors and schedule display.
- [x] Add a MapKit trial with synthetic Kathmandu coordinates and an explicit location-permission action; no background location request.
- [x] Add build/integration status explaining what the trial can demonstrate and which auth/Firestore/push/distribution checks remain pending. Do not display unverified items as passed.
- [x] Add an isolated Keychain adapter/source trial without embedding credentials or connecting it to fabricated login.
- [x] Parse Swift source on Linux. Record clearly that parsing does not typecheck SwiftUI or prove iPhone operation.

## Task 6: guides, independent review and handoff

**Files:** New README and `Documentation/{SETUP,LEARNING_GUIDE,FEATURE_PARITY,FEASIBILITY,PROGRESS}.md`, new CI for Linux core/source checks; current architecture/build indexes get links/status only.

- [x] Write a concise README with an architecture diagram and exact first-result commands.
- [x] Explain source roles, core exercises, SDK extraction, local tool verification and native trial/build commands in the learning/setup guides.
- [x] Mark each full-app feature as core-only, trial source, not implemented, or blocked; preserve source references and shared-backend ownership.
- [x] Obtain an independent code/spec review; fix material findings and rerun affected checks.
- [x] Confirm original app runtime/config files are unchanged by this approved milestone; validate local links and secret exclusions.
- [x] Initialize meaningful local history for the new repository only. Record no remote publication and no native build/install evidence.

## Pending external evidence

Apple SDK extraction, physical iPhone checks, native Firebase/Google dependency selection, signing, APNs transport migration and xtool-only App Store distribution remain pending. Their absence prevents completing Gate A and proceeding with legacy iOS retirement; it does not prevent completing the source/core/tooling work above.

## Continuation — 22 October 2026

The owner asked to continue until the full work is done and confirmed that the SDK archive is not downloaded. Finish local history and extend the Foundation core with the existing enrollment/batch and messaging/review contracts. These are transport-independent source preparations; they do not select a REST fallback, add Firebase packages, perform live writes or advance the unproven native gates.

### Task 7: complete the shared domain contracts

- [x] Add Codable/Sendable enrollment request, roster, batch/member and availability contracts from the existing TypeScript types, preserving field names, optional legacy fields, status values, NPR values and epoch-millisecond units.
- [x] Add Codable/Sendable conversation/message and review contracts from the existing source. Preserve participant scalars, per-user maps, optional rating fields and private/public URL distinctions; no token/provider credentials in fixtures.
- [x] Write meaningful decode/encode fixtures and boundary/error tests before implementation. Unknown statuses must not silently become approved/active; projection serialization must not be represented as safe full-document replacement.
- [x] Add a reproducible cross-language fixture exporter using the original checkout's existing Node/TypeScript tools and copied pure helper files in temporary scratch space. Do not install anything or modify the backend checkout.
- [x] Test Swift behavior against exported canonical slots, limits, Kathmandu dates, valid roster derivations and UTF-16 conversation identities; explicitly record deliberate stricter Swift parsing differences.
- [x] Review, run affected/full local checks, update the learning/parity/evidence guides and create a separate local source commit.

No native or public-release milestone can be marked complete while its prerequisite remains unavailable. SDK extraction still requires the owner's licensed Apple download; legacy iOS removal remains gated as approved.
