# EdumentX Design & Feature Prompts

This document contains specialized prompts tailored for the **EdumentX** project. These prompts are designed to be used with AI agents or as guidance for developers to maintain design consistency and build high-quality visual components.

---

## Prompt 1: Design System Documentation Extraction

**Goal:** Create a comprehensive design system website or document based on the existing EdumentX codebase.

**Prompt Content:**
> I have a mobile app design with screens already built for **EdumentX**. I need you to extract and document a complete design system from the existing code that developers can use for implementation.
>
> **App name:** EdumentX
> **Target platform:** iOS, Android, and Web (React Native / Expo)
> **Frame size:** 390×844px (iPhone 14)
>
> Analyze the existing screens and constants in my codebase (specifically `constants/theme.ts`, `constants/colors.ts`, `constants/spacing.ts`, and `constants/typography.ts`) and create a comprehensive design system website that includes:
>
> 1. **Color Tokens**
>    - Extract brand colors: Primary (#1A56DB), AI (#4F46E5), Verification (#0D9E75), Splash (#174780).
>    - Document semantic colors (Success, Warning, Danger, Info).
>    - Document surface and text hierarchies.
>
> 2. **Typography Scale**
>    - Font families used (System/Inter).
>    - Size scale: `heroTitle` (28px), `screenTitle` (22px), `sectionTitle` (15px), `body` (13px), `caption` (11px).
>    - Weight and line-height mappings.
>
> 3. **Spacing & Radii System**
>    - Extract the 2px to 32px spacing scale.
>    - Document border radius constants: `card` (12px), `hero` (18px), `circle` (999px).
>
> 4. **Component Specs**
>    - **Buttons:** Primary (12px radius, 52px height), Secondary (10px radius, 44px height).
>    - **Inputs:** 48px height, 10px radius, specific background and border colors.
>    - **Cards:** 12px radius, specific shadow/border patterns.
>    - **Badges:** Document status variants (Active, Verified, Pending, Suspended) with their specific background/text pairs.
>
> 5. **Design Tokens File**
>    - Generate a `tokens.ts` file that exports these values as a clean TypeScript object.
>    - Include light mode and potential dark mode variants.
>
> 6. **Component Usage Guidelines**
>    - When to use `heroTitle` vs `screenTitle`.
>    - Accessibility notes for color contrast (specifically with brand blue and text colors).
>
> **Output format:** Create a DESIGN_SYSTEM website or a structured Markdown document.

---

## Prompt 2: Rich Feature Visuals for Onboarding

**Goal:** Build high-quality, code-based illustrations for the EdumentX onboarding carousel.

**Prompt Content:**
> I have an onboarding carousel that showcases **3** core features of **EdumentX**, a location-based tutor finding platform. The current placeholders need to be replaced with rich, visual feature illustrations built with actual React Native components.
>
> **App context:** EdumentX connects students/parents with nearby verified tutors using maps and AI recommendations.
> **Design system:** Modern, clean, professional blue palette (#1A56DB), high-quality typography, subtle shadows, and rounded cards (12px-18px).
>
> **Core features to showcase:**
> 1. **Location-based Discovery:** Find tutors in your immediate neighborhood.
> 2. **Verified Tutors:** Every tutor undergoes a strict credential verification process.
> 3. **Smart Recommendations:** AI-powered tutor matching based on learning goals.
>
> For each feature, create a visual illustration component named `FeatureVisual` using actual React Native elements (Views, Text, SVG via `react-native-svg`). Each illustration should:
>
> - **Slide 1 (Discovery):** Build a mini-map interface with marker pins, a pulsing "current location" dot, and a tutor preview card popping up from the bottom.
> - **Slide 2 (Verification):** Build a "Credential Badge" animation. Show a tutor profile card with a large green "Verified" badge appearing with a checkmark animation, surrounded by floating icons of degrees and certificates.
> - **Slide 3 (AI Match):** Build a mini "Matching" UI. Show a student avatar and a tutor avatar with a glowing purple connection line (#4F46E5) and floating "AI tags" like "Calculus Expert", "Top Rated", "5km Away".
>
> **Technical Requirements:**
> - Use the project's existing `theme` constants from `@/constants/theme`.
> - Use `View`, `Text`, and `Animated` (or `moti`/`reanimated` if preferred) for micro-interactions.
> - Fit within a 300×300px container.
> - Background colors should match the onboarding theme:
>   - Discovery: `#E8F0FE`
>   - Verification: `#E0F5EE`
>   - AI Match: `#EEF2FF`
>
> **Output:** Create a `FeatureVisual` component that takes an `index: number` prop and renders the appropriate rich illustration.
