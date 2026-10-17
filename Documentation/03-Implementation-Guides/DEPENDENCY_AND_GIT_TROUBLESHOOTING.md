# Development troubleshooting

Start with the exact command, full error, Node version, current platform, and `git status --short`. Share only redacted configuration names, never secret values.

## Command fails before the app launches

Check `nvm use`, then `node --version` and `npm --version`. The repository pins Node 24. Use local npm scripts rather than a globally installed compiler or linter.

An `Exec format error` from `node_modules/.bin` can indicate dependencies installed on another operating system. Use a platform-specific dependency installation. Preserve source and the lockfile; do not fix it by deleting application files.

`npm ci` is the normal lockfile-based installation command. Do not use `npm audit fix --force` as a generic repair for an Expo native project.

## Native module is missing

Expo Go is not supported by this app. Build or install a matching development client, then run `npx expo start --dev-client`. Rebuild after adding a native dependency or changing native plugins. See [installation](../05-Build-and-Deploy/install-guide.md).

## UI styles are missing

Inspect [tailwind.config.js](../../tailwind.config.js), [babel.config.js](../../babel.config.js), [metro.config.js](../../metro.config.js), and the root CSS import. The working Metro configuration includes NativeWind integration and a resolver workaround; do not replace it with a historical snippet.

Use only defined color/radius tokens. Run `npm run lint` to catch token violations. Restart Metro with its cache cleared only after identifying a stale-cache cause.

## Login or Maps fails on one build

Check the native Firebase files, Google OAuth configuration, bundle/package identifiers, signing certificate, Android Maps API-key restriction, and installed client version. A debug signing fingerprint does not automatically cover a release build.

For email verification, the pending auth screen must reload the Firebase user after the user follows the email link. See the [auth notes](../04-Firebase/phase-3-notes.md).

## Mock mode still contacts Firebase

The selector applies only to participating service domains. Authentication and direct Firestore reads remain real. See the [setup limits](PROJECT_SETUP.md#3-choose-a-data-mode).

## Rules tests fail before the emulator starts

`npm run test:rules` begins with a credentialed deployed-rules comparison. Run the [local-only command](PROJECT_SETUP.md#local-firestore-rules-tests) to distinguish credentials/drift from emulator failures. Keep test project IDs explicit.

## Cannot save files

Check whether the repository's volume is mounted read-only. On Linux, `findmnt -T .` shows mount options. A `ro` filesystem needs an operating-system/storage fix or a writable checkout; changing file permissions does not make it writable.

## Git shows staged deletions and untracked copies

Do not run `reset --hard`, `clean`, or blanket `add` commands. Inspect the index and worktree separately, back up the working copy, and determine what the owner intended. The documentation cleanup deliberately leaves existing index changes alone.

Record what failed and the evidence before changing dependencies, configuration, or cloud state.
