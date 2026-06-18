# AI Prompts

> **Purpose**: Production-ready prompts for use with AI design and code tools. Each prompt is the result of multiple iterations and is kept up-to-date as the project evolves.

## Available Prompts

### 🎨 Figma Make (Design)

**File**: [`Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md`](./Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md)

Generates a complete, industry-grade, multi-role UI design for EdumentX with:
- Sidebar navigation (responsive, collapses to bottom tab on mobile)
- 3 user roles: Student/Parent, Tutor, Admin
- 40+ screens including all dashboards, map, chat, verification
- Design system tokens page (colors, typography, spacing, components)
- Edge cases (loading, empty, error, success)
- Dark mode variants for top 5 screens

**When to use**: When starting a new design iteration, or when you need to refresh the visual direction.

**Compatible tools**: Figma Make, Musho, Relume, Galileo AI, Uizard.

### 💻 Claude Code (Engineering)

**File**: [`Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`](./Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md)

Refactors the EdumentX codebase to:
- Use **NativeWind 4.2 + Tailwind 3.4** as the styling layer (Tamagui is no longer in the stack — see `00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md §16.1`)
- Establish a Firebase service layer (`auth`, `firestore`, `errors`) using the **Firebase JS SDK**, not `@react-native-firebase/*`
- Add Zustand for global state with persistence (Phase 4)
- Set up multi-role navigation (Student/Tutor/Admin) via `app/(auth)/` and `app/(app)/` route groups

**When to use**: When you want to migrate the codebase to a production-ready architecture, or when adding major new features.

**Compatible tools**: Claude Code (VS Code), Cursor (with Claude model), Anthropic API directly.

> **Note**: the master prompt itself was last updated for the Tamagui world. As of June 12, 2026 the active plan is `05-Build-and-Deploy/firebase-auth-plan.md` (audited). If you re-paste the master prompt, you will get suggestions that contradict the current NativeWind + Firebase-JS-SDK state — always reference the plan + operations doc instead.

### 🛰️ Gemini Antigravity + Claude (Firebase Sprint)

**File**: [`antigravity-integration.md`](./antigravity-integration.md)

Explains how to pair **Antigravity** (the Google AI Pro / Firebase console agent) with **Claude Code** to cover the full Firebase sprint. Antigravity handles the console-side ops (project creation, provider enable, rules review, doc inspection); Claude handles the code-side (plan execution, debug, refactor). Includes a 3-day sprint workflow and a rules-review feedback loop.

**When to use**: During Phase C (Backend / Firebase) of the implementation roadmap.

**Compatible tools**: Antigravity (Firebase Console) + Claude Code.

## How to Use These Prompts

### Quick Start
1. Open your AI tool
2. Make sure it's set to the right model:
   - **Figma Make**: any model works, but GPT-4-class or Claude Sonnet-class recommended
   - **Claude Code**: minimax-m3 / Custom Sonnet (NOT generic "Custom" — see warning below)
3. Copy-paste the entire prompt
4. Attach the files listed in §7 (Figma Make) or have the codebase open (Claude Code)
5. Review the output before committing

### ⚠️ Model Selection Warning (For Claude Code)

The Claude Code CLI changes its behavior based on the model name it thinks it's using:

| Ollama Option | What it means | Recommended? |
|---------------|---------------|--------------|
| **Option 3 — Custom Sonnet model** | Optimized for Sonnet-style coding | ✅ **YES** — best for refactors |
| Option 2 — Custom Opus model | Larger context, slower | ⚠️ OK for huge codebases, slow for small ones |
| Option 5 — Custom model | Generic fallback | ❌ NO — defensive behavior, limited tools |

Always pick **Option 3** (Custom Sonnet) for this project.

### Iteration Strategy

Don't try to run all 5 phases of the Claude Code prompt at once. Instead:
1. Paste the master prompt
2. Wait for Phase 1 to complete
3. Review the diff in VS Code
4. Run `npm run typecheck` to catch issues
5. If happy, say "Continue with Phase 2"
6. Repeat for each phase

For Figma Make:
1. Paste Phase 1 (design system)
2. Review the tokens
3. If happy, paste Phase 2 (app shell)
4. Continue one phase at a time

## Updating These Prompts

When the project changes (new screens, new tokens, new architecture):
1. Update the relevant master prompt
2. Bump the version in the prompt header
3. Move the old version to `99-Archive/`
4. Update this README

## See Also

- [`../00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md`](../00-Overview/EDUMENTX_MASTER_PROJECT_GUIDE.md) — product & design reference
- [`../03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`](../03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md) — when to use these prompts in the project lifecycle
- [`../99-Archive/`](../99-Archive/) — older versions of these prompts

---

*Maintained by SuhanVerse · June 2026*
