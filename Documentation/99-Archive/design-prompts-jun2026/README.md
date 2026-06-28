# Design Prompt History — June 2026

> **Purpose**: All v1 design-prompt material from June 2026 has been moved
> here and **migrated** into this single consolidated reference. The
> 13 original `_v1.md` files (now renamed without the suffix inside this
> folder) are kept for git blame and reference, but **do not read them
> for current guidance**. This README is the current entry point.
>
> **Current canonical prompt**: `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md`
>
> **Why this folder exists**: We learned the hard way that Figma-Make
> quality depends on three things — accurate design tokens, screen-count
> consistency, and avoiding Figma-hostile phrasing (citation markers,
> backslash-escaped Markdown, ASCII wireframes). The notes below
> capture those lessons so the next person who touches the Figma prompt
> doesn't have to re-derive them.

---

## 1. Palette (canonical, source of truth)

The "Sophisticated Slate & Amber" palette was settled on in early June
2026 after several iterations. It is now the **single source of truth**
in `tailwind.config.js`. The values here MUST match the Tailwind config.

| Token | Hex | Role |
|---|---|---|
| **Night** | `#0F172A` | Primary text, headers, dark backgrounds, CTA fill |
| **Sand** | `#F1F5F9` | Page background (`bg-background`) |
| **Surface** | `#FFFFFF` | Card / floating surfaces (`bg-surface`) |
| **Amber** | `#B45309` | Accent CTAs, links, progress (`text-amber`, `bg-amber`) |
| **Verification** | `#047857` | "Blue Tick Pro" badge, success states |
| **AI** | `#4F46E5` | Reserved exclusively for AI features (avoid "AI washing") |
| **Border** | `#E2E8F0` | Hairline separators |
| **AI Match light** | `#EEF2FF` | AI screen chat-bubble tint |
| **Verification light** | `#ECFDF5` | Success-state background |

If a future Figma-Make prompt references any other palette value, it
is wrong.

---

## 2. Typography

- **Family**: Plus Jakarta Sans (geometric, modern, "custom-built"
  rather than system-default). Fallback: Inter, then system-ui.
- **Hierarchy**:
  - Hero / display: 24–30 px, weight 700 (the existing
    `text-hero` Tailwind class).
  - Section title: 16–18 px, weight 600 (`text-card-title`).
  - Body: 14 px, weight 400 (`text-body`).
  - Caption: 11–12 px, weight 500 (`text-caption`).
- **Editorial feel**: Use `letterSpacing` adjustments on uppercase
  labels (the `text-overline` class is already configured).

---

## 3. Component DNA (the things Figma-Make always gets wrong)

These rules come from the **DESIGN_PROMPT_ISSUES_AND_FIXES** notes
(June 2026) and were the reason the v1 → v2 prompt rewrite happened.
They are non-negotiable:

1. **No oversaturated blue/purple gradients.** Avoid the "AI look."
2. **No pill buttons** unless for tag-style chips (radius ≤ 12 px for
   CTAs; the `rounded-card` Tailwind class is 12 px).
3. **Multi-layered soft shadows**, not heavy black drop-shadows.
   Reference value: `0 4px 12px rgba(15, 23, 42, 0.05)`.
4. **Hairline borders** (0.5–1 px) for the "precision-engineered" feel.
5. **Flat surfaces** with optional border, not gradient cards. If you
   ever feel the need to add a gradient, prefer a 2-tone solid instead.
6. **Frame size**: 390×844 px (iPhone 14 reference).

---

## 4. The 15 problems the v2 prompt fixed

These came up in the **DESIGN_PROMPT_ISSUES_AND_FIXES** review of the
v1 prompt material. The v2 master prompt explicitly addresses each one:

1. Citation markers (`[cite: 11]`) leak into Figma layers — strip them.
2. Backslash-escaped Markdown (`\#`, `\+`, `\[`) is noise — plain text only.
3. ASCII wireframes in the prompt make Figma-Make produce text boxes,
   not real UI frames — describe behavior, not layout diagrams.
4. Screen counts disagreed across v1 prompts (24 vs 25 vs current route
   file) — v2 pins to **24 screens** across Student, Tutor, Admin.
5. Separate admin-login screen would duplicate auth UX — v2 uses the
   unified login (matches the codebase).
6. "No gradients" vs "gradient hero cards" in same prompt — v2 keeps
   the strict no-gradient rule.
7. AI purple exclusivity — v2 keeps `#4F46E5` only for AI elements;
   user-side AI chat bubbles use neutral / light-purple tints.
8. Implementation-code terms (`numberOfLines={1}`) — v2 uses design
   language ("truncate long names with ellipsis").
