# EdumentX

A location-based tutor-finding app for Nepal. Students and parents browse
verified home tutors on a map, send enrollment requests, join group
batches, message tutors directly, and leave reviews after sessions. Tutors
manage availability, capacity, batches, and their inbox from one dashboard;
admins review verifications and monitor platform stats.

Everything runs on free tiers — no paid Firebase plan, maps SDK, or AI
service. Storage is Supabase's free tier, map tiles come from
OpenStreetMap, and all matching logic runs client-side.

## Features

- Map-based tutor discovery with subject, level, mode, distance, and budget filters
- Tutor verification (ID + academic documents, admin-reviewed)
- Enrollment requests with a weekly schedule picker and conflict checking
- Group batches with session codes, seat limits, and a browse/join flow
- In-app chat with read receipts and typing indicators
- Reviews and ratings on tutor profiles
- Saved tutors, notifications, and help & support
- Separate dashboards for students, tutors, and admins

## Tech stack

- React Native + Expo SDK 54 (TypeScript, expo-router v6)
- NativeWind 4 for styling — all colors/radii come from design tokens in `tailwind.config.js`, enforced by custom ESLint rules
- Firebase: native Auth (email/password + Google Sign-In), Firestore, security rules
- Supabase Storage for avatars
- OpenStreetMap tiles via `react-native-maps`
- Zustand for client state, Reanimated for animations

## Getting started

```bash
nvm use
npm ci
cp .env.example .env   # fill in the Firebase + Supabase keys
npx expo run:android   # or npx expo start
```

The app reads live Firestore data. Set `EXPO_PUBLIC_USE_MOCK_DATA=true`
in `.env` to run against in-memory repositories instead.

Installing on a physical device (iOS or Android) is covered in
[`Documentation/05-Build-and-Deploy/install-guide.md`](Documentation/05-Build-and-Deploy/install-guide.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint, including the design-token rules |
| `npm run test:derived` | Unit tests for the enrollment helpers |
| `npm run test:lint-rules` | Unit tests for the design-token lint rules |
| `npm run test:rules` | Firestore rules: deployed-drift check + six emulator suites |
| `npm run smoke:messages` | Live smoke tests against the deployed rules (needs a service-account key) |

## Repository layout

```
src/app/          expo-router routes
src/screens/      screen components (student, tutor, admin, shared, auth)
src/components/   reusable UI and domain components
src/services/     data layers (Firestore repositories + mocks)
src/store/        Zustand stores
src/lib/          helpers (validation, motion, tutor service)
src/constants/    design tokens and colors
firebase/         Firestore security rules
scripts/          smoke tests, rules tests, seed scripts
Documentation/    project docs — start at Documentation/README.md
```

## CI

Every push to `main` runs typecheck, lint, unit tests, six Firestore
rules suites, a deployed-vs-local rules drift check, and four live smoke
suites (enrollments, reviews, batches, messages) in
`.github/workflows/ci.yml`.
