# EdumentX: Professional Developer Redesign Strategy

This document outlines the transition from a generic "AI-generated" aesthetic to a **Professional, Developer-Grade** mobile experience. It includes the new design tokens and updated prompts for implementation.

## 1. The "Sophisticated Slate & Amber" Palette
To avoid the "AI look" (oversaturated blues/purples) and the "common look" (basic black and white), we use a high-contrast, professional palette inspired by premium educational institutions and modern tech platforms (like Stripe or Linear).

| Role | Color | Hex | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary (Night)** | Deep Navy Slate | `#0F172A` | Primary text, headers, and dark-mode backgrounds. |
| **Accent (Amber)** | Polished Copper | `#B45309` | CTAs, progress bars, and high-importance highlights. |
| **Secondary (Sand)** | Cool Slate | `#F1F5F9` | Page backgrounds, subtle card surfaces. |
| **Surface** | Pure White | `#FFFFFF` | Primary cards and floating elements. |
| **Border** | Subtle Silver | `#E2E8F0` | Ultra-thin separators (0.5pt - 1pt). |
| **Success** | Forest Emerald | `#059669` | Verification badges and positive feedback. |

## 2. Typography & Component DNA
- **Font Family:** **"Plus Jakarta Sans"** (Modern, geometric, and looks "custom-built" compared to standard system fonts).
- **Corner Radius:** **8px to 10px** (Sharp enough to look professional, rounded enough to feel modern). Avoid "pill" buttons unless for small tags.
- **Elevation:** Use **multi-layered soft shadows** instead of heavy black shadows.
- **Borders:** Use **hairline borders** (`StyleSheet.hairlineWidth`) for a precision-engineered look.

---

## 3. Updated Design System Prompt
*Use this prompt to extract and document the new, enhanced design system.*

> **Prompt:**
> I am building **EdumentX**, a premium location-based tutor finding platform. I need you to document a design system that feels like it was built by a senior product designer at a top-tier tech firm (e.g., Apple, Stripe, or Linear).
>
> **Avoid the "AI Look":** No oversaturated blue/purple gradients, no generic pill buttons, and no heavy shadows.
>
> **Design Tokens:**
> - **Base Colors:** Night (#0F172A), Sand (#F1F5F9), and Pure White (#FFFFFF).
> - **Accent:** Polished Copper (#B45309) for high-impact CTAs.
> - **Typography:** Plus Jakarta Sans. Hierarchy: Bold display headers (24-30px), Medium section titles (16-18px), and Regular body text (14px).
> - **Spacing:** Strict 8pt grid system.
> - **Components:**
>   - **Buttons:** 10px radius, subtle 1px border for secondary buttons.
>   - **Inputs:** Focused state should use a 2px Night (#0F172A) ring.
>   - **Cards:** White surface, #E2E8F0 border, and a "Soft Depth" shadow (0 4px 12px rgba(15, 23, 42, 0.05)).
>
> **Deliverable:** Create a `DESIGN_SYSTEM.md` that maps these values and provides usage guidelines for "Professional Developer" implementation.

---

## 4. Updated Rich Feature Visuals Prompt
*Use this to generate the high-quality onboarding illustrations.*

> **Prompt:**
> Create a `FeatureVisual` component for **EdumentX** onboarding. These visuals must look like high-end "Product UI" illustrations, not cartoonish icons.
>
> **Visual Style:**
> - Use a "Layered Depth" aesthetic.
> - Backgrounds: Use the Sand (#F1F5F9) or a very light Copper-tinted white.
> - Elements: Use actual UI components (mini-cards, profile avatars, list items).
>
> **Features to Illustrate:**
> 1. **Discovery:** A mini-map using Slate (#0F172A) for landmasses and White for the tutor cards. Use a Copper (#B45309) pulse for the user location.
> 2. **Verification:** A clean, minimal tutor profile card. When "Verified" is active, show a subtle glowing Emerald (#059669) ring and a sharp, thin checkmark.
> 3. **AI Matching:** A "Connection Map" showing nodes. Use thin Slate lines and Copper "energy" dots moving between the student and the tutor.
>
> **Technical:** Built with pure React Native `View` and `Text`. No images. Focus on layout precision and micro-animations.

---

## 5. MASTER REDESIGN PROMPT (Final App Prompt)
*Use this for the complete redesign/implementation of the app.*

> **Prompt:**
> **Task:** Redesign and implement the core UI for **EdumentX** to look like a premium, professional mobile application for both iOS and Android.
>
> **Strategic Objective:** Move away from "AI-looking" templates. The goal is a "Quiet Luxury" aesthetic that signals trust, precision, and high-value education.
>
> **Architecture & Code Standards:**
> - **Theming:** Centralize everything in `constants/theme.ts`. Use TypeScript types for the theme to ensure 100% type safety across the app.
> - **Spacing:** Implement a strict `spacing` object (2, 4, 8, 12, 16, 24, 32, 48, 64).
> - **Platform Parity:** Use `Platform.select` to ensure headers look like native iOS headers and Android Material 3 headers where appropriate, but maintain a unified brand feel.
> - **Clean Code:** Use functional components, custom hooks for logic, and memoization for expensive UI components to ensure 60fps performance.
>
> **Visual Requirements:**
> - **Primary Palette:** Night (#0F172A), Sand (#F1F5F9), Copper (#B45309).
> - **Typography:** Standardize on Plus Jakarta Sans. Use `letterSpacing` adjustments for uppercase labels to look "Editorial."
> - **Depth:** Use "Layered Surfaces." No standard shadows; use border-bottom or subtle multi-blur shadows to create a feeling of floating elements.
> - **Interactions:** Implement subtle feedback on press (opacity 0.7 for buttons, slight scale down).
>
> **Deliverable:** Update all existing screens (Splash, Onboarding, Phone Entry) and the `constants/` files to match this professional developer standard.
