# EdumentX Documentation

> **Welcome!** This folder is your single source of truth for the EdumentX
> project. It's organized by purpose so you can find what you need quickly.

## 📖 Quick Navigation

### For "What is EdumentX?"

Start with [`00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md`](./00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md)
— a complete 15-section guide covering the product, screens, design tokens,
architecture, and improvement roadmap.

For a focused architectural overview of the **current production stack**
(zero-budget hybrid), read [`01-Architecture/ARCHITECTURE.md`](./01-Architecture/ARCHITECTURE.md).

### For "How do I build the next feature?"

Read [`03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`](./03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md)
— a sprint-by-sprint guide with exact commands.

For the implementation status and release risks in the current working tree,
read [`03-Implementation-Guides/CURRENT_CODEBASE_ANALYSIS_AUG_2026.md`](./03-Implementation-Guides/CURRENT_CODEBASE_ANALYSIS_AUG_2026.md).

### For "I need a Figma design"

Use [`06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md`](./06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md)
— paste into Figma Make / Musho / Relume.

### For "I need Claude Code to refactor my code"

Use [`06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`](./06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md)
— paste into Claude Code (VS Code).

### For "I need to know what NOT to do"

Open [`01-Architecture/ARCHITECTURE.md` §8](./01-Architecture/ARCHITECTURE.md)
— the anti-pattern list. Cloud Storage / Cloud Functions / Google Maps
SDK / paid LLM providers are all out of scope.

---

## 📁 Folder Structure

```
Documentation/
├── 00-Overview/                              ← Read first
│   ├── EDUMENTX_MASTER_PROJECT_GUIDE.md       (15-section master guide)
│   ├── LOG.md                                (team-authored — DO NOT EDIT)
│   └── README.md
│
├── 01-Architecture/                          ← System design docs
│   ├── ARCHITECTURE.md                       (canonical stack + anti-patterns)
│   └── zero_cost_architecture.md             (full 3,884-line proposal)
│
├── 02-Design-System/                         ← Design tokens (placeholder)
│
├── 03-Implementation-Guides/                 ← How-to guides
│   ├── IMPLEMENTATION_ROADMAP.md             (sprint-by-sprint plan)
│   ├── CURRENT_CODEBASE_ANALYSIS_AUG_2026.md  (current implementation audit)
│   ├── PROJECT_SETUP.md                      (initial dev setup)
│   ├── INITIAL_PROJECT_SETUP.md              (Expo + Firebase setup)
│   ├── CLAUDE_CODE_TOOL_STACK.md             (skills / plugins / MCP servers)
│   └── DEPENDENCY_AND_GIT_TROUBLESHOOTING.md
│
├── 04-Firebase/                              ← Firebase-specific guides
│   └── phase-3-notes.md                      (deploy workflow, rules)
│
├── 05-Build-and-Deploy/                      ← EAS, app store, eSewa
│   ├── firebase-auth-plan.md
│   ├── firebase-auth-plan-audit.md
│   └── esewa_integration.md
│
├── 06-Prompts/                               ← AI tool prompts
│   ├── Figma-Make/
│   │   └── 00-MASTER-FIGMA-MAKE-PROMPT.md
│   ├── Claude-Code/
│   │   └── 00-MASTER-CLAUDE-CODE-PROMPT.md
│   └── antigravity-integration.md
│
├── 07-Design-Context/                        ← Reference designs
│   ├── EdumentX-Design-Extraction.md
│   └── google_ai_studio.png
│
├── 97-Educational_Contents/                  ← Senior reports for reference
│   ├── Mid_defense.pdf
│   ├── Mid_defense.pdf / .pptx
│   ├── Prabhat_Dai_forestfire_midterm_project_reportl 1.pptx
│   ├── Prabhat_Dai_Midterm_Report.pdf
│   ├── The-Final-Report.pdf
│   ├── Minor_Proposal_Report.pdf             (moved from 99-Archive on Jun 27)
│   └── Minor_Final_Report.pdf                (moved from 01-Architecture on Jun 27)
│
└── 99-Archive/                               ← Old/superseded docs (kept for history)
    ├── README.md                             (folder index — read this first)
    ├── 2026-06-21-clerk-revert/              (Clerk pivot archive)
    ├── design-prompts-jun2026/               (v1 design prompts, consolidated)
    └── context-snapshots-jun2026/            (long AI chat transcripts)
```

