# 02 — Design System

This folder holds design-token reference docs and component
specifications for EdumentX.

The **canonical design-token source of truth** lives in two places:

1. **`tailwind.config.js`** at the project root — every color, spacing
   value, radius, and font-size used in production code.
2. **`01-Architecture/ARCHITECTURE.md` §0** — the conceptual token table
   (Night / Sand / Amber / Surface / Verification / AI).

## Documents in this folder

- [`premium_ui_ux_guidelines.md`](./premium_ui_ux_guidelines.md) —
  premium-tier visual guidelines, type scale, and elevation tokens.
- [`motion.md`](./motion.md) — **the motion & interactivity system.**
  Token constants, hooks, primitives, patterns by surface, and the
  CssInterop caveat. Read this before adding or modifying any
  Reanimated motion in the app.

## Future work

- A `tokens.md` listing every Tailwind token with hex values and use-case
  guidance ("use `bg-night` for primary CTAs, `text-amber` for links, etc.").
- A `component-library.md` describing the shared components in
  `components/ui/` and `components/forms/` with their props and
  accessibility considerations.
