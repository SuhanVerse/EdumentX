# EdumentX

Location-based tutor finding app for students, parents, tutors, and admins.

## Tech Stack

- React Native with Expo
- TypeScript
- Expo Router
- Firebase

## Quick Start

```bash
nvm use
npm ci
cp .env.example .env
npx expo start --lan
```

Expo Go tunnel:

```bash
npx expo start --tunnel --clear
```

## Documentation

- [Initial Project Setup](Documentation/INITIAL_PROJECT_SETUP.md)
- [Feature Implementation Guide](Documentation/FEATURE_IMPLEMENTATION_GUIDE.md)
- [Project Structure And Feature Workflow](Documentation/PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md)
- [Dependency And Git Troubleshooting](Documentation/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md)
- [Current Setup Notes](Documentation/PROJECT_SETUP.md)

## Git Workflow

Work from `develop`, create `feature/*` or `fix/*` branches, and open pull requests. Use merge commits.

## Useful Scripts

```bash
npm run start
npm run lint
npm run typecheck
```
