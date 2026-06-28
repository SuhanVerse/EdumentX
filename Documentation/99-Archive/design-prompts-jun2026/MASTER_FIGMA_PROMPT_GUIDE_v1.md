# EdumentX: Master Figma Design & Model Guidance

This document provides the "Master Figma Design Prompt" for creating a professional, developer-grade prototype of EdumentX, along with guidance on which AI models to use for the various design tasks.

---

## 1. Master Figma Design Prompt
*Paste this comprehensive prompt into your preferred Figma AI tool (e.g., Figma Make, Musho, or Relume).*

```text
Create a premium, professional-grade mobile app UI prototype for EdumentX.

Goal:
Transition from a generic "AI-generated" look to a "Quiet Luxury" aesthetic. The app must feel like it was built by a senior product developer at a top-tier tech firm (like Apple, Stripe, or Linear).

Product Scope:
EdumentX is a location-based tutor-finding platform. It includes a multi-role ecosystem for Students/Parents, Tutors, and Admins.

Design Strategy (Sophisticated Slate & Amber):
- Palette: 
  - Primary (Night): #0F172A (Deep Navy Slate)
  - Accent (Amber): #B45309 (Polished Copper)
  - Secondary (Sand): #F1F5F9 (Cool Slate Background)
  - Surface: #FFFFFF (Pure White)
  - Success: #059669 (Forest Emerald)
- Typography: Plus Jakarta Sans (Geometric, modern, professional).
- Components: 8px-10px corner radius. multi-layered soft shadows. Hairline borders (0.5px).
- Visual Style: Flat, minimal, editorial. No heavy gradients, no bubbly pill buttons, no "AI-generated" glow effects.

Role-Based Layouts:
1. Student/Parent Flow:
   - S01 Home: Minimalist dashboard with "Sand" background. Night-colored headers. Card-based feed of tutors.
   - S02 Map: Precision street grid. Slate (#0F172A) landmasses, Amber (#B45309) location pulse.
   - S03 AI Chat: Purple-themed (#4F46E5) RAG assistant interface.
2. Tutor Flow:
   - S04 Dashboard: Metric-heavy grid (active students, earnings, ratings).
   - S05 Capacity Manager: Weekly availability grid with strict Slate/White styling.
   - S06 Verification Queue: Document upload interface with Emerald (#059669) status indicators.
3. Admin Flow:
   - S07 Verification Queue: High-density management table for approving tutor credentials.
   - S08 Platform Stats: Sophisticated data visualizations (line charts, bar charts) in Night/Copper colors.

Technical Requirements:
- Frame Size: 390x844px (iPhone 14).
- Use Auto Layout and Constraints everywhere.
- Export as reusable Figma Components and Design Tokens.

Screen List (Generate all):
Auth (Splash, Onboarding, Unified Login, OTP, Role Selection), Student Home, Map Search, Tutor Profile, AI Assistant, Tutor Dashboard, Capacity Manager, Admin Panel.

Final Deliverable:
A complete, linked prototype that signals trust, precision, and high-value educational services.
```

---

## 2. Model Selection Guide
Based on the capabilities required for each of your three refined prompts, here are the recommended AI models for the best results:

| Task / Prompt | Recommended Model | Why? |
| :--- | :--- | :--- |
| **1. Design System Extraction** | **Claude 3.5 Sonnet** | Best at precise code analysis and structured Markdown/TypeScript output. It won't hallucinate color codes. |
| **2. Rich Feature Visuals** | **GPT-4o (with DALL-E 3)** or **Midjourney v6** | Superior for creative visual conceptualization. GPT-4o is better if you want React Native code snippets for the visuals. |
| **3. Master Redesign Prompt** | **GPT-4o** or **Claude 3.5 Sonnet** | These "Frontier" models are best at following 500+ word complex instructions and maintaining architectural consistency. |
| **4. Figma Make (Figma Plugin)** | **GPT-4o** (Default in most plugins) | Most Figma AI plugins (like Musho) use GPT-4o for its high-quality UI layout generation and logical grouping. |

---

## 3. How to use these together
1.  **Step 1: Extract the System.** Run Prompt #1 in **Claude 3.5 Sonnet** to get your `DESIGN_SYSTEM.md`.
2.  **Step 2: Generate Visuals.** Run Prompt #2 in **GPT-4o** to get the actual React Native code for your onboarding illustrations.
3.  **Step 3: Build the UI.** Paste the **Master Figma Design Prompt** (from Section 1 above) into your **Figma Make** tool to generate the actual Figma frames.
4.  **Step 4: Refine with Developer Logic.** Use the **Master Redesign Prompt** (from `PROFESSIONAL_REDESIGN_STRATEGY.md`) with a coding agent to update your Expo project code to match the new Figma designs.
