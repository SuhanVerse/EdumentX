# EdumentX

> **Location-based tutor finding app** — connecting students/parents with verified home tutors nearby. Built with React Native (Expo SDK 54) + Firebase.

## 📚 Documentation

**Start here**: [`Documentation/00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md`](./Documentation/00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md) — the definitive 15-section guide to the product, design, architecture, and roadmap.

The full documentation structure is in [`Documentation/README.md`](./Documentation/README.md). Key files:

- 🎯 **[Master Project Guide](./Documentation/00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md)** — product, screens, tokens, improvements
- 🗺️ **[Implementation Roadmap](./Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md)** — sprint-by-sprint build plan
- 🎨 **[Figma Make Prompt](./Documentation/06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md)** — generate industry-grade designs
- 💻 **[Claude Code Prompt](./Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md)** — refactor the codebase

## Tech Stack

- **React Native** with **Expo SDK 54** (TypeScript strict mode, New Architecture)
- **Expo Router v6** for file-based navigation (typed routes)
- **Firebase** for Auth, Firestore, Storage (not yet wired)
- **Zustand** for state (planned)
- **Tamagui** for UI (planned migration target)

## Quick Start

```bash
nvm use                  # Node 20.19.4+
npm ci
cp .env.example .env     # Add your Firebase keys
npx expo start --lan
```

For physical device testing:

```bash
npx expo start --tunnel --clear
```

## Project Status (June 2026)

| Phase | Status |
|-------|--------|
| 7 auth/onboarding screens | ✅ Complete |
| Design system tokens | ✅ Complete |
| Firebase security rules | ✅ Complete |
| Firebase Auth + Firestore integration | ⏳ Pending |
| Tamagui UI migration | ⏳ Pending |
| Multi-role dashboards (Student, Tutor, Admin) | ⏳ Pending |
| Map-based tutor discovery | ⏳ Pending |
| Chat + enrollments | ⏳ Pending |

See the [Implementation Roadmap](./Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md) for the full plan.

## Git Workflow

Work from `develop`, create `feature/*` or `fix/*` branches, and open pull requests. Use merge commits.

## Useful Scripts

```bash
npm run start       # Start Expo dev server
npm run android     # Open on Android emulator
npm run ios         # Open on iOS simulator
npm run web         # Open in browser
npm run lint        # ESLint
npm run typecheck   # TypeScript check
```
