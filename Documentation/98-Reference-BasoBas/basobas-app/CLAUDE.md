
## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## UI & Figma Implementation

When implementing UI from Figma designs (especially scaled-down or miniature frames):
- **DO NOT** blindly copy raw pixel values, font sizes (`10px`), or hardcoded hex colors (`#F5F5F5`).
- **Source of Truth:** ALWAYS prioritize the project's `tailwind.config.js` tokens and existing reference screens (e.g., `app/(tenant)/(tabs)/index.tsx`).
- **Typography:** Use semantic text tokens (`text-body`, `text-body-sm`, `text-caption`, `text-h1`, etc.) instead of arbitrary pixels.
- **Colors:** Map Figma hex colors to the theme tokens (`bg-input`, `bg-canvas`, `text-ink`, `text-brand`, `text-placeholder`, etc.).
- **Layout & Spacing:** Use standard layout padding (`px-[24px]` for screen edges).
- **Touch Targets:** Ensure buttons, FABs, and chips are mobile-friendly (typically `48px`, `56px`, or `42px`), matching the scale of `index.tsx`.
- **Border Radii:** Use defined tokens (`rounded-card`, `rounded-pill`, `rounded-lg`) instead of raw pixel values.
