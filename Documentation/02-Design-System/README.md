# 02 — Design System

> **Placeholder.** This folder will hold design-token reference docs and
> component specifications once Phase 4 (Figma Make prompt + design
> system extraction) completes.

For now, the **canonical design-token source of truth** lives in two
places:

1. **`tailwind.config.js`** at the project root — every color, spacing
   value, radius, and font-size used in production code.
2. **`01-Architecture/ARCHITECTURE.md` §0** — the conceptual token table
   (Night / Sand / Amber / Surface / Verification / AI).

**What will go here in Phase 4**:
- A `tokens.md` listing every Tailwind token with hex values and use-case
  guidance ("use `bg-night` for primary CTAs, `text-amber` for links, etc.").
- A `component-library.md` describing the shared components in
  `components/ui/` and `components/forms/` with their props and
  accessibility considerations.
- A `motion.md` describing the animation primitives (Reanimated worklets,
  Pressable feedback, screen transitions).

Until then, treat this folder as read-only and refer to the two sources
above.