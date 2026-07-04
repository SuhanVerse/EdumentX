# Admin Setup & Onboarding Guide

> **Audience**: a teammate joining the project who needs to test the
> admin surface (verification queue, user management, platform
> statistics, admin profile).
> **Goal**: take a Google or email+password account and grant it
> admin access on a working EdumentX dev build, end-to-end.
> **Time**: ~15 minutes if you already have the app building on
> your machine. ~45 minutes from a clean clone.

This guide walks through the full workflow: generating a Firebase
service-account key, setting `GOOGLE_APPLICATION_CREDENTIALS`,
running the seed script, and signing in as the new admin on the
device. It also covers the one-time rules deploy and the
first-time-profile setup the admin lands on after sign-in.

---

## 1. What "admin" means in EdumentX

Admins are **not** a role users can pick during onboarding. The
onboarding flow only offers Student or Tutor. Admin status is
granted out-of-band by writing a document at `admins/{uid}` in
Firestore. The auth guard in `app/_layout.tsx` reads that doc on
every sign-in and sets `role = "admin"` for the session.

Two things are true after `admins/{uid}` exists:

- The user is **always** treated as an admin on sign-in, even if
  their `users/{uid}.role` field is stale (e.g. still says
  `"student"` from a previous student sign-in). The
  `admins/{uid}` doc is the source of truth, not the user doc.
  The auth guard heals the user doc to match on the next sign-in
  so any future query that reads the user doc agrees.
- The user is sent to `/admin-profile` for first-time setup
  (display name, role title, phone) before they reach the
  dashboard. The setup screen saves
  `users/{uid}/adminProfile/default` and flips a
  `hasAdminProfile` flag in the auth store, so on every
  subsequent sign-in they land directly on `/admin-home`.

---

## 2. Prerequisites

Before you can grant admin access, make sure these are true:

| # | What | Where to get it |
|---|------|-----------------|
| 1 | The project is cloned and `npm install` has run | `git clone … && cd EdumentX && npm install` |
| 2 | You can build the app to your phone or emulator | `npx expo run:android` or `npx expo run:ios` (the first build is long — go make coffee) |
| 3 | You have access to the Firebase project `edumentx-dev` | Ask Asim to add your Google account under **Firebase Console → Project Settings → Users and permissions** |
| 4 | The Firestore rules are deployed | See step 3 below. Without this, the admin doc read will be denied |
| 5 | Node.js ≥ 20.19.4 installed locally | `node --version` — the project pins this in `package.json#engines` |
| 6 | Firebase CLI installed and logged in | `npm i -g firebase-tools && firebase login` |

---

## 3. One-time: deploy the Firestore rules

The `admins` collection is locked to Admin-SDK writes only
(`allow write: if false` in `firebase/firestore.rules`). The
`users/{uid}/adminProfile/default` subcollection reads + writes
under the existing `users/{userId}/{subcollection}/{document=**}`
rule, so no per-collection rule is needed for it. But you still
need to make sure the rules file on the live project matches the
one in this repo:

```bash
# From the project root
firebase deploy --only firestore:rules
```

