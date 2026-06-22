# EdumentX — Implementation Roadmap

> **Purpose**: A step-by-step guide for the developer (you) to follow. Each phase has prerequisites, exact commands, expected output, and verification steps.
>
> **Pair this with**: `06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` (the prompt you paste into Claude Code to do most of the work)
>
> **Pair this with**: `06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md` (the prompt you paste into Figma Make for design)

---

## TL;DR — The Path

```
Phase 1.5: Foundation (NativeWind)    ✅ COMPLETE (June 8, 2026)
Phase 2:   Babel fix + RNFirebase     ⏳ NEXT — see Phase B
Phase 3:   Backend (Firebase Auth)     ⏳ see Phase C
Phase 4:   Dashboards (role landing)  ✅ UI shipped (mock data) — wire to Firestore in Phase D
Phase 5:   Map + Search + Bookings    ⏳ see Phase E
Phase 6:   Admin + Verification       ⏳ see Phase F
Phase 7:   Polish + Beta launch       ⏳ see Phase G
```

**Last updated**: June 12, 2026 — Phase 1.5 (NativeWind) is **complete**, Phase 2 (babel + RNFirebase native deps) is **next** and unblocks Phase 3 (Firebase). The plan in `05-Build-and-Deploy/firebase-auth-plan.md` has been audited, corrected, and rewritten to use `@react-native-firebase/*` (the native SDK) — see `05-Build-and-Deploy/firebase-auth-plan-audit.md` for the full diff, in particular **finding #14** which describes the SDK override.

> **Architectural correction (June 12, 2026)**: the original roadmap described Phase B as a "Tamagui foundation" sprint. That work was started, then **reverted on June 8, 2026 in favor of NativeWind 4.2 + Tailwind CSS 3.4**. All Tamagui packages and config files have been removed. If you see `@tamagui/*` references anywhere in the docs, they are stale. The only token source of truth is now `tailwind.config.js`.

---

## Phase 1.5 — Foundation (NativeWind) ✅ COMPLETE (June 8, 2026)

**Owner**: Claude Code (you drive it)
**Goal**: Production-grade design tokens + component-ready screens

**What was done**:

- Reverted the partial Tamagui migration and started over with **NativeWind 4.2.5 + Tailwind CSS 3.4.19**.
- `babel.config.js` now uses `babel-preset-expo` (`jsxImportSource: 'nativewind'`) + `nativewind/babel`. No reanimated or Tamagui plugins.
- `metro.config.js` uses `getDefaultConfig(__dirname, { isCSSEnabled: true })` wrapped with `withNativeWind`. `Documentation/98-Reference-BasoBas/` is excluded via `blockList`.
- `tailwind.config.js` is the **single source of truth** for design tokens. `constants/colors.ts` is a narrow fallback consumed only by SVG primitives.
- 9/9 screens migrated to NativeWind: `SplashScreen`, `OnboardingScreen`, `PhoneEntryScreen`, `OtpVerify`, `Password`, `RoleSelection`, `ProfileScreen`, `StudentProfileScreen`, `TutorProfileScreen`.
- 4/4 form components + 3/3 illustration components migrated.
- Palette tuned for WCAG AA on white: `semantic.success` `#047857`, `semantic.warning` `#B45309`, `text.muted` `#64748B`, `border.strong` `#64748B`.

**What is still open in Phase 1.5**:

- `screens/auth/ProfileScreen.tsx` is dead code and gets deleted as part of Phase 3 (Step 3.b of the Firebase plan).
- `RoleSelection` doesn't write `role` to the registration shim — fixed as part of Phase 3 Step 3.b.
- `screens/auth/PhoneEntryScreen.tsx` still has an `Alert.alert` placeholder at submit; replaced as part of Phase 3.

