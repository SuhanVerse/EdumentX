# EdumentX Design Prompt Issues And Fixes

This note summarizes problems found in the attached Figma Make/Gemini prompt material and how the final prompt fixes them.

## Files Reviewed

- `/home/xlegion/.codex/attachments/cbc53d65-d6ec-4c95-88c4-eed8437d5297/pasted-text.txt`
- `/home/xlegion/Downloads/new prompt.md`
- `/home/xlegion/Downloads/now create a proper and detailed figma make promp....md`
- `/home/xlegion/Downloads/Edumentx_Design (Community)/src/app/routes.tsx`
- `/home/xlegion/Downloads/Edumentx_Design (Community)/src/styles/theme.css`
- `/home/xlegion/Downloads/Edumentx_Design (Community)/ATTRIBUTIONS.md`
- `/home/xlegion/Pictures/Screenshots/Screenshot from 2026-05-31 13-23-48.png`

## Issues Found

1. Citation artifacts such as `[cite: 11]` are present in the prompt text. These can leak into generated Figma layers and labels.

2. Some Markdown is escaped with backslashes, such as `\#`, `\+`, and `\[` patterns. This makes the prompt noisy and less readable.

3. The screenshot shows an AI response producing ASCII wireframes. That is useful for reasoning, but bad as a Figma Make prompt because it encourages text-box layouts instead of real UI frames.

4. The prompts disagree on screen count. Some say 24 screens, another includes 25, while the current Figma Make route file contains more routes including `EnrollmentDetail`, `SessionCode`, `NotificationsCenter`, and an `admin/settings` stub.

5. The prompts contain an admin login screen, but the product decision says admin should use the same unified login screen and route by role. A separate admin login would create duplicated auth UX.

6. The prompts say "no gradients" but also request gradient hero cards in some screens. The final prompt keeps the strict flat design rule and avoids gradient requirements.

7. The prompts say AI purple is exclusive, but one AI chat user bubble uses brand blue. The final prompt keeps AI active elements purple and uses neutral/light purple user bubbles inside the AI screen.

8. Some instructions are implementation-code terms, such as `numberOfLines={1}`. Figma Make should receive design language instead: "truncate long names with ellipsis".

9. Some descriptions are too technical for a design generator, such as "KNN proximity directory" or "database-side locked". The final prompt translates these into visible UI behavior.

10. Some map instructions ask for an "accurate vector cartographic rendering" of Kathmandu Valley. That is high risk for inaccurate output. The final prompt asks for a schematic Kathmandu Valley map style with clear labels and privacy-safe fuzzy radius overlays.

11. The route file maps `admin/settings` to `PlatformStats`, which means the settings screen is currently a stub. The final prompt asks for either an Admin Settings frame or a clearly marked placeholder.

12. The generated design references shadcn/ui, Unsplash, React Router, Tailwind, and browser UI conventions. The final prompt keeps these as source context only and asks for a mobile app UI that can be converted to React Native Expo.

13. Some button labels are inconsistent: "Approve Pass", "Approve-Teal", "Reject / Deny", and "Request Info". The final prompt standardizes admin actions to "Approve", "Request info", and "Reject".

14. Batch capacity is inconsistent across prompts: 4-5 students, 2-6 students, and 10/10 total students. The final prompt states: batch setup allows 2-6 students, recommended public/private batches are 4-5 students, and tutor capacity is shown separately from session slots.

15. Bottom navigation is inconsistent: student uses 5 tabs, tutor sometimes 4 and sometimes 5, admin sometimes 3 top tabs and 4 bottom tabs. The final prompt standardizes them.

## Final Prompt Fixes

- Removes citation markers, escaped Markdown noise, and ASCII diagram instructions.
- Makes the expected output explicit: polished Figma frames and components, not code and not wireframes.
- Uses one consistent design system based on the current theme tokens.
- Separates user roles and screen groups clearly.
- Preserves key product decisions: unified login, OTP only for signup, role selection once, fuzzy student location privacy, tutor verification tiers, group batches, capacity limits, reviews after completed sessions, and AI purple exclusivity.
- Adds missing states: empty, loading, offline, validation, permission, full-capacity, and verification-pending states.
- Adds component library requirements so the design can be reused cleanly in React Native Expo.
