# Fix Firestore collectionGroup `{prefix=**}` Semantics Bug

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the broken `prefix.size()` / `prefix[0]` / `prefix[1]` checks from all five Firestore collectionGroup rule blocks at `firebase/firestore.rules:423-453`, re-deploy, and confirm on-device that the two recurring `permission-denied` warnings disappear for a signed-in student with existing enrollment requests + roster rows.

**Architecture:** The current rules use a recursive wildcard `{prefix=**}` and treat it as a list of path segments (`prefix.size()`, `prefix[0]`, `prefix[1]`). Per the [official Firestore rules reference](https://firebase.google.com/docs/rules/rules-behavior), `{prefix=**}` binds to a **single string** containing the entire matched path — e.g. `"enrollmentRequests/abc123"` for a doc at `enrollmentRequests/{tutorUid}/requests/{requestId}`. Indexing and `.size()` operate on characters, not segments, so `prefix[0]` is `"e"`, not `"enrollments"`. The condition `prefix[0] == "enrollments"` therefore always evaluates to false and short-circuits the `&&` chain before `resource.data.studentUid == auth.uid` is ever evaluated.

**Fix:** Drop the path-prefix predicate from all five blocks. Rely on:
1. The literal collection name in the `match` declaration (e.g. `/roster/{enrollmentId}`) — still scopes the rule to that exact collection ID.
2. `resource.data.studentUid` / `resource.data.tutorUid` — every write path populates at least one of these (verified in Phase 1).
3. `isAdmin()` — preserved override path.

**Tech Stack:** Expo SDK 54, React Native, NativeWind, native Firebase (`@react-native-firebase/*`), Firestore Security Rules (rules_version 2), Firebase CLI for deploy, firebaserules Management API for live-rules verification.

## Global Constraints

- **Zero-budget only** (CLAUDE.md §6) — never suggest paid dependencies. This fix touches only `firebase/firestore.rules` (free) and uses `npm run deploy:rules` (free Firebase CLI command).
- **Native Firebase only** — no `firebase` JS SDK; no `process.env.FIREBASE_*` config (config comes from `google-services.json` at native build time).
- **NativeWind + RN primitives only** — no Tamagui, no inline `style={{}}`. Not relevant for this rules-only change.
- **No new hex colors** — not relevant for this rules-only change.
- **The on-device verification step is mandatory** — per the user's preamble: "every stage's Phase 'verify' requires an actual rebuild (`npx expo run:android`) and on-device confirmation, not just green terminal output." Static checks (tsc) are necessary but NOT sufficient.
- **Don't restart from zero** — earlier per-tutor fixes already resolved tutor-side `subscribeRequests`/`subscribeEnrollments`/`subscribeBatches` warnings. Don't touch the direct-path match blocks at lines 270-298 (enrollmentRequests) and 332-369 (enrollments) — they are working.
- **All five collectionGroup blocks** — user approved "fix all five" in brainstorming, not just the two currently failing. `members`, `classes`, `reviews` have the same latent bug; fix them now to avoid another round.

---

## File Structure

**Files modified:**
- `firebase/firestore.rules` — single block edit, lines 423-453. Replaces the path-prefix predicate in all five `match /{prefix=**}/...` blocks.

**Files NOT modified (explicit scope boundary):**
- `src/services/enrollments/FirebaseEnrollmentRepository.ts` — code is correct; the rules are wrong. No client-side change needed.
- `firebase/firestore.indexes.json` — composite indexes are already deployed.
- `src/app/_layout.tsx` — auth routing is unrelated.
- The direct-path nested match blocks at lines 270-298 (`/enrollmentRequests/{tutorUid}/requests/{requestId}`) and 332-369 (`/enrollments/{tutorUid}/roster/{enrollmentId}`) — these gate writes and are working.

**Files created:**
- `docs/superpowers/plans/2026-08-11-firestore-enrollment-rules.md` (this plan, already exists — being updated in place).
- `docs/superpowers/specs/2026-08-11-firestore-prefix-semantics-design.md` (spec, already exists).

**Verification artifacts:**
- Live ruleset pulled from firebaserules Management API — compared to local file via diff.
- Fresh `npx expo run:android` device log — must show zero matches for `subscribeRequestsByStudent` or `subscribeEnrollmentsByStudent` `[permission-denied]`.

---

## Task 1: Fix the five collectionGroup rule blocks

**Files:**
- Modify: `firebase/firestore.rules:423-453`

**Interfaces:**
- Consumes: current local rules at `firebase/firestore.rules:423-453` (already read in Phase 1).
- Produces: updated rules where the path-prefix predicate (`prefix.size() >= 2 && prefix[0] == "..."`) is removed from each of the five blocks. Resource-data identity + literal collection scoping + isAdmin() remain.

- [ ] **Step 1: Edit `firebase/firestore.rules` — replace lines 423-453 with the corrected rule blocks**

Replace the entire block from line 423 (`match /{prefix=**}/roster/{enrollmentId} {`) through line 453 (the closing `}` of the `reviews` block) with:

```firestore
    // ────────────────────────────────────────────────────────────────────
    // Collection-group query access (student dashboard + repo lookups)
    // ────────────────────────────────────────────────────────────────────
    //
    // Firestore security rules do NOT authorize a `collectionGroup()`
    // query via path-specific match blocks. A path-specific rule such
    // as `match /enrollments/{tutorUid}/roster/{enrollmentId}` only
    // guards DIRECT-path reads (collection(db, "enrollments", uid,
    // "roster")) — a `collectionGroup(db, "roster")` query over every
    // tutor's roster fails with permission-denied even when the
    // path-specific rule allows it (the Aug 11 log showed exactly
    // this for subscribeEnrollmentsByStudent / subscribeRequestsByStudent).
    //
    // A collectionGroup query requires a match with a RECURSIVE parent
    // wildcard: `match /{path=**}/roster/{doc}`. Each block below
    // binds that wildcard as `{prefix=**}` — the literal collection
    // name in the match declaration (e.g. `/roster/{enrollmentId}`)
    // scopes the rule to that exact collection ID wherever it appears
    // in the document tree.
    //
    // IMPORTANT: `{prefix=**}` captures the ENTIRE matched path as a
    // single string (per the rules-behavior docs:
    // https://firebase.google.com/docs/rules/rules-behavior), so
    // `prefix[0]` returns the first CHARACTER, not the first SEGMENT.
    // Earlier code used `prefix.size() >= 2 && prefix[0] == "enrollments"`
    // which always evaluated false (prefix[0] was `"e"`, not
    // `"enrollments"`), short-circuiting the `&&` chain before
    // `resource.data.studentUid == auth.uid` was ever checked. The
    // fix: rely on resource-data identity instead. Every write path
    // populates `studentUid` and/or `tutorUid` on each row (verified
    // in FirebaseEnrollmentRepository.ts:620 / :768), so checking
    // those fields is sufficient. Read-only — all writes stay on the
    // direct-path rules above.
    match /{prefix=**}/roster/{enrollmentId} {
      allow get, list: if isSignedIn()
        && (resource.data.studentUid == request.auth.uid
            || resource.data.tutorUid == request.auth.uid
            || isAdmin());
    }
    match /{prefix=**}/requests/{requestId} {
      allow get, list: if isSignedIn()
        && (resource.data.studentUid == request.auth.uid
            || resource.data.tutorUid == request.auth.uid
            || isAdmin());
    }
    match /{prefix=**}/members/{memberId} {
      allow get, list: if isSignedIn()
        && (resource.data.studentUid == request.auth.uid
            || resource.data.tutorUid == request.auth.uid
            || isAdmin());
    }
    match /{prefix=**}/classes/{batchId} {
      allow get, list: if isSignedIn()
        && (resource.data.tutorUid == request.auth.uid || isAdmin());
    }
    match /{prefix=**}/reviews/{reviewId} {
      allow get, list: if isSignedIn()
        && (resource.data.studentUid == request.auth.uid || isAdmin());
    }
```

(The classes block intentionally does NOT check studentUid — only the tutor owns classes. The reviews block intentionally checks ONLY studentUid + isAdmin — only the student who wrote the review reads it via the reviews collectionGroup. These match the original resource-data checks; only the path-prefix predicate is removed.)

- [ ] **Step 2: Re-read `firebase/firestore.rules:423-477` to confirm the edit**

Run: `sed -n '423,477p' /media/xlegion/Win/PROJECTS/EdumentX/firebase/firestore.rules`
Expected: the five `match /{prefix=**}/...` blocks appear as written above, with NO references to `prefix.size()`, `prefix[0]`, or `prefix[1]`.

- [ ] **Step 3: Confirm no other rules changed**

Run: `git diff --stat firebase/firestore.rules`
Expected: `firebase/firestore.rules | <some lines changed>` — only one file. No other paths touched.

- [ ] **Step 4: Stage the rules edit**

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
git add firebase/firestore.rules
git status
```
Expected: `firebase/firestore.rules` staged, nothing else changed.

- [ ] **Step 5: Commit the rules edit**

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
git commit -m "fix(firestore-rules): drop broken {prefix=**} list-semantics checks

The five collectionGroup rule blocks (roster, requests, members,
classes, reviews) used prefix.size(), prefix[0], and prefix[1] as if
{prefix=**} were a list of path segments. Per the official rules-
behavior docs, {prefix=**} captures the entire matched path as a
single string — prefix[0] returns the first CHARACTER, not the first
SEGMENT. The condition prefix[0] == 'enrollments' always evaluated
false (prefix[0] was 'e'), short-circuiting the && chain before
resource.data.studentUid == auth.uid was checked.

Effect: subscribeRequestsByStudent and subscribeEnrollmentsByStudent
both failed with permission-denied for any signed-in student.

Fix: drop the path-prefix predicate. Rely on the literal collection
name in the match declaration (e.g. /roster/{enrollmentId}) for
scoping, and resource.data.studentUid/tutorUid + isAdmin() for
identity. All five blocks updated (members/classes/reviews have the
same latent bug; fixing them now avoids another round)."
```
Expected: commit created, hash returned, no other files in the commit.

---

## Task 2: Re-deploy the rules to live Firestore

**Files:**
- Modify (live): Firestore rules for project `edumentx-dev` via `npm run deploy:rules`.
- Verify: live ruleset pulled via firebaserules Management API.

**Interfaces:**
- Consumes: the committed rules edit from Task 1.
- Produces: live Firestore project `edumentx-dev` running the corrected rules.

- [ ] **Step 1: Verify `firebase.json` points at `firebase/firestore.rules`**

Run: `cat /media/xlegion/Win/PROJECTS/EdumentX/firebase.json | head -20`
Expected: `"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }` (or similar — confirms the rules path). If absent or pointing elsewhere, STOP and surface that.

- [ ] **Step 2: Confirm active Firebase project is `edumentx-dev`**

Run: `cat /media/xlegion/Win/PROJECTS/EdumentX/.firebaserc`
Expected: `{ "projects": { "default": "edumentx-dev" } }`.

- [ ] **Step 3: Deploy the rules**

Run: `cd /media/xlegion/Win/PROJECTS/EdumentX && npm run deploy:rules`
Expected output (last few lines):
```
=== Deploying to 'edumentx-dev'...

i  firestore: uploading rules firestore.rules
✔  firestore: rules compiled successfully
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```
If it fails with `Failed to authenticate`, the user's local Firebase CLI session expired — surface that, do NOT re-login on the user's behalf without explicit consent.

- [ ] **Step 4: Pull the live ruleset and confirm the new blocks are present**

Run:
```bash
TOKEN=$(firebase login:ci 2>/dev/null && firebase projects:list 2>/dev/null | head -5) || \
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token 2>/dev/null)" \
  "https://firebaserules.googleapis.com/v1/projects/edumentx-dev/rulesets" | head -200
```

Then take the latest ruleset ID from the response and fetch its source:
```bash
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token 2>/dev/null)" \
  "https://firebaserules.googleapis.com/v1/projects/edumentx-dev/rulesets/<RULESET_ID>" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['source']['files'][0]['content'])" \
  > /tmp/live-rules.txt
```

Then diff:
```bash
diff -u /media/xlegion/Win/PROJECTS/EdumentX/firebase/firestore.rules /tmp/live-rules.txt
```
Expected: `diff` produces ONLY the changes from Task 1 (the five updated blocks). No unrelated drift. If diff is empty (rules haven't been re-deployed) or shows unrelated differences, STOP and surface that — do not proceed.

(If `firebase login:ci` or `gcloud auth` is unavailable in the harness, fall back to the MCP `firebase_get_security_rules` tool if configured, or ask the user to paste the live rules text.)

- [ ] **Step 5: Commit a deploy marker (optional but recommended)**

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
git commit --allow-empty -m "chore(firestore): deploy rules fix to edumentx-dev

Live ruleset for edumentx-dev now matches local firebase/firestore.rules
at HEAD. Verified via firebaserules.googleapis.com Management API diff."
```

---

## Task 3: Static checks (necessary but not sufficient)

**Files:**
- No modifications. Runs `npx tsc --noEmit` to confirm the branch compiles. The rules file is NOT TypeScript, so this is a sanity check that the rest of the project still compiles after any incidental changes (none expected).

- [ ] **Step 1: Run TypeScript compile**

Run: `cd /media/xlegion/Win/PROJECTS/EdumentX && npx tsc --noEmit 2>&1 | tail -20`
Expected: no errors. If errors appear, surface them — they are likely unrelated to this change but must be addressed before the on-device step.

- [ ] **Step 2: Run ESLint (if configured)**

Run: `cd /media/xlegion/Win/PROJECTS/EdumentX && npx eslint . --ext .ts,.tsx 2>&1 | tail -20 || echo "eslint not configured or errors found"`
Expected: 0 errors. (If eslint is not configured for this branch, note that and proceed.)

---

## Task 4: On-device rebuild + sign-in + log capture (mandatory verification)

**Files:**
- No code modifications. Operates entirely on the device + adb logcat.

**Interfaces:**
- Consumes: the deployed rules from Task 2 + static checks from Task 3.
- Produces: a fresh log showing zero matches for `subscribeRequestsByStudent [permission-denied]` and `subscribeEnrollmentsByStudent [permission-denied]` after a student signs in.

- [ ] **Step 1: Rebuild the native dev client**

Run: `cd /media/xlegion/Win/PROJECTS/EdumentX && npx expo run:android`
Expected: build completes, app launches on connected device or emulator.

- [ ] **Step 2: Sign in as a student with existing enrollment data**

The user/CI must provide a test student account that has at least one row in `enrollmentRequests/{anyTutorUid}/requests/{anyRequestId}` and one row in `enrollments/{anyTutorUid}/roster/{anyEnrollmentId}`. If no such account exists, this is the gating dependency — coordinate with the user to provision one or accept that the verification is limited to "no warnings in an empty data case" (acceptable per the brainstorming scope but weaker).

Sign in flow per CLAUDE.md: `src/screens/auth/EmailSignUp.tsx` (Email + Password / Google), routed by `src/app/_layout.tsx` once verified.

- [ ] **Step 3: Navigate to the Enrollment screen**

From the student dashboard, navigate to the Enrollment screen (`src/screens/student/Enrollment.tsx`), which mounts `subscribeRequestsByStudent` and `subscribeEnrollmentsByStudent` (lines 50-139 of that file). Wait for the subscription to fire (the onSnapshot error callback is invoked synchronously on permission-denied).

- [ ] **Step 4: Capture the fresh log**

Open a second terminal and tail device logs filtered to the two warning strings:
```bash
adb logcat | grep -E "subscribeRequestsByStudent|subscribeEnrollmentsByStudent"
```
Expected: NO output (or output for messages other than `[permission-denied]`). Specifically, the strings `FirebaseEnrollmentRepository.subscribeRequestsByStudent` and `FirebaseEnrollmentRepository.subscribeEnrollmentsByStudent` should NOT be followed by `[permission-denied]` in the fresh log.

If either warning IS present, the fix did not take effect — STOP, return to Task 1 and re-verify the rule shape and deployment.

- [ ] **Step 5: Capture positive signal — student-side data IS loading**

While still on the Enrollment screen, confirm the "Pending" and "Active" tabs actually render rows for the signed-in student. If the tabs render empty for a student that DOES have data, the rule is still too restrictive — surface that, do not declare success.

- [ ] **Step 6: Regression check — tutor-side flows still work**

Sign out, sign in as a tutor (with at least one existing request to their inbox). Navigate to their inbox. Confirm the tutor-side `subscribeRequests` and `subscribeEnrollments` (the direct-path variant) still render incoming rows. The direct-path nested match blocks at lines 270-298 and 332-369 were NOT modified, so this should be unchanged — but verifying it catches any unintended side-effect of the collectionGroup edit.

---

## Task 5: Code-review gate (superpowers:requesting-code-review)

**Files:**
- No modifications. Produces a structured review.

- [ ] **Step 1: Run `/code-review medium` against the changed commit**

The changed commit is the one from Task 1 Step 5 (`fix(firestore-rules): drop broken {prefix=**} list-semantics checks`). Run `/code-review medium` and confirm no blockers. Specifically check:

- All five collectionGroup blocks updated, no stray `prefix.size()` / `prefix[0]` / `prefix[1]` references remain.
- The `classes` block correctly retains `resource.data.tutorUid == auth.uid || isAdmin()` (no studentUid branch — only the tutor owns classes).
- The `reviews` block correctly retains `resource.data.studentUid == auth.uid || isAdmin()` (no tutorUid branch — only the student who wrote the review reads it).
- The rules-comment block above the five match declarations was updated to reflect the new design and link to the official docs.
- The catch-all deny at line 458-460 is unchanged (or removed if no longer needed — but per the original design it stays as defense in depth).

- [ ] **Step 2: Address any findings before proceeding**

If the review surfaces issues, fix them in a follow-up commit and re-deploy (Task 2). Do not move to Task 6 with unresolved findings.

---

## Task 6: Final verification + branch-finish gate

**Files:**
- No modifications. Runs `superpowers:verification-before-completion` + `/verify` to confirm the full chain (commit → deploy → device) holds.

- [ ] **Step 1: Run `/verify`**

`/verify` checks: commit landed, deployed ruleset matches local at HEAD, on-device log clean, static checks green.

- [ ] **Step 2: Run `superpowers:verification-before-completion`**

Confirm:
- Local rules file (HEAD) contains the fix.
- Live ruleset (latest) is byte-identical to local for the affected blocks.
- Device log shows zero matches for the two warning strings.
- Tutor-side regression check passes.

- [ ] **Step 3: Invoke `superpowers:finishing-a-development-branch`**

Per the user's preamble, the contract ends with this skill. It handles the merge to `main`, branch cleanup, and final commit history review.

---

## Self-Review (per writing-plans skill)

**1. Spec coverage:**
- ✅ Drop the buggy prefix checks → Task 1.
- ✅ Re-deploy → Task 2.
- ✅ Static checks → Task 3.
- ✅ On-device rebuild + sign-in + log capture → Task 4.
- ✅ Code-review gate → Task 5.
- ✅ Final verification + branch-finish → Task 6.

**2. Placeholder scan:** No "TBD", "TODO", "implement later", or vague descriptions. Every step has the exact command, expected output, or code to write. The one minor exception is Step 4 of Task 2 (alternate auth methods if `firebase login:ci` is unavailable in the harness) — this is a fallback, not a placeholder, and surfaces the need for user input if it triggers.

**3. Type/signature consistency:** Only the Firestore rules file is touched, no TS types involved. Resource-data field names (`studentUid`, `tutorUid`) match the verified write paths in `FirebaseEnrollmentRepository.ts:620` and `:768`. Match-block collection names (`roster`, `requests`, `members`, `classes`, `reviews`) match the collectionGroup names queried in the repository (verified at lines 530-531 for `requests`, 570-571 for `roster`, and inferred for `members`/`classes`/`reviews` from the prior Aug 9 fix comment).

**4. Scope check:** Single subsystem (Firestore rules), single file edit. No need to split into sub-plans per the writing-plans skill's scope-check rule.
