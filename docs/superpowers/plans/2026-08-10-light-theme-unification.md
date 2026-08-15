# Light Theme Unification ("The Study Desk") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify EdumentX's main student/tutor surfaces onto one coherent light theme (warm paper `#FBF8F2` + white cards), fixing confirmed contrast bugs and the bottom-nav safe-area issue, without any app-wide dark sweep.

**Architecture:** Keep the existing `ScreenLayout → ScreenHeader → ScreenScroll` frame and the existing light `tone` variants already present in `TutorCard`/`NotificationBell`/`ReviewBanner`/`BottomNav`/`TutorBottomBar`. The work is (a) convert the four full-dark outlier screens to light, (b) standardize in-scope dark heroes to the light hairline hero, (c) fix three confirmed contrast/safe-area bugs using existing tokens only. No new design tokens; no hardcoded hex outside `constants/colors.ts`; no dark sweep.

**Tech Stack:** React Native (expo SDK 54), NativeWind (Tailwind classes), `react-native-safe-area-context` (`useSafeAreaInsets`), `@/constants/colors`, `@/components/shared/ScreenLayout`.

## Global Constraints

- **No dark sweep.** `bg-night`/`bg-night-deep`/`bg-glass*`/`tone="dark"`/`text-slate-*`/`text-white` on dark surfaces are removed from the screens in scope; they are NOT applied elsewhere. Admin/auth/onboarding screens are untouched.
- **Carved-out exceptions** (keep their dark heroes / native map, do NOT convert): `AIChat.tsx` (deliberate dark-hero → light-`ScreenSheet` chat seam), `MapSearch.tsx` (full-screen native map; dark header aids map legibility). Everything else in scope gets a light hero.
- **Existing tokens only.** All colors come from `tailwind.config.js` / `constants/colors.ts`. No new hex literals. The only permitted literal colours are ones already in use (e.g. `#2F5D50`, `#8B5E10`).
- **Amber rule stays:** the amber `border-b-2 border-accent` title underline is the identity mark — keep it on every converted hero. Do not delete it.
- **No jest test infra exists** in this repo (`package.json` has no `test` script, no `jest.config.*`). Verification for each task = `npx tsc --noEmit` (0 new errors) + targeted grep of old tokens + a manual contrast check. A build check (`npx expo export --platform android` or a dev-client run) is the end-to-end gate in the final task.
- Commit frequently, one commit per task, conventional-commit messages.

---

### Task 1: BottomNav — add bottom safe-area inset

**Files:**
- Modify: `src/components/shared/BottomNav.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `BottomNav` still accepts `role`, `current`, `tone` — adds safe-area padding internally. Later tasks rely on this so converted screens render the dock clear of the home indicator.

- [ ] **Step 1: Add the import and apply the inset**

Add `useSafeAreaInsets` to the existing safe-area import at `BottomNav.tsx:1`:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
```

Inside `BottomNav` (after `const router = useRouter();` at line 228), read the inset and use it additively on both tone branches:

```tsx
const insets = useSafeAreaInsets();
const navPadding = `pb-3`;          // existing base padding (keep)
// pad the dock by base + bottom inset so the home indicator never overlaps
```

Replace the two wrapper `pb-3` hardcodes. Dark dock (`BottomNav.tsx:261`):

```tsx
<View className="px-4 pt-2" style={{ paddingBottom: 12 + insets.bottom }}>
```

Light bar (`BottomNav.tsx:276`):

```tsx
<View className="bg-surface border-t border-border pt-2" style={{ paddingBottom: 12 + insets.bottom }}>
```

