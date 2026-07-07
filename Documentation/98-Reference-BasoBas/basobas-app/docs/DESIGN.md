# BasoBas Design System

## Overview

This design system draft was generated from Figma and suggests a clear accent color for emphasis, a light and spacious background foundation, strong readable text contrast, structured layout patterns. It is intended as a working specification for UI generation, design system documentation, and AI-assisted layout exploration. Review semantic tokens and component rules before using it as a final source of truth.

---

## Colors

- Primary (#1A6B4A): Main call-to-action buttons, active highlights, and strong emphasis.
- Background (#FAFAF8): Page background and large canvas areas.
- Surface (#FAFAFA): Cards, panels, modals, and elevated containers.
- Text (#0A0A0A): Headings, body copy, and primary reading content.
- Border (#E8E8E8): Subtle dividers, input borders, and low-emphasis outlines.
- Muted Text (#6B6B6B): Secondary copy, helper text, and low-emphasis metadata.
- Supporting Color (#FFFFFF): Secondary or contextual color requiring manual semantic review before reuse as a primary accent.
- Supporting Color (#ABABAB): Secondary or contextual color requiring manual semantic review before reuse as a primary accent.
- Supporting Color (#F5F5F5): Secondary or contextual color requiring manual semantic review before reuse as a primary accent.

## Typography

- Headline Font: [Manual input required]
- Body Font: [Manual input required]
- No local text styles found

---

## Spacing

Base unit: **8px**
- xs: 4px — Tight inline gaps
- sm: 8px — Compact component spacing
- md: 16px — Default padding
- lg: 24px — Card padding and section gutters
- xl: 32px — Larger section spacing

## Border Radius

- sm: 4px — Small tags, chips, compact corners
- md: 8px — Buttons, inputs, cards
- lg: 16px — Panels, larger containers
- full: 9999px — Pills, avatars, circular elements

## Elevation

- Gentle, diffused shadows are recommended unless stronger hierarchy is clearly required.
- sm: Buttons, chips, small overlays.
- DEFAULT: Cards, dropdowns, standard floating surfaces.
- md: Elevated cards, side panels, larger floating regions.
- lg: Modals and high-priority overlay containers.

## Components

### Buttons
- **Primary**: #1A6B4A fill, #FFFFFF text, no border, radius 8px.
- **Primary Hover**: #176043 fill, #FFFFFF text, no border.
- **Primary Focus**: #1A6B4A fill, #FFFFFF text, 3px ring #1A6B4A1F.
- **Primary Disabled**: #1A6B4A fill, #FFFFFF text, 40% opacity.

- **Secondary**: transparent fill, #0A0A0A text, 1px #E8E8E8 border, radius 8px.
- **Secondary Hover**: #0A0A0A0A fill, #0A0A0A text, 1px #E8E8E8 border.
- **Secondary Focus**: transparent fill, #0A0A0A text, 1px #1A6B4A border, 3px ring #1A6B4A1F.
- **Secondary Disabled**: transparent fill, #6B6B6B text, 1px #E8E8E8 border, 40% opacity.

- **Ghost**: transparent fill, #6B6B6B text, no border, radius 8px.
- **Ghost Hover**: #0A0A0A06 fill, #0A0A0A text, no border.
- **Ghost Focus**: transparent fill, #0A0A0A text, 3px ring #1A6B4A1F.
- **Ghost Disabled**: transparent fill, #6B6B6B text, no border, 40% opacity.

### Cards
- **Default**: #FAFAFA fill, 1px #E8E8E8 border, radius 8px.
- **Elevated**: #FAFAFA fill, soft elevation, radius 8px.
- **Large Panel**: #FAFAFA fill, subtle border or elevation, radius 16px.

### Inputs
- **Default**: #FAFAFA fill, 1px #E8E8E8 border, text color #0A0A0A, radius 8px.
- **Hover**: #FAFAFA fill, 1px #BEBEBE border, text color #0A0A0A.
- **Focus**: #FAFAFA fill, 1px #1A6B4A border, 3px ring #1A6B4A1F.
- **Error**: #FAFAFA fill, 1px #EF4444 border, 3px ring #EF44441F.
- **Disabled**: #FAFAFA fill, 1px #E8E8E8 border, text color #6B6B6B, 40% opacity.

### Layout Containers
- Use #FAFAFA for contained regions.
- Use #FAFAF8 for page-level background areas.
- Use 16px only for larger panels or special containers.
- Keep radii and spacing consistent across repeated containers.

---

## Layout Principles

- Use generous whitespace between sections and repeated content groups.
- Prefer card-based grouping for related content and modular page regions.
- Maintain spacing rhythm based on the 8px system.
- Keep page background and surface colors visually distinct when depth or grouping is needed.
- Reuse existing auto layout patterns instead of inventing one-off container structures.

## Do's and Don'ts

1. **Do** use #1A6B4A for key interactive emphasis only.
2. **Do** keep page backgrounds consistent with #FAFAF8.
3. **Do** preserve strong readability with #0A0A0A for core reading content.
4. **Do** maintain a compact, repeatable radius and spacing rhythm across repeated UI.
5. **Don't** introduce additional accent colors unless intentionally extending the system.
6. **Don't** use supporting colors as new CTA colors without explicitly defining their role.
7. **Don't** replace Primary with other extracted blues unless explicitly promoted to a semantic token.
8. **Don't** mix unrelated shadow styles or multiple border treatments without purpose.

## Extracted Source Notes

- Auto-generated from Figma on 2026-06-21.
- Source of truth: Figma file.
- File: BasoBas
- Scope: Current Page
- Root nodes scanned: 1
- Auto layout containers found: 19
- This draft combines extracted signals with inferred semantic rules.
- Manual input required: Responsive