**Verify the current state**:

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
grep -rn "@tamagui" . --include="*.ts" --include="*.tsx" --include="*.json" 2>/dev/null
# expect: 0 matches
grep -rn "tamagui.config" . --include="*.ts" --include="*.tsx" 2>/dev/null
# expect: 0 matches
npm run typecheck
# expect: 0 errors
```

---

## Phase B — Babel fix + Webview (Sprint 2.0: ~1 day)

**Owner**: You (manual edits) + Claude Code (verification)
**Goal**: Unblock Phase 3 by fixing the `installTurboModule` crash and installing the native deps Firebase needs.

### B.1 — Add the worklets babel plugin

The dev client crashes with `TurboModule method "installTurboModule" called with 0 arguments` because `react-native-reanimated@~4.1.1` requires the `react-native-worklets/plugin` babel transform to register its TurboModule on the new architecture. This is **independent of Firebase** but blocks everything.

Edit `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
      "react-native-worklets/plugin", // MUST be last
    ],
  };
};
```

**Verify**:

```bash
npx expo start -c
# expect: no "installTurboModule" error, no gesture-handler crash
```

### B.2 — Install Native React Native Firebase (RNFirebase) + `expo-build-properties`

> **Why RNFirebase, not the JS SDK**: see `05-Build-and-Deploy/firebase-auth-plan-audit.md` finding #14. The JS SDK would force us to ship `react-native-webview` for invisible reCAPTCHA, which (a) is a hacky workaround, (b) costs us a network round-trip per send, and (c) isn't the industry standard. RNFirebase hooks into Google Play Integrity on Android and APNs on iOS for native, first-party device verification — no webview, no reCAPTCHA, no iframe.

```bash
# Add RNFirebase modules (native code, REBUILD dev client after)
npx expo install @react-native-firebase/app \
                 @react-native-firebase/auth \
                 @react-native-firebase/firestore

# Required for RNFirebase 21.x on Expo SDK 54 / new architecture
npx expo install expo-build-properties

# Drop anything JS-SDK-era we no longer need
npm uninstall firebase react-native-webview
```

After install, **rebuild the dev client** (RNFirebase ships native code):

```bash
eas build --profile development --platform android --clear-cache
# install the new APK on your Realme
```

**Verify**:

```bash
grep -E '"@react-native-firebase/(app|auth|firestore)"' package.json
# expect: all three listed in dependencies
grep -E '"(firebase|react-native-webview)"' package.json
# expect: NOT in dependencies (the uninstall step actually removed them)
```

### B.3 — Drop `google-services.json` at the project root

1. Open the Firebase Console → Project Settings → Your apps → Android app (`com.anonymous.edumentx`).
2. If the Android app isn't registered yet, click **Add app** → Android → use package name `com.anonymous.edumentx` → register.
3. **Add both fingerprints** under "SHA certificate fingerprints" — paste the SHA-1 and SHA-256 values from your `eas credentials` output. (The Firebase Console's "Display Fingerprint" section is the source of truth; if those don't match what `eas credentials` shows, re-paste from the CLI.)
4. Click **Download google-services.json** and save the file to the **project root** (same level as `app.json` and `package.json`).
5. Do **not** add `@react-native-firebase/app` as a config plugin in `app.json` — RNFB 21.x auto-initializes from `google-services.json` at native build time. Adding it will throw "plugin not found" on `expo prebuild`.

**Verify**:

```bash
ls -lh google-services.json
# expect: file present, ~1-2 KB
cat google-services.json | head -3
# expect: JSON opening with "project_info", "client": [...]
```

### B.4 — `app.json` `expo-build-properties` block

Add the `expo-build-properties` plugin entry to `app.json` (required for RNFirebase 21.x on Expo SDK 54):

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["expo-build-properties", {
        "android": {
          "compileSdkVersion": 35,
          "targetSdkVersion": 35,
          "minSdkVersion": 24
        }
      }]
    ]
  }
}
```

**Verify**:

```bash
grep -A 6 'expo-build-properties' app.json
# expect: the plugin block from above
```

### B.5 — Commit

```bash
git add babel.config.js app.json package.json package-lock.json google-services.json
git commit -m "feat: switch to @react-native-firebase/* + expo-build-properties"
git push
```

**Deliverable**: dev client boots cleanly; RNFirebase installed; `google-services.json` at root; `expo-build-properties` configured; ready for Phase 3.

---

## Phase C — Backend (Sprint 2.1: 1-2 weeks)

**Owner**: You (manual Firebase setup) + Claude Code (wiring) + **Antigravity** (optional, for Firebase console ops — see `06-Prompts/antigravity-integration.md`)
**Implementation plan**: `05-Build-and-Deploy/firebase-auth-plan.md` (audited June 12, 2026)
**Operations doc**: `04-Firebase/phase-3-notes.md`

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
3. For Phone auth: add test phone number `+9779800000000` with code `123456` for local testing
4. **Do NOT enable Email/Password or Google yet** — the v1 admin flow uses Firestore lookup, not Firebase Auth (see `04-Firebase/phase-3-notes.md §4`)

### C.3 — Create Firestore database

1. **Firestore Database** → Create database
2. Start in **production mode** (we have rules ready in `firebase/firestore.rules`)
3. Region: **asia-south1** (Mumbai)

