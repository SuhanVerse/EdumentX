# BasoBas reference inventory and translation boundaries

This overview was written on 17 October 2026 to repair the missing reference entry point named by AGENTS.md. The older per-file analysis was not present in the inspected working tree; this is a new inventory, not a recovered historical map.

BasoBas is a separate property-marketplace reference project. None of its screens, backend policies, auth setup, or payment assumptions define current EdumentX behavior.

## What is preserved

| Location | Purpose |
| --- | --- |
| [basobas-app/](basobas-app/) | Original reference application source |
| [basobas-figma/](basobas-figma/) | Reference design export and its attribution |
| [Basobas_report.pdf](Basobas_report.pdf) | Original report |

Generated graph output and macOS AppleDouble metadata were removed after an external backup. The reference application's source and design attribution are preserved.

## How to use it

Study the user flow, navigation sequence, information grouping, and interaction states. Then locate the corresponding native EdumentX feature in the [learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md).

| Reference concern | EdumentX implementation to study |
| --- | --- |
| Search and map composition | [MapSearch](../../src/screens/student/MapSearch.tsx), [TutorMap](../../src/components/map/TutorMap.tsx) |
| Profile and onboarding steps | [Auth screens](../../src/screens/auth) |
| Request and roster interaction | [Enrollments domain](../../src/services/enrollments) |
| Sandbox payment state changes | [eSewa guide](../05-Build-and-Deploy/esewa_integration.md) |
| Shared layout rhythm | [ScreenLayout](../../src/components/shared/ScreenLayout.tsx) |

Do not copy web markup, CSS, classes, or platform-specific components into the native app. Rewrite the idea with React Native primitives, NativeWind, and EdumentX tokens. Do not import BasoBas's Clerk/Supabase auth approach. Review its asset and code attribution before reuse.
