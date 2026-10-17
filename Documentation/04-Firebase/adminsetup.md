# Admin access

Repository contract checked 2026-10-17. This is an owner-operated runbook for an approved admin grant; it is not part of ordinary developer setup.

Start with [project setup](../03-Implementation-Guides/PROJECT_SETUP.md) and the [codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md). The implementation is [seedAdmin.ts](../../scripts/seedAdmin.ts).

## Authority and app routing

| State | Purpose |
|---|---|
| Firebase Auth custom claim `admin: true` | Authorizes admin requests in `firebase/firestore.rules` |
| `admins/{uid}` | Audit ledger; `_layout.tsx` reads it to choose the admin UI |
| `users/{uid}.role` | App routing metadata; does not grant rule permissions |
| `users/{uid}/adminProfile/default` | Admin display profile; first-time setup requires a nonempty `fullName` |

A ledger document alone can send someone to admin screens while their privileged reads fail. A claim without matching routing metadata can leave an authorized account on a student/tutor screen. Keep both aligned. Never grant access by editing a role field in the client.

## Inspect before granting

1. Have the intended account sign in using email/password or Google. Email/password accounts must verify their email.
2. Ensure it has a `users/{uid}` document with the intended email; the script finds users through that collection, not by looking up Firebase Auth directly. Role selection creates auth metadata; completing a profile is not required just to create this document.
3. Review `ADMIN_EMAILS` in `scripts/seedAdmin.ts`. The script processes **every address in that hardcoded list**, not a command-line email.
4. Use an owner-provided service-account JSON with the needed Auth and Firestore privileges. Confirm its project is the intended target. The script derives its project from this key, not `.firebaserc`.

Keep the key outside the checkout. For a shell session:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside-repo/service-account.json
npm run seed:admin -- --list
```

`--list` reads the configured users and `admins` ledger documents; **it does not inspect custom claims**. Do not use the current `seed:admin:list` alias: it adds an extra `--`, so the script can fall through into granting access.

## Grant approved accounts

Only the authorized project owner should run this mutation after reviewing the target and allowlist:

```bash
npm run seed:admin
```

For each matching user it upserts the ledger and calls `setCustomUserClaims(uid, { admin: true })`. This **replaces the entire custom-claims object**, including any other claims. Inspect existing claims through the Admin SDK before using it if the account has additional privileges. The two writes are separate; a failure can leave only one applied, so check the outcome for each account.

Sign out and back in to obtain a token containing the claim. First-time admins go to `/admin-profile`, save their profile, then reach `/admin-home`. Existing admins with a populated profile go directly to their dashboard.

## Verify and revoke deliberately

Verify the Auth user's custom claims with an owner-controlled Admin SDK inspection, the matching ledger entry, and an actual authorized admin read. A successful `--list` alone proves only the ledger exists.

Revocation has no bundled script. An authorized owner must remove the `admin` claim while preserving unrelated claims, reconcile the ledger and stale `users/{uid}.role`, and handle outstanding sessions/tokens as appropriate. **Deleting `admins/{uid}` does not revoke the claim**, and editing the role alone does not revoke backend authority. Confirm denial using a refreshed non-admin token.

## Troubleshooting

| Symptom | Check |
|---|---|
| Script skips an email | Matching `users` row and email, plus the reviewed `ADMIN_EMAILS` list |
| Admin UI opens but reads are denied | Actual token claim, recent sign-in, deployed rules and target project |
| Account stays on student/tutor dashboard | Ledger exists for the same UID; sign out/in to rerun routing checks |
| Key rejected | Credential validity, project, system clock and required IAM access |

Rules publication is a separate owner operation covered in the [deployment runbook](../05-Build-and-Deploy/DEPLOYMENT_GUIDE.md); do not deploy rules just to diagnose an admin claim.
