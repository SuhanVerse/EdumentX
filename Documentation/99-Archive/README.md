# 99-Archive

> **Purpose**: Older documentation that has been superseded by newer guides.
> These files are kept for historical reference and git-blame purposes.
> **Do not use them as the source of truth** — the latest numbered
> `00-` / `01-` / `03-` files in their respective folders are always
> authoritative.

## What's in Here

### `2026-06-21-clerk-revert/` — Clerk pivot history

The Clerk → native Firebase Auth pivot that was attempted on June 20 and
reverted on June 21 because Clerk discontinued its `integration_firebase`
template for new accounts. Contains the original Clerk integration
write-up that was moved here from `04-Firebase/`.

### `design-prompts-jun2026/` — v1 design-prompt material

All v1 design-prompt material (the 13 dated `_v1.md` files plus the
`Figma_Make_UI_v1.png` reference screenshot) was moved here on
**June 27, 2026** and **consolidated into a single `README.md`** at the
folder root.

**Read `design-prompts-jun2026/README.md` first** — it captures the
unique insights from those 13 files (palette origin, the 15 prompt
fixes, screen list, typography rules) so you don't have to dig through
the originals.

The original files are kept verbatim inside the folder for git-blame.
**Do not edit them.** If you need to know "why the current prompt
doesn't do X," the answer is almost always in `design-prompts-jun2026/README.md`
§4 (the 15 fixes).

### `context-snapshots-jun2026/` — AI conversation snapshots

Long context snapshots that were loose at the Documentation root before
the June 27, 2026 cleanup. These are **read-only historical records** of
working sessions with Claude / Gemini / other tools. They are NOT
current documentation.

| File | What it was |
|---|---|
| `claude_tamagui_context.txt` | Tamagui migration session context (1,876 lines) |
| `gemini_chat_context.md` / `gemini_chat_context_v2.md` | Gemini prompt-engineering sessions |
| `gemini_dashboards.md` | Dashboard design exploration |
| `Screenshot from 2026-06-09 ...png` | App screenshot from a working session |
| `WhatsApp Image 2026-06-08 ...{06,07}.jpeg` | Team-shared screenshots |

## Reading Order (for project-history context)

1. `97-Educational_Contents/Minor_Proposal_Report.pdf` — original academic context (now in `97-Educational_Contents/`, not here)
2. `99-Archive/context-snapshots-jun2026/` — chronological working sessions
3. `99-Archive/design-prompts-jun2026/README.md` — design-iteration history
4. `99-Archive/2026-06-21-clerk-revert/` — Clerk pivot lessons learned
5. `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` — current canonical guide
6. `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md` — current design direction
7. `06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` — current engineering direction

## Why Not Delete?

Deleting documentation removes context. Future contributors (and AI
tools) benefit from understanding what was tried, what didn't work,
and how the project evolved. Git history + this archive = complete
record.

If you find a doc here that's misleading, **add a note at the top of
the file** with `> ⚠️ SUPERSEDED — see [new file] for the current version.`
Do not edit the body.

---

*Last reorganized June 27, 2026 — the 13 design-prompt v1 files were
merged into a single consolidated README inside `design-prompts-jun2026/`
and the orphan context snapshots at the Documentation root were moved
to `context-snapshots-jun2026/`.*