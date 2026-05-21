# EdumentX Project Setup Guide

This guide explains the starting project setup in simple words so every teammate can clone the repo, install dependencies, run the app, and place future code in the correct folders.

## 1. What This Setup Contains

EdumentX is currently set up as a React Native app using Expo, Expo Router, and TypeScript.

The project has only a basic working app shell right now. It is not the full EdumentX app yet. Feature screens such as login, tutor dashboard, map search, enrollment, batches, verification, and admin panels should be added later through separate feature branches.

## 2. Required Tools

Install these before working on the project:

- Node.js LTS through `nvm`
- Git
- GitHub CLI, optional but recommended
- VS Code
- Expo Go on your mobile phone
- Firebase CLI when Firebase setup begins
- Android Studio only if you want Android emulator testing

Check your tools:

```bash
node -v
npm -v
git --version
eas --version
firebase --version
```

This repo includes `.nvmrc`. On Ubuntu, load the project Node version before installing packages:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install
nvm use
```

## 3. Clone and Run the Project

Clone the repo:

```bash
git clone git@github.com:SuhanVerse/EdumentX.git
cd EdumentX
git checkout develop
```

Install dependencies:

```bash
npm ci
```

Create your local environment file:

```bash
cp .env.example .env
```

Start the app:

```bash
nvm use
npm run start
```

For Expo Go on your phone:

```bash
nvm use
npx expo start --lan
```

If your phone cannot connect through the same Wi-Fi:

```bash
npx expo start --tunnel --clear
```

Do not use `--localhost` for a real phone. It points Expo Go to the phone itself, not your laptop.

## 4. Current Folder Structure

The project uses root-level folders. We are not putting everything inside `src/` right now because Expo Router expects the root `app/` folder by default.

```text
app/
  _layout.tsx
  index.tsx
  AppNavigator.tsx
  navigationTypes.ts

assets/

components/
  common/
  forms/
  map/
  tutor/
  student/
  admin/

constants/
  colors.ts
  spacing.ts
  typography.ts

hooks/

screens/
  auth/
  student/
  tutor/
  admin/

services/
  firebase/
  location/
  notifications/
  ai/

store/
types/
utils/

firebase/
  firestore.rules
  storage.rules
  indexes.json

