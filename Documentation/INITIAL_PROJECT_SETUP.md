# Initial Project Setup

This guide helps every teammate set up EdumentX on a local machine and test the current Expo app with Expo Go. It is written for the first stage of the project, before the full production features are built.

## What EdumentX Is

EdumentX is a location-based tutor finding platform for students, parents, tutors, and admins. The mobile app is built with React Native, Expo, TypeScript, Expo Router, and Firebase.

## What This Initial Setup Includes

- A basic Expo app that can run in Expo Go.
- TypeScript project configuration.
- Firebase environment placeholders.
- Firestore, Storage, and Firebase project files.
- A minimal splash and onboarding app structure.
- Team Git workflow rules for working from one GitHub repository.

## What Is Not Built Yet

- Production phone OTP signup.
- Real role-based dashboards.
- Google Maps tutor search.
- Tutor verification and Blue Tick approval.
- Enrollment requests and batch tutoring.
- Notifications.
- RAG AI chatbot.
- Production Android and iOS builds.

Build these later, feature by feature, using `Documentation/FEATURE_IMPLEMENTATION_GUIDE.md`.

## Required Accounts

Each teammate should have:

- A GitHub account with access to the EdumentX repository.
- A Firebase project invitation for `edumentx-dev`.
- A phone with Expo Go installed.
- A code editor, preferably VS Code.

## Ubuntu 24.04 LTS Setup

Run system updates first:

```bash
sudo apt update
sudo apt upgrade -y
```

Install basic developer tools:

```bash
sudo apt install -y git curl wget unzip zip build-essential ca-certificates gnupg
```