---

## 🗺️ Where to Find What You Need

| I want to... | Go to |
|--------------|-------|
| Understand the product | `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` |
| See all screens and their layout | `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` §6 |
| Find a specific color hex | `tailwind.config.js` (single source of truth) |
| Read the canonical architecture | `01-Architecture/ARCHITECTURE.md` |
| See what NOT to do (anti-patterns) | `01-Architecture/ARCHITECTURE.md` §8 |
| Set up my dev environment | `03-Implementation-Guides/PROJECT_SETUP.md` |
| Start a new sprint | `03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md` |
| See the current implementation baseline and release blockers | `03-Implementation-Guides/CURRENT_CODEBASE_ANALYSIS_AUG_2026.md` |
| Deploy Firestore rules | `npm run deploy:rules` (see `04-Firebase/phase-3-notes.md`) |
| Generate a Figma design | `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md` |
| Refactor code with Claude Code | `06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` |
| See previous design iterations | `99-Archive/design-prompts-jun2026/README.md` |
| Find an old AI chat transcript | `99-Archive/context-snapshots-jun2026/` |
| See the team-authored history | `00-Overview/LOG.md` (do NOT edit) |
| Reference a senior's mid-term | `97-Educational_Contents/` |
| Fix a dependency issue | `03-Implementation-Guides/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md` |
| See what Claude Code skills / plugins / MCP servers are installed | `03-Implementation-Guides/CLAUDE_CODE_TOOL_STACK.md` |
| Understand file/folder purpose | Each folder has a `README.md` |

---

## 🎯 The 4 Documents You Will Use Most

1. **Master Project Guide** (`00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md`)
   — when you have a question about the product, design, or architecture.
2. **Architecture** (`01-Architecture/ARCHITECTURE.md`) — when you need
   to know the canonical stack or what's forbidden.
3. **Implementation Roadmap** (`03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`)
   — when you start a new sprint or feature.
4. **Claude Code Master Prompt** (`06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`)
   — when you want to refactor or extend the codebase.

Everything else is reference material.

---

## 📝 Documentation Convention

- **Filenames**: PascalCase for guides (`IMPLEMENTATION_ROADMAP.md`),
  UPPERCASE for master prompts (`00-MASTER-FIGMA-MAKE-PROMPT.md`).
- **Numbered prefix** (`00-`, `01-`) controls reading order.
- **`_v1.md`** suffix marks superseded documents in `99-Archive/`.
  After June 27, 2026, v1 design-prompt files were **merged into a
  single consolidated README** at `99-Archive/design-prompts-jun2026/README.md`
  to reduce duplication.
- **Single source of truth**: when in doubt, the latest numbered `00-`
  document wins.

---

## 🔄 Updating This Folder

When adding a new doc:
1. Place it in the correct numbered folder.
2. Update this README's "Folder Structure" section.
3. Add a row to the "Where to Find What You Need" table.
4. If it supersedes an old doc, **merge the old content into a
   consolidated README** rather than leaving a `_v1.md` duplicate.

When "deleting":
- Don't delete — **merge and archive**. The 99-Archive folder is
  intentionally curated as project history.

---

## 🤝 For AI Tools (Claude, GPT, Cursor, etc.)

If you're an AI reading this folder to help with the project:

1. **Read first**: `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` — the
   canonical product description.
2. **Read second**: `01-Architecture/ARCHITECTURE.md` — the canonical
   stack, anti-patterns, and current roadmap table.
3. **Read third**: `CLAUDE.md` at the project root — the engineering
   rules (no Tamagui, zero-budget, NativeWind only).
4. **Check the code**: the actual source is in `app/`, `screens/`,
   `components/`, `services/`, `store/`, `lib/`.
5. **Respect the design tokens**: `tailwind.config.js` is the source
   of truth — don't invent new colors.
6. **Never edit** `00-Overview/LOG.md`. It's team-authored. If you
   think it needs updating, surface your suggestions in chat; the
   team will edit it manually.
7. **Don't trust v1 docs**: anything in `99-Archive/` is superseded.

---

*Maintained by SuhanVerse · Last reorganized June 27, 2026*
