# EdumentX — Light Theme Unification ("The Study Desk") — Design

**Date:** 2026-08-10
**Status:** Approved (design), awaiting implementation plan

## Context

An external AI (Gemini) reviewed app screenshots and flagged a "per-tab theme
flip": some screens render on a dark slate (`#0F172A`) while others render on a
warm paper background (`#FBF8F2`). This report was treated as a **symptom list,
not a verdict**. All conclusions below were verified against the real source
code (session ran text-only, so no screenshots were consulted).

### Key code-grounded findings

1. **The flagship home screens are fully dark, not "dark-hero → light-body."**
   `StudentHome.tsx:203` (`variant="night"`), `:249` (`bg-night-deep` body),
   `:368` (`BottomNav tone="dark"`); `TutorHome.tsx:387` (`variant="night"`),
   `:479` (`bg-night-deep`), `:819` (`TutorBottomBar tone="dark"`). So the
   strong existing pattern is **full dark slate with glass cards**.
2. **Three coexisting patterns already exist** — full-dark (StudentHome,
   TutorHome, BatchCreation, AdminProfile, auth profile screens), the deliberate
   "dark-hero → light-sheet" seam (`ScreenSheet`, used by AIChat, Notification,
   Enrollment, StudentProfile), and plain light (TutorInbox, EditProfile,
   EditTeachingDetails, TutorCapacity, admin management screens, MapSearch body).
3. **Confirmed bugs, independent of theme direction:**
   - Subject chip contrast: `TutorHome.tsx:905` `bg-accent-light` + `text-accent`,
     and `TutorInbox.tsx:357` `bg-verification-light` + `text-verification` — low
     contrast, muddy on their backing cards.
   - Disabled email field: `StudentProfile.tsx:306` `bg-surface-muted` +
     `text-text-secondary`.
   - **Bottom-nav safe area:** neither `BottomNav.tsx` nor `TutorBottomBar.tsx`
     calls `useSafeAreaInsets()`; both hardcode `pb-3`.

## Decision (Phase 1)

The product direction chosen by the stakeholder:

1. **Make everything light.** One coherent `bg-background` + `bg-surface` story.
   The two home dashboards come back to warm paper. No app-wide dark sweep.
2. **Scope:** main app only — student + tutor tabs plus the shared components
   they use. Admin screens and auth/onboarding screens are left for a later pass.
3. **Drive:** spec-then-plan. This document is the spec; implementation goes
   through the writing-plans skill.

This was a deliberate product decision (not an automation of Gemini's
"symptom list → force bg-night" prescription). It prioritizes a single coherent
light identity and legibility over preserving the dark accent look.

## Design: "The Study Desk" (light, unified)

### Surface system (one light frame)

| Token | Hex | Role |
|---|---|---|
| `background` | `#FBF8F2` | Every content body |
| `surface` | `#FFFFFF` | Every card, sheet, input |
| `border` DEFAULT | `#E7E1D3` | Hairline on cards / light hero |
| `accent` / `amber` | `#E5A03B` | Signature accent — one high-value thing per screen |
| `primary` | `#2F5D50` | Chalkboard green — interactive / active |

Conversions applied across the touched screens:
- Body `bg-night-deep` → `bg-background`; `bg-glass`/`bg-glass-strong` →
  `bg-surface`; `border-glass-border` → `border-border`.
- `tone="dark"` props on cards/bells/bars → light tone (or
  remove if the prop is consumed only by dark).
- Text `text-white`, `text-slate-300/400` on dark surfaces → appropriate light
  tokens (`text-text-primary`, `text-text-muted`, `text-text-secondary`).
- `text-white/XX`, `bg-white/10` translucent-on-dark patterns → solid surface.
- Status/danger/warning-bg tokens remain valid (they're light already).

### Signature — amber rule

The amber `border-b-2 border-accent` underline under screen titles (present in
homes) becomes the app's identity mark on every screen title, replacing
per-screen literal `#E5A03B` style objects with the token.
`ScreenLayout` light hero (`SCREEN_HERO_LIGHT_CLASSES`) is the default header.

### Contrast and touch fixes (existing tokens only)

- **SubjectChip:** `TutorHome.tsx:905` → `bg-accent-light` + `text-accent-dark`
  (`#8B5E10`). `TutorInbox.tsx:357` → `bg-verification-light` + darker
  verification text token (verify `verification.dark` exists; else keep
  `text-verification` on the light chip but check contrast).
- **Disabled email:** `StudentProfile.tsx:306` → `bg-surface-muted` + a darker
  text token (`text-text-muted` or `text-text-primary` per measured contrast).
- **Bottom nav safe area:** add `useSafeAreaInsets()` to `BottomNav.tsx` and
  `TutorBottomBar.tsx`; apply `insets.bottom` additively to the existing
  `pb-3` padding for both light (and dark, if it survives) variants.

## Screens in scope

Student: `StudentHome`, `StudentProfile`, `Enrollment`, `AIChat`, `MapSearch`,
`TutorDetailsScreen`, `FiltersSheet`.
Tutor: `TutorHome`, `TutorInbox`, `EditProfile`, `EditTeachingDetails`,
`TutorCapacity`, `BatchCreation`, `PendingReview`.
Shared: `BottomNav`, `TutorBottomBar`, `ScreenLayout`, `TutorCard`,
`NotificationBell`, `ReviewBanner`.

Out of scope (later pass): all `src/screens/admin/*`, auth screens
(`EmailSignUp`, `RoleSelection`, `StudentProfileScreen`, `TutorProfileScreen`),
onboarding (`Onboarding`, `Splash`).

## Verification

- `npx tsc --noEmit` — 0 new errors.
- Contrast scanner: re-run per-screen for the touched chips / disabled fields.
- Bottom nav sits clear of home indicator on device.