Install Node.js with `nvm`. This keeps Node versions clean per developer machine:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install
nvm use
node -v
npm -v
```

The repo has a `.nvmrc` file, so `nvm install` and `nvm use` select the project Node version.

Install global tools:

```bash
npm install -g firebase-tools eas-cli
```

Install GitHub CLI:

```bash
sudo apt install -y gh
gh auth login
```

Recommended VS Code extensions:

- ESLint
- Prettier
- Expo Tools
- TypeScript language features
- GitHub Pull Requests
- Firebase Explorer, optional

## Windows Setup

Install these tools:

- Git for Windows: <https://git-scm.com/download/win>
- Node.js LTS: <https://nodejs.org>
- VS Code: <https://code.visualstudio.com>
- GitHub CLI: <https://cli.github.com>

After installing Node.js, open PowerShell and check:

```powershell
node -v
npm -v
git --version
gh --version
```

Install global tools:

```powershell
npm install -g firebase-tools eas-cli
```

Login to GitHub CLI:

```powershell
gh auth login
```

If you prefer version-managed Node on Windows, use `nvm-windows`. Do not install both normal Node and `nvm-windows` without understanding which one is active in your terminal.

## Expo Go Mobile Setup

Install Expo Go on your phone:

- Android: install Expo Go from Google Play.
- iPhone: install Expo Go from the App Store.

Expo Go is enough for the initial app shell, documentation testing, and simple Firebase web SDK tests. Some future native features may require an EAS development build instead of Expo Go.

## Is Android Studio Required?

Android Studio is optional at the initial stage.

Use Android Studio if:

- You want an Android emulator on your laptop.
- You need native Android logs.
- You later create development builds.

You do not need Android Studio if:

- You are testing only with Expo Go on your personal phone.
- You only need to scan the QR code and open the app.

iOS Simulator requires macOS. On Ubuntu or Windows, iOS testing uses a physical iPhone with Expo Go now, and EAS cloud builds later.

## Clone The Repository

Use SSH if your GitHub SSH key is set up:

```bash
git clone git@github.com:SuhanVerse/EdumentX.git
cd EdumentX
```

Use HTTPS if your team chooses HTTPS:

```bash
git clone https://github.com/SuhanVerse/EdumentX.git
cd EdumentX
```

Switch to the team integration branch:

```bash
git fetch origin
git checkout develop
git pull origin develop
```

Install packages:

```bash
nvm use
npm ci
```

## Environment File Setup

Create a local `.env` file from the example file.

Ubuntu/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Current variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Each teammate gets the Firebase values from the same Firebase development project, `edumentx-dev`.

Important rules:

- Do not commit `.env`.
- Commit `.env.example`.
- `EXPO_PUBLIC_*` variables are visible inside the built mobile app.
- Do not put private service account keys, payment secrets, AI provider secrets, or admin credentials in `EXPO_PUBLIC_*`.
- Server-only secrets belong in Firebase Functions secrets, EAS environment variables, or another server-side secret system.

## Run The App With Expo Go

Start the Expo dev server:

```bash
nvm use
npx expo start --lan
```

Then scan the QR code.

Android:

- Open Expo Go.
- Tap scan QR code.
- Scan the terminal or browser QR code.

iPhone:

- Use the iPhone Camera app or Expo Go.
- Scan the QR code.
- Open the link in Expo Go.

## Same Wi-Fi Testing

The default Expo connection works best when:

- Laptop and phone are on the same Wi-Fi.
- VPN is off.
- Firewall is not blocking the dev server.
- The phone can reach the laptop IP address.

Use:

```bash
npx expo start --lan
```

If the app does not open, try the tunnel method.

Do not use `--localhost` for a real phone. `localhost` means the phone itself, so Expo Go cannot download the update from your laptop.

## Tunnel Testing

Tunnel mode is useful when the phone and laptop cannot connect directly:

```bash
npx expo start --tunnel --clear
```

Common tunnel fixes:

- Wait a few seconds after the QR code appears.
- Restart Expo Go.
- Run `npx expo start --clear --tunnel`.
- Try a different network.
- Check if ngrok or Expo tunnel services are having issues.

## WSL Networking Warning

If you use Windows with WSL, Expo Go can have trouble reaching the Linux dev server because WSL runs behind a virtual network.

Recommended options:

- Run Expo from Windows PowerShell for easiest phone testing.
- Use `npx expo start --tunnel` from WSL.
- Keep project files in the Windows filesystem only if your team accepts slower file watching.
- Keep project files inside the Linux filesystem for better performance, then use tunnel mode for the phone.

## Common Expo Go Problems

Metro cache issue:

```bash
npx expo start --clear
```

Phone cannot connect:

```bash
npx expo start --tunnel
```

Wrong Node version:

```bash
node -v
nvm install
nvm use
```

If Expo shows `TypeError: configs.toReversed is not a function`, the terminal is using old Node. Run `source ~/.bashrc`, then `nvm use`, then start Expo again.

Package mismatch:

```bash
npx expo install --fix
```

Fresh install:

```bash
rm -rf node_modules
npm ci
```

On Windows PowerShell:

```powershell
Remove-Item node_modules -Recurse -Force
npm ci
```

If you see `expo: Exec format error`, `tsc: Exec format error`, or `ESLint: 6.4.0`, your `node_modules` folder was probably created by another OS or an older install. Follow [Dependency And Git Troubleshooting](DEPENDENCY_AND_GIT_TROUBLESHOOTING.md).

## Firebase Initial Console Setup

Use the Firebase development project:

```text
edumentx-dev
```

Later, create a separate production project:

```text
edumentx-prod
```

### Register A Firebase Web App

In Firebase Console:

1. Open `edumentx-dev`.
2. Go to Project settings.
3. Under "Your apps", add a Web app.
4. Name it `EdumentX Web Dev` or similar.
5. Copy the Firebase config values.
6. Paste them into your local `.env`.

The Expo app uses the Firebase JavaScript/Web SDK during the initial phase, so the Web app config is enough for early testing.

### Enable Development Auth

In Firebase Console:

1. Go to Build > Authentication.
2. Open the Sign-in method tab.
3. Enable Email/Password.

Email/Password is temporary for development testing. Production signup should use phone OTP after the team decides between Expo Go limitations and EAS development builds.

### Create Firestore

In Firebase Console:

1. Go to Build > Firestore Database.
2. Click Create database.
3. Choose a development-friendly mode while rules are being built.
4. Select region `asia-south1`.
5. Create the database.

Keep Firestore mostly empty initially. App code should create documents such as `users/{uid}` automatically after signup when the authentication phase is implemented. Do not manually create random user document IDs in the Console.

## Firebase Files In This Repo

`firebase.json` tells Firebase CLI where the rules and indexes live.

`firebase/firestore.rules` contains Firestore security rules. Early rules should stay strict and expand only when each feature is implemented.

`firebase/storage.rules` contains Storage security rules for files such as profile images and future verification documents.

`firebase/indexes.json` stores Firestore indexes needed by queries. Add indexes when the app or Firebase Console says a query requires one.

Deploy Firebase rules only after checking them:

```bash
firebase login
firebase use edumentx-dev
firebase deploy --only firestore:rules,storage
```

## Firebase Android App Setup For Later

This is not required for Expo Go testing.

When the team starts native Android builds:

1. Firebase Console > Project settings > Add app > Android.
2. Use package name:

```text
com.edumentx.app
```

1. Download `google-services.json`.
2. Do not commit it unless the team intentionally decides to manage native config files in the repo.
3. Prefer EAS secrets or controlled team storage for native config files.

## Firebase iOS App Setup For Later

This is not required for Expo Go testing.

When the team starts native iOS builds:

1. Firebase Console > Project settings > Add app > iOS.
2. Use bundle ID:

```text
com.edumentx.app
```

1. Download `GoogleService-Info.plist`.
2. Do not commit it unless the team intentionally decides to manage native config files in the repo.
3. iOS builds from Ubuntu or Windows require EAS cloud build and an Apple Developer account.

## Future App Identifiers

When native builds begin, add identifiers to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.edumentx.app"
    },
    "android": {
      "package": "com.edumentx.app"
    }
  }
}
```

