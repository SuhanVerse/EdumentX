# EdumentX System Directives

You are an expert React Native and Tamagui engineer building EdumentX.

## Architectural Rules

1. **Never use standard React Native Views or inline styles.** Always use Tamagui structural primitives (`YStack`, `XStack`, `ZStack`).
2. **Never use Tailwind or NativeWind.** We rely exclusively on Tamagui props.
3. **Never hardcode hex colors.** Always use our Tamagui design tokens (e.g., `bg="$night"`, `color="$amber"`, `bg="$sand"`).
4. **Reference Sandbox:** The folder `Documentation/98-Reference-BasoBas/` contains a React web app. You may study its UX logic, component composition, and layout structures, but you MUST translate those concepts into pure Tamagui/React Native code before writing anything to our `app/` or `components/` directories.

## Translation Protocol

When referencing the BasoBas project (found in `Documentation/98-Reference-BasoBas/`):

* DO NOT copy BasoBas CSS, Tailwind, or standard React Native components.
* ONLY study their UX flow, navigation logic, and layout composition.
* ALWAYS rewrite their UI logic into our EdumentX design system using Tamagui components (`XStack`, `YStack`, `Button`, `Sheet`) and our `$night`, `$amber`, `$sand` tokens.
* Read `Documentation/98-Reference-BasoBas/ANALYSIS.md` first for the per-file translation map.

## Current State (June 6, 2026)

**Phase 1 (Tamagui Foundation) — In Progress**

Installed and working:
* Tamagui 2.1.0 + `@tamagui/config/reanimated` driver
* 7 production deps: `tamagui`, `@tamagui/config`, `@tamagui/animations-react-native`, `@tamagui/font-inter`, `react-native-svg`, `react-native-reanimated`, `@react-native-async-storage/async-storage`
* 2 dev deps: `@tamagui/babel-plugin`, `@tamagui/metro-plugin`
* Babel: `@tamagui/babel-plugin` + `react-native-reanimated/plugin` (must be last)
* Metro: `TamaguiMetroPlugin` + `wrapWithReanimatedMetroConfig`
* `app/_layout.tsx` wrapped in `<TamaguiProvider config={tamaguiConfig} defaultTheme="light">`

Palette refined for WCAG AA on white:
* `semantic.success` `#059669` → `#047857` (3.77 → 5.48 contrast)
* `semantic.warning` `#D97706` → `#B45309` (3.19 → 5.02 contrast)
* `text.muted` `#94A3B8` → `#64748B` (2.56 → 4.76 contrast)
* `border.strong` `#94A3B8` → `#64748B`

Screens migrated to Tamagui primitives (7/7):
* ✅ `screens/onboarding/SplashScreen.tsx`
* ✅ `screens/onboarding/OnboardingScreen.tsx` (wired to 3 SVG illustrations)
* ✅ `screens/auth/PhoneEntryScreen.tsx`
* ✅ `screens/auth/OtpVerify.tsx`
* ✅ `screens/auth/Password.tsx`
* ✅ `screens/auth/RoleSelection.tsx`
* ✅ `screens/auth/ProfileScreen.tsx`
* ✅ `screens/auth/StudentProfileScreen.tsx` (migrated previously)
* ✅ `screens/auth/TutorProfileScreen.tsx` (migrated previously)

Onboarding illustrations (3/3 — shape compositions, no images):
* ✅ `components/illustrations/DiscoverIllustration.tsx`
* ✅ `components/illustrations/AiMatchIllustration.tsx`
* ✅ `components/illustrations/VerifiedIllustration.tsx`

Known typecheck noise: (none — `npm run typecheck` is clean as of June 6, 2026)
* `Documentation/98-Reference-BasoBas/**` is excluded from typecheck via `tsconfig.json` — it is a Figma-Make web export, not our app.

Build pipeline (expo SDK 54, Tamagui 2.1.0):
* `babel.config.js` uses `babel-preset-expo` (default JSX runtime) + `@tamagui/babel-plugin` (transforms `<YStack>` to `createTamaguiElement`) + `react-native-reanimated/plugin` (must be last). Do NOT set `jsxImportSource: 'tamagui'` — that subpath is not exported in v2.x.
* `metro.config.js` uses `getDefaultConfig(__dirname, { isCSSEnabled: true })` + `withTamagui(config, {...})` (v2.x export — not the old `TamaguiMetroPlugin` factory) + `wrapWithReanimatedMetroConfig` (outermost).
* `@tamagui/animations-moti` and `moti` are required runtime deps (peer of the reanimated animation driver). Install both before bundling.
* `RoleSelection` routes to `/profile-student` or `/profile-tutor` based on the chosen role (the old `/profile` route was deleted).

Pending Phase 1 deliverables:
* Fix the 2 PhoneEntryScreen typecheck errors.
* Migrate the 4 unmigrated auth screens to Tamagui.
* Build 3 onboarding illustration components (`components/illustrations/{DiscoverIllustration,AiMatchIllustration,VerifiedIllustration}.tsx`) — shape compositions, no images, per `Documentation/gemini_chat_context.md` FeatureVisuals prompt.
* Wire illustrations into `OnboardingScreen.tsx` (replace the current `Ionicons` icons).
* Final `npm run typecheck` must be clean.

Reference: see `Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md` Phase B and `Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` for the long-form plan.

Context: Before making structural changes, refer to Documentation/gemini_chat_context_v2.md to understand the transition from Expo Go to the EAS Dev Client, and our Tamagui token rules.
