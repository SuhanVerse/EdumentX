# EdumentX System Directives

You are an expert React Native + NativeWind engineer building EdumentX.

## Architectural Rules

1. **Use standard React Native primitives** (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) for layout — apply styling through NativeWind `className` props, not inline `style={{}}` objects.
2. **Never use Tamagui.** All `@tamagui/*` packages and `tamagui.config.ts` have been removed. Do not reintroduce them.
3. **Never hardcode hex colors.** Always use design tokens defined in `tailwind.config.js` (e.g., `bg-night`, `text-amber`, `border-border`). The narrow exceptions are SVG illustrations (`components/illustrations/*`) where `react-native-svg` primitives need raw hex — those consume `constants/colors.ts`.
4. **Reference Sandbox:** The folder `Documentation/98-Reference-BasoBas/` contains a React web app. You may study its UX logic, component composition, and layout structures, but you MUST translate those concepts into pure React Native + NativeWind code before writing anything to our `app/` or `components/` directories.
5. **Auth is native Firebase Auth.** Use `@react-native-firebase/auth` (`getAuth(getApp())`, `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInWithCredential`, etc.) and `@react-native-google-signin/google-signin` for Google Sign-In. The unified entry point is `screens/auth/EmailSignUp.tsx` — it hosts both the Email + Password form and the "Continue with Google" button. Do NOT reintroduce Clerk; a one-day pivot to Clerk (June 20) was reverted the next day (Clerk's `integration_firebase` template is discontinued for new accounts). The Clerk-pivot history is archived under `Documentation/99-Archive/2026-06-21-clerk-revert/`.
6. **Zero-budget / free-tier only.** This project is a college demo built without an international credit card. **Never suggest Firebase Cloud Storage, Firebase Cloud Functions, Google Maps SDK, Google Places API, OpenAI, Anthropic, Cohere, Mapbox, or Algolia** — all require a paid plan or card. Object storage lives in **Supabase Storage** (1 GB free, no card). Map tiles come from **OpenStreetMap** via `react-native-maps` `<UrlTile>` (no key). Geocoding uses **Nominatim** (keyless). Distance / KNN / matching math runs **client-side** (no Cloud Functions). The RAG chatbot uses **Groq** or **HuggingFace Serverless Inference** (free dev tier). Before adding any new dependency, update `Documentation/01-Architecture/ARCHITECTURE.md` §0 with a row justifying it as zero-budget. If it can't be justified, replace the feature or remove it.

## Translation Protocol

When referencing the BasoBas project (found in `Documentation/98-Reference-BasoBas/`):

* DO NOT copy BasoBas CSS, Tailwind classes, or standard React Native components wholesale — study the *ideas*, not the markup.
* ONLY study their UX flow, navigation logic, and layout composition.
* ALWAYS rewrite their UI logic into our EdumentX design system using React Native primitives + NativeWind classes (`bg-night`, `text-amber`, `rounded-card`, `p-4`).
* Read `Documentation/98-Reference-BasoBas/ANALYSIS.md` first for the per-file translation map.

## Current State (June 21, 2026)

**Phase 2 (Native Firebase Auth) — Complete**

Identity lives in native Firebase Auth. Two free methods are wired up:
**Email + Password** (via `createUserWithEmailAndPassword` +
`sendEmailVerification`) and **Google Sign-In** (via
`@react-native-google-signin/google-signin` + `signInWithCredential`).
There is no Clerk, no SMS, and no phone provider — Firebase's SMS OTP
requires the paid Blaze plan, and a one-day Clerk pivot (June 20) was
reverted after Clerk discontinued their `integration_firebase` template
for new accounts.

The Clerk-pivot history is archived under
`Documentation/99-Archive/2026-06-21-clerk-revert/`.

**Auth flow (Email + Password / Google):**
- `screens/auth/EmailSignUp.tsx` — single auth entry screen with a
  "Sign up" / "Log in" toggle. On signup, calls
  `signUpWithEmail(...)` and flips to a "check your inbox" pending
  panel that hosts the **"I've verified — continue"** button. That
  button is the only place the app calls
  `auth.currentUser.reload()` — without it, the cached `User`
  object's `emailVerified` flag stays stale and the layout guard
  refuses to advance. This was Bug #4 in the June 21 audit.
- `screens/auth/EmailSignUp.tsx` — also hosts the "Continue with
  Google" button, which calls `signInWithGoogle()`. Google users are
  auto-verified by Google and skip the inbox step entirely.

**Auth-flow routing ("Source of Truth"):**
`app/_layout.tsx` runs a 5-step redirect tree on every render where
`user` / `role` / `segments` change:
1. Wait for the root navigator to mount (`useRootNavigationState()`).
2. `!user` → `/email-signup`.
3. `user && !emailVerified && password-provider` → `/email-signup`
   (the "check your inbox" panel; user can also sit on the screen
   freely).
4. `user && verified && !role` → `/role-selection` (first-time
   signup, no doc yet).
5. `user && verified && role` → matching dashboard.

Step 5 was Bug #1 ("Amnesia Login Loop") — an existing user with a
populated `users/{uid}.role` was being sent back to
`/role-selection` on login. The fix: read the role inside the
`onAuthStateChanged` callback (not in a separate effect) and write
it to the Zustand store **before** the redirect effect runs, so the
guard sees the populated role on its first pass.

**Phase flow (after auth):**
```
email-signup        ← single auth surface (signup or login)
  ↓ (verified, role still null)
role-selection      ← pick student or tutor (writes role to Firestore)
  ↓ (role set)
profile-student     ← collect username, phone, grade, subjects, location
  or profile-tutor  ← collect username, phone, headline, bio, monthly rate
  ↓ (profile subcollection written)
student-home        ← live dashboard (reads users/{uid} + profile subdoc)
  or tutor-home
```

**Files at play in this flow:**
- ✅ `app/_layout.tsx` (Source-of-Truth routing + onAuthStateChanged)
- ✅ `screens/auth/EmailSignUp.tsx` (signup + login + Google + "I've verified — continue")
- ✅ `screens/auth/RoleSelection.tsx` (writes role, routes to /profile-* not dashboard)
- ✅ `screens/auth/StudentProfileScreen.tsx` (writes
  `users/{uid}/studentProfile/default`)
- ✅ `screens/auth/TutorProfileScreen.tsx` (writes
  `users/{uid}/tutorProfile/default`, uses `monthlyRateNpr`)
- ✅ `screens/student/student_home.tsx` (live `onSnapshot` reads,
  shows real `fullName` + `locationLabel`)
- ✅ `screens/tutor/tutor_home.tsx` (live `onSnapshot` reads, shows
  real `fullName` + verified flag)
- ✅ `services/firebase/authService.ts` (modular RNFirebase API,
  Google Sign-In, no OTP)
- ✅ `components/forms/LocationField.tsx` (`MIN_CITY_LENGTH = 3`, not
  2 — the location-field bug from the June 21 audit)
- ✅ `lib/registration.ts` (no more Clerk-pivot type-level
  placeholders)

**Files removed in this pivot:**
- ❌ `screens/auth/PhoneEntryScreen.tsx`
- ❌ `screens/auth/OtpVerify.tsx`
- ❌ `screens/auth/Password.tsx`
- ❌ `app/phone-entry.tsx`
- ❌ `app/otpverify.tsx`
- ❌ `app/create_password.tsx`
- ❌ `components/ClerkFirebaseBridge.tsx`
- ❌ `@clerk/clerk-expo`, `expo-crypto`, `expo-secure-store`,
  `expo-web-browser`, `expo-application`
- ❌ `Documentation/04-Firebase/Clerk_Integration.md` (moved to
  archive)

**Build pipeline (expo SDK 54, NativeWind 4.2.x, native Firebase):**
- `babel.config.js` uses `babel-preset-expo` with
  `jsxImportSource: 'nativewind'` + `nativewind/babel`. No
  reanimated/Tamagui plugins.
- `metro.config.js` uses `getDefaultConfig(__dirname, { isCSSEnabled: true })`
  only. The `Documentation/98-Reference-BasoBas/` folder is excluded
  via `blockList`.
- `app/_layout.tsx` mounts `<GestureHandlerRootView>` →
  `<SafeAreaProvider>` → `<Stack>`. The Stack always renders (no
  conditional tree returns — that breaks expo-router child
  tracking). The loading overlay sits on top via
  `pointerEvents="none"`.
- `users/{uid}` is the only Firestore root document the auth flow
  touches. Role + verified flag drive the redirect guard.
- `useRootNavigationState()` gate prevents `router.replace()` from
  firing before the navigator mounts.

**Pending deliverables:**
- Rebuild the EAS dev client with the updated native deps (Clerk
  packages removed, `@react-native-google-signin/google-signin`
  restored).
- Wire metric values (rating, reviews, response rate, monthly
  earnings) in `tutor_home.tsx` — they're still mock data.
- Wire the `MOCK_TUTORS` list in `student_home.tsx` to a real
  `tutors` collection query.

