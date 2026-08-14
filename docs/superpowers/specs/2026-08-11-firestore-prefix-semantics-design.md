# Firestore collectionGroup `{prefix=**}` semantics — Design

**Date:** 2026-08-11
**Status:** Draft (root cause confirmed, awaiting approval)

## Context

The student-side Enrollment screen calls
`FirebaseEnrollmentRepository.subscribeRequestsByStudent` and
`subscribeEnrollmentsByStudent`, both of which run Firestore `collectionGroup`
queries filtered by `studentUid == auth.uid`. The fresh rebuild log shows BOTH
methods returning `[permission-denied]` from `onSnapshot`'s error callback
on every render.

Earlier in the pipeline, tutor-side queries (`subscribeRequests`,
`subscribeEnrollments`) and `subscribeBatches` were also failing. Those have
been resolved by prior fixes (per-session evidence + user report "those are
gone now, treat as evidence a prior fix partially worked"). Only the two
`*ByStudent` methods remain — they are collectionGroup queries where the
caller is the STUDENT (denormalized owner field on the doc), not the TUTOR
(the path-bound owner).

## Hypothesis under test (from brainstorming)

1. **Primary** — the student-is-participant case on the `*ByStudent`
   collectionGroup queries has no matching rule OR the rule shape doesn't
   cover the query.
2. **Secondary** — the prior `npm run deploy:rules` may not have actually
   run, so live rules are stale relative to local.

## Root cause (Phase 1 audit completed)

**Hypothesis #1 confirmed.** The repo HAS a matching collectionGroup rule
block (`firebase/firestore.rules:423-453`), and it IS live (live ruleset
byte-identical to local — pulled via firebaserules Management API, Aug 11
15:00 UTC). BUT the rule uses `prefix.size()`, `prefix[0]`, and `prefix[1]`
as if `prefix` were a list of path segments. It is not.

Per the authoritative
[`rules-behavior`](https://firebase.google.com/docs/rules/rules-behavior)
docs: *"the wildcard variable will contain the entire matching path segment"*.
So `{prefix=**}` binds to a single string like `"enrollmentRequests/{tutorUid}"`.
Indexing and `.size()` operate on characters:

- `prefix.size()` → string length (~30+), not segment count (`2`)
- `prefix[0]` → first character (`"e"`), not first segment
- `prefix[1]` → second character (`"n"`), not tutorUid

The condition `prefix[0] == "enrollments"` therefore evaluates to
`"e" == "enrollments"` → **always false** → `&&` chain short-circuits →
`resource.data.studentUid == request.auth.uid` never evaluated → deny.

The rule would have allowed the student if the chain reached the
`resource.data` check, because every enrollment request/roster row carries
`studentUid: <auth.uid>` (verified at `FirebaseEnrollmentRepository.ts:620`
for requests and `:768` for roster). The bug is purely the path-prefix
check; the resource-data check is unreachable.

**Hypothesis #2 ELIMINATED.** Live rules match local rules byte-for-byte.
Not a deploy gap.

## All five collectionGroup blocks affected

`firebase/firestore.rules:423-453` has FIVE rule blocks sharing the same
buggy shape: `roster`, `requests`, `members`, `classes`, `reviews`. Only
`roster` and `requests` show in the current log because the student test
path only queries those two. `members` / `classes` / `reviews` are latent
failures — they will surface the same `permission-denied` the moment a
user actually has data in those collections and runs the corresponding
query. The user approved "fix all five" in the brainstorming gate, to
prevent another round of bug-hunting on the same root cause.

## Design — fix shape

Drop the `prefix.size()` / `prefix[0]` / `prefix[1]` checks. Rely on:

1. **The literal collection name in the `match` declaration** (e.g.,
   `/roster/{enrollmentId}`) — this still scopes the rule to that exact
   collection ID wherever it appears in the document tree.
2. **`resource.data.studentUid` / `resource.data.tutorUid`** — every
   write path populates at least one of these (verified Phase 1).
3. **`isAdmin()`** for the override path.

The rules-comment at firebase/firestore.rules:419-422 already prescribes
this approach — "Ownership is then checked via the denormalized uid fields
on the doc itself" — but the implementation got the path-prefix half
wrong. The fix aligns the implementation with the documented intent.

### Concrete edit

For each of the five blocks, drop the path-prefix predicate. Sketch for
`roster`:

```firestore
match /{prefix=**}/roster/{enrollmentId} {
  allow get, list: if isSignedIn()
    && (resource.data.studentUid == request.auth.uid
        || resource.data.tutorUid == request.auth.uid
        || isAdmin());
}
```

Same pattern for `requests`, `members`, `classes`, `reviews`.

### Why this is safe (not a privilege escalation)

- **Collection name is still scoped** by the literal segment in the match
  declaration. A `batches/{x}/roster/{y}` doc would still only be hit if
  `resource.data.studentUid == auth.uid || resource.data.tutorUid == auth.uid || isAdmin()`.
- **No global read escalation.** Even if a future bug introduces a
  `batches/{x}/roster/{y}` collection (none exists today), the rule only
  grants reads for documents whose owner field matches the caller. It does
  not grant reads to all docs in that collection.
- **All write rules unchanged.** Direct-path nested match blocks (e.g.,
  `match /enrollments/{tutorUid}/roster/{enrollmentId}` at lines 338-369)
  still gate writes. The collectionGroup rules are read-only by design
  (comment at line 422).

### Alternatives considered and rejected

- **Option A** — `prefix.matches('enrollments/.*')` (RE2 regex on prefix).
  Defends the same threat model (a hypothetical `batches/{x}/roster`) but
  at the cost of an unbounded regex match on every collectionGroup read.
  Firestore rules use RE2 which has performance-sensitive paths; avoid
  regex when the same scoping is already achieved by the literal
  collection name in the match declaration.
- **Option B (chosen)** — drop the prefix checks entirely; rely on
  resource.data identity. Matches the documented intent (line 419-422).

## Files touched
- `firebase/firestore.rules` (one block edit, lines 423-453).

## Verification gate (superpowers:verification-before-completion)

1. Local file re-read — five blocks no longer reference `prefix.size()` /
   `prefix[0]` / `prefix[1]`.
2. Live rules re-deployed via `npm run deploy:rules`. Pulled via
   firebaserules Management API; new ruleset contains updated blocks.
3. `npx tsc --noEmit` — 0 errors.
4. **On-device rebuild + sign-in** — `npx expo run:android`, sign in as a
   student WITH existing enrollment requests + roster rows. Fresh log
   must be free of both warnings. Coordinate with user/CI for the device
   step (preamble requires this, not just green terminal output).
5. **Regression check** — sign in as a tutor, confirm
   `subscribeRequests(tutorUid, ...)` and
   `subscribeEnrollments(tutorUid, ...)` still resolve data (direct-path
   nested match blocks at 270-298 and 332-369 are unchanged, but worth
   re-confirming).
