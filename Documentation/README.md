# EdumentX Documentation

> **Welcome!** This folder is your single source of truth for the EdumentX project. It's organized by purpose so you can find what you need quickly.

## 📖 Quick Navigation

### For "What is EdumentX?"

Start with [`00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md`](./00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md) — a complete 15-section guide covering the product, screens, design tokens, Firebase architecture, and improvement roadmap.

### For "How do I build the next feature?"

Read [`03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`](./03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md) — a step-by-step sprint-by-sprint guide with exact commands.

### For "I need a Figma design"

Use [`06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md`](./06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md) — paste into Figma Make / Musho / Relume.

### For "I need Claude Code to refactor my code"

Use [`06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`](./06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md) — paste into Claude Code (VS Code).

---

## 📁 Folder Structure

```
Documentation/
├── 00-Overview/                    ← Read first
│   ├── EDUMENTX_MASTER_PROJECT_GUIDE.md    (15-section master guide)
│   └── README.md                           (this file)
│
├── 01-Architecture/                ← System design docs (TBD)
│
├── 02-Design-System/               ← Design tokens reference (TBD)
│
├── 03-Implementation-Guides/       ← How-to guides
│   ├── IMPLEMENTATION_ROADMAP.md           (sprint-by-sprint plan)
│   ├── PROJECT_SETUP.md                    (initial dev setup)
│   ├── INITIAL_PROJECT_SETUP.md            (Expo + Firebase setup)
│   └── DEPENDENCY_AND_GIT_TROUBLESHOOTING.md
│
├── 04-Firebase/                    ← Firebase-specific guides (TBD)
│
├── 05-Build-and-Deploy/            ← EAS, app store submission (TBD)
│
├── 06-Prompts/                     ← AI tool prompts
│   ├── Figma-Make/
│   │   └── 00-MASTER-FIGMA-MAKE-PROMPT.md
│   └── Claude-Code/
│       └── 00-MASTER-CLAUDE-CODE-PROMPT.md
│
├── 07-Design-Context/              ← Reference designs from previous iterations
│   ├── EdumentX-Design-Extraction.md
│   └── google_ai_studio.png
│
└── 99-Archive/                     ← Old/superseded docs (kept for history)
    ├── COMPREHENSIVE_PROJECT_ANALYSIS_v1.md
    ├── PROJECT_SUMMARY_v1.md
    ├── PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW_v1.md
    ├── FEATURE_IMPLEMENTATION_GUIDE_v1.md
    ├── FINAL_FIGMA_MAKE_PROMPT_v1.md
    ├── EDUMENTX_DESIGN_PROMPTS_v1.md
    ├── FIREBASE_SETUP_DETAILS_v1.md
    ├── MASTER_FIGMA_PROMPT_GUIDE_v1.md
    ├── PROFESSIONAL_REDESIGN_STRATEGY_v1.md
    ├── DESIGN_PROMPT_ISSUES_AND_FIXES_v1.md
    ├── FILES_TO_ATTACH_WITH_PROMPT_v1.md
    ├── FIGMA_MAKE_README_v1.md
    ├── Figma_Make_UI_v1.png
    └── Minor_Proposal_Report.pdf
```

---

## 🗺️ Where to Find What You Need

| I want to... | Go to |
|--------------|-------|
| Understand the product | `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` |
| See all screens and their layout | `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` §6 |
| Find a specific color hex | `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` §4 |
| Set up my dev environment | `03-Implementation-Guides/PROJECT_SETUP.md` |
| Start a new sprint | `03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md` |
| Generate a Figma design | `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md` |
| Refactor code with Claude Code | `06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` |
| See previous design iterations | `07-Design-Context/` |
| Find an old doc (v1) | `99-Archive/` |
| Fix a dependency issue | `03-Implementation-Guides/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md` |
| Understand file/folder purpose | Each folder has a `README.md` |

---

## 🎯 The 3 Documents You Will Use Most

1. **Master Project Guide** — when you have a question about the product, design, or architecture
2. **Implementation Roadmap** — when you start a new sprint or feature
3. **Claude Code Master Prompt** — when you want to refactor or extend the codebase

Everything else is reference material.

---

## 🏗️ Project Status (June 2026)

| Phase | Status |
|-------|--------|
| **A. Design refresh** | ⏳ Pending (use Figma Make prompt) |
| **B. Tamagui foundation** | ⏳ Pending (use Claude Code Phase 1-3) |
| **C. Firebase integration** | ⏳ Pending (use Claude Code Phase 4) |
| **D. Multi-role navigation** | ⏳ Pending (use Claude Code Phase 5) |
| **E. Dashboards + Map** | ⏳ Pending (after Phase D) |
| **F. Verification + Chat** | ⏳ Pending |
| **G. Polish + Beta** | ⏳ Pending |

**Current code state**: 7 auth/onboarding screens with full UI but no Firebase integration. Design tokens defined. Security rules pre-written.

---

## 📝 Documentation Convention

- **Filenames**: PascalCase for guides (`IMPLEMENTATION_ROADMAP.md`), UPPERCASE for master prompts (`00-MASTER-FIGMA-MAKE-PROMPT.md`)
- **Numbered prefix** (`00-`, `01-`) controls reading order
- **`_v1.md`** suffix marks superseded documents in `99-Archive/`
- **Single source of truth**: when in doubt, the latest numbered `00-` document wins

---

## 🔄 Updating This Folder

When adding a new doc:
1. Place it in the correct numbered folder
2. Update this README's "Folder Structure" section
3. Add a row to the "Where to Find What You Need" table
4. If it supersedes an old doc, move the old one to `99-Archive/` with a `_v1.md` suffix

When deleting:
- Don't delete — move to `99-Archive/`
- The git history will tell future readers what was deprecated and why

---

## 🤝 For AI Tools (Claude, GPT, Cursor, etc.)

If you're an AI reading this folder to help with the project:

1. **Read first**: `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md` — this is the canonical product description
2. **Check the code**: the actual source is in `app/`, `screens/`, `constants/`, and `firebase/`
3. **Respect the design tokens**: `constants/theme.ts` is the source of truth — don't invent new colors
4. **Use the prompts as starting points**: `06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` is the safest way to request refactors
5. **Don't trust v1 docs**: anything in `99-Archive/` is superseded

---

*Maintained by SuhanVerse · Last updated June 2026*