### C.4 — Create Storage bucket

1. **Storage** → Get started
2. Start in **production mode**
3. Use default bucket

### C.5 — Android app registration (DO THIS — RNFirebase needs it)

> **Required because**: RNFirebase reads `google-services.json` at native build time. Without the file, every `import auth from '@react-native-firebase/auth'` call returns an uninitialized auth instance, and the app crashes on first `signInWithPhoneNumber`.

1. Firebase Console → Project Settings → Your apps
2. Click **Add app** → choose the **Android** icon
3. **Android package name**: `com.anonymous.edumentx` (must match `app.json` exactly)
4. **App nickname**: `EdumentX Android`
5. **Debug signing certificate SHA-1**: paste the SHA-1 from your `eas credentials` → Display Fingerprint output
6. **Debug signing certificate SHA-256**: paste the SHA-256 from the same output
7. Click **Register app** → **Download google-services.json** → save to the **project root** (same level as `app.json` and `package.json`)
8. **Do not** add `@react-native-firebase/app` as a config plugin in `app.json` — RNFB 21.x auto-initializes. Adding it will throw "plugin not found" on `expo prebuild`.

If you change the Android package name in `app.json` or rotate the keystore (`eas credentials` → Keystore → Reset), the SHA-1/SHA-256 change and you must re-register the app in the Firebase Console and re-download `google-services.json`. The old one will silently break auth.

### C.6 — Verify `google-services.json` and `.env`

```bash
cd /media/xlegion/Win/PROJECTS/EdumentX
ls -lh google-services.json
# expect: file present at project root

cat .env
# expect: EXPO_PUBLIC_FIREBASE_* keys present (edumentx-dev project)
```

**Important**: with RNFirebase, `.env` only carries the
`EXPO_PUBLIC_FIREBASE_*` API keys for the dev project. RNFirebase
reads them via `google-services.json` at **native build time**, not
from `process.env` at runtime. The runtime config is one source of
truth now: `google-services.json`.

### C.7 — (no emulator in MVP)

The MVP does **not** use the Firebase Local Emulator Suite. The dev
build talks directly to the live `edumentx-dev` project on Google's
servers. To push a rule change from `firebase/firestore.rules` to
the live project, either:

* Paste the file contents into the Firebase Console
  (`console.firebase.google.com/project/edumentx-dev/firestore/rules`)
  and click **Publish**, **or**
* Run `firebase deploy --only firestore:rules` after `firebase login`
  (one-time). The CLI reads `firebase.json` from the repo root and
  deploys the file referenced under `firestore.rules`.

The local emulator (`firebase emulators:start`) is a useful tool for
offline rule iteration but is not wired into the dev build. If you
later want to add it back, the wiring pattern is in the Git history
of `services/firebase/emulator.ts` before it was removed in June
2026.

### C.8 — Execute the Firebase auth plan

Paste this into Claude Code:

```
Implement the Firebase Auth + dashboards plan in 
Documentation/05-Build-and-Deploy/firebase-auth-plan.md (13 steps, audited 
June 12 — see firebase-auth-plan-audit.md for the 14 corrections, in 
particular finding #14 about the @react-native-firebase/* SDK). Read the 
plan first, then the operations doc in 04-Firebase/phase-3-notes.md, then 
execute Steps 0–13 in order. After each step, run `npm run typecheck` to 
catch regressions. Stop and ask if any step contradicts the actual code 
(screens, lib/registration.ts, tailwind.config.js, package.json) — do not 
silently invent paths.
```

Claude will:
1. Verify `google-services.json` is at the project root (Step 1.b)
2. Add `expo-build-properties` plugin to `app.json` (Step 1.c)
3. Create `services/firebase/{authService,firestoreService,errors,emulator}.ts` (Steps 3, 5, 6) — no `config.ts` (RNFirebase auto-initializes)
4. Create `store/authStore.ts` + `hooks/useAuth.ts` + `hooks/useRedirectAfterAuth.ts` (Step 4)
5. Refactor `PhoneEntryScreen`, `OtpVerify`, `Password`, `RoleSelection` (Step 3.b + Step 8)
6. Create 3 dashboards in `screens/dashboards/` + 3 routes in `app/(app)/` (Step 9)
7. Update `firebase/firestore.rules` to allow the subcollections and the public-read admins (Step 10)
8. Add validation pure-functions in `services/validation/` (Step 11)
9. Delete `screens/auth/ProfileScreen.tsx` (dead code)
10. Move existing auth routes from `app/*.tsx` into `app/(auth)/*.tsx`