You should see `✔ firestore: rules released`. If you get a
permission error, you need to be added to the Firebase project
(see prerequisite #3). If the deploy is a no-op, your local rules
already match the deployed rules — that's fine, just continue.

---

## 4. Generate a Firebase service-account key

The seed script needs Admin-SDK credentials to write to
`admins/{uid}`. We use a JSON key file, not user login, because
the script runs locally on a laptop and has no interactive auth
flow.

### 4.1. Generate the key

1. Open the Firebase Console: <https://console.firebase.google.com/>
2. Select the **edumentx-dev** project.
3. Click the ⚙️ gear icon next to "Project Overview" in the
   top-left → **Project settings**.
4. Open the **Service accounts** tab.
5. Make sure **Firebase Admin SDK** is selected (it's the default).
6. Click **Generate new private key**.
7. A modal warns you that the key grants admin access to your
   Firebase services — read it, then click **Generate key**.
8. Your browser downloads a JSON file. It will be named something
   like `edumentx-dev-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`.
   Save it somewhere outside the project — a folder like
   `~/.config/firebase/` or `~/keys/` is conventional. **Do not
   commit it to git.**

### 4.2. Confirm the key is not tracked

The downloaded JSON file should not be in your project. Verify:

```bash
cd path/to/EdumentX
git status --ignored
```

If you see the JSON key listed as an untracked file inside the
project, **move it outside the project tree**. If
`scripts/seedAdmin.ts` finds a `service-account-*.json` file in
the project root, it's a leak — add it to `.gitignore` (the
project does not yet have an entry for this; add the line below
if you have permission, otherwise ask Asim to do it):

```gitignore
# Firebase Admin SDK service-account key (never commit)
service-account-*.json
*-firebase-adminsdk-*.json
```

### 4.3. Point the seed script at the key

The `firebase-admin` SDK reads the key path from the
`GOOGLE_APPLICATION_CREDENTIALS` environment variable. Set it
before running the seed script.

**macOS / Linux (bash, zsh):**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/edumentx-dev-firebase-adminsdk-xxxxx.json"
```

To make it permanent, add the same line to your `~/.zshrc` or
`~/.bashrc` so you don't have to re-export it in every new
shell.

**Windows (PowerShell):**

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\.config\firebase\edumentx-dev-firebase-adminsdk-xxxxx.json"
```

To make it permanent, use **System Properties → Environment
Variables** and add a `GOOGLE_APPLICATION_CREDENTIALS` user
variable pointing at the JSON file. The PowerShell form above
only lasts for the current shell.

**Verify the env var is set:**

```bash
# macOS / Linux
echo "$GOOGLE_APPLICATION_CREDENTIALS"
# Windows PowerShell
echo $env:GOOGLE_APPLICATION_CREDENTIALS
```

The path should print. If it's empty, the `export` (or
`$env:... =`) didn't run — re-run it in the shell you're about
to use for the seed.

---

## 5. Add the new admin's email to the seed list

Open `scripts/seedAdmin.ts` and find the `ADMIN_EMAILS` array
near the top of the file:

```ts
const ADMIN_EMAILS = ["asimdkt63@gmail.com"];
```

Append the new admin's email:

```ts
const ADMIN_EMAILS = [
  "asimdkt63@gmail.com",
  "new.admin@example.com",
];
```

The script loops over the array, so adding more entries is
purely additive — re-running the script is idempotent and won't
touch existing `admins/{uid}` docs.

---

## 6. Have the new admin sign in once on the device

The seed script looks up the Firebase Auth `uid` by querying
`users` for a doc with that email. For that doc to exist, the
user must have signed in on the app at least once — that's what
materializes the `users/{uid}` row.

The new admin should:

1. Install the dev build on their device (ask Asim for the
   `.apk` / `.ipa`, or build it themselves with
   `npx expo run:android` / `npx expo run:ios`).
2. Open the app, tap **Sign up**, and create an account with the
   new email. Email + password or Google Sign-In both work —
   Google is fastest because there's no email-verification step.
3. Complete the student/tutor onboarding flow (it doesn't
   matter which they pick — the seed script overrides the role
   to admin on the next sign-in).
4. Confirm they can see the student or tutor dashboard. The role
   change won't take effect until the *next* sign-in.

If they get a "Permission denied" error during onboarding, the
Firestore rules haven't been deployed yet — go back to step 3.

---

## 7. Run the seed script

From the project root, with `GOOGLE_APPLICATION_CREDENTIALS`
set:

```bash
npm run seed:admin
```

This:

1. Compiles `scripts/seedAdmin.ts` to JavaScript via `tsc`
   (the `:build` half of the script) into `dist/scripts/`.
