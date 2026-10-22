# Design system

The app uses React Native primitives and NativeWind. The source of truth for visual tokens is [tailwind.config.js](../../tailwind.config.js); native props that need raw color values use [src/constants/colors.ts](../../src/constants/colors.ts).

Read [AGENTS.md](../../AGENTS.md) for the exact color/radius rules and narrow styling exceptions. Five custom ESLint rules enforce part of this contract.

Start reading UI code at [PrimaryButton.tsx](../../src/components/ui/PrimaryButton.tsx), [ScreenLayout.tsx](../../src/components/shared/ScreenLayout.tsx), and [inputs.ts](../../src/components/forms/inputs.ts). Then follow the [UI exercises](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) in the learning guide.

[Motion notes](motion.md) explain the existing animation helpers. Verify examples against [motion hooks](../../src/components/motion/hooks.ts) before copying them; the notes do not certify reduced-motion or accessibility coverage.

The [reference study and implementation](REFERENCE_RECONSTRUCTION.md) maps the barber-booking and VibeMove references to discovery, tutor cards, dashboard hierarchy, and motion, with the remaining device checks.

Original design PDFs and attribution are preserved under [design context](../07-Design-Context/README.md). The unrelated web export has been removed from the active tree; its markup was never the native app's implementation.
