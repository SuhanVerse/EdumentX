# EdumentX — Implementation Roadmap

> **Purpose**: A step-by-step guide for the developer (you) to follow. Each phase has prerequisites, exact commands, expected output, and verification steps.
>
> **Pair this with**: `06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` (the prompt you paste into Claude Code to do most of the work)
>
> **Pair this with**: `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md` (the prompt you paste into Figma Make for design)

---

## TL;DR — The 3-Phase Path

```
Phase A: Design (Figma)        — 1-2 weeks parallel
Phase B: Foundation (Tamagui)  — 1 sprint
Phase C: Backend (Firebase)    — 1 sprint
Phase D: Dashboards + Map      — 2 sprints
Phase E: Verification + Chat   — 1 sprint
Phase F: Polish + Beta launch  — 1 sprint
```

**Last updated**: June 6, 2026 — Phase B.2 is **in progress** (3/7 screens migrated, palette tuned, 2 typecheck errors remain). See "Phase 1 — Current State" below.

---

## Phase A — Design Refresh (1-2 weeks, in parallel with code work)

**Owner**: You + Figma Make
**Goal**: Get an industry-grade multi-role design with sidebar

### A.1 — Generate the design

1. Open your Figma AI tool (Figma Make, Musho, Relume, or Galileo)
2. Paste the **Phase 1** section of `00-MASTER-FIGMA-MAKE-PROMPT.md` — generates the design system tokens page
3. Paste **Phase 2** — generates the sidebar + bottom tab + role switcher
4. Paste **Phase 3** — generates all 9 onboarding/auth screens
5. Paste **Phase 4** — generates all 10 student screens
6. Paste **Phase 5** — generates all 8 tutor screens
7. Paste **Phase 6** — generates all 6 admin screens
8. Paste **Phase 7** — generates 12 edge-case states
9. Paste **Phase 8** — generates the component library

### A.2 — Extract the design system

Run the prompt in §8 of the Figma brief against the generated file. Save the output as `02-Design-System/EDUMENTX_DESIGN_SYSTEM_V2.md` for Claude Code to reference.

### A.3 — Quality gate

Verify against the checklist in §9 of the Figma brief before exporting. If anything fails, re-paste the relevant phase with clarifications.

**Deliverable**: A Figma file with **40+ screens** across 3 roles + design system page.

---

## Phase B — Foundation (Sprint 1: 1-2 weeks)

**Owner**: Claude Code (you drive it)
**Goal**: Tamagui + tokens + component library + Zustand

### B.1 — Pre-flight

```bash
# 1. Verify Node version
node -v   # must be ≥ 20.19.4

# 2. Update npm to latest
npm install -g npm@latest

# 3. Clean install
cd /media/xlegion/Win/PROJECTS/EdumentX
rm -rf node_modules package-lock.json
npm install
npx expo install --check

# 4. Set Claude Code to Custom Sonnet
/model
# Pick "Custom Sonnet model" (Option 3 in Ollama menu)
```

### B.2 — Execute Phase 1 of the Claude Code prompt

Paste the master prompt. Claude will:
1. Read all 7 screen files
2. Install Tamagui + dependencies
3. Create `constants/tamagui.config.ts` mirroring `theme.ts`
4. Create `babel.config.js` + `metro.config.js`
5. Wrap `app/_layout.tsx` in `TamaguiProvider`
6. Migrate all 7 screens to use `YStack`/`XStack`/`Button`/`Input`/`Text`

**Verify**:
```bash
npx expo start -c
# All 7 screens should look IDENTICAL to before
npm run typecheck
```

#### B.2.a — Phase 1 Current State (June 6, 2026)

**Done**:
- Tamagui 2.1.0 + driver + babel + metro plugins + reanimated + svg + async-storage installed.
- `constants/tamagui.config.ts` and `tamagui.config.ts` (root) created. Both import from `constants/theme.ts`. Animation driver: `@tamagui/config/reanimated` (NOT `@tamagui/animations-react-native`).
- `babel.config.js` with `babel-preset-expo` (`jsxImportSource: 'tamagui'`) + `@tamagui/babel-plugin` + `react-native-reanimated/plugin` (last).
- `metro.config.js` with `wrapWithReanimatedMetroConfig` + `TamaguiMetroPlugin`.
- `app/_layout.tsx` wrapped in `<TamaguiProvider config={tamaguiConfig} defaultTheme="light">`.
- 4 palette hex values tightened for WCAG AA on white: `semantic.success` `#047857`, `semantic.warning` `#B45309`, `text.muted` `#64748B`, `border.strong` `#64748B`.
- `tsconfig.json` excludes `Documentation/98-Reference-BasoBas/**` and `Documentation/99-Archive/**` from typecheck.
- 3 screens migrated to Tamagui primitives: `SplashScreen`, `OnboardingScreen`, `PhoneEntryScreen`.