2. Runs the compiled script with `node`.
3. For each email in `ADMIN_EMAILS`, looks up the uid on the
   `users` collection, then upserts `admins/{uid}` with
   `{ email, grantedAt: serverTimestamp(), grantedBy: "seed-script" }`.

You should see output like:

```
Seeding admin users...

✓ asimdkt63@gmail.com  →  admins/abc123def456
✓ new.admin@example.com  →  admins/789ghi012jkl

Done. The next time the user signs in on the device, the
auth guard will see admins/{uid} and route them to /admin-home.
```

If you see `✗ new.admin@example.com  no users/{uid} doc found` —
the user hasn't signed in on the device yet. Have them complete
step 6 and re-run.

### Useful variants

```bash
# See who is already an admin without writing anything
npm run seed:admin -- --list

# Print the script's help text
npm run seed:admin -- --help
```

The `--list` output looks like:

```
  ✓ asimdkt63@gmail.com  admins/abc123def456  (grantedAt=2026-07-04T...)
  – new.admin@example.com  admins/789ghi012jkl  (not yet an admin)
  ✗ third.admin@example.com  (no users/{uid} doc — sign in on the device first)
```

`✓` = already an admin, `–` = uid found but no admin doc yet (run
without `--list` to grant), `✗` = no uid at all (have them sign
in first).

---

## 8. Sign in as the new admin

The new admin should:

1. **Sign out** of the app (the bottom of their dashboard has a
   Sign out / Log out button).
2. **Sign back in** with the same account.

On the next sign-in, the auth guard in `app/_layout.tsx`:

1. Reads `users/{uid}` — the role field is still `"student"` or
   `"tutor"`, doesn't matter.
2. Reads `admins/{uid}` — finds the doc you just seeded.
3. Overrides the role to `"admin"`.
4. Reads `users/{uid}/adminProfile/default` — finds no doc
   (or finds one if this admin was set up previously).
5. Routes to `/admin-profile` if the profile doc is missing
   (first-time setup), or `/admin-home` if it exists.

### First-time setup

The new admin lands on a setup screen with three fields:

- **Full name** — required, 2–80 letters/spaces/punctuation.
- **Role title** — required, e.g. "Lead Moderator" or
  "Head of Trust & Safety". ≤ 60 chars.
- **Phone** — optional, 7–15 digits.
- **Email** — read-only, locked to their Firebase Auth email.

The hero also has a **Sign out** pill in the top-right and a
**Sign out instead** link below the form. Both open a native
confirmation alert before signing out — this is intentional,
don't worry if it looks like a second tap is needed.

On save, the screen writes `users/{uid}/adminProfile/default`
and `router.replace("/admin-home")`. The next sign-in will skip
the setup screen and land on `/admin-home` directly.

### What the admin sees

The bottom nav has five tabs, in this order:

```
Home · Statistics · Verification · Users · Profile
```

- **Home** — three large cards (Statistics, Verification, Users)
  with count badges.
- **Statistics** — KPI grid + weekly enrollment + subject demand
  bar lists (all currently backed by mock data — Phase 5 will
  swap in real Firestore aggregations).
- **Verification** — four sections: New Tutor Verifications,
  Pending Edits, Under Review (Info Requested), Decided.
- **Users** — searchable, filterable list of all users; can
  suspend/reinstate and soft-delete with confirmation.
- **Profile** — the same screen as first-time setup, but pre-
  filled with the saved values for editing.

The admin's display name (the value they entered on setup)
appears in the hero on Home, Statistics, and Profile, so other
admins see the right name throughout the app.

---

## 9. Removing admin access

There is no automated revoke flow. To remove admin access:

1. Open Firebase Console → Firestore → `admins` collection.
2. Find the doc with the admin's `uid` (you can list docs in
   the `admins` collection and inspect the `email` field on
   each).
3. Delete the doc.

On the admin's next sign-in, the auth guard won't find
`admins/{uid}` and will fall back to whatever their
`users/{uid}.role` field says (usually `"student"` from their
first onboarding). They will be routed to the student dashboard
and the admin nav will disappear.

