# EdumentX

Location-based tutor finding app for students, parents, tutors, and admins.

This repository currently contains the initial working Expo setup and project folder structure. Full feature work should be added through feature branches from `develop`.

## Tech Stack

- React Native with Expo
- Expo Router
- TypeScript
- Firebase for auth, database, storage, functions, and notifications
- EAS Build planned for Android APK and iOS cloud builds

## Quick Start

```bash
npm install
cp .env.example .env
npm run start
```

For Expo Go mobile testing:

```bash
npx expo start
```

If the phone cannot connect on the same Wi-Fi:

```bash
npx expo start --tunnel
```

## Project Structure

The detailed setup guide is here:

[Documentation/PROJECT_SETUP.md](Documentation/PROJECT_SETUP.md)

Firebase setup and the temporary development signup test are documented here:

[Documentation/PROJECT_SETUP.md#9-firebase-files-and-initial-auth-test](Documentation/PROJECT_SETUP.md#9-firebase-files-and-initial-auth-test)

Important folders:

- `app/`: Expo Router entry files and app shell
- `screens/`: role and flow screens
- `components/`: reusable UI components
- `services/`: Firebase, location, notification, and AI helpers
- `constants/`: color, spacing, and typography tokens
- `firebase/`: Firestore and Storage rules/indexes
- `functions/`: Firebase Cloud Functions source after initialization

## Git Workflow

- `main`: stable branch
- `develop`: integration branch
- `feature/*`: feature work
- `fix/*`: bug fixes

Create feature branches from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

Open pull requests into `develop` and use GitHub's normal merge commit option, **Merge pull request**.

## Useful Scripts

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

On Ubuntu, use Expo Go or EAS cloud builds for iOS because iOS simulator requires macOS.