**In progress / pending**:
- 2 typecheck errors in `PhoneEntryScreen.tsx` lines 159 & 192 — `backgroundColor={colors.border.strong}` props. Fix by wrapping with `style={{ backgroundColor: ... }}`.
- 4 screens still on React Native StyleSheet: `OtpVerify.tsx`, `Password.tsx`, `RoleSelection.tsx`, `ProfileScreen.tsx`.
- 3 illustration components not yet built: `components/illustrations/{DiscoverIllustration,AiMatchIllustration,VerifiedIllustration}.tsx` (no images, pure shape composition per the Figma Make FeatureVisuals prompt in `Documentation/gemini_chat_context.md`).
- Illustrations not yet wired into `OnboardingScreen.tsx`.

**B.2 acceptance gate (must pass before B.3)**:
- `npm run typecheck` returns 0 errors.
- `npx expo start -c` boots without a Tamagui config error.
- All 7 screens render with the same visual output as before the migration.
- 3 illustration components are imported and rendered inside `OnboardingScreen` instead of the `Ionicons` icons.

### B.3 — Execute Phase 2 of the Claude Code prompt

Claude will:
1. Create 15 reusable components in `components/ui/` and `components/layout/`
2. Refactor all 7 screens to use the components
3. Behavior should remain identical

**Verify**:
```bash
npm run typecheck
npx expo start -c
# All flows should work exactly as before
```

### B.4 — Execute Phase 3 of the Claude Code prompt

Claude will:
1. Create `lib/env.ts` (typed env reader)
2. Create `services/validation/` (phone, password, email, profile)
3. Create `store/registrationStore.ts` (Zustand + persistence)
4. Create `store/authStore.ts` + `store/uiStore.ts`
5. Create 5 custom hooks
6. Refactor screens to use store instead of `useState`

**Verify**:
```bash
npm run typecheck
npx expo start -c
# Try this: enter phone → kill app → reopen → phone number should still be there
```

### B.5 — Commit

```bash
git add .
git commit -m "feat: tamagui foundation + component library + zustand state"
git push
```

**Deliverable**: Tamagui-powered app, all 7 screens migrated, reusable components, persistent state.

---

## Phase C — Backend (Sprint 2: 1-2 weeks)

**Owner**: You (manual Firebase setup) + Claude Code (wiring)

### C.1 — Firebase project setup (DO THIS MANUALLY)

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `edumentx-dev` (and `edumentx-prod` later)
3. Enable Google Analytics: yes
4. Region: **asia-south1** (Mumbai — closest to Nepal)
5. Wait for project creation (~30s)

### C.2 — Enable Authentication

1. In Firebase Console → **Authentication** → Get started
2. **Sign-in method** tab → enable:
   - ✅ **Phone** (primary for students/parents)
   - ✅ **Email/Password** (fallback + admin)
   - ✅ **Google** (optional, for social login)
3. For Phone auth: add test phone number `+9779800000000` with code `123456` for local testing

### C.3 — Create Firestore database

1. **Firestore Database** → Create database
2. Start in **production mode** (we have rules ready)
3. Region: **asia-south1** (Mumbai)

### C.4 — Create Storage bucket

1. **Storage** → Get started
2. Start in **production mode**
3. Use default bucket

### C.5 — Register Android app

1. Project Settings (⚙️) → General → Your apps → **Add app** → Android
2. Package name: `com.suhanverse.edumentx`
3. App nickname: `EdumentX`
4. **SHA-1**: Run this in your terminal:
   ```bash
   cd /media/xlegion/Win/PROJECTS/EdumentX
   npx expo credentials:manager
   # → Android
   # → Keystore
   # → Display Fingerprint
   # Copy the SHA-1
   ```
5. Paste SHA-1 in the Firebase form
6. Download `google-services.json` → place in project root
7. Update `app.json`:
   ```json
   "android": {
     "package": "com.suhanverse.edumentx",
     "googleServicesFile": "./google-services.json"
   }
   ```

