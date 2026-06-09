# EdumentX System Directives

You are an expert React Native + NativeWind engineer building EdumentX.

## Architectural Rules

1. **Use standard React Native primitives** (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) for layout — apply styling through NativeWind `className` props, not inline `style={{}}` objects.
2. **Never use Tamagui.** All `@tamagui/*` packages and `tamagui.config.ts` have been removed. Do not reintroduce them.
3. **Never hardcode hex colors.** Always use design tokens defined in `tailwind.config.js` (e.g., `bg-night`, `text-amber`, `border-border`). The narrow exceptions are SVG illustrations (`components/illustrations/*`) where `react-native-svg` primitives need raw hex — those consume `constants/colors.ts`.
4. **Reference Sandbox:** The folder `Documentation/98-Reference-BasoBas/` contains a React web app. You may study its UX logic, component composition, and layout structures, but you MUST translate those concepts into pure React Native + NativeWind code before writing anything to our `app/` or `components/` directories.

## Translation Protocol

When referencing the BasoBas project (found in `Documentation/98-Reference-BasoBas/`):

* DO NOT copy BasoBas CSS, Tailwind classes, or standard React Native components wholesale — study the *ideas*, not the markup.
* ONLY study their UX flow, navigation logic, and layout composition.
* ALWAYS rewrite their UI logic into our EdumentX design system using React Native primitives + NativeWind classes (`bg-night`, `text-amber`, `rounded-card`, `p-4`).
* Read `Documentation/98-Reference-BasoBas/ANALYSIS.md` first for the per-file translation map.

## Current State (June 8, 2026)

**Phase 1.5 (NativeWind Migration) — Complete**

Installed and working:
* NativeWind 4.2.x + Tailwind CSS 3.4.x
* `babel-preset-expo` with `jsxImportSource: 'nativewind'` + `nativewind/babel` preset
* Metro: default `getDefaultConfig(__dirname, { isCSSEnabled: true })` (no Tamagui or reanimated wrappers)
* `app/_layout.tsx` imports `../global.css` (Tailwind base/components/utilities)
* 5 production deps: `nativewind`, `tailwindcss`, `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`
* 0 dev deps for styling (Tailwind + PostCSS are runtime/preset only)

Removed:
* All `@tamagui/*` packages, `tamagui`, `moti`
* `constants/tamagui.config.ts`, root `tamagui.config.ts`, `.tamagui/` cache
* `@tamagui/babel-plugin`, `@tamagui/metro-plugin`, `wrapWithReanimatedMetroConfig`
* `TamaguiProvider` from `app/_layout.tsx`

Palette refined for WCAG AA on white (unchanged):
* `semantic.success` `#047857` (5.48 contrast)
* `semantic.warning` `#B45309` (5.02 contrast)
* `text.muted` `#64748B` (4.76 contrast)
* `border.strong` `#64748B`

Screens migrated to NativeWind classes (9/9):
* ✅ `screens/onboarding/SplashScreen.tsx`
* ✅ `screens/onboarding/OnboardingScreen.tsx` (wired to 3 SVG illustrations)
* ✅ `screens/auth/PhoneEntryScreen.tsx`
* ✅ `screens/auth/OtpVerify.tsx`
* ✅ `screens/auth/Password.tsx`
* ✅ `screens/auth/RoleSelection.tsx`
* ✅ `screens/auth/ProfileScreen.tsx`
* ✅ `screens/auth/StudentProfileScreen.tsx`
* ✅ `screens/auth/TutorProfileScreen.tsx`

Shared components migrated (4/4 forms + 3/3 illustrations):
* ✅ `components/forms/AvatarUploader.tsx`
* ✅ `components/forms/ChipGroup.tsx`
* ✅ `components/forms/LocationField.tsx`
* ✅ `components/forms/NameEmailFields.tsx`
* ✅ `components/illustrations/DiscoverIllustration.tsx`
* ✅ `components/illustrations/AiMatchIllustration.tsx`
* ✅ `components/illustrations/VerifiedIllustration.tsx`

Build pipeline (expo SDK 54, NativeWind 4.2.x):
* `babel.config.js` uses `babel-preset-expo` with `jsxImportSource: 'nativewind'` + `nativewind/babel`. No reanimated/Tamagui plugins.
* `metro.config.js` uses `getDefaultConfig(__dirname, { isCSSEnabled: true })` only. The Documentation/98-Reference-BasoBas/ folder is excluded via `blockList`.
* `RoleSelection` routes to `/profile-student` or `/profile-tutor` based on the chosen role.
* `global.css` and `nativewind-env.d.ts` live at the project root and are imported by `app/_layout.tsx`.
* `tailwind.config.js` is the design-token source of truth. `constants/colors.ts` is a narrow fallback consumed only by SVG primitives.

Pending deliverables (post-migration):
* Run `npm run typecheck` to verify zero regressions.
* Rebuild the EAS dev client (one-time, after native deps changed).
* Connect Firebase auth in the auth sprint.
