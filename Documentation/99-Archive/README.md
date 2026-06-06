# 99-Archive

> **Purpose**: Older documentation that has been superseded by newer guides. These files are kept for historical reference and git blame purposes. **Do not use them as the source of truth** — the latest numbered `00-` files in their respective folders are always authoritative.

## What's in Here

### Project Overviews (Superseded by `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md`)

| File | What It Was | Why Archived |
|------|------------|--------------|
| `COMPREHENSIVE_PROJECT_ANALYSIS_v1.md` | First comprehensive analysis (June 2026) | Superseded by the v2 master guide which adds: improvement roadmap, performance/testing sections, AI quick-reference, and AI tools guidance |
| `PROJECT_SUMMARY_v1.md` | High-level project summary | Outdated — pre-Tamagui, pre-Firebase architecture |
| `PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW_v1.md` | Directory structure and feature workflows | Outdated — pre-new folder structure |
| `FEATURE_IMPLEMENTATION_GUIDE_v1.md` | Step-by-step implementation guide | Outdated — predates Tamagui + Firebase rewrite |
| `Minor_Proposal_Report.pdf` | Academic project proposal | Not relevant to engineering |
| `Figma_Make_UI_v1.png` | First Figma Make output | Superseded by the v2 master Figma prompt |

### Figma / Design Prompts (Superseded by `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md`)

| File | What It Was | Why Archived |
|------|------------|--------------|
| `FINAL_FIGMA_MAKE_PROMPT_v1.md` | First Figma Make prompt | Replaced by the v2 master prompt with sidebar, multi-role, and design system extraction |
| `EDUMENTX_DESIGN_PROMPTS_v1.md` | Design generation prompts | Merged into the v2 master prompt |
| `MASTER_FIGMA_PROMPT_GUIDE_v1.md` | Master guide for Figma Make | Replaced by the v2 master prompt |
| `PROFESSIONAL_REDESIGN_STRATEGY_v1.md` | Professional redesign strategy | Insights incorporated into the v2 master prompt |
| `DESIGN_PROMPT_ISSUES_AND_FIXES_v1.md` | Known Figma Make issues | Incorporated into the v2 master prompt §9 |
| `FILES_TO_ATTACH_WITH_PROMPT_v1.md` | Required file attachments for Figma Make | Incorporated into the v2 master prompt §7 |
| `FIGMA_MAKE_README_v1.md` | Figma Make folder README | Replaced by `06-Prompts/Figma-Make/` structure |

## Reading Order

If you want to understand the project's evolution, read in this order:
1. `Minor_Proposal_Report.pdf` — original academic context
2. `PROJECT_SUMMARY_v1.md` — early product vision
3. `COMPREHENSIVE_PROJECT_ANALYSIS_v1.md` — first deep analysis
4. `EDUMENTX_MASTER_PROJECT_GUIDE.md` (in `00-Overview/`) — current canonical guide
5. `00-MASTER-FIGMA-MAKE-PROMPT.md` (in `06-Prompts/Figma-Make/`) — current design direction
6. `00-MASTER-CLAUDE-CODE-PROMPT.md` (in `06-Prompts/Claude-Code/`) — current engineering direction

## Why Not Delete?

Deleting documentation removes context. Future contributors (and AI tools) benefit from understanding what was tried, what didn't work, and how the project evolved. Git history + this archive = complete record.

If you find a v1 doc that's misleading, add a note at the top of the file with `> ⚠️ SUPERSEDED — see [new file] for the current version.`