(12px = the old `pb-3`. `insets.bottom` is 0 on Android edge-to-edge and ~34px on iPhone with a home indicator, so nothing changes on Android and the dock lifts clear on iOS.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors. Then `grep -n 'pb-3' src/components/shared/BottomNav.tsx` → no remaining `pb-3` in that file.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/BottomNav.tsx
git commit -m "fix(nav): pad BottomNav above device home indicator"
```

---

### Task 2: TutorBottomBar — add bottom safe-area inset

**Files:**
- Modify: `src/components/domain/TutorBottomBar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TutorBottomBar` keeps its `tone` prop; safe-area padding added internally.

- [ ] **Step 1: Add import + apply inset to both tone branches**

Add at `TutorBottomBar.tsx` imports:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
```

Inside `TutorBottomBar` (after line 63, before the `tone === "dark"` branch at line 87):

```tsx
const insets = useSafeAreaInsets();
```

Dark dock (`TutorBottomBar.tsx:89`):

```tsx
<View className="px-4 pt-2" style={{ paddingBottom: 12 + insets.bottom }}>
```

Light bar (`TutorBottomBar.tsx:129`):

```tsx
<View
  className="flex-row bg-surface border-t border-border px-2 pt-2"
  style={{ paddingBottom: 12 + insets.bottom }}
  onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
>
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → no new errors. `grep -n 'pb-3' src/components/domain/TutorBottomBar.tsx` → none.

- [ ] **Step 3: Commit**

```bash
git add src/components/domain/TutorBottomBar.tsx
git commit -m "fix(nav): pad TutorBottomBar above device home indicator"
```

---

### Task 3: StudentHome — convert full dark to light

**Files:**
- Modify: `src/screens/student/StudentHome.tsx`

**Interfaces:**
- Consumes: Task 1 (safe-area in `BottomNav`), existing `TutorCard` light tone (default).
- Produces: a fully light home that other student screens now match.

- [ ] **Step 1: Flip the layout variant and body background**

`StudentHome.tsx:203` `variant="night"` → `variant="background"`.
`StudentHome.tsx:249` `ScreenScroll className="flex-1 bg-night-deep"` → `ScreenScroll className="flex-1 bg-background"`.

- [ ] **Step 2: Light the hero header**

`StudentHome.tsx:206` `<ScreenHeader>` → `<ScreenHeader variant="light">`.
Inside the header (lines 207-243) apply this token map (exact old → new):

| Old class | New class |
|---|---|
| `text-white/70` | `text-text-secondary` |
| `text-white` (greeting name) | `text-text-primary` |
| `rgba(255,255,255,0.7)` icon color (line 228) | `#6B7280` |
| `bg-glass-strong rounded-2xl h-input ... border border-glass-border` (search bar, 234) | `bg-surface rounded-2xl h-input ... border border-border` |
| `rgba(255,255,255,0.5)` search icon (235) | `#6B7280` |
| placeholder `rgba(255,255,255,0.35)` (240) | `#9CA3AF` |
| search input `text-white` (241) | `text-text-primary` |

`NotificationBell tone="dark"` (line 223) → `tone="light"` (or drop the prop — `light` is the default).

- [ ] **Step 3: Light the CTA + list body**

CTA button (`StudentHome.tsx:258`): `bg-amber` stays (amber is the signature CTA surface). Icon + label `text-night`/`text-night` (lines 261-262) → keep (dark text on amber is correct contrast). No change needed to the CTA itself.

Section header (lines 270-284):
| Old | New |
|---|---|
| `text-white` (272) | `text-text-primary` |
| `text-slate-400` (276, 281) | `text-text-muted` |
| `text-body-sm text-slate-400` (281) | `text-body-sm text-text-muted` |

- [ ] **Step 4: Light the empty/loading state + tutor cards**

Loading block (288-294): `rgba(255,255,255,0.5)` spinner (290) → `#2F5D50`; `text-slate-400` (292) → `text-text-muted`.

Empty state (296-311):
| Old | New |
|---|---|
| `bg-glass-strong ... border border-glass-border` (297) | `bg-surface ... border border-border` |
| `rgba(255,255,255,0.5)` icon (300) | `#6B7280` |
| `text-white` (304) | `text-text-primary` |
| `text-body-sm text-slate-400` (307) | `text-body-sm text-text-muted` |

Tutor list (313-334): remove `tone="dark"` from `<TutorCard>` (line 331) so it renders the default light tone.

- [ ] **Step 5: Light the log-out affordance + nav**

`StudentHomeLogOut` (338-365):
| Old | New |
|---|---|
| `bg-glass border border-glass-border` (391) | `bg-surface border border-border` |
| `rgba(255,255,255,0.6)` spinner (394) | `#6B7280` |
| `text-danger` (398) — keep, it's a valid token | — |

`BottomNav role="student" current="/student-home" tone="dark"` (line 368) → `tone="light"`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` → 0 new errors.
`grep -nE 'bg-night-deep|bg-glass|tone="dark"|text-slate-|text-white' src/screens/student/StudentHome.tsx` → no remaining dark-token hits (the CTA's `text-night` is expected and correct).

- [ ] **Step 7: Commit**

```bash
git add src/screens/student/StudentHome.tsx
git commit -m "feat(home): convert StudentHome to unified light theme"
```

---

### Task 4: TutorHome — convert full dark to light + fix SubjectChip contrast

**Files:**
- Modify: `src/screens/tutor/TutorHome.tsx`

**Interfaces:**
- Consumes: Task 2 (safe-area in `TutorBottomBar`), `ReviewBanner` (already tone-neutral).
- Produces: light dashboard; corrects the subject-chip contrast bug Gemini flagged.

- [ ] **Step 1: Flip layout + body**

`TutorHome.tsx:387` `variant="night"` → `variant="background"`.
`TutorHome.tsx:479` `ScreenScroll className="flex-1 bg-night-deep"` → `ScreenScroll className="flex-1 bg-background"`.

- [ ] **Step 2: Light the hero header**

`TutorHome.tsx:390` `<ScreenHeader>` → `<ScreenHeader variant="light">`.
Header tokens (391-433):
| Old | New |
|---|---|
| `text-white/70` (397) | `text-text-secondary` |
| `text-white` name (400) | `text-text-primary` |
| `bg-verification-light` + `text-success` verified pill (407-410) — keep (light tokens) | — |
| availability toggle `bg-white/10 ... border border-glass-border` (419) | `bg-surface ... border border-border` |
| `text-white` (421) | `text-text-primary` |
| `text-white/65` (424) | `text-text-secondary` |

`NotificationBell tone="dark"` (415) → `tone="light"`.

- [ ] **Step 3: Light the banner + metric cards**

`ReviewBanner` usage (449-477) — no change; it renders its own tinted surface on light. Confirm it sits between the light hero and light body (it will, since both are now light).

`Metric` component (867-892):
| Old | New |
|---|---|
| `bg-glass border border-glass-border rounded-2xl p-3.5` (870) | `bg-surface border border-border rounded-2xl p-3.5` |
| icon tile `bg-glass-strong border border-glass-border` (874) | `bg-background border border-border` |
| icon `#FFFFFF` (879) | `#2F5D50` |
| `text-slate-400` label (883) | `text-text-muted` |
| `text-white` value (884) | `text-text-primary` |
| trend `text-verification` / `text-slate-400` (886) — keep | — |

- [ ] **Step 4: Light the capacity + profile-completion cards**

Capacity card (512-536): `bg-glass border border-glass-border` (514) → `bg-surface border border-border`. Progress track `bg-night-deep` (530) → `bg-border`. Icon `rgba(255,255,255,0.55)` (517) → `#6B7280`. `text-white` (518) → `text-text-primary`. Chevron `rgba(255,255,255,0.45)` (528) → `#6B7280`.

Profile completion (539-554): `bg-glass border border-glass-border` (539) → `bg-surface border border-border`. `text-white` (540) → `text-text-primary`. Track `bg-night-deep` (544) → `bg-border`. `text-accent` (550-552) keep.

- [ ] **Step 5: Light the sessions card + pending requests**

Sessions card (560-586): `bg-glass border border-glass-border` (560) → `bg-surface border border-border`. Icon tile `bg-glass-strong border border-glass-border` (561) → `bg-background border border-border`. Icon `#E5A03B` (562) keep. `text-slate-400` (565, 579, 581) → `text-text-muted`. `text-white` (578) → `text-text-primary`. `border-glass-border` separators (573) → `border-border`. `text-accent` time (576) keep.

Pending requests header (589-601): `text-white` (592) → `text-text-primary`.

`RequestsSubTabs` (1068-1134):
| Old | New |
|---|---|
| `bg-glass border border-glass-border rounded-xl` (1084) | `bg-surface border border-border rounded-xl` |
| count chip `bg-night-deep` (1119) | `bg-border` |
| `text-slate-300` inactive (1113) | `text-text-secondary` |
| `text-slate-400` count (1126) | `text-text-muted` |
| active pill `bg-primary` (1092) — keep | — |

**SubjectChip — the contrast bug** (`TutorHome.tsx:903-909`): change the text token from amber-on-cream to the darker amber:

```tsx
function SubjectChip({ label }: SubjectChipProps) {
  return (
    <View className="px-2 py-0.5 rounded-sm bg-accent-light">
      <Text className="text-micro text-accent-dark font-medium">{label}</Text>
    </View>
  );
}
```

(`accent-dark` = `#8B5E10` — a token that already exists in `tailwind.config.js:46`. Amber `#E5A03B` on cream `#FBEBCF` is ~2.1:1; `#8B5E10` on `#FBEBCF` is ~5.4:1, WCAG AA for normal text.)

Request cards (620-649): `bg-glass rounded-2xl p-3.5 border border-glass-border` (624) → `bg-surface rounded-2xl p-3.5 border border-border`. `text-white` (631) → `text-text-primary`. `text-slate-400` (635, 643) → `text-text-muted`. `StatusBadge` uses light tokens already — keep.

- [ ] **Step 6: Light batch-request cards**

Batch cards (668-679): `bg-glass ... border glass-border` (669) → `bg-surface ... border border-border` (keep the conditional `border-verification`/`border-danger-bg` overrides). `text-white` (692) → `text-text-primary`. `text-slate-400` (695, 708, 718) → `text-text-muted`. Slot panel `bg-night-deep border border-glass-border` (700) → `bg-background border border-border`. `text-slate-300` (705) → `text-text-secondary`. `bg-night-deep` disabled accept (739) → `bg-border`. `text-slate-400` blocked text (750) → `text-text-muted`.

- [ ] **Step 7: Light group CTA + quick actions**

Group CTA (787-801): `bg-glass border border-glass-border` (789) → `bg-surface border border-border`. `bg-ai` icon tile (791) keep. `text-slate-400` (796) → `text-text-muted`.

Quick actions (804-817): `bg-glass border border-glass-border` (812) → `bg-surface border border-border`. `text-white` (814) → `text-text-primary`.

- [ ] **Step 8: Light the dock + availability switch**

`TutorBottomBar tone="dark"` (819) → `tone="light"`.

`AvailabilitySwitch` (1008-1060): `TRACK_OFF = "rgba(255,255,255,0.20)"` (1018) → `"#E7E1D3"` (the `border` token). Keep `TRACK_ON = colors.brand.verification`. Thumb `bg-white` (1055) → `bg-white` with a `border border-border`? Simpler: `bg-surface` (thumb on light track needs a border to read) — change to `className="w-5 h-5 rounded-full bg-white border border-border"`.

- [ ] **Step 9: Light the empty state**

`TutorDashboardEmptyState` (957-994): `variant="night"` (960) → `variant="background"`. `text-white` (969) → `text-text-primary`. `text-slate-300` (972) → `text-text-secondary`. `text-slate-400` (987) → `text-text-muted`.

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit` → 0 new errors.
`grep -nE 'bg-night-deep|bg-glass|tone="dark"|text-slate-|text-white' src/screens/tutor/TutorHome.tsx` → no remaining hits.
Contrast check: `#8B5E10` on `#FBEBCF` = ≥ 4.5:1 (subject chip), `#2F5D50` on `#FFFFFF` = ~7:1 (icon tiles).

- [ ] **Step 11: Commit**

```bash
git add src/screens/tutor/TutorHome.tsx
git commit -m "feat(dashboard): convert TutorHome to light theme and fix subject chip contrast"
```

---

### Task 5: TutorInbox — light hero + chip/badge contrast

**Files:**
- Modify: `src/screens/tutor/TutorInbox.tsx`

**Interfaces:**
- Consumes: Task 2 (safe-area).
- Produces: inbox hero matches other tutor surfaces; fixes its chips too.

- [ ] **Step 1: Verify current state + light the header**

`TutorInbox.tsx:108` is already `variant="surface"` and `ScreenHeader variant="light"` (111) — the hero is already light. No hero change needed.

**Fix the subject chip contrast** (`TutorInbox.tsx:353-361`):

```tsx
function SubjectChip({ label }: SubjectChipProps) {
  return (
    <View className="px-2 py-1 rounded-sm bg-verification-light">
      <Text className="text-micro text-verification-dark font-medium">{label}</Text>
    </View>
  );
}
```

Check: does `verification.dark` resolve as `text-verification-dark`? `tailwind.config.js:63-67` defines `verification: { DEFAULT, dark, light }` → yes, `text-verification-dark` = `#2D6B44` on `bg-verification-light` `#DCF0E4` ≈ 5.9:1, AA pass. (If the build errors on the class, fall back to inline `color: "#2D6B44"`.)

- [ ] **Step 2: Fix the PendingBadge contrast**

`PendingBadge` (`TutorInbox.tsx:363-369`): `bg-warning-bg` + `text-warning` (amber `#E5A03B` on cream) → use the darker amber:

```tsx
<View className="px-2 py-0.5 rounded-sm bg-warning-bg">
  <Text className="text-micro font-semibold text-warning-text">Pending</Text>
</View>
```

(`warning-text` = `#8B5E10`, same as `accent-dark` — exists at `tailwind.config.js:80`.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → 0 new errors. Confirm `grep -nE 'text-warning"|text-verification"' src/screens/tutor/TutorInbox.tsx` returns only the `StatusBadge` accepted/declined uses, not the subject chip / pending badge.

- [ ] **Step 4: Commit**

```bash
git add src/screens/tutor/TutorInbox.tsx
git commit -m "fix(inbox): contrast-correct subject chips and pending badge"
```

---

### Task 6: StudentProfile — disabled email field contrast

**Files:**
- Modify: `src/screens/student/StudentProfile.tsx`

**Interfaces:**
- Consumes: nothing new (already `variant="background"` + `ScreenSheet`).
- Produces: readable read-only email row.

- [ ] **Step 1: Fix the read-only email row contrast**

`StudentProfile.tsx:306` currently `bg-surface-muted` + `text-text-secondary` (`#6B7280` on `#F1ECE0` ≈ 3.4:1, fails AA for the 15px body text). Change the text token to the darker neutral:

```tsx
<View className="flex-row items-center justify-between bg-surface-muted border border-border rounded-card h-input px-4">
    <Text
      className="text-body-lg text-text-primary flex-1"
      numberOfLines={1}
    >
      {user?.email ?? "Not signed in"}
    </Text>
```

(`text-text-primary` = `#0F172A` on `#F1ECE0` ≈ 12:1.) The "Verified" pill (`bg-success-bg` + `text-success-text`) is already fine.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → 0 new errors. Check the row renders dark text on the muted chip.

- [ ] **Step 3: Commit**

```bash
git add src/screens/student/StudentProfile.tsx
git commit -m "fix(profile): improve read-only email field contrast"
```

---

### Task 7: Enrollment — light hero (standardize)

**Files:**
- Modify: `src/screens/student/Enrollment.tsx`

**Interfaces:**
- Consumes: Task 1 (safe-area).
- Produces: enrollment hero matches the other student tabs (light), sheet stays light.

- [ ] **Step 1: Flip the hero to light**

`Enrollment.tsx:235` stays `variant="background"`. `ScreenHeader` at line 238 (default = dark) → `variant="light"`.

Hero tokens (239-254):
| Old | New |
|---|---|
| `text-white/70` (239) | `text-text-secondary` |
| `text-white` (248) | `text-text-primary` |
| `text-white/70` (252) | `text-text-secondary` |

The amber title underline (243-247) stays.

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit` → 0 new errors. `grep -n 'text-white' src/screens/student/Enrollment.tsx` → only the intended white-on-amber/white-on-primary button labels (lines 821, 838) remain.

```bash
git add src/screens/student/Enrollment.tsx
git commit -m "feat(enrollments): light hero for enrollment tab"
```

---

### Task 8: EditProfile — light hero

**Files:**
- Modify: `src/screens/tutor/EditProfile.tsx`

**Interfaces:**
- Consumes: Task 2 (safe-area).
- Produces: profile hero matches other tutor surfaces.

- [ ] **Step 1: Flip hero to light**

`EditProfile.tsx:377` stays `variant="background"`. `ScreenHeader` at line 382 → `variant="light"`.

Hero tokens (383-387):
| Old | New |
|---|---|
| `text-white/70` (383) | `text-text-secondary` |
| `text-white` (385) | `text-text-primary` |

Amber underline (384-386) stays.

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit` → 0 new errors. `grep -nE 'bg-night|text-white' src/screens/tutor/EditProfile.tsx` → no hero hits.

```bash
git add src/screens/tutor/EditProfile.tsx
git commit -m "feat(profile): light hero for tutor edit profile"
```

---

### Task 9: EditTeachingDetails — light hero (custom dark hero → light)

**Files:**
- Modify: `src/screens/tutor/EditTeachingDetails.tsx`

**Interfaces:**
- Consumes: nothing new (uses `ScreenLayout variant="background"`, no bottom nav).
- Produces: consistent light hero on the teaching-details screen.

- [ ] **Step 1: Replace the custom `bg-night` hero with a light header**

`EditTeachingDetails.tsx:489` currently:

```tsx
<View className="bg-night px-5 pb-6 shrink-0">
```

Replace with the standard light header wrapper (same class shape as `SCREEN_HERO_LIGHT_CLASSES`):

```tsx
<View className="bg-surface px-6 pb-8 shrink-0 border-b border-border">
```

Hero tokens (495-510):
| Old | New |
|---|---|
| back button `bg-white/10` + chevron `#FFFFFF` (496, 501) | `bg-surface` + chevron `#2F5D50`, add `border border-border` |
| `text-white/70` (500) | `text-text-secondary` |
| `text-white` (503) | `text-text-primary` |
| `text-white/70` (508) | `text-text-secondary` |

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit` → 0 new errors. `grep -nE 'bg-night|text-white' src/screens/tutor/EditTeachingDetails.tsx` → none.

```bash
git add src/screens/tutor/EditTeachingDetails.tsx
git commit -m "feat(teaching-details): light hero for teaching details screen"
```

---

### Task 10: TutorCapacity — light hero

**Files:**
- Modify: `src/screens/tutor/TutorCapacityScreen.tsx`

**Interfaces:**
- Consumes: Task 2 (safe-area).
- Produces: capacity hero matches other tutor surfaces.

- [ ] **Step 1: Flip hero to light**

`TutorCapacityScreen.tsx:209` stays `variant="background"`. `ScreenHeader variant="dark"` at line 210 → `variant="light"`.

Hero tokens (211-216):
| Old | New |
|---|---|
| `text-white/70` (211) | `text-text-secondary` |
| `text-white` (213) | `text-text-primary` |
| `text-white/70` (215) | `text-text-secondary` |

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit` → 0 new errors. `grep -n 'text-white' src/screens/tutor/TutorCapacityScreen.tsx` → none.

```bash
git add src/screens/tutor/TutorCapacityScreen.tsx
git commit -m "feat(capacity): light hero for capacity screen"
```

---

### Task 11: BatchCreation — fix night layout (should be light)

**Files:**
- Modify: `src/screens/tutor/BatchCreation.tsx`

**Interfaces:**
- Consumes: Task 2 (safe-area).
- Produces: batch creation sits on the light frame (it already has a light header; the `night` page background was the bug).

- [ ] **Step 1: Flip the page background only**

`BatchCreation.tsx:52` `variant="night"` → `variant="background"`. The header is already `ScreenHeader variant="light"` (56) and the body `ScreenScroll` (65) has no explicit bg (inherits `bg-background`) — so just the variant flip fixes it. Check line 71 `text-white` is inside the header → that's the `bg-ai` CTA ("Create new batch" button) which is fine (white on blue).

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit` → 0 new errors. `grep -n 'variant="night"' src/screens/tutor/BatchCreation.tsx` → none.

```bash
git add src/screens/tutor/BatchCreation.tsx
git commit -m "fix(batches): render batch creation on light background"
```

---

### Task 12: PendingReview — convert full dark to light

**Files:**
- Modify: `src/screens/tutor/PendingReview.tsx`

**Interfaces:**
- Consumes: nothing new (no bottom nav).
- Produces: the "under review" state reads as a light surface, not a dark one.

- [ ] **Step 1: Flip layout + light the text**

`PendingReview.tsx:216` `variant="night"` → `variant="background"`.

Hero tokens (224-233):
| Old | New |
|---|---|
| `text-white/70` uppercase eyebrow (224) | `text-text-secondary` |
| `text-white` (229) | `text-text-primary` |
| `text-white/65` (233) | `text-text-secondary` |

Scan the rest of the body for `text-white`/`text-slate-*`/`bg-glass*` and map each to its light counterpart (`text-text-primary`, `text-text-muted`, `bg-surface`, `border-border`).

- [ ] **Step 2: Verify + commit**

`npx tsc --noEmit` → 0 new errors. `grep -nE 'bg-night|tone="dark"|text-slate-' src/screens/tutor/PendingReview.tsx` → none.

```bash
git add src/screens/tutor/PendingReview.tsx
git commit -m "feat(pending): convert pending-review screen to light theme"
```

---

### Task 13: AIChat — carve-out (verify only, no change expected)

**Files:**
- Read-only: `src/screens/student/AIChat.tsx`

**Interfaces:**
- Consumes: Task 1 (safe-area in its `BottomNav`).
- Produces: confirms the intentional dark-hero → light-`ScreenSheet` seam is untouched.

- [ ] **Step 1: Confirm carve-out + check nav**

`AIChat.tsx:164` `variant="night"`, `ScreenHeader` (dark), `ScreenSheet` (light body, 203), `BottomNav` (266) default light. This is the deliberate seam — leave the hero dark. Verify `BottomNav` at line 266 has no `tone="dark"` (it should be default light, which is correct for the light sheet). No code change.

- [ ] **Step 2: Document in commit message**

No commit — this is a verification-only task. Note in the plan report: AIChat intentionally keeps its dark hero.

---

### Task 14: MapSearch — carve-out (verify only)

**Files:**
- Read-only: `src/screens/student/MapSearch.tsx`

**Interfaces:**
- Consumes: Task 1 (safe-area in its `BottomNav`).
- Produces: confirms the native-map surface is untouched.

- [ ] **Step 1: Confirm carve-out + check nav**

`MapSearch.tsx:357` is `View className="flex-1 bg-background"` with a custom `bg-night` hero (360) + `BottomNav` default light (502). Native map + dark header for legibility — leave as-is. The bottom "nearby tutors" strip already uses `bg-surface` (451) and `TutorCard tone="light"` (489) — correct on light. No code change.

- [ ] **Step 2: Note in report**

No commit.

---

### Task 15: FiltersSheet — verify no dark-token change needed

**Files:**
- Read-only: `src/screens/student/FiltersSheet.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: confirms the filter sheet (a light Modal) needs no change.

- [ ] **Step 1: Confirm**

`FiltersSheet.tsx:214` `text-white` is inside the *active* `bg-primary`/`bg-accent` pill branch (`active ? "text-white"`) — that's white-on-teal/amber, correct contrast, and it lives on a light `bg-surface` Modal sheet. `text-verification-dark` (221) already used. No code change.

- [ ] **Step 2: Note in report**

No commit.

---

### Task 16: TutorDetailsScreen — verify scope boundary

**Files:**
- Read-only: `src/screens/student/TutorDetailsScreen.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: confirms the detail screen's dark elements are intentional (native map placeholder, price-on-dark).

- [ ] **Step 1: Confirm**

`TutorDetailsScreen.tsx:853` `text-white` is the full-session price/CTA on a coloured surface — acceptable. `bg-night` at 1098 is the *map placeholder* hero (image area) — keep, it is a deliberate "map-like" tile, not a page background. The screen is `variant="background"`. No code change.

- [ ] **Step 2: Note in report**

No commit.

---

### Task 17: End-to-end verification + dark-token sweep

**Files:**
- Read: all files modified in Tasks 1-12.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Type-check + lint**

```bash
npx tsc --noEmit
npx eslint src/screens/student src/screens/tutor src/components/shared/BottomNav.tsx src/components/domain/TutorBottomBar.tsx
```
Expected: 0 new errors (existing warnings acceptable if they predate this work).

- [ ] **Step 2: Scripted dark-token sweep**

Run a grep across the modified screens for any residual dark tokens that should be gone:

```bash
grep -rnE 'bg-night-deep|tone="dark"|bg-glass' \
  src/screens/student/StudentHome.tsx src/screens/tutor/TutorHome.tsx \
  src/screens/tutor/BatchCreation.tsx src/screens/tutor/PendingReview.tsx \
  src/screens/tutor/EditProfile.tsx src/screens/tutor/EditTeachingDetails.tsx \
  src/screens/tutor/TutorCapacityScreen.tsx src/screens/student/Enrollment.tsx
```

Expected: zero matches (except any deliberate `tone="dark"` inside `BottomNav.tsx`/`TutorBottomBar.tsx` themselves, which remain as supported variants for future dark screens).

- [ ] **Step 3: Contrast re-check (the two fixed chips + email row)**

Compute luminance contrast:
- `#8B5E10` on `#FBEBCF` (TutorHome SubjectChip) ≥ 4.5:1 → PASS.
- `#2D6B44` on `#DCF0E4` (TutorInbox SubjectChip) ≥ 4.5:1 → PASS.
- `#8B5E10` on `#FBEBCF` (TutorInbox PendingBadge) ≥ 4.5:1 → PASS.
- `#0F172A` on `#F1ECE0` (StudentProfile email row) ≥ 4.5:1 → PASS.

- [ ] **Step 4: Build check (optional but recommended)**

```bash
npx expo export --platform android --no-minify 2>&1 | tail -20
```
Expected: export completes; the bundle contains no unresolved token classes (NativeWind would have left the old classes as dead code, which is why the grep sweep in Step 2 matters more than the build).

- [ ] **Step 5: Commit any stragglers + report**

If Step 2 surfaced residual tokens not covered by Tasks 3-12, fix them in the owning screen and commit. Then write the final report per the plan format.

---

## Self-Review

**Spec coverage:**
- Surface system (body→`bg-background`, card→`bg-surface`) → Tasks 3, 4, 12 (full-dark screens); heroes→light via Tasks 7-10.
- Amber rule preserved → each hero conversion keeps the `border-b-2 border-accent` underline (Tasks 3, 7, 8, 10 note it stays).
- Subject chip contrast → Task 4 (`accent-dark`) + Task 5 (`verification-dark`).
- Disabled email contrast → Task 6.
- Bottom-nav safe area → Tasks 1, 2.
- Carve-outs (AIChat, MapSearch) → Tasks 13, 14 (verify-only).
- Out-of-scope admin/auth/onboarding → untouched (global constraints).
- Verification → Task 17 (tsc, eslint, token sweep, contrast, build).

**Placeholder scan:** every step has an exact old→new mapping or explicit code block; no TBDs.

**Type/prop consistency:** `variant="light"` on `ScreenHeader` matches the existing prop (verified `ScreenLayout.tsx:128-144`). `tone="light"` on `BottomNav`/`TutorBottomBar`/`TutorCard`/`NotificationBell` all exist as accepted props (verified in each component). `text-accent-dark`/`text-verification-dark`/`text-warning-text` resolve in `tailwind.config.js` (lines 40-47, 63-67, 80).
