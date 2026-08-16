# 00 — Overview

This folder contains high-level, project-wide documents. Read these first.

## Contents

| File | Purpose | Audience |
|------|---------|----------|
| [`EDUMENTX_MASTER_PROJECT_GUIDE.md`](./EDUMENTX_MASTER_PROJECT_GUIDE.md) | The definitive guide: product, screens, tokens, architecture, roadmap, improvements | Everyone |
| [`README.md`](./README.md) | This file | Everyone |
| [`FIGMA_AI_CONTEXT.md`](./FIGMA_AI_CONTEXT.md) **+ 4 companions** | Reverse-engineered design-system exports for Figma AI sync (see [Figma AI exports](#figma-ai-design-exports) below) | Design / Figma AI agents |
| [`FIGMA_MAKE_PROMPT_GUIDE.md`](./FIGMA_MAKE_PROMPT_GUIDE.md) | One self-directing Figma Make master prompt: phase-driven (auth → student → tutor → admin → shared → QA), auto-detects done screens and continues | Design / Figma AI agents |
| [`../05-Build-and-Deploy/install-guide.md`](../05-Build-and-Deploy/install-guide.md) | Installing the app on iOS & Android: local Xcode/Gradle builds, EAS cloud builds, free-vs-paid Apple accounts, APK sharing, common issues | Anyone running the app on a phone |
| [`../05-Build-and-Deploy/borrowed-mac-checklist.md`](../05-Build-and-Deploy/borrowed-mac-checklist.md) | One-page checkbox runbook for running the app on a friend's Mac + iPhone (the zero-budget iOS path) | Anyone setting up a borrowed Mac session |

## What is EdumentX?

**EdumentX** is a **location-based home tutor marketplace** built with React Native (Expo SDK 54) and Firebase. It connects **Students/Parents** with **verified home Tutors** nearby, with AI-powered matching and a trust system ("Blue Tick Pro" verified tutors).

**Status (June 22, 2026)**: Native Firebase Auth + Firestore + Supabase Storage shipped (zero-budget hybrid stack). Multi-role dashboards live. Next: OpenStreetMap tiles, Nominatim geocoding, client-side KNN, Supabase-backed avatar uploads, Groq RAG chatbot. See `Documentation/01-Architecture/ARCHITECTURE.md` for the canonical stack matrix and anti-patterns.

**Target market**: Nepal (initial), international-ready architecture.

**Differentiator**: Not a generic e-learning platform — specifically an in-person home tutoring marketplace with map-based discovery.

**Architectural rule (zero-budget)**: Every backend dependency must be usable on a free tier with **no credit card required**. Firebase Cloud Storage / Cloud Functions / Google Maps SDK / OpenAI are out of scope. See `ARCHITECTURE.md` §0 and §8 for the rule and the anti-pattern list.

## How to Use the Master Guide

The master guide has 15 sections. You don't need to read all of them — here's a guide:

| If you want to... | Read section |
|-------------------|--------------|
| Understand the product | §1 Executive Summary |
| See the tech stack | §2 Technology Stack |
| See the file structure | §3 Project Architecture |
| Find a color or spacing value | §4 Design System |
| Trace a user flow | §5 User Flow & Navigation |
| Look up a specific screen | §6 Complete Screen-by-Screen Reference |
| Understand Firebase | §7 Firebase Architecture |
| Know what's done | §8 Implementation Status |
| Plan improvements | §9 🎯 How This Project Can Be Improved |
| Refactor the code | §10 Workflow & Architecture Improvements |
| Speed up the app | §11 Performance & Reliability |
| Set up testing | §12 Testing & Quality |
| Build & deploy | §13 DevOps & Release Pipeline |
| Quick context for AI tools | §14 Quick-Reference for AI Tools |
| Find a specific file path | §15 Appendix |

## Figma AI Design Exports

Reverse-engineered from the production codebase (React Native + NativeWind, Expo SDK 54) so a Figma AI generator can rebuild every surface pixel-accurately. Read **in this order** — each file builds on the previous one's tokens and terminology:

| # | File | Covers |
|---|------|--------|
| 1 | [`FIGMA_AI_CONTEXT.md`](./FIGMA_AI_CONTEXT.md) | Global design tokens (exact hex palette, typography, radii, spacing), core component anatomy (buttons, cards, navs, chips, sheets), screen inventory, motion, and the **hex → Tailwind-class QA checklist** (§1.5) |
| 2 | [`FIGMA_AI_AUTH_CONTEXT.md`](./FIGMA_AI_AUTH_CONTEXT.md) | Auth + onboarding at field level: splash, carousel, email signup/login (+ Google), role selection, both profile-setup flows |
| 3 | [`FIGMA_AI_STUDENT_CONTEXT.md`](./FIGMA_AI_STUDENT_CONTEXT.md) | Student marketplace at field level: home, map + filters, tutor details (+ enroll sheet), my enrollments, AI chat |
| 4 | [`FIGMA_AI_TUTOR_CONTEXT.md`](./FIGMA_AI_TUTOR_CONTEXT.md) | Tutor surfaces at field level: dashboard (live metrics), enrollment inbox (+ slot picker), capacity & schedule, group batches wizard |
| 5 | [`FIGMA_AI_ADMIN_CONTEXT.md`](./FIGMA_AI_ADMIN_CONTEXT.md) | Admin console (home, statistics, verification queue, user management) + the shared bottom-sheet / modal components |

**How to use them:** feed `#1` to the Figma AI first so it learns the token system, then the surface-specific export for whatever screens you're regenerating. Every hex in the docs is a design token — a Figma AI that adds drop shadows, uses `#E5A03B` amber as a generic accent, or draws a chart component instead of the `View`-width bars will drift from the coded look (the exports flag each of these traps explicitly).

**Ready to generate?** Paste the single master prompt in [`FIGMA_MAKE_PROMPT_GUIDE.md`](./FIGMA_MAKE_PROMPT_GUIDE.md) — it embeds the design-system anchor, runs six phases (auth → student marketplace → tutor → admin → shared components → QA sweep) with per-phase done-criteria, classifies each screen as DONE/PARTIAL/UNDONE from your supplied state, and advances automatically without manual step-by-step instructions. Include the current-state note in the guide (§"How to run it") so already-compliant screens are skipped.

## Other Places to Look

- **Architecture (canonical stack)**: [`../01-Architecture/ARCHITECTURE.md`](../01-Architecture/ARCHITECTURE.md) — **read this first** before adding any new dependency
- **Implementation guides**: [`../03-Implementation-Guides/`](../03-Implementation-Guides/) — `IMPLEMENTATION_ROADMAP.md` is the v3.0 current-state guide
- **Firebase**: [`../04-Firebase/phase-3-notes.md`](../04-Firebase/phase-3-notes.md) — Phase 3 operations doc
- **Build & deploy**: [`../05-Build-and-Deploy/firebase-auth-plan.md`](../05-Build-and-Deploy/firebase-auth-plan.md) + `firebase-auth-plan-audit.md`
- **AI prompts**: [`../06-Prompts/`](../06-Prompts/) — including the Antigravity + Claude integration guide
- **Code reference**: `app/`, `screens/`, `components/`, `lib/`, `tailwind.config.js` (in project root)
- **Old docs**: [`../99-Archive/`](../99-Archive/)

## Maintaining This Folder

The master guide is updated as the project evolves. If you make a significant change to the codebase (new screen, new token, new architecture), update the relevant section.