If you want to fully revoke (e.g. the admin is leaving the
team and you want to wipe their data), also delete
`users/{uid}` and `users/{uid}/adminProfile/default` from
Firestore, and disable the account in Firebase Auth (Console →
Authentication → Users → ⋮ → Disable). Soft-delete in
`/user-management` does not do any of this — it just hides the
user from the active list.

---

## 10. Troubleshooting

### `GOOGLE_APPLICATION_CREDENTIALS is not set.`

You forgot to export the env var in the current shell. Re-run
the `export` (bash) or `$env:… = …` (PowerShell) from step 4.3.
The error message prints the exact command you need to run.

### `Seed script failed: Error: 7 PERMISSION_DENIED`

The service account in the JSON key doesn't have Firestore
write access. Either:

- You're using a key from the wrong project, or
- The service account's IAM role doesn't include "Cloud Datastore
  User" / "Firebase Admin". Re-generate the key from the
  Firebase Console — that path automatically grants the right
  roles.

### `✗ new.admin@example.com  no users/{uid} doc found.`

The new admin hasn't signed in on the device yet. Have them
complete step 6 and re-run. If they *have* signed in but you
still see this error, check:

- The email they signed in with matches the email in
  `ADMIN_EMAILS` exactly (case-insensitive on the auth side,
  but the `users` collection query is case-sensitive).
- They're using the same Firebase project (the email would have
  gone to a different project's `users` collection if they
  signed in on a different build).

### Admin is routed to /student-home instead of /admin-home

Almost always: the `admins/{uid}` doc was never written. Verify
with:

```bash
npm run seed:admin -- --list
```

If the email shows `–` (uid found, no admin doc), re-run
without `--list`. If it shows `✗` (no uid at all), the user
hasn't signed in on the device.

If `✓` and you're still being routed to /student-home, sign out
and sign back in — the auth guard only reads `admins/{uid}` on
auth-state change, not on every render.

### Admin is routed to /admin-profile after every sign-in

`users/{uid}/adminProfile/default` is missing or has an empty
`fullName`. On the profile setup screen, fill in the name and
role title and save. The setup screen also sets the
`hasAdminProfile` flag in the auth store, so the next sign-in
skips the setup screen.

### "Permission denied" when reading `admins/{uid}` in the Metro console

This is the auth guard failing to read the admin doc, which is
exactly what the rule change in step 3 fixes. If you still see
this after deploying the rules, double-check that
`firebase/firestore.rules` is committed and your local copy
matches what's deployed:

```bash
firebase deploy --only firestore:rules
```

The relevant block is:

```
match /admins/{adminId} {
  allow read: if isOwner(adminId);
  allow write: if false;
}
```

### TypeScript errors in the admin screens

Run `npx tsc --noEmit` to see the errors. Pre-existing known
issues (out of scope, can be ignored):

- `screens/admin/VerificationQueue.tsx:737` — `Ionicons` name
  typing on a dynamic icon name.
- `screens/admin/AdminHome.tsx:111` — `person-circle-outline`
  cast (was on the deleted "My profile" pill; harmless).

Any error you see that isn't on those lines is a real bug —
ask Asim or file an issue.

---

## 11. Quick reference

```bash
# 1. Deploy the rules (one time per clone)
firebase deploy --only firestore:rules

# 2. Set the service-account key (every new shell, or persist in rc file)
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/edumentx-dev-firebase-adminsdk-xxxxx.json"

# 3. Have the new admin sign in on the device FIRST (so users/{uid} exists)

# 4. Add their email to scripts/seedAdmin.ts → ADMIN_EMAILS, then:
npm run seed:admin              # grant admin
npm run seed:admin -- --list    # check status (no writes)

# 5. Have them sign out and sign back in to pick up the admin role
```

That's the full loop. The first admin you set up takes ~15
minutes (mostly the rules deploy + the service-account key
generation). Adding the second, third, etc. is ~2 minutes each.
