# Pruned Code — June 2026

> **Purpose**: Code files moved here on **June 27, 2026** because they
> were no longer imported anywhere in the active codebase. Kept
> verbatim so the original reasoning and references survive for git
> blame and historical context. **Do not import from these files in
> new code** — they are kept for reference only.

## Why these files were pruned

After the **NativeWind (Tailwind for React Native) migration**,
color, spacing, and typography values moved from JS constants into
`tailwind.config.js`. The legacy constants files were left in place
"just in case," but a fresh audit on June 27 confirmed **zero imports**
of any of them across `app/`, `components/`, `screens/`, `services/`,
`store/`, and `lib/`. Moving them here:

* Frees the import path (`@/constants/theme`, `@/constants/spacing`,
  `@/constants/typography`) so future contributors don't accidentally
  reach for them.
* Keeps the original source in git history so a future code-archaeology
  session can see what the pre-NativeWind system looked like.
* Makes the "current source of truth" relationship unambiguous —
  `tailwind.config.js` is the single token source, period.

## What's here

```
Pruned_Code_June2026/
├── README.md                         ← this file
└── constants/
    ├── theme_legacy.ts               ← 247-line legacy theme object
    ├── spacing_legacy.ts             ← 17-line legacy spacing scale
    └── typography_legacy.ts          ← empty placeholder (export const typography = {} as const)
```

### `constants/theme_legacy.ts`

The pre-NativeWind theme object. Contains nested `colors`, `spacing`,
`radii`, `typography`, `borders`, `sizes`, `components`, and `badges`
subtrees. **Every value duplicates what lives in `tailwind.config.js`
today.** Was used by some pre-migration screens and by SVG illustration
fallback paths, but the SVG fallbacks have since moved to
`constants/colors.ts` (a narrow hex-only fallback for `react-native-svg`
primitives, which is still imported).

### `constants/spacing_legacy.ts`

A 6-key scale (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`). Tailwind's
default 4-pt scale (`p-4`, `gap-2`, etc.) covers everything here and
more. **No imports.**

### `constants/typography_legacy.ts`

Was already empty at the time of the audit (`export const typography = {} as const`).
The planned content never materialized — typography migrated directly
into Tailwind's `fontSize` / `lineHeight` / `fontWeight` keys via
`tailwind.config.js`.

## What's NOT here (and where it lives instead)

| Old location | New location | Notes |
|---|---|---|
| Color tokens | `tailwind.config.js` → `theme.extend.colors` | Source of truth. |
| Color hex fallbacks for SVG | `constants/colors.ts` | Still imported. |
| Spacing scale | `tailwind.config.js` → `theme.extend.spacing` | Source of truth. |
| Typography | `tailwind.config.js` → `theme.extend.fontSize` + `lineHeight` + `fontWeight` | Source of truth. |

## How to verify this is still safe

If you ever wonder "is `constants/theme.ts` still around?", the
answer is **no** — it's here, in the archive. Run:

```bash
ls constants/
# → colors.ts (still active — SVG fallback)
# → (no theme.ts, spacing.ts, or typography.ts)
```

If you need to read the old theme, browse `constants/theme_legacy.ts`.

---

*Archived June 27, 2026 during the Phase 2 codebase audit. The audit
also flagged the broader dead-code candidates listed in the Phase 2
plan (`useRegistration` hook + several `registration.*` methods,
unused `default export` lines on illustration files, broken
`INPUT_ERROR` / `INPUT_OK` docstring references in `inputs.ts`). Those
edits were applied in place — this folder holds only the file-level
moves.*