Do this when the team is ready for development builds or store builds, not just for Expo Go.

## GitHub Team Workflow

Use one shared GitHub repository.

Branches:

- `main`: stable branch.
- `develop`: integration branch for current work.
- `feature/*`: new feature branches.
- `fix/*`: bug fix branches.

Start new work:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/short-feature-name
```

Commit work:

```bash
git status
git add .
git commit -m "feat: add short description"
git push -u origin feature/short-feature-name
```

Open a pull request into `develop`. Use merge commits only. Do not squash if the team wants commit history preserved.

## Branch Protection

Recommended GitHub branch rules:

- Protect `main`.
- Protect `develop` after the team is comfortable with PRs.
- Require pull requests before merging.
- Require conversation resolution.
- Block force pushes.
- Block branch deletion.
- Allow merge commits.
- Disable squash and rebase if the team wants merge commits only.

If you require approvals and you are the only person working, you may block yourself from merging. Add teammates or reduce the approval requirement during early setup.

## Sync Develop After Main Changes

If `main` gets ahead after a pull request is merged, update `develop`:

```bash
git checkout main
git pull origin main
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

For feature branches:

```bash
git checkout develop
git pull origin develop

git checkout feature/short-feature-name
git merge develop
git push origin feature/short-feature-name
```

If there are conflicts, resolve them locally, commit, and push again.

## Team Rules

- Pull before starting work.
- Work from `develop`.
- Use feature branches.
- Do not commit `.env`.
- Do not commit Firebase private keys.
- Do not commit Android or iOS signing files.
- Run lint and typecheck before opening a PR.
- Update documentation when setup steps change.
- Keep README short; put detailed setup in `Documentation/`.

## Cleaning The Initial Expo Project For Simple Testing

Expo starter templates sometimes include demo screens, sample components, and React logo assets. These can be removed if they still exist and the team only wants a simple first app screen for Expo Go testing.

Do not run cleanup blindly after feature development has started. Check the files first.

### Removable Starter Files If Present

- `app/(tabs)/`
- `app/modal.tsx`
- `components/hello-wave.tsx`
- `components/parallax-scroll-view.tsx`
- `components/themed-text.tsx`
- `components/themed-view.tsx`
- `components/external-link.tsx`
- `components/haptic-tab.tsx`
- `components/ui/`
- `constants/theme.ts`
- `hooks/use-color-scheme.ts`
- `hooks/use-color-scheme.web.ts`
- `hooks/use-theme-color.ts`
- `scripts/reset-project.js`
- `assets/images/react-logo.png`
- `assets/images/react-logo@2x.png`
- `assets/images/react-logo@3x.png`
- `assets/images/partial-react-logo.png`

### Required Files To Keep

- `app/_layout.tsx`
- `app/index.tsx`
- `app/onboarding.tsx`
- `screens/onboarding/SplashScreen.tsx`
- `screens/onboarding/OnboardingScreen.tsx`
- `app.json`
- `package.json`
- `tsconfig.json`
- `eslint.config.js`
- `.env.example`
- `firebase.json`
- `firebase/firestore.rules`
- `firebase/storage.rules`
- `firebase/indexes.json`
- `constants/colors.ts`
- `constants/spacing.ts`
- `constants/typography.ts`
- `README.md`
- `Documentation/`

Git does not track empty folders. If the team wants to keep empty folders such as `screens/auth/` or `components/common/`, add a `.gitkeep` file inside each empty folder.

### Ubuntu/macOS Cleanup Commands

Check files first:

```bash
ls app components constants hooks scripts assets/images
```

Remove starter files only if they are still unused:

```bash
rm -rf "app/(tabs)" app/modal.tsx
rm -rf components/hello-wave.tsx components/parallax-scroll-view.tsx
rm -rf components/themed-text.tsx components/themed-view.tsx
rm -rf components/external-link.tsx components/haptic-tab.tsx components/ui
rm -f constants/theme.ts
rm -f hooks/use-color-scheme.ts hooks/use-color-scheme.web.ts hooks/use-theme-color.ts
rm -f scripts/reset-project.js
rm -f assets/images/react-logo.png assets/images/react-logo@2x.png
rm -f assets/images/react-logo@3x.png assets/images/partial-react-logo.png
```