9. Technical jargon ("KNN proximity directory") — v2 translates to
   visible UI behavior ("Tutors sorted by distance, top 5 visible").
10. Map instructions ("accurate vector cartographic rendering of
    Kathmandu Valley") — v2 asks for schematic style with fuzzy
    privacy-radius overlays.
11. `admin/settings` is a stub in the route file — v2 either specifies
    a real Admin Settings frame or marks it as placeholder.
12. Generated designs referencing shadcn / Unsplash / Tailwind / web
    conventions — v2 keeps these as source context only and asks for
    React Native Expo output.
13. Inconsistent admin-button labels ("Approve Pass", "Approve-Teal",
    "Reject / Deny", "Request Info") — v2 standardizes to **Approve /
    Request info / Reject**.
14. Inconsistent batch capacity (4-5 / 2-6 / 10/10) — v2 pins to
    **2-6 students per batch, recommended 4-5 for public/private,
    tutor capacity tracked separately from session slots**.
15. Inconsistent bottom-nav (student 5 tabs, tutor 4-5, admin 3-4) —
    v2 standardizes: **Student 5 tabs, Tutor 5 tabs, Admin 4 bottom
    tabs + top sub-nav**.

---

## 5. Screen list (final, do not modify without updating both prompts)

| # | Screen | Role | Route |
|---|---|---|---|
| 01 | Splash | All | `/` |
| 02 | Onboarding | All | `/onboarding` |
| 03 | Unified Login (Email + Google) | All | `/email-signup` |
| 04 | Role Selection | All | `/role-selection` |
| 05 | Student Profile | Student | `/profile-student` |
| 06 | Tutor Profile | Tutor | `/profile-tutor` |
| 07 | Student Home | Student | `/student-home` |
| 08 | Map Discovery | Student | `/discover` |
| 09 | Tutor List | Student | `/tutors` |
| 10 | Tutor Detail | Student | `/tutors/[id]` |
| 11 | Enrollments | Student | `/enrollments` |
| 12 | Chat List | Student / Tutor | `/chat` |
| 13 | Chat Thread | Student / Tutor | `/chat/[id]` |
| 14 | Tutor Dashboard | Tutor | `/tutor-home` |
| 15 | Capacity Manager | Tutor | `/capacity` |
| 16 | Verification Queue (Tutor) | Tutor | `/verification` |
| 17 | Earnings | Tutor | `/earnings` |
| 18 | Schedule | Tutor | `/schedule` |
| 19 | Admin Verification Queue | Admin | `/admin/verifications` |
| 20 | Admin User Management | Admin | `/admin/users` |
| 21 | Admin Platform Stats | Admin | `/admin/stats` |
| 22 | Admin Settings (or placeholder) | Admin | `/admin/settings` |
| 23 | AI Chat Assistant | All | `/chatbot` |
| 24 | AI Chat (404 fallback frame) | All | n/a |

Total = **24 screens**. If a future Figma generation asks for 25,
it is wrong — see issue #4.

---

## 6. Files in this folder (git-blame / historical reference)

These are the original v1 files, kept verbatim:

- `COMPREHENSIVE_PROJECT_ANALYSIS_v1.md` — first deep analysis
- `DESIGN_PROMPT_ISSUES_AND_FIXES.md` — the 15-issue review (now summarized in §4)
- `EDUMENTX_DESIGN_PROMPTS.md` — design system + visuals prompts
- `FEATURE_IMPLEMENTATION_GUIDE.md` — older implementation steps (now superseded by `IMPLEMENTATION_ROADMAP.md`)
- `FIGMA_MAKE_README.md` — old prompt README
- `FILES_TO_ATTACH_WITH_PROMPT.md` — what to attach to Figma-Make
- `FINAL_FIGMA_MAKE_PROMPT.md` — first final Figma prompt
- `FIREBASE_SETUP_DETAILS.md` — old Firebase setup notes
- `MASTER_FIGMA_PROMPT_GUIDE.md` — old master Figma guide
- `PROFESSIONAL_REDESIGN_STRATEGY.md` — palette + typography origin
- `PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md` — old project structure
- `PROJECT_SUMMARY.md` — first high-level summary
- `Figma_Make_UI_v1.png` — first Figma-Make output screenshot

**Do not edit these files.** They are historical. If a question arises
about why the current prompt is the way it is, the answer is almost
always in §4 of this README.

---

*Consolidated June 27, 2026 — the 13 original v1 files were merged into
this single reference after the user's request to "migrate context of
older prompts into newer files instead of creating multiple older
files."*