functions/
Documentation/
```

## 5. Where to Put Code

Use these rules when creating new files:

- Put route entry files in `app/`.
- Put full screen components in `screens/`.
- Put reusable UI pieces in `components/`.
- Put app-wide colors, spacing, and typography in `constants/`.
- Put Firebase client setup in `services/firebase/`.
- Put location helpers in `services/location/`.
- Put notification helpers in `services/notifications/`.
- Put AI and recommendation helpers in `services/ai/`.
- Put shared TypeScript types in `types/`.
- Put Zustand stores or other app state files in `store/`.
- Put small shared helper functions in `utils/`.
- Put Firestore and Storage rules in `firebase/`.
- Put backend Cloud Functions in `functions/` after Firebase Functions is initialized.

## 6. Installed Core Packages

Native Expo-compatible packages were installed with `npx expo install`:

```bash
npx expo install expo-location expo-notifications expo-image-picker expo-secure-store expo-device
npx expo install react-native-maps react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens
```

JavaScript libraries were installed with `npm`:

```bash
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npm install firebase zustand react-hook-form zod @hookform/resolvers
npm install @gorhom/bottom-sheet
npm install -D eslint prettier typescript
```

Do not run `npm audit fix --force` without team discussion because it can upgrade packages in a way that breaks Expo compatibility.

## 7. Scripts

Use these commands during development:

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

Notes:

- `npm run ios` is useful only for teammates using macOS with Xcode.
- On Ubuntu, use Expo Go for mobile testing or EAS cloud builds for iOS.
- Android Studio is optional at the beginning if you test on a real phone with Expo Go.
- If `expo`, `tsc`, or `eslint` show `Exec format error`, rebuild dependencies using `Documentation/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md`.
- If Expo shows `TypeError: configs.toReversed is not a function`, run `source ~/.bashrc`, then `nvm use`. The terminal is using old Node.

## 8. Environment Variables

The committed example file is `.env.example`.

Each teammate should create their own local `.env` file:

```bash
cp .env.example .env
```

Do not commit `.env`.

Current variables:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Important: `EXPO_PUBLIC_` values are visible in the built app. Do not put private service account keys, admin SDK credentials, payment secrets, or AI provider secret keys in these variables.

## 9. Firebase Files and Initial Auth Test

The starting Firebase config files are:

```text
firebase.json
firebase/firestore.rules
firebase/storage.rules
firebase/indexes.json
```

The current rules are intentionally minimal and safe. They allow each signed-in user to access their own `users/{userId}` document only when the document ID matches the Firebase Auth UID. Everything else is denied until we design the full data model.

### Firebase Console Setup

In Firebase Console:

1. Open the `edumentx-dev` project.
2. Go to **Project settings**.
3. Under **Your apps**, create a **Web app**.
4. Copy the Firebase config values into your local `.env` file.
5. Go to **Build > Authentication > Sign-in method**.
6. Enable **Email/Password** for development testing.
7. Go to **Build > Firestore Database** and create the database if it is not created yet.
8. Keep Firestore mostly empty. Do not manually create every collection.

### Local Environment File

Create your local file:

```bash
cp .env.example .env
```

Fill these values from the Firebase Web app config:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Restart Expo after editing `.env`:

```bash
nvm use
npx expo start --clear
```

If Firebase values are empty, the app can still open for initial UI testing, but the temporary Firebase signup/login panel will stay disabled.

### How Firestore Documents Are Created

Do not manually create production collections from the Firebase Console.

The app creates documents when users perform actions:

```text
users/{uid}                 created after development signup
tutorProfiles/{uid}         later, after tutor profile setup
enrollments/{autoId}        later, after student enrollment request
batches/{autoId}            later, after tutor batch creation
reviews/{autoId}            later, after completed enrollment review
```

The current starter app has a temporary **Firebase development signup** panel on the first screen. It uses Email/Password only for development:

1. Enter name, email, password, phone, and role.
2. Tap **Create test user**.
3. Confirm Firebase Console shows a user in **Authentication > Users**.
4. Confirm Firestore shows a matching document at `users/{same uid}`.

Phone OTP remains the production target, but it should be implemented in a later auth sprint after deciding the Expo Go vs EAS development build approach.

### Firebase CLI Init

When the team is ready to connect the local Firebase CLI project, run:

```bash
firebase login
firebase init
```

Choose Firestore, Storage, Functions, and Emulators when the team is ready for backend work.

## 10. Git Workflow

Always start work from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

Commit related changes only:

```bash
git status
git add path/to/files
git commit -m "feat(auth): add login screen"
git push -u origin feature/your-feature-name
```

Open pull requests into `develop`.

Use normal merge commits. Do not use squash merge unless the team changes the rule later.

### Sync `develop` After Merging Into `main`

When a `develop -> main` pull request is merged, GitHub creates a merge commit on `main`. That commit does not automatically move back to `develop`, so GitHub may show:

```text
develop is 1 commit behind main
```

Fix it with:

```bash
git checkout main
git pull origin main

git checkout develop
git pull origin develop
git merge main
git push origin develop
```

Before pushing a feature branch, update it from `develop`:

```bash
git checkout develop
git pull origin develop

git checkout feature/your-feature-name
git merge develop
git push origin feature/your-feature-name
```

Detailed commands are in `Documentation/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md`.

## 11. When to Update This Documentation

Update `README.md` or this setup guide when:

- New setup commands are added.
- New environment variables are added.
- Firebase setup changes.
- Package scripts change.
- A new major folder or architecture decision is added.
- EAS build setup is added.
- Google Maps setup is added.

## 12. Current Setup Checklist

Before starting feature work, make sure this passes:

```bash
npm run lint
npm run typecheck
npx expo start
```

If those commands pass, the project setup is healthy.
