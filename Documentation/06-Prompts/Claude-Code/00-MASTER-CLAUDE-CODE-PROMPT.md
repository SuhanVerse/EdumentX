# Claude Code — Master Refactor Prompt
## EdumentX v2: Tamagui + Firebase + Zustand Migration

> **Purpose**: The definitive prompt to paste into **Claude Code (VS Code)** running on **minimax-m3 (Custom Sonnet)** to convert EdumentX from a flat, UI-only prototype into a production-ready, multi-role, Tamagui-powered, Firebase-backed mobile application.
>
> **How to use**: Copy the **Master Prompt** at the bottom (§10) into Claude Code. Claude will plan, then execute in phases. Each phase ends with a checkpoint where you can review.
>
> **Strategy**: Feed it **one phase at a time** (use `/clear` between phases if context fills up). Don't try to run all 5 phases in one go — review each output before moving on.

---

## 0. Pre-Flight Checklist

Before you start, verify these are in place:

```bash
# 1. Node version
node -v   # Should be ≥ 20.19.4

# 2. Working directory
cd /media/xlegion/Win/PROJECTS/EdumentX

# 3. Existing files are intact
ls constants/theme.ts   # Should exist
ls app/_layout.tsx      # Should exist
ls screens/             # Should have 2 subfolders

# 4. Model is set to Custom Sonnet (Option 3)
/model  # Pick "Custom Sonnet model" in the Ollama menu
```

---

## 1. Goal

Refactor the EdumentX codebase to:

1. Adopt **Tamagui** as the UI compiler (with `XStack`/`YStack`/`Button`/`Input` primitives)
2. Centralize all design tokens into a **Tamagui config** that mirrors `constants/theme.ts`
3. Establish a **strict service layer** (`services/firebase/`, `services/auth/`)
4. Add **Zustand** for global state (registration flow, auth, UI state)
5. Use **lucide-react-native** for icons (replacing Ionicons where it makes sense)
6. Wire up **Firebase Auth** (Phone OTP + Email/Password)
7. Persist **Firestore user documents** on signup completion
8. Implement a **role-based router** (Student, Tutor, Admin) with proper navigation guards
9. Set up **type-safe environment variables** with `expo-constants`
10. Add **accessibility primitives** (touch targets, labels, roles) consistently

---

## 2. Design Token Authority (Do Not Deviate)

The new Tamagui config MUST mirror the existing `constants/theme.ts`. **Do not invent new colors.** The brand identity is "Quiet Luxury" with these specific tokens:

```ts
// === THE TOKENS (final, non-negotiable) ===

// Brand
brand.primary        = #0F172A  // Night — buttons, headings
brand.primaryDark    = #020617
brand.primaryLight   = #F1F5F9  // Sand — page backgrounds
brand.accent         = #B45309  // Copper — hero CTA accent
brand.verification   = #059669  // Emerald — verified badges
brand.ai             = #4F46E5  // Indigo — AI features

// Semantic
semantic.success     = #059669
semantic.successBg   = #DCFCE7
semantic.warning     = #D97706
semantic.warningBg   = #FEF3C7
semantic.danger      = #DC2626
semantic.dangerBg    = #FEE2E2

// Surface
background.page      = #F1F5F9
background.surface   = #FFFFFF

// Text
text.primary         = #0F172A
text.secondary       = #475569
text.muted           = #94A3B8
text.inverse         = #FFFFFF

// Border
border.default       = #E2E8F0
border.strong        = #94A3B8

// Spacing (8pt grid)
space = { 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16,
          5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 12: 48, 16: 64, 20: 80 }

// Radius
radius = { xs: 6, sm: 8, md: 10, card: 12, lg: 14, hero: 18, full: 999 }

// Sizes
size = { touchTarget: 44, inputHeight: 48, primaryButton: 52, 
         primaryButtonLarge: 56, avatar: 40, avatarCard: 60, 
         avatarProfile: 96, otpBox: 44 }

// Typography (Plus Jakarta Sans — variable weight)
fontFamily = { body: "PlusJakartaSans", heading: "PlusJakartaSans" }

// Elevation (subtle, layered)
e1 = { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 } }
e2 = { shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }
e3 = { shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }
eCopper = { shadowColor: "#B45309", shadowOpacity: 0.20, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }
```

---

## 3. Target File Structure (End State)

After all phases, the project should look like this:

