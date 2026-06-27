# 00 — Overview

This folder contains high-level, project-wide documents. Read these first.

## Contents

| File | Purpose | Audience |
|------|---------|----------|
| [`EDUMENTX_MASTER_PROJECT_GUIDE.md`](./EDUMENTX_MASTER_PROJECT_GUIDE.md) | The definitive guide: product, screens, tokens, architecture, roadmap, improvements | Everyone |
| [`README.md`](./README.md) | This file | Everyone |

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
