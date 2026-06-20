# EdumentX System Directives

You are an expert React Native + NativeWind engineer building EdumentX.

## Architectural Rules

1. **Use standard React Native primitives** (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`) for layout — apply styling through NativeWind `className` props, not inline `style={{}}` objects.
2. **Never use Tamagui.** All `@tamagui/*` packages and `tamagui.config.ts` have been removed. Do not reintroduce them.
3. **Never hardcode hex colors.** Always use design tokens defined in `tailwind.config.js` (e.g., `bg-night`, `text-amber`, `border-border`). The narrow exceptions are SVG illustrations (`components/illustrations/*`) where `react-native-svg` primitives need raw hex — those consume `constants/colors.ts`.
4. **Reference Sandbox:** The folder `Documentation/98-Reference-BasoBas/` contains a React web app. You may study its UX logic, component composition, and layout structures, but you MUST translate those concepts into pure React Native + NativeWind code before writing anything to our `app/` or `components/` directories.
5. **Clerk is the only auth library.** Use `@clerk/clerk-expo` for sign-in, sign-up, email OTP, Google OAuth, sessions, and sign-out. The only place `@react-native-firebase/auth` may be touched is inside `components/ClerkFirebaseBridge.tsx`, where it consumes a Clerk-minted custom token via `signInWithCustomToken` to bridge into Firestore. Do not call `getAuth`, `signInWithCustomToken`, or `firebaseSignOut` anywhere else in the codebase.

## Translation Protocol

When referencing the BasoBas project (found in `Documentation/98-Reference-BasoBas/`):

* DO NOT copy BasoBas CSS, Tailwind classes, or standard React Native components wholesale — study the *ideas*, not the markup.
* ONLY study their UX flow, navigation logic, and layout composition.
* ALWAYS rewrite their UI logic into our EdumentX design system using React Native primitives + NativeWind classes (`bg-night`, `text-amber`, `rounded-card`, `p-4`).
* Read `Documentation/98-Reference-BasoBas/ANALYSIS.md` first for the per-file translation map.

## Current State (June 20, 2026)

**Phase 2 (Clerk Pivot) — Complete**

Identity has moved from Firebase Auth to Clerk Auth. Firebase is retained **only** for Firestore. The two systems are stitched together by `components/ClerkFirebaseBridge.tsx`, a "Silent Bridge" that:

1. Watches `useAuth()` from `@clerk/clerk-expo`.
2. When the user signs in, asks Clerk for a custom token minted from the `integration_firebase` JWT template (configured in the Clerk Dashboard).
3. Hands that token to `signInWithCustomToken()` from `@react-native-firebase/auth`. The resulting Firebase user id IS the Clerk user id (it's the `uid` claim in the token), so every Firestore read/write keyed on `users/{clerkUid}` just works.
4. On sign-out, calls `firebaseSignOut()` so the Firestore session is dropped.

Why this works: Clerk's `integration_firebase` template produces a token whose payload matches the Firebase custom-token format. RNFirebase's `signInWithCustomToken` is happy with it, and the `uid` claim on the decoded token becomes the Firebase local uid. The bridge owns that mapping in one place so the rest of the app never has to think about it.

**Auth flow (Unified Passwordless Gateway):**
- `screens/auth/PhoneEntryScreen.tsx` — single input that accepts an email OR a custom username. Tries `signIn.create({ identifier })` first; on `form_identifier_not_found` it falls through to `signUp.create({ emailAddress })` + `signUp.prepareEmailAddressVerification({ strategy: 'email_code' })`. Both paths converge on `screens/auth/OtpVerify.tsx` with a `mode` query param.
- `screens/auth/OtpVerify.tsx` — single 6-digit code entry. Branches on `mode` between `signIn.attemptFirstFactor({ strategy: 'email_code', code })` and `signUp.attemptEmailAddressVerification({ code })`. Calls `setActive({ session })` on success; the layout guard in `app/_layout.tsx` then routes by `users/{uid}.role`.
- Google Sign-In: `useOAuth({ strategy: 'oauth_google' })` from `@clerk/clerk-expo` (the native popup).

**Clerk dashboard configuration:**
- Email verification code: ON
- Google OAuth: ON
- Phone provider: OFF (Pro feature — not available on the free tier)
- Username requirement: OFF (so the identifier input can be a username, but Firestore owns the canonical username, not Clerk)

**Environment:**
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...` — the only Clerk env var. Set in `.env` and loaded by `app/_layout.tsx` into `<ClerkProvider>`.

**Files added/rewritten in this pivot:**
- ✅ `components/ClerkFirebaseBridge.tsx` (new)
- ✅ `app/_layout.tsx` (ClerkProvider + bridge + role-fetching layout guard)
- ✅ `screens/auth/PhoneEntryScreen.tsx` (Unified Passwordless Gateway)
- ✅ `screens/auth/OtpVerify.tsx` (Clerk email_code verify)
- ✅ `screens/auth/RoleSelection.tsx` (writes `username` to `users/{uid}`)
- ✅ `screens/auth/StudentProfileScreen.tsx` (collects username + unverified phone)
- ✅ `screens/auth/TutorProfileScreen.tsx` (collects username + unverified phone)
- ✅ `screens/student/student_home.tsx` (Clerk `useClerk().signOut()`)
- ✅ `screens/tutor/tutor_home.tsx` (Clerk `useClerk().signOut()`)
- ✅ `store/authStore.ts` (lightweight `ClerkUser` type — uid, email, displayName, avatarUrl, username)
- ✅ `services/firebase/authService.ts` (gutted — only `logout` remains as a belt-and-suspenders fallback; new code should call `useClerk().signOut()` directly)
- ✅ `lib/registration.ts` (added `username` + `phone` to `profileDraft`; kept `phone`/`countryCode`/`password` as type-level placeholders for Phase-4 compatibility)

**Files deleted in this pivot (and not coming back):**
- ❌ `screens/auth/Password.tsx`
- ❌ `screens/auth/EmailSignUp.tsx`
- ❌ `screens/auth/ProfileScreen.tsx` (the original first-time setup — split into `StudentProfileScreen`/`TutorProfileScreen` earlier)
- ❌ `app/create_password.tsx`
- ❌ `app/email-signup.tsx`
- ❌ `@react-native-google-signin/google-signin` (Clerk's `useOAuth` replaces it)

**Build pipeline (expo SDK 54, NativeWind 4.2.x, Clerk v2.19.x):**
- `babel.config.js` uses `babel-preset-expo` with `jsxImportSource: 'nativewind'` + `nativewind/babel`. No reanimated/Tamagui plugins.
- `metro.config.js` uses `getDefaultConfig(__dirname, { isCSSEnabled: true })` only. The `Documentation/98-Reference-BasoBas/` folder is excluded via `blockList`.
- `app/_layout.tsx` mounts `<ClerkProvider>` → `<ClerkFirebaseBridge />` → `<GestureHandlerRootView>` → `<SafeAreaProvider>` → `<RootLayoutNav>`.
- `RootLayoutNav` always renders the `<Stack>` (never conditionally returns a different tree — that breaks expo-router child tracking). The loading overlay sits on top of the Stack via `pointerEvents="none"`.
- `users/{clerkUid}` is the only Firestore root document the auth flow touches. Role (`"student" | "tutor"`) is read on every signed-in render to drive the redirect guard.
- `useRootNavigationState()` gate prevents `router.replace()` from firing before the navigator mounts (which would throw "Attempted to navigate before mounting the Root Layout component").

**Pending deliverables (post-pivot):**
- Rebuild the EAS dev client (one-time, after native deps changed: `@clerk/clerk-expo` added, `@react-native-google-signin/google-signin` removed).
- Sweep `Documentation/` for stale Firebase Auth references (see tasks #46 + #49).