```
EdumentX/
├── app/                                # Expo Router routes (thin wrappers)
│   ├── _layout.tsx                     # Root: TamaguiProvider + SafeArea + Stack
│   ├── (auth)/                         # Auth group (no sidebar)
│   │   ├── _layout.tsx
│   │   ├── index.tsx                   # Splash
│   │   ├── onboarding.tsx
│   │   ├── phone-entry.tsx
│   │   ├── otpverify.tsx
│   │   ├── create_password.tsx
│   │   ├── role-selection.tsx
│   │   └── profile.tsx
│   ├── (app)/                          # Authenticated group (with sidebar)
│   │   ├── _layout.tsx                 # Sidebar layout
│   │   ├── student/
│   │   │   ├── _layout.tsx             # Student bottom tab
│   │   │   ├── home.tsx
│   │   │   ├── discover.tsx
│   │   │   ├── tutor/[id].tsx
│   │   │   ├── enroll/[id].tsx
│   │   │   ├── enrollments.tsx
│   │   │   ├── chats/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   └── profile.tsx
│   │   ├── tutor/
│   │   │   ├── _layout.tsx
│   │   │   ├── home.tsx
│   │   │   ├── profile/[id].tsx
│   │   │   ├── profile/edit.tsx
│   │   │   ├── schedule.tsx
│   │   │   ├── requests.tsx
│   │   │   ├── verify.tsx
│   │   │   └── earnings.tsx
│   │   └── admin/
│   │       ├── _layout.tsx
│   │       ├── home.tsx
│   │       ├── verifications/
│   │       │   ├── index.tsx
│   │       │   └── [id].tsx
│   │       ├── users.tsx
│   │       └── analytics.tsx
│   └── +not-found.tsx
│
├── components/
│   ├── ui/                             # Tamagui-based primitives
│   │   ├── PrimaryButton.tsx
│   │   ├── SecondaryButton.tsx
│   │   ├── IconButton.tsx
│   │   ├── TextField.tsx
│   │   ├── PasswordField.tsx
│   │   ├── PhoneField.tsx
│   │   ├── OtpInput.tsx
│   │   ├── Chip.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── StepIndicator.tsx
│   │   ├── ScreenHeader.tsx
│   │   ├── BackButton.tsx
│   │   ├── PasswordStrengthBar.tsx
│   │   └── Pressable.tsx               # Tamagui-based wrapper
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── BottomTab.tsx
│   │   ├── TopBar.tsx
│   │   ├── RoleSwitcher.tsx
│   │   └── ScreenContainer.tsx
│   ├── feedback/
│   │   ├── Toast.tsx
│   │   ├── Alert.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx
│   └── domain/                         # Feature-specific composed components
│       ├── TutorCard.tsx
│       ├── RoleCard.tsx
│       ├── EnrollRequestCard.tsx
│       ├── ChatBubble.tsx
│       ├── StatCard.tsx
│       └── MapPin.tsx
│
├── constants/
│   ├── theme.ts                        # Master (unchanged)
│   ├── colors.ts                       # Re-exports (unchanged)
│   ├── typography.ts                   # Re-exports (unchanged)
│   ├── spacing.ts                      # Re-exports (unchanged)
│   └── tamagui.config.ts               # NEW: Tamagui config matching theme.ts
│
├── services/
│   ├── firebase/
│   │   ├── config.ts                   # initializeApp from env
│   │   ├── auth.ts                     # Phone OTP, Email/Password
│   │   ├── firestore.ts                # User CRUD, queries
│   │   ├── storage.ts                  # Avatar upload
│   │   └── errors.ts                   # formatFirebaseError()
│   ├── api/
│   │   ├── ai.ts                       # AI tutor matching
│   │   └── maps.ts                     # Google Maps geocoding
│   ├── validation/
│   │   ├── phone.ts
│   │   ├── password.ts
│   │   ├── email.ts
│   │   └── profile.ts
│   └── analytics/
│       └── events.ts
│
├── store/
│   ├── authStore.ts                    # Current user, loading, role
│   ├── registrationStore.ts            # Multi-step form data (persisted)
│   └── uiStore.ts                      # Sidebar collapsed, theme mode
│
├── hooks/
│   ├── useAuth.ts                      # Wrapper around authStore
│   ├── useRegistration.ts
│   ├── useForm.ts                      # Generic form state
│   ├── useDebounce.ts
│   ├── useKeyboard.ts
│   ├── useOtpCountdown.ts
│   └── useCountryPicker.ts
│
├── lib/
│   ├── env.ts                          # Typed process.env wrapper
│   ├── navigation.ts                   # Route helpers
│   ├── haptics.ts
│   └── format.ts                       # Currency, date, distance formatters
│
├── types/
│   ├── user.ts
│   ├── tutor.ts
│   ├── enrollment.ts
│   └── common.ts
│
├── screens/                            # (becomes thin — logic moves to hooks)
│   ├── auth/                           # Existing
│   └── onboarding/                     # Existing
│
├── firebase/
│   ├── firestore.rules                 # Existing
│   ├── storage.rules                   # Existing
│   └── indexes.json                    # Update with composite indexes
│
├── assets/
│   ├── icon.png                        # App icon
│   ├── adaptive-icon.png
│   ├── splash.png
│   └── fonts/                          # Plus Jakarta Sans variable font files
│
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js                     # Tamagui babel plugin
├── metro.config.js                     # Tamagui metro config
├── tamagui.config.ts                   # Same as constants/tamagui.config.ts
└── .env
```

---

## 4. Phase Plan

### Phase 1 — Foundation (Tamagui + Tokens)
**Goal**: Get Tamagui running with the existing screens migrated to use it.

Files created:
- `constants/tamagui.config.ts` (Tamagui config mirroring `theme.ts`)
- `babel.config.js` (with Tamagui plugin)
- `metro.config.js` (with Tamagui metro config)
- `app/_layout.tsx` updated (wrap in `TamaguiProvider`)
- `tamagui.config.ts` (root copy for build)

Files migrated:
- All 7 existing screens use `YStack`/`XStack`/`Button`/`Input` instead of `View`/`Pressable`/`TextInput`/`Text`
- `constants/theme.ts` becomes the single source of truth, with `tamagui.config.ts` reading from it

### Phase 2 — Component Library
**Goal**: Extract reusable components.

Create:
- `components/ui/PrimaryButton.tsx`
- `components/ui/SecondaryButton.tsx`
- `components/ui/TextField.tsx`
- `components/ui/PasswordField.tsx`
- `components/ui/OtpInput.tsx`
- `components/ui/Chip.tsx`
- `components/ui/Card.tsx`
- `components/ui/Avatar.tsx`
- `components/ui/Badge.tsx`
- `components/ui/ScreenHeader.tsx`
- `components/ui/BackButton.tsx`
- `components/ui/PasswordStrengthBar.tsx`
- `components/ui/StepIndicator.tsx`
- `components/layout/ScreenContainer.tsx`

