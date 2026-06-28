# Files To Attach With The Figma Make Prompt

Attach only the files that help Figma Make understand the design. Avoid uploading secrets, build folders, or dependency folders.

## Best Attachments

Use these with `FINAL_FIGMA_MAKE_PROMPT.md`:

```text
Documentation/design-context/EdumentX-Design-Extraction.md
constants/theme.ts
Prompts/FigmaMake/FINAL_FIGMA_MAKE_PROMPT.md
Prompts/FigmaMake/DESIGN_PROMPT_ISSUES_AND_FIXES.md
```

## If You Want Figma Make To Understand The Current Expo App

Add:

```text
README.md
package.json
app.json
app/_layout.tsx
app/index.tsx
app/onboarding.tsx
app/phone-entry.tsx
screens/onboarding/SplashScreen.tsx
screens/onboarding/OnboardingScreen.tsx
screens/auth/PhoneEntryScreen.tsx
constants/colors.ts
constants/spacing.ts
constants/typography.ts
```

## If You Want Figma Make To Understand The Existing Web/Figma Export

Add from the design export folder:

```text
/home/xlegion/Downloads/Edumentx_Design (Community)/src/app/routes.tsx
/home/xlegion/Downloads/Edumentx_Design (Community)/src/app/App.tsx
/home/xlegion/Downloads/Edumentx_Design (Community)/src/app/data/mockData.ts
/home/xlegion/Downloads/Edumentx_Design (Community)/src/styles/theme.css
/home/xlegion/Downloads/Edumentx_Design (Community)/ATTRIBUTIONS.md
```

Add individual screen files only when asking Figma Make or another AI to improve a specific screen.

## Do Not Attach

```text
.env
.env.*
node_modules/
.expo/
dist/
android/
ios/
firebase-debug.log
API keys
Firebase secrets
service account files
google-services.json
GoogleService-Info.plist
```

## Recommended Upload Order

1. `FINAL_FIGMA_MAKE_PROMPT.md`
2. `EdumentX-Design-Extraction.md`
3. `theme.ts`
4. Current screen screenshots, if you want visual matching
5. Current Expo screen files, only if code context is needed

## Short Instruction To Add Before Uploading

```text
Use the prompt as the main instruction. Use the attached design extraction and theme tokens as reference context. Create visual Figma Make app screens, not ASCII wireframes, not a code-only answer, and not a written report.
```
