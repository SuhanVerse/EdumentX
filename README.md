# EdumentX

Location-based tutor finding app for students, parents, tutors, and admins.

## Tech Stack

- React Native with Expo
- Expo Router
- TypeScript
- Firebase planned for auth, database, storage, functions, and notifications
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
```

On Ubuntu, use Expo Go or EAS cloud builds for iOS because iOS simulator requires macOS.
