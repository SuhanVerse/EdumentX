# 01 — Architecture

> **Read first**: [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the canonical
> stack matrix, anti-pattern list, and current roadmap.
>
> [`zero_cost_architecture.md`](./zero_cost_architecture.md) — the full
> 3,884-line proposal that the canonical doc above was distilled from.
> Read this when you need deeper justification for a specific decision
> (e.g., why Supabase over Cloudinary, why OSM over Google Maps).

## Files

| File | Purpose | Audience |
|---|---|---|
| `ARCHITECTURE.md` | Canonical stack matrix, anti-patterns, code map, roadmap | Everyone |
| `zero_cost_architecture.md` | Full proposal with detailed comparisons and code samples | Deep-dive readers |

## What goes here

Anything architectural — stack decisions, data models, security
boundaries, integration patterns. Service-by-service docs belong in
`04-Firebase/`, `06-Prompts/`, or their respective folders, not here.

## What does NOT go here

- Implementation steps (those live in `03-Implementation-Guides/`).
- One-off fixes (those live in commit messages or PR descriptions).
- Old architecture decisions (those live in `99-Archive/`).