### Windows PowerShell Cleanup Commands

Check files first:

```powershell
Get-ChildItem app, components, constants, hooks, scripts, assets/images -ErrorAction SilentlyContinue
```

Remove starter files only if they are still unused:

```powershell
Remove-Item "app/(tabs)" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "app/modal.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/hello-wave.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/parallax-scroll-view.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/themed-text.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/themed-view.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/external-link.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/haptic-tab.tsx" -Force -ErrorAction SilentlyContinue
Remove-Item "components/ui" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "constants/theme.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "hooks/use-color-scheme.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "hooks/use-color-scheme.web.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "hooks/use-theme-color.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "scripts/reset-project.js" -Force -ErrorAction SilentlyContinue
Remove-Item "assets/images/react-logo.png" -Force -ErrorAction SilentlyContinue
Remove-Item "assets/images/react-logo@2x.png" -Force -ErrorAction SilentlyContinue
Remove-Item "assets/images/react-logo@3x.png" -Force -ErrorAction SilentlyContinue
Remove-Item "assets/images/partial-react-logo.png" -Force -ErrorAction SilentlyContinue
```

## Initial Setup Checklist

- GitHub account has repo access.
- Git is installed.
- Node LTS and npm are installed.
- Firebase CLI is installed.
- EAS CLI is installed.
- VS Code is installed.
- Expo Go is installed on the phone.
- Repo is cloned.
- Branch is `develop`.
- `nvm use` selects the project Node version.
- `npm ci` completed.
- `.env` was created from `.env.example`.
- Firebase Web app config values were added to `.env`.
- Email/Password auth is enabled for development.
- Firestore is created in `asia-south1`.
- Firestore is kept empty until app code creates documents.
- `npx expo start` opens the app.
- `npx expo start --tunnel` works if same Wi-Fi does not.
- `npm run lint` passes.
- `npm run typecheck` passes.

---

Depending on whether you mean the Firebase Web Configuration credentials (API keys for your app) or Backend Cloud Functions variables, you can extract them directly using the Firebase CLI. [1, 2]
------------------------------

## Option A: Get Frontend App Configuration (API Keys, Project ID)

If you need the configuration object to initialize your frontend application (firebaseConfig), you can fetch it instantly via the command line. [3]

   1. Run the following command in your project terminal:

   firebase apps:sdkconfig web

   1. The CLI will output the exact object you need to copy into your local .env file:

   {
     "apiKey": "AIzaSyA...",
     "authDomain": "://firebaseapp.com",
     "projectId": "your-app",
     "storageBucket": "://appspot.com",
     ...
   }

(Alternatively, you can view this visually in the Firebase Console under Project Settings > General > Your Apps). [2, 4]
------------------------------

## Option B: Get Backend Environment Config (Cloud Functions)

If your team is working with Firebase Cloud Functions and needs the server-side runtime variables or older legacy configs, use the configuration subcommands. [5, 6]

## 1. Fetching Legacy Runtime Configs (functions.config())

To see the active server environment variables set on the project: [6]

firebase functions:config:get

- To download them directly into a local file for development:

firebase functions:config:get > functions/.runtimeconfig.json

Note: The Cloud Functions emulator automatically reads .runtimeconfig.json locally. Ensure you add *runtimeconfig.json to your .gitignore. [7, 8]

## 2. Migrating/Exporting to Cloud Secret Manager

Modern Firebase projects use Cloud Secret Manager for sensitive environment keys. You can export everything directly to a secret version using: [5]

firebase functions:config:export

Would you like help setting up a script to automatically generate the .env template file for your developers, or do you need assistance configuring multiple environments (like staging and production)? [5]

[1] [https://docs.onboardbase.com](https://docs.onboardbase.com/docs/firebase-functions)
[2] [https://support.google.com](https://support.google.com/firebase/answer/7015592?hl=en)
[3] [https://firebase.flutter.dev](https://firebase.flutter.dev/docs/cli)
[4] [https://firebase.google.com](https://firebase.google.com/docs/projects/learn-more)
[5] [https://firebase.google.com](https://firebase.google.com/docs/functions/config-env)
[6] [https://akhromieiev.com](https://akhromieiev.com/config-variables-firebase-cloud-functions/)
[7] [https://stackoverflow.com](https://stackoverflow.com/questions/44766536/how-do-you-setup-local-environment-variables-for-cloud-functions-for-firebase)
[8] [https://stackoverflow.com](https://stackoverflow.com/questions/64926615/accessing-local-firebase-environment-variables-when-running-node-test-js-locally)
