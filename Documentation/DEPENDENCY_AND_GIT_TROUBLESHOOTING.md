# Dependency And Git Troubleshooting

Use this page when Expo, ESLint, TypeScript, or Git branch syncing behaves strangely.

## 1. Expo, ESLint, Or TypeScript Shows Exec Format Error

Example errors:

```bash
npx expo start
# sh: 1: expo: Exec format error

npm run typecheck
# sh: 1: tsc: Exec format error

npm run lint
# ESLint: 6.4.0
# ESLint couldn't find a configuration file.
```

Another common wrong-Node error:

```bash
npx expo start --localhost
# TypeError: configs.toReversed is not a function
```

### Why This Happens

This usually happens when `node_modules` was created by another operating system or an older install.

`configs.toReversed is not a function` means Expo/Metro is running with old Node. The project requires Node `>=20.19.4`, and the repo `.nvmrc` currently selects Node 24.

In our case, the files under `node_modules/.bin/` were broken `IntxLNK` files instead of normal Linux executable links. Because of that:

- Expo could not run.
- TypeScript could not run.
- ESLint fell back to the old global `/usr/bin/eslint` instead of the local project ESLint.

### Correct Fix On Ubuntu

Run these commands from the project root:

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install
nvm use

node -v
npm -v

rm -rf node_modules
npm ci

npx expo --version
npm run lint
npm run typecheck
npx expo start
```

The repo includes `.nvmrc`, so `nvm install` and `nvm use` should select Node 24.

If `node -v` still shows `v18.x`, your current terminal has not loaded `nvm`. Run:

```bash
source ~/.bashrc
nvm use
```

### If You Do Not Have NVM Yet

Install `nvm`, reload the terminal, then run the fix again:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install
nvm use
```

### Windows PowerShell Fix

If you are working from Windows instead of Ubuntu, rebuild dependencies from Windows:

```powershell
cd D:\PROJECTS\EdumentX
node -v
npm -v

Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm ci

npx expo --version
npm run lint
npm run typecheck
npx expo start
```

Do not share the same `node_modules` between Windows and Ubuntu. Each operating system should run its own `npm ci`.

## 2. Recommended Project Location

Best Ubuntu performance:

```bash
/home/xlegion/Projects/EdumentX
```

Acceptable but sometimes slower:

```bash
/media/xlegion/Win/PROJECTS/EdumentX
```

If you keep the repo on a Windows or NTFS drive:

- Do not copy `node_modules` from Windows to Ubuntu.
- Do not switch between Windows and Ubuntu without rebuilding `node_modules`.
- If executable errors appear, delete `node_modules` and run `npm ci` again.

## 3. Check That Local Tools Are Being Used

Run:

```bash
node -v
which node
npx expo --version
npx eslint --version
npx tsc --version
```

Healthy Ubuntu output should use a path like:

```text
/home/xlegion/.nvm/versions/node/v24.x/bin/node
```

If it uses `/usr/bin/node`, the terminal is still using the system Node version.

If `npm run lint` shows `ESLint: 6.4.0`, the project is probably using the old global ESLint. Rebuild `node_modules` with `npm ci`.

## 4. Do Not Force Audit Fixes

`npm install` or `npm ci` may show audit warnings.

Do not run this without team discussion:

```bash
npm audit fix --force
```

It can upgrade packages outside Expo's expected version range and break the app.

Use this only for information:

```bash
npm audit
```

## 5. Firebase Invalid API Key

Example error:

```bash
Metro error: Firebase: Error (auth/invalid-api-key).
```

This means the Firebase Web app values in `.env` are missing, empty, copied incorrectly, or from the wrong Firebase project.

The Expo log may show only:

```text
env: export EXPO_PUBLIC_APP_ENV
```

That means the Firebase variables are still empty. For the initial UI test, the app should still open and show a warning. Firebase signup/login testing will stay disabled until real Firebase values are added.

Check your local `.env` without printing secrets:

```bash
node - <<'NODE'
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
for (const key of [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
]) {
  const value = env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
  console.log(`${key}: ${value ? 'set' : 'missing/empty'}`);
}
NODE
```

Fix:

1. Open Firebase Console.
2. Select `edumentx-dev`.
3. Go to Project settings.
4. Under "Your apps", create or open the Web app.
5. Copy the web config values into `.env`.
6. Restart Expo with cache clear:

```bash
nvm use
npx expo start --clear
```

Do not invent Firebase values. Use the exact values from Firebase Console.

## 6. Expo Go Cannot Download Remote Update

Example phone error:

```text
java.io.IOException: Failed to download remote update
```

If you start Expo with this:

```bash
npx expo start --localhost
```

the QR code points to `127.0.0.1`. On a real phone, `127.0.0.1` means the phone itself, not your laptop. That is why the phone cannot download the app.

Use one of these for real phone testing:

```bash
npx expo start --lan --clear
```

or:

```bash
npx expo start --tunnel --clear
```

Use `--localhost` only for local browser testing, Android emulator, or tools running on the same machine.

If LAN mode fails:

- Make sure phone and laptop are on the same Wi-Fi.
- Turn off VPN.
- Allow firewall access to Node/Metro.
- Use tunnel mode.

## 7. GitHub Says Develop Is Behind Main

This happens after a pull request from `develop` into `main` is merged with a merge commit. GitHub creates a new merge commit on `main`, but it does not automatically copy that commit back to `develop`.

Message example:

```text
develop is 1 commit behind main
```

Fix after every `develop -> main` PR merge:

```bash
git checkout main
git pull origin main

git checkout develop
git pull origin develop
git merge main
git push origin develop
```

Simple rule:

- After `main` changes, update `develop` from `main`.
- After `develop` changes, update feature branches from `develop`.

## 8. Normal Feature Branch Workflow

Start from updated `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

Work, commit, and push:

```bash
git status
git add .
git commit -m "feat: describe your change"
git push -u origin feature/your-feature-name
```

Open a pull request into `develop`.

## 9. Keep A Feature Branch Updated

Before pushing or before asking for review:

```bash
git checkout develop
git pull origin develop

git checkout feature/your-feature-name
git merge develop
git push origin feature/your-feature-name
```

If the pull request is into `main`, update from `main` instead:

```bash
git checkout main
git pull origin main

git checkout feature/your-feature-name
git merge main
git push origin feature/your-feature-name
```

## 10. If GitHub Says A PR Branch Is Behind The Base Branch

For a PR into `develop`:

```bash
git fetch origin
git checkout feature/your-feature-name
git merge origin/develop
git push origin feature/your-feature-name
```

For a PR into `main`:

```bash
git fetch origin
git checkout develop
git merge origin/main
git push origin develop
```

## 11. If A Merge Conflict Happens

Git will mark the conflicted files.

Check status:

```bash
git status
```

Open the conflicted files, choose the correct code, then:

```bash
git add .
git commit
git push
```

If you are unsure, ask the teammate who edited the same file before choosing.