Refactor screens to use these components.

### Phase 3 — Service Layer + State
**Goal**: Wire up the data layer without yet connecting to Firebase.

Create:
- `lib/env.ts` (typed env reader)
- `services/validation/{phone,password,email,profile}.ts`
- `store/registrationStore.ts` (Zustand + AsyncStorage persistence)
- `store/authStore.ts`
- `hooks/useForm.ts`
- `hooks/useDebounce.ts`
- `hooks/useOtpCountdown.ts`
- `hooks/useRegistration.ts`

Refactor screens to use `registrationStore` instead of `useState`.

### Phase 4 — Firebase Integration
**Goal**: Real Auth + Firestore.

Create:
- `services/firebase/config.ts`
- `services/firebase/auth.ts`
- `services/firebase/firestore.ts`
- `services/firebase/storage.ts`
- `services/firebase/errors.ts`
- `types/user.ts`

Update:
- `PhoneEntryScreen` → uses `authService.signInWithPhone`
- `OtpVerify` → uses `authService.verifyOtp`
- `Password` → uses `authService.completeSignup`
- `ProfileScreen` → uses `userService.createProfile` + `storageService.uploadAvatar`
- `RoleSelection` → uses `userService.setRole`
- New: `hooks/useAuth.ts` reads `authStore` and subscribes to `onAuthStateChanged`

Update Firebase rules (`firebase/firestore.rules` + `storage.rules`) for tutor discovery, enrollments, etc.

### Phase 5 — Navigation + Role Routing
**Goal**: Multi-role app shell with sidebar.

Create:
- `app/(auth)/_layout.tsx`
- `app/(app)/_layout.tsx` (sidebar wrapper)
- `app/(app)/student/_layout.tsx` (bottom tab)
- `app/(app)/tutor/_layout.tsx` (bottom tab)
- `app/(app)/admin/_layout.tsx` (no bottom tab)
- `components/layout/Sidebar.tsx`
- `components/layout/BottomTab.tsx`
- `components/layout/TopBar.tsx`
- `components/layout/RoleSwitcher.tsx`
- `app/+not-found.tsx`

Update `app.json` to add `bundleIdentifier` and `package` if missing.

### Phase 6 (Optional) — Polish
- Splash screen animation with `react-native-reanimated`
- Onboarding swipe gestures
- Password strength with `zxcvbn`
- Loading + error states everywhere
- Toast notification system
- Accessibility audit

---

## 5. Dependency Installation

These are the **exact versions** to install. Claude should use `npx expo install` for Expo-managed packages and `npm install` for the rest:

```bash
# Core
npx expo install tamagui @tamagui/config @tamagui/animations-react-native
npm install @tamagui/babel-plugin @tamagui/metro-plugin

# Icons
npx expo install lucide-react-native
# (Note: lucide-react-native may not be Expo-managed; use npm if expo install fails)
npm install lucide-react-native

# Firebase
npx expo install firebase
npm install @react-native-async-storage/async-storage

# State
npm install zustand
npm install @react-native-async-storage/async-storage  # for persistence

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# Hooks & utilities
npm install expo-constants expo-linking expo-haptics expo-image
npm install expo-localization react-native-mmkv
npm install react-native-reanimated react-native-gesture-handler

# Performance
npm install @shopify/flash-list
npm install expo-image

# Dev
npm install --save-dev @types/react @types/node
```

⚠️ **Important**: After installing, run `npx expo install --check` to align versions.

---

## 6. Firebase Setup (Pre-Implementation Checklist)

Before Claude can wire up Firebase, the developer must do this manually:

1. **Create Firebase project** at https://console.firebase.google.com
   - Project name: `edumentx-prod` (or `edumentx-dev` for development)
   - Region: `asia-south1` (Mumbai — closest to Nepal)
   - Enable Google Analytics: yes

2. **Enable Authentication methods**:
   - Phone (for OTP)
   - Email/Password (for admin & password login)
   - Google (optional, for social login)

3. **Create Firestore database** (Native mode, asia-south1)

4. **Create Storage bucket** (default)

5. **Add Android app**:
   - Package name: `com.suhanverse.edumentx`
   - App nickname: `EdumentX`
   - SHA-1: run `npx expo credentials:manager` → Android → Keystore → Display
   - Download `google-services.json` → place in project root
   - Update `app.json`: `"android": { ..., "googleServicesFile": "./google-services.json" }`

6. **Add iOS app**:
   - Bundle ID: `com.suhanverse.edumentx`
   - Download `GoogleService-Info.plist` → place in project root

7. **Copy config values to `.env`**:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=edumentx-prod.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=edumentx-prod
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=edumentx-prod.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   EXPO_PUBLIC_APP_ENV=development
   ```

8. **Set up Firebase emulators** for local dev:
   ```bash
   firebase init emulators   # Already configured in firebase.json
   firebase emulators:start
   ```

---

## 7. Configuration Files to Generate

### 7.1 `babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'tamagui' }],
    ],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
        },
      ],
      'react-native-reanimated/plugin',  // MUST be last
    ],
  };
};
```

### 7.2 `metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const { TamaguiMetroPlugin } = require('@tamagui/metro-plugin');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = wrapWithReanimatedMetroConfig(
  TamaguiMetroPlugin({
    components: ['tamagui'],
    config: './tamagui.config.ts',
  })(config)
);
```

### 7.3 `constants/tamagui.config.ts`

```ts
import { createTamagui, createTokens } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { animations } from '@tamagui/animations-react-native';
import { theme as masterTheme } from './theme';

