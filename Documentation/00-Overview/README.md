# 00 — Overview

This folder contains high-level, project-wide documents. Read these first.

## Contents

| File | Purpose | Audience |
|------|---------|----------|
| [`EDUMENTX_MASTER_PROJECT_GUIDE.md`](./EDUMENTX_MASTER_PROJECT_GUIDE.md) | The definitive guide: product, screens, tokens, architecture, roadmap, improvements | Everyone |
| [`README.md`](./README.md) | This file | Everyone |

## What is EdumentX?

**EdumentX** is a **location-based home tutor marketplace** built with React Native (Expo SDK 54) and Firebase. It connects **Students/Parents** with **verified home Tutors** nearby, with AI-powered matching and a trust system ("Blue Tick Pro" verified tutors).

**Status (June 2026)**: Authentication and onboarding UI complete. Firebase backend pending. Multi-role dashboards not yet built.

**Target market**: Nepal (initial), international-ready architecture.

**Differentiator**: Not a generic e-learning platform — specifically an in-person home tutoring marketplace with map-based discovery.

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

- **Implementation guides**: [`../03-Implementation-Guides/`](../03-Implementation-Guides/)
- **AI prompts**: [`../06-Prompts/`](../06-Prompts/)
- **Code reference**: `app/`, `screens/`, `constants/`, `firebase/` (in project root)
- **Old docs**: [`../99-Archive/`](../99-Archive/)

## Maintaining This Folder

The master guide is updated as the project evolves. If you make a significant change to the codebase (new screen, new token, new architecture), update the relevant section.