**Verify**:

```bash
# Typecheck
npm run typecheck
# expect: 0 errors

# Boot
npx expo start -c
# expect: no installTurboModule error, no auth/argument-error from reCAPTCHA
# expect: no "Firebase not initialized" warnings from RNFirebase

# Run the 3 e2e paths from plan Step 13:
# 1. Student: phone → OTP → password → role=Student → profile → dashboard
# 2. Tutor: phone → OTP → password → role=Tutor → profile → dashboard
# 3. Admin: phone-entry → Log in tab → admin@edumentx.dev / Admin@123 → admin dashboard
# (Run the seedAdmins script once to create the admin doc: `node scripts/seedAdmins.ts`)
```

### C.9 — Commit

```bash
git add .
git commit -m "feat: firebase auth + firestore + role dashboards (phase 3)"
git push
```

**Deliverable**: end-to-end auth that works (student/tutor OTP signup, admin email login) with v1 security caveats documented in `04-Firebase/phase-3-notes.md`.

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

Use the NativeWind design tokens (see `tailwind.config.js`). No inline styles. Follow the Figma brief in 
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

## Recent Updates (June 19, 2026)

**Auth sprint v2 — completed in this session.** Five follow-ups to the original Phase 3 plan, all wired and typechecked:

- **Dashboards with mock data** — `/student-home` and `/tutor-home` shipped as UI-only milestones (PRs #28, #30). The `_layout.tsx` redirect guard now gates on `useRootNavigationState()` to prevent the "Attempted to navigate before mounting the Root Layout component" crash, and routes the signed-in user straight to the right dashboard after picking a role.
- **Logout from dashboards** — added a "Log out" Pressable at the bottom of both `student_home.tsx` and `tutor_home.tsx`. The button calls `authService.logout()` (modular RNFirebase v22+ API), clears the local Zustand auth store via the new `useAuthStore.reset()` action, and `router.replace('/phone-entry')`. Confirmation dialog included so an accidental tap doesn't destroy the session.
- **Profile screens wired to Firestore** — `StudentProfileScreen.tsx` and `TutorProfileScreen.tsx` now write to `users/{uid}/studentProfile/default` and `users/{uid}/tutorProfile/default` respectively (per `Documentation/04-Firebase/phase-3-notes.md` §3). Submit button shows "Saving…" and is disabled during the write. Falls back to `/phone-entry` if there's no signed-in user. The `registration` shim is still updated first so the in-flight navigation reads the cached draft.
- **100%-free Email Verification** — new route `/email-signup` (file `screens/auth/EmailSignUp.tsx`) handles both signup and login via email + password. On signup, `authService.signUpWithEmail()` calls `createUserWithEmailAndPassword` and immediately `sendEmailVerification`. The screen flips to a "check your inbox" pending state with a "Resend verification email" link and an "I've verified — continue" button that calls `currentUser.reload()` to re-read the server-side `emailVerified` claim. The `_layout.tsx` redirect guard also enforces this: any user whose `providerData` includes `"password"` but whose `user.emailVerified` is `false` is routed to `/email-signup` until they verify.
- **`LocationField` city input documented** — the `MIN_CITY_LENGTH = 2` threshold in `components/forms/LocationField.tsx` only gates the "Set" badge (not the `TextInput` itself). The `TextInput` has no `maxLength` prop; the user can type any number of characters into the local `draft` state. An explanatory comment was added so this isn't mistaken for a `maxLength={2}` bug again.

**Files added**: `screens/auth/EmailSignUp.tsx`, `app/email-signup.tsx`.

**Files modified**: `app/_layout.tsx` (redirect guard + emailVerified check + new Stack screen), `services/firebase/authService.ts` (3 new helpers: `signUpWithEmail`, `loginWithEmail`, `sendVerificationAgain`), `store/authStore.ts` (new `reset()` action), `components/forms/LocationField.tsx` (clarifying comment), `screens/auth/StudentProfileScreen.tsx` (Firestore write), `screens/auth/TutorProfileScreen.tsx` (Firestore write), `screens/auth/PhoneEntryScreen.tsx` ("Continue with email" entry point), `screens/student/student_home.tsx` (logout button), `screens/tutor/tutor_home.tsx` (logout button), `.expo/types/router.d.ts` (add `/email-signup` to the typed-routes union).

**Verification**: `npm run typecheck` → 0 errors.

---

*Generated for EdumentX · June 2026 · v3.1 · Last updated June 19, 2026 (Dashboards merged, profiles wired to Firestore, logout added, free Email Verification live).*