const interFont = createInterFont();

const tokens = createTokens({
  color: {
    primary: masterTheme.colors.brand.primary,
    primaryDark: masterTheme.colors.brand.primaryDark,
    primaryLight: masterTheme.colors.brand.primaryLight,
    accent: masterTheme.colors.brand.accent,
    verification: masterTheme.colors.brand.verification,
    ai: masterTheme.colors.brand.ai,
    success: masterTheme.colors.semantic.success,
    warning: masterTheme.colors.semantic.warning,
    danger: masterTheme.colors.semantic.danger,
    page: masterTheme.colors.background.page,
    surface: masterTheme.colors.background.surface,
    textPrimary: masterTheme.colors.text.primary,
    textSecondary: masterTheme.colors.text.secondary,
    textMuted: masterTheme.colors.text.muted,
    textInverse: masterTheme.colors.text.inverse,
    border: masterTheme.colors.border.default,
    borderStrong: masterTheme.colors.border.strong,
  },
  space: {
    0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16,
    5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 12: 48, 16: 64, 20: 80,
  },
  size: {
    touchTarget: 44, inputHeight: 48, primaryButton: 52,
    primaryButtonLarge: 56, avatar: 40, avatarCard: 60,
    avatarProfile: 96, otpBox: 44,
  },
  radius: {
    xs: 6, sm: 8, md: 10, card: 12, lg: 14, hero: 18, full: 999,
  },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 },
});

const config = createTamagui({
  tokens,
  themes: {
    light: {
      background: tokens.color.page,
      backgroundHover: tokens.color.primaryLight,
      backgroundPress: tokens.color.primaryLight,
      backgroundFocus: tokens.color.surface,
      color: tokens.color.textPrimary,
      colorHover: tokens.color.textPrimary,
      colorPress: tokens.color.textPrimary,
      colorFocus: tokens.color.textPrimary,
      borderColor: tokens.color.border,
      borderColorHover: tokens.color.borderStrong,
      borderColorFocus: tokens.color.primary,
      borderColorPress: tokens.color.primary,
      placeholderColor: tokens.color.textMuted,
    },
  },
  fonts: {
    body: interFont,
    heading: interFont,
  },
  animations,
  defaultFont: 'body',
  shouldAddPrefersColorThemes: true,
  themeConfig: {
    initialColorScheme: 'light',
  },
});

export type AppConfig = typeof config;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
```

### 7.4 `services/firebase/config.ts`

```ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey:            Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain:        Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId:         Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket:     Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId:             Constants.expoConfig?.extra?.firebaseAppId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
```

### 7.5 `store/registrationStore.ts`

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'student' | 'tutor' | 'admin';
export type Grade = 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10' | 
                    'Grade XI (Science)' | 'Grade XI (Management)' | 
                    'Grade XII (Science)' | 'Grade XII (Management)';
export type Subject = 'Math' | 'Physics' | 'Chemistry' | 'Computer Science' | 
                      'Biology' | 'Nepali' | 'English';

interface RegistrationState {
  // Step 1: Phone
  countryCode: string;
  phone: string;
  // Step 2: OTP (not persisted — handled by Firebase)
  confirmationResult: unknown | null;
  // Step 3: Password
  password: string;
  // Step 4: Role
  role: Role | null;
  // Step 5: Profile
  fullName: string;
  email: string;
  grade: Grade | null;
  subject: Subject | null;
  avatarUri: string | null;
  // Actions
  setPhone: (countryCode: string, phone: string) => void;
  setConfirmationResult: (result: unknown | null) => void;
  setPassword: (password: string) => void;
  setRole: (role: Role | null) => void;
  setProfile: (profile: Partial<Pick<RegistrationState, 
    'fullName' | 'email' | 'grade' | 'subject' | 'avatarUri'>>) => void;
  reset: () => void;
}

const initialState = {
  countryCode: '+977',
  phone: '',
  confirmationResult: null,
  password: '',
  role: null,
  fullName: '',
  email: '',
  grade: null,
  subject: null,
  avatarUri: null,
};

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set) => ({
      ...initialState,
      setPhone: (countryCode, phone) => set({ countryCode, phone }),
      setConfirmationResult: (result) => set({ confirmationResult: result }),
      setPassword: (password) => set({ password }),
      setRole: (role) => set({ role }),
      setProfile: (profile) => set(profile),
      reset: () => set(initialState),
    }),
    {
      name: 'edumentx-registration',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        countryCode: state.countryCode,
        phone: state.phone,
        role: state.role,
        fullName: state.fullName,
        email: state.email,
        grade: state.grade,
        subject: state.subject,
        // Don't persist: password, confirmationResult, avatarUri
      }),
    }
  )
);
```

### 7.6 `services/firebase/auth.ts`

```ts
import {
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { auth } from './config';
import { formatFirebaseError } from './errors';

export async function startPhoneAuth(phoneNumber: string): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber);
  } catch (error) {
    throw new Error(formatFirebaseError(error));
  }
}

export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<User> {
  try {
    const result = await confirmationResult.confirm(otp);
    return result.user;
  } catch (error) {
    throw new Error(formatFirebaseError(error));
  }
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(formatFirebaseError(error));
  }
}

export async function signUpWithPassword(email: string, password: string): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(formatFirebaseError(error));
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export function onAuthChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
```