### C.6 — Populate `.env`

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
cat > .env <<'EOF'
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=edumentx-dev.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=edumentx-dev
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=edumentx-dev.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
EXPO_PUBLIC_APP_ENV=development
EOF
```

Also update `app.json` to expose these via `extra`:
```json
{
  "expo": {
    "extra": {
      "firebaseApiKey":            "...",
      "firebaseAuthDomain":        "...",
      "firebaseProjectId":         "...",
      "firebaseStorageBucket":     "...",
      "firebaseMessagingSenderId": "...",
      "firebaseAppId":             "..."
    }
  }
}
```

### C.7 — Start emulators

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
firebase emulators:start
# Open http://localhost:4000 to see the emulator UI
```

In another terminal:
```bash
# Add to .env so the app connects to emulators
echo 'EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true' >> .env
```

### C.8 — Execute Phase 4 of the Claude Code prompt

Claude will:
1. Create `services/firebase/{config,auth,firestore,storage,errors}.ts`
2. Create `types/user.ts`
3. Create `hooks/useAuth.ts`
4. Refactor all auth screens to call real Firebase functions
5. Update Firestore + Storage security rules

**Verify**:
```bash
# Test full signup flow:
# 1. Enter +977 9800000000 (test number)
# 2. Enter 123456 (test OTP)
# 3. Set password "TestPass123"
# 4. Select "Student" role
# 5. Fill profile
# 6. Click "Finish setup"
# → Should create user in Firebase Auth
# → Should create user document in Firestore (check emulator UI)
# → Should navigate to dashboard
```

### C.9 — Commit

```bash
git add .
git commit -m "feat: firebase auth + firestore + storage integration"
git push
```

**Deliverable**: Working signup/login with real Firebase backend, user data persisted, secure rules in place.

---

## Phase D — Dashboards + Map (Sprint 3-4: 2-3 weeks)

**Owner**: Claude Code (in pieces) + manual testing

### D.1 — Multi-role navigation (Phase 5 of Claude prompt)

Claude will:
1. Restructure routes into `app/(auth)/` and `app/(app)/` groups
2. Create sidebar + bottom tab + top bar components
3. Create role-based home pages (placeholders)
4. Set up auth-state-based redirect

**Verify**:
```bash
npm run typecheck
npx expo start -c
# Complete signup as Student → land on /student/home
# (For now it's a placeholder — focus is on routing)
```

### D.2 — Student screens (in order)

1. **Home dashboard** — greeting, stats, recommended tutors
2. **Discover/Map** — Google Maps with tutor pins
3. **Tutor list** — `FlashList` of tutor cards
4. **Tutor detail** — full profile + "Request enrollment" CTA
5. **Enrollments** — tabs: Active / Pending / Past
6. **Chat list + thread** — Firestore real-time listeners

For each, prompt Claude Code with:
```
Implement the Student Home screen at app/(app)/student/home.tsx using the 
components from components/ui/ and the layout from components/layout/. 
It should show:
- Greeting with user's first name (from authStore)
- 3 stat cards (active sessions, saved tutors, hours this week) — placeholder data for now
- "Continue learning" carousel of current tutors (use FlashList)
- "Recommended for you" section
- "Nearby tutors" preview

Use the Tamagui design tokens. No inline styles. Follow the Figma brief in 
Documentation/06-Prompts/Figma-Make/ for visual specs.
```

### D.3 — Tutor screens (in order)

1. **Dashboard** — 4 stat cards + pending requests + upcoming sessions
2. **Profile editor** — avatar, name, bio, subjects, hourly rate
3. **Schedule** — week-view calendar
4. **Requests inbox** — accept/decline enrollment requests
5. **Verification queue** — 4-step document upload flow
6. **Earnings** — chart + transaction list

### D.4 — Map integration

Install:
```bash
npx expo install react-native-maps expo-location
```

Then prompt Claude:
```
Add Google Maps integration to /student/discover. Use react-native-maps. 
- Show all tutor locations as custom pins (use the tutor's avatar in a copper ring)
- Pulsing current-location dot (use Animated API)
- Search bar at top with filter chips (Subject, Distance, Rating, Price)
- Bottom sheet (collapsible) showing tutor list below the map
- Tap a pin → open tutor detail
```