---

## 8. Code Review Checklist (Per Phase)

Before approving each phase, verify:

- [ ] **TypeScript strict**: No `any` types except where truly unavoidable (mark with `// eslint-disable-next-line` and comment)
- [ ] **No console.logs** left in production code
- [ ] **No commented-out blocks** (use git history instead)
- [ ] **All Pressables have `accessibilityLabel`** if not text-labeled
- [ ] **All interactive elements** are ≥ 44px touch target
- [ ] **No hardcoded hex** in screen files (only via `theme.ts` / `tamagui.config.ts`)
- [ ] **All async operations** have loading and error UI
- [ ] **KeyboardAvoidingView** wraps all ScrollView with TextInput
- [ ] **SafeAreaView** is used at screen root
- [ ] **No magic numbers** for spacing (use tokens)
- [ ] **No `import from 'react-native'`** for View/Text — use Tamagui

---

## 9. Common Pitfalls (Warn Claude About)

| Pitfall | Fix |
|---------|-----|
| Tamagui babel plugin not loaded → components unstyled | Verify `babel.config.js` has the plugin and Metro cache is cleared with `npx expo start -c` |
| `firebase/auth` not working in React Native (web-only persistence) | Use `initializeAuth` with `getReactNativePersistence` from `firebase/auth/react-native` |
| `.env` vars undefined | Use `expo-constants` + `extra` in `app.json`, not `process.env` |
| Icons not rendering | `lucide-react-native` requires `react-native-svg`; `npx expo install react-native-svg` |
| `react-native-reanimated` not working | Babel plugin MUST be last in plugins array; clear cache |
| `async-storage` errors on first run | Wrap in try/catch in stores; provide fallback in-memory storage |
| OTP auto-fill not working | Set `autoComplete="sms-otp"` + `textContentType="oneTimeCode"` on first input |
| Phone number format rejected | Firebase expects E.164 format: `+97798XXXXXXXX` not `+977 98XXXXXXXX` |
| Firestore security rules blocking | Test with `firebase emulators:start` and check emulator UI logs |
| Country picker not detecting locale | Use `expo-localization` `getLocales()` and pick first locale's regionCode |

---

## 10. 🟢 THE MASTER PROMPT (Copy From Here)

> **Copy everything from this line down and paste into Claude Code:**

---

### TASK

You are refactoring the **EdumentX** codebase — a React Native (Expo SDK 54) tutor marketplace — from a flat, UI-only prototype into a production-grade application using **Tamagui** for UI, **Firebase** for backend, and **Zustand** for state.

**Working directory**: `/media/xlegion/Win/PROJECTS/EdumentX`
**Model**: minimax-m3 (Custom Sonnet)
**Strict rules**:
- TypeScript strict mode, no `any`
- Match the existing design tokens in `constants/theme.ts` exactly — never invent new colors
- Plan first, then execute. Pause for review between major phases
- Run `npm run typecheck` after each phase to catch errors
- Never delete existing working code without an equivalent replacement

### CURRENT STATE (Read First)

**As of June 6, 2026 — Phase 1 is in progress (3/7 screens migrated).**

**App structure (unchanged):**
- `app/_layout.tsx` — root Stack, now wrapped in `<TamaguiProvider config={tamaguiConfig} defaultTheme="light">`
- `app/index.tsx` — splash + 1800ms auto-nav
- `screens/onboarding/SplashScreen.tsx` — 98 lines
- `screens/onboarding/OnboardingScreen.tsx` — 195 lines
- `screens/auth/PhoneEntryScreen.tsx` — 385 lines, hardcoded Nepal +977
- `screens/auth/OtpVerify.tsx` — 397 lines, mock verification
- `screens/auth/Password.tsx` — 357 lines, length-based strength
- `screens/auth/RoleSelection.tsx` — 323 lines, 2 roles
- `screens/auth/ProfileScreen.tsx` — 458 lines, dark header + sand body
- `constants/theme.ts` — master design tokens
- `constants/tamagui.config.ts` — Tamagui config mirroring `theme.ts` (created)
- `tamagui.config.ts` (root) — duplicate of the above, required by babel/metro plugins (created)
- `babel.config.js`, `metro.config.js` — created and wired
- `firebase/firestore.rules` + `storage.rules` — pre-emptive security rules
- `package.json` — Expo SDK 54, React 19.1, RN 0.81.5, Tamagui 2.1.0

**Migration status:**
- ✅ `SplashScreen.tsx` migrated to Tamagui primitives
- ✅ `OnboardingScreen.tsx` migrated to Tamagui primitives
- ⚠️ `PhoneEntryScreen.tsx` migrated, **2 typecheck errors at lines 159 & 192** (`backgroundColor={colors.border.strong}` — Tamagui prop expects named tokens, not hex; wrap in `style={{ backgroundColor: ... }}`)
- ⏳ `OtpVerify.tsx` — not migrated
- ⏳ `Password.tsx` — not migrated
- ⏳ `RoleSelection.tsx` — not migrated
- ⏳ `ProfileScreen.tsx` — not migrated

**Palette refinements (already applied to `theme.ts`):**
- `semantic.success` `#059669` → `#047857` (5.48:1 contrast on white)
- `semantic.warning` `#D97706` → `#B45309` (5.02:1 contrast on white)
- `text.muted` `#94A3B8` → `#64748B` (4.76:1 contrast on white)
- `border.strong` `#94A3B8` → `#64748B` (4.76:1 contrast on white)

**Typecheck exclusions:**
- `Documentation/98-Reference-BasoBas/**` is excluded (it's a Figma-Make web export reference, not our app).
- `Documentation/99-Archive/**` is excluded.

**Pending Phase 1 deliverables (you must complete these):**
1. Fix the 2 typecheck errors in `PhoneEntryScreen.tsx`.
2. Migrate the 4 unmigrated auth screens (`OtpVerify`, `Password`, `RoleSelection`, `ProfileScreen`) to Tamagui primitives.
3. Build 3 onboarding illustration components: `components/illustrations/{DiscoverIllustration,AiMatchIllustration,VerifiedIllustration}.tsx` — pure shape composition, **no images**. Reference: `Documentation/gemini_chat_context.md` FeatureVisuals prompt.
4. Wire the 3 illustrations into `OnboardingScreen.tsx` (replace the current `Ionicons` icons inside the slide's centered YStack).
5. Run `npm run typecheck` — must return **0 errors**.

**Reference docs you should skim:**
- `CLAUDE.md` (project root) — system directives + current state
- `Documentation/98-Reference-BasoBas/ANALYSIS.md` — per-file UX translation map for the friend project reference (BasoBas is a web app for room rentals in Nepal; do NOT copy its code, only translate its UX patterns)

### DESIGN TOKENS (Authoritative — Do Not Deviate)

```ts
brand.primary        = #0F172A   // Night
brand.primaryLight   = #F1F5F9   // Sand
brand.accent         = #B45309   // Copper (hero CTA only)
brand.verification   = #059669   // Emerald
brand.ai             = #4F46E5   // Indigo
semantic.success     = #059669
semantic.warning     = #D97706
semantic.danger      = #DC2626
background.page      = #F1F5F9
background.surface   = #FFFFFF
text.primary         = #0F172A
text.secondary       = #475569
text.muted           = #94A3B8
text.inverse         = #FFFFFF
border.default       = #E2E8F0
```

### PHASE 1 — Tamagui Foundation

**Goal**: Install Tamagui, configure it to mirror `constants/theme.ts`, wrap root layout in `TamaguiProvider`, and migrate the existing 7 screens to use Tamagui primitives (`YStack`/`XStack`/`Button`/`Input`/`Text`).

**Steps**:

1. **Read first**:
   - `package.json`
   - `constants/theme.ts` (master)
   - `app/_layout.tsx`
   - All 7 screen files

2. **Install**:
   ```bash
   npx expo install tamagui @tamagui/config @tamagui/animations-react-native \
     @tamagui/font-inter react-native-svg
   npm install @tamagui/babel-plugin @tamagui/metro-plugin
   ```

3. **Create `constants/tamagui.config.ts`** matching the tokens above. Use `createInterFont` for now; we'll switch to Plus Jakarta Sans in Phase 6. The config must import from `./theme` so there's one source of truth.

4. **Create `babel.config.js`** with Tamagui babel plugin + reanimated plugin (reanimated last).

5. **Create `metro.config.js`** with Tamagui metro plugin + reanimated wrap.

6. **Update `app/_layout.tsx`** to wrap children in `<TamaguiProvider config={tamaguiConfig}>`.

7. **Migrate `SplashScreen.tsx`**:
   - Replace `<View>` with `<YStack>` and `<XStack>`
   - Replace `<Text>` with `<Text>` from tamagui
   - Use theme tokens for all colors/spacing/radius
   - Keep the `Animated` View for progress bar

8. **Migrate `OnboardingScreen.tsx`**:
   - Same replacements
   - Replace `Pressable` with Tamagui's `Button` (variant="ghost" for Skip, "solid" for Next)
   - Use `useWindowDimensions` for illustration height (same as before)

9. **Migrate `PhoneEntryScreen.tsx`**:
   - Use `<Input>` instead of `<TextInput>`
   - Use Tamagui `<Button>` for primary CTA
   - Use `<YStack gap="$3">` for form layout
   - Keep all validation logic identical

10. **Migrate `OtpVerify.tsx`**:
    - Use `<Input size={44}>` for each OTP box
    - Keep `inputMode="numeric"`, `maxLength`, `onChangeText`, `onKeyPress` logic
    - Replace `Pressable` for Resend with `<Button variant="ghost">`

11. **Migrate `Password.tsx`**:
    - Use `<Input secureTextEntry>` for both fields
    - Use Tamagui's strength bar pattern (`<YStack>` with conditional `width`)

12. **Migrate `RoleSelection.tsx`**:
    - Use `<Card>` for role cards
    - Use `<Button variant={role === "student" ? "solid" : "outlined"}>` pattern

13. **Migrate `ProfileScreen.tsx`**:
    - Use `<Image source={{ uri }}>` from tamagui (or `expo-image` if installed)
    - Use `<Chip>` for grade/subject selection
    - Use copper `accent` color for the Finish button

14. **Verify**:
    ```bash
    npx expo start -c
    ```
    App should look identical to before, but use Tamagui under the hood. Test all flows.

15. **Run typecheck**:
    ```bash
    npm run typecheck
    ```

**Pause for review.** When I approve, proceed to Phase 2.

---

### PHASE 2 — Component Library

**Goal**: Extract reusable components from existing screens.

**Create files**:

1. `components/ui/PrimaryButton.tsx` — props: `{ children, onPress, disabled, loading, size?: "md" | "lg", variant?: "primary" | "accent" }`
2. `components/ui/SecondaryButton.tsx` — ghost/outlined variant
3. `components/ui/IconButton.tsx` — for eye toggle, back button
4. `components/ui/TextField.tsx` — props: `{ label, value, onChangeText, error?, helperText?, secureTextEntry?, ...inputProps }`
5. `components/ui/PasswordField.tsx` — wraps TextField with eye toggle
6. `components/ui/OtpInput.tsx` — props: `{ length=6, value, onChange }`, handles auto-advance, paste, backspace
7. `components/ui/Chip.tsx` — props: `{ selected, onPress, children, variant? }`
8. `components/ui/Card.tsx` — surface card with optional shadow
9. `components/ui/Avatar.tsx` — props: `{ uri?, name?, size? }`
10. `components/ui/Badge.tsx` — props: `{ variant: "active" | "pending" | "verified" | "rejected" | "info", children }`
11. `components/ui/ScreenHeader.tsx` — props: `{ title, subtitle?, onBack?, rightSlot? }`
12. `components/ui/BackButton.tsx`
13. `components/ui/PasswordStrengthBar.tsx` — props: `{ password }`, returns label + color + width
14. `components/ui/StepIndicator.tsx` — props: `{ current, total }`
15. `components/layout/ScreenContainer.tsx` — wraps SafeArea + ScrollView + KeyboardAvoiding

**Refactor all 7 screens** to use these components. Behavior must be **identical** to Phase 1 output.

**Verify**:
```bash
npm run typecheck
npx expo start -c
```

**Pause for review.** When I approve, proceed to Phase 3.

---

### PHASE 3 — Service Layer + Zustand

**Goal**: Add the data layer scaffolding WITHOUT yet connecting Firebase.

**Create**:

1. `lib/env.ts`:
   ```ts
   import Constants from 'expo-constants';
   export const env = {
     firebaseApiKey: Constants.expoConfig?.extra?.firebaseApiKey as string,
     // ... etc, with runtime checks
   };
   ```

2. `services/validation/phone.ts` — `isValidPhone(phone: string, country: string): boolean`

3. `services/validation/password.ts` — `getPasswordStrength(p: string): { score: 0|1|2|3|4, label, color, width, suggestions: string[] }` (use the SAME length-based logic as current Password.tsx, but include suggestions array for future enhancement)

4. `services/validation/email.ts` — `isValidEmail(e: string): boolean`

5. `services/validation/profile.ts` — Zod schema + `validateProfile(input)`

6. `store/registrationStore.ts` — the Zustand store shown in §7.5

7. `store/authStore.ts` — `{ user: User | null, role: Role | null, isLoading: boolean, setUser, setRole, reset }`

8. `store/uiStore.ts` — `{ sidebarCollapsed: boolean, toggleSidebar, themeMode: "light" | "dark" | "system", setThemeMode }`

9. `hooks/useForm.ts` — generic form hook wrapping `useState` with validation

10. `hooks/useDebounce.ts` — debounce any value

11. `hooks/useOtpCountdown.ts` — OTP timer logic extracted from OtpVerify

12. `hooks/useRegistration.ts` — typed wrapper around registration store

**Refactor**:
- `PhoneEntryScreen` reads `phone` from `useRegistrationStore` instead of `useState`
- `OtpVerify` uses `useOtpCountdown` hook
- `Password` uses `getPasswordStrength` from validation service
- `RoleSelection` writes `role` to registration store
- `ProfileScreen` validates with `validateProfile` Zod schema

**Verify**:
```bash
npm run typecheck
```
Note: data is now persisted in AsyncStorage. Kill and relaunch the app — registration state should survive.

**Pause for review.** When I approve, proceed to Phase 4.

---

### PHASE 4 — Firebase Integration

**Goal**: Real authentication and Firestore persistence.

**Pre-requisites** (verify the developer has done these before proceeding):
- [ ] Firebase project created
- [ ] `.env` populated with real values
- [ ] `google-services.json` in project root (Android)
- [ ] `app.json` references `googleServicesFile`

**Create**:

1. `services/firebase/config.ts` — initialize Firebase with env values, using `initializeAuth` + `getReactNativePersistence`

2. `services/firebase/auth.ts` — startPhoneAuth, verifyPhoneOtp, signInWithPassword, signUpWithPassword, signOut, onAuthChanged

3. `services/firebase/firestore.ts`:
   - `createUserProfile(uid, profile)`
   - `getUserProfile(uid)`
   - `updateUserProfile(uid, patch)`
   - `getTutors(filters)`
   - `getTutorById(id)`
   - `createEnrollmentRequest(...)`
   - `getEnrollmentsForStudent(uid)`
   - `getEnrollmentsForTutor(uid)`

4. `services/firebase/storage.ts`:
   - `uploadAvatar(uid, localUri): Promise<string>` — returns download URL
   - `uploadTutorDocument(uid, type, localUri)`

5. `services/firebase/errors.ts`:
   - `formatFirebaseError(err): string` — maps `auth/invalid-verification-code` → "Incorrect OTP. Please try again."

6. `types/user.ts`:
   ```ts
   export interface UserProfile {
     uid: string;
     phone: string;
     email: string;
     fullName: string;
     role: 'student' | 'tutor' | 'admin';
     grade?: Grade;
     subject?: Subject;
     avatarUrl?: string;
     createdAt: number;
     updatedAt: number;
   }
   ```

7. `hooks/useAuth.ts`:
   - Subscribes to `onAuthStateChanged` on mount
   - Returns `{ user, profile, isLoading, signOut }`
   - Auto-fetches profile from Firestore on user change

**Update screens**:
- `PhoneEntryScreen` → calls `authService.startPhoneAuth` (or `signInWithPassword` for log-in mode)
- `OtpVerify` → calls `authService.verifyPhoneOtp` then navigates to password
- `Password` → for phone signup, password is set later via `updatePassword`. For email signup, calls `signUpWithPassword`. Saves role + profile in next screens.
- `RoleSelection` → writes role to Firestore via `userService.updateUserProfile`
- `ProfileScreen` → calls `userService.createUserProfile` + `storageService.uploadAvatar` then navigates to dashboard

**Update Firebase rules** in `firebase/firestore.rules`:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    // Users — own read/write, public read for tutor discovery
    match /users/{uid} {
      allow read: if isSignedIn() && (isOwner(uid) || resource.data.role == 'tutor');
      allow create: if isOwner(uid) && request.resource.data.uid == uid;
      allow update: if isOwner(uid) && request.resource.data.uid == uid;
      allow delete: if false;
    }

    // Enrollments
    match /enrollments/{enrollId} {
      allow read: if isSignedIn() && (isOwner(resource.data.studentId) || isOwner(resource.data.tutorId));
      allow create: if isSignedIn() && request.resource.data.studentId == request.auth.uid;
      allow update: if isSignedIn() && (isOwner(resource.data.studentId) || isOwner(resource.data.tutorId));
      allow delete: if isSignedIn() && isOwner(resource.data.studentId);
    }

    // Chats
    match /chats/{chatId} {
      allow read, write: if isSignedIn() && request.auth.uid in resource.data.participantIds;
      match /messages/{msgId} {
        allow read, write: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participantIds;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Verify with emulator**:
```bash
firebase emulators:start
npx expo start -c
```
Test full signup flow. Check emulator UI at http://localhost:4000 to see user document created.

**Pause for review.** When I approve, proceed to Phase 5.

---

### PHASE 5 — Multi-Role Navigation + App Shell

**Goal**: Add sidebar, bottom tab, and route group structure.

**Create new routes** (move existing routes into groups):
- `app/(auth)/_layout.tsx` — auth group with Stack
- `app/(auth)/index.tsx` — splash
- `app/(auth)/onboarding.tsx`
- `app/(auth)/phone-entry.tsx`
- `app/(auth)/otpverify.tsx`
- `app/(auth)/create_password.tsx`
- `app/(auth)/role-selection.tsx`
- `app/(auth)/profile.tsx`
- `app/(app)/_layout.tsx` — sidebar wrapper (desktop) or nothing (mobile)
- `app/(app)/student/_layout.tsx` — student bottom tab
- `app/(app)/student/home.tsx` — basic home placeholder
- `app/(app)/tutor/_layout.tsx`
- `app/(app)/tutor/home.tsx` — basic dashboard placeholder
- `app/(app)/admin/_layout.tsx`
- `app/(app)/admin/home.tsx` — basic admin placeholder

**Create components**:
- `components/layout/Sidebar.tsx` — the desktop sidebar with role switcher
- `components/layout/BottomTab.tsx` — mobile bottom tab with 5 items
- `components/layout/TopBar.tsx` — shared top bar
- `components/layout/RoleSwitcher.tsx` — sheet to switch role
- `components/layout/AppShell.tsx` — responsive wrapper

**Logic**:
- In `app/_layout.tsx`, use `useAuth()` to determine if user is signed in
- If signed in, redirect to `(app)/[role]/home` based on user role
- If not, show `(auth)` group
- After profile completion, navigate to `(app)/[role]/home`

**Update**:
- `app/+not-found.tsx` — 404 page

**Verify**:
```bash
npm run typecheck
npx expo start -c
```

End-to-end test: complete signup → land on home → switch role (via sidebar on desktop, or profile screen on mobile) → see appropriate home.

**Pause for review.** When I approve, the migration is complete. Phases 6+ (polish, dashboards, map, chat) can be tackled in subsequent sprints.

---

### EXECUTION RULES (Apply to All Phases)

- **Plan first**: Before writing code, output a brief plan (1 paragraph) of what you'll change
- **Use `replace_all`** when the same change applies to multiple files
- **Run `npm run typecheck`** after every meaningful change
- **Run `npx expo start -c`** to clear Metro cache when adding new packages
- **Never delete working code** without preserving the equivalent behavior
- **Commit** at the end of each phase:
  ```bash
  git add .
  git commit -m "refactor: phase N — <description>"
  ```
- **Ask for clarification** if a design decision is ambiguous (e.g., "Should the sidebar be visible on tablet portrait or only landscape?")
- **Avoid emoji in code or commit messages** — use plain ASCII

### START NOW

Begin with **Phase 1: Tamagui Foundation**. Output your plan, then execute.

When Phase 1 is complete and I've approved it, I'll say "Continue with Phase 2" — do NOT auto-advance.

---

## 11. Recovery & Rollback

If something goes wrong mid-phase:

```bash
# Revert last commit
git reset --hard HEAD~1

# Or stash in-progress work
git stash
git stash list
git stash apply
```

If Metro cache is corrupted:
```bash
rm -rf node_modules/.cache .expo
npx expo start -c
```

If dependencies are broken:
```bash
rm -rf node_modules package-lock.json
npm install
npx expo install --check
```

---

*Generated for EdumentX · June 2026 · v2.1 — supersedes all previous Claude Code prompts. Last updated June 6, 2026 to reflect the Tamagui foundation work in progress (3/7 screens migrated).*