**Google Maps API key**:
1. Go to https://console.cloud.google.com
2. Enable Maps SDK for Android and iOS
3. Create API key
4. Add to `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
5. Restrict the key to your package name (Android) and bundle ID (iOS)

### D.5 — Commit per feature

```bash
git add .
git commit -m "feat(student): home dashboard with stats and recommended tutors"
git push

# ... continue for each screen
```

**Deliverable**: Working Student and Tutor dashboards with map, list, detail, enrollments.

---

## Phase E — Admin + Verification (Sprint 5: 1 week)

**Owner**: Claude Code + manual review

### E.1 — Admin screens

1. **Console home** — 4 KPI cards + activity feed
2. **Verification queue** — data table with approve/reject actions
3. **User management** — data table with role filters
4. **Analytics** — charts (use `react-native-svg-charts` or `victory-native`)

### E.2 — Tutor verification flow

1. Tutor uploads ID document → goes to Firebase Storage
2. Tutor uploads education proof → goes to Firebase Storage
3. Tutor records short video intro → goes to Firebase Storage
4. Admin reviews in `/admin/verifications/:id` → approves/rejects
5. Tutor's profile shows "Blue Tick Pro" badge

Update Firestore rules to handle verification documents.

**Deliverable**: Admin can review and approve tutors.

---

## Phase F — Polish + Beta (Sprint 6: 1 week)

**Owner**: You + Claude Code

### F.1 — Polish checklist

- [ ] All loading states have spinners/skeletons
- [ ] All error states have friendly messages
- [ ] All empty states have illustrations + CTAs
- [ ] All buttons have `accessibilityLabel`
- [ ] All touch targets are ≥ 44px
- [ ] KeyboardAvoidingView wraps every form
- [ ] Dark mode variants for top 5 screens
- [ ] Onboarding is swipeable
- [ ] Password strength checks character variety
- [ ] Haptic feedback on key actions
- [ ] Toast notifications for success/error

### F.2 — Performance audit

```bash
# Use React DevTools Profiler to check for unnecessary re-renders
# Use FlashList instead of FlatList for lists > 20 items
# Use expo-image instead of Image for all remote images
# Memoize expensive components
```

### F.3 — Accessibility audit

- [ ] All text has 4.5:1 contrast on its background
- [ ] All interactive elements work with screen reader
- [ ] All form errors are announced
- [ ] Dynamic Type is respected

### F.4 — Build & distribute

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for Android (preview = APK)
eas build --platform android --profile preview

# You'll get a URL — share with testers
# They install the APK on their phone
```

### F.5 — App Store assets

Create:
- App icon (1024×1024 for iOS, 512×512 for Android)
- Splash screen (1242×2436 for iOS, 1920×1080 for Android)
- Screenshots (5-8 per platform)
- App description (4000 chars max)
- Keywords
- Privacy policy URL
- Support URL

---

## Testing Strategy

### Local development
- Use Expo Go for fast iteration on UI
- Use Firebase emulators for backend testing without hitting production
- Use `npx expo start -c` after any config change

### Staging
- Deploy to `edumentx-dev` Firebase project
- Build with `eas build --profile preview` for testers
- Distribute via Firebase App Distribution (Android) or TestFlight (iOS)

### Production
- Deploy to `edumentx-prod` Firebase project
- Submit to Play Store (Android) and App Store (iOS)
- Use `eas submit` to automate store uploads

---

## When to Use Claude Code vs Do It Yourself

| Task | Use Claude Code? | Why |
|------|------------------|-----|
| Generate boilerplate components | ✅ Yes | Repetitive, error-prone |
| Migrate screens to new library | ✅ Yes | Mechanical transformation |
| Write Firebase service functions | ✅ Yes | Standard patterns |
| Design tokens config | ✅ Yes | Many values, easy to mistype |
| Add new screen from Figma | ✅ Yes | Pattern is well-established |
| Debug build errors | ⚠️ Partially | Claude can read errors but you may need to verify |
| Performance optimization | ⚠️ Partially | Claude can suggest, you verify |
| Security-critical code (rules) | ❌ No | Always review yourself |
| App store metadata | ❌ No | Marketing/UX writing |
| Architecture decisions | ❌ No | Discuss with humans |

---

*Generated for EdumentX · June 2026 · v2.0 · Last updated June 6, 2026 (Phase 1 in progress)*
