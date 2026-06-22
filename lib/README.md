# Lib

Pure utility functions, helpers, and infrastructure code. **No React, no UI, no business logic.**

> **Status (June 16, 2026)** — this README is **aspirational / Phase 4 contract**.
> Files marked with 🟡 below do not exist yet. The only file that exists in
> `lib/` today is `registration.ts`, a `useSyncExternalStore` shim matching
> the patterns described here. The Phase 4 Zustand swap will add the missing
> files in place; until then, follow the existing `registration.ts` as the
> implementation reference.
>
> **RNFirebase pivot (June 12, 2026)**: the original `env.ts` sketch below
> showed `process.env.EXPO_PUBLIC_FIREBASE_*` reads. With the switch to
> `@react-native-firebase/*`, those env vars are **unused at runtime** —
> RNFirebase reads its config from `google-services.json` (Android) and
> `GoogleService-Info.plist` (iOS) at **native build time**. The only env
> var the app actually reads at runtime is `EXPO_PUBLIC_FIREBASE_USE_EMULATOR`,
> used by `services/firebase/emulator.ts`. See
> `Documentation/04-Firebase/phase-3-notes.md §1` for the full rationale.

## Folder Structure

```
lib/
├── env.ts           # 🟡 Typed environment variable reader (Phase 4)
├── navigation.ts    # 🟡 Route helper functions (Phase 4)
├── haptics.ts       # 🟡 Tactile feedback wrappers (Phase 4)
├── format.ts        # 🟡 Currency, date, distance formatters (Phase 4)
└── registration.ts  # ✅ Multi-step signup state shim (current)
```

## Rules

- **Pure functions only** — same input = same output
- **No side effects** (no API calls, no logging in production)
- **No React imports**
- **TypeScript strict** — all parameters and returns typed
- **Tree-shakeable** — export named functions, not classes
- **Testable** — should be unit-testable with Jest

## Pattern: env.ts

```ts
// lib/env.ts  (Phase 4 — does not exist yet)
// Post-RNFirebase pivot: the Firebase config is read from
// `google-services.json` at native build time, not from process.env. The
// only Firebase-related env var the app actually reads is the
// `EXPO_PUBLIC_FIREBASE_USE_EMULATOR` switch (consumed by
// services/firebase/emulator.ts). The `EXPO_PUBLIC_FIREBASE_*` keys still
// live in .env for tooling visibility, but reading them from RN code at
// runtime will give you `undefined` — the native SDK doesn't see them.
//
// The only env reads below are the non-Firebase keys (Google Maps key,
// app env). If you ever need a Firebase value at runtime, you are doing
// it wrong — use `import { auth, firestore } from '@react-native-firebase/*'`.

function optionalEnv(key: string, fallback: string): string {
  return (process.env[key] as string | undefined) ?? fallback;
}

export const env = {
  // Read at runtime by services/firebase/emulator.ts only.
  useEmulator: optionalEnv('EXPO_PUBLIC_FIREBASE_USE_EMULATOR', 'false') === 'true',

  // Non-Firebase app config.
  googleMapsApiKey: optionalEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', ''),
  appEnv:           optionalEnv('EXPO_PUBLIC_APP_ENV', 'development') as 'development' | 'staging' | 'production',
};
```

## Pattern: format.ts

```ts
// lib/format.ts

/** Format NPR currency */
export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`;
}

/** Format a Date as "5 hours ago" */
export function formatRelativeTime(date: Date | number): string {
  const now = Date.now();
  const then = typeof date === 'number' ? date : date.getTime();
  const diff = now - then;
  
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(then).toLocaleDateString('en-NP');
}

/** Format distance in km/m */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format phone number for display: 98XXXXXXXX → 98XX-XXX-XXX */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}
```

## Pattern: navigation.ts

```ts
// lib/navigation.ts
import { router } from 'expo-router';
import { useAuthStore, type UserRole } from '@/store/authStore';

// The route tree today is FLAT (no /(app)/ or /(auth)/ groups — see
// app/_layout.tsx). The handoff doc that suggested grouped routes was
// superseded when the SDK pivot (RNFirebase, June 12, 2026) was finalized.
// If/when we add route groups in a later sprint, update this file.

function dashboardPathForRole(role: UserRole): '/tutor-home' | '/student-home' {
  if (role === 'tutor') return '/tutor-home';
  return '/student-home';
}

export function navigateToRoleHome(role: UserRole) {
  router.replace(dashboardPathForRole(role));
}

export function navigateToAuth() {
  // The single auth entry screen is `/email-signup` (hosts both Sign
  // up and Log in via its mode toggle, plus "Continue with Google").
  // Phone OTP was removed in the June 21, 2026 pivot.
  router.replace('/email-signup');
}

export function redirectAfterAuth() {
  const role = useAuthStore.getState().role;
  if (role) {
    navigateToRoleHome(role);
  } else {
    router.replace('/role-selection');
  }
}

export function signOutAndRedirect() {
  // Clear all stores
  useAuthStore.getState().reset();
  // ... reset other stores

  navigateToAuth();
}
```

## Pattern: haptics.ts

```ts
// lib/haptics.ts
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const haptics = {
  light: () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success: () => {
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning: () => {
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  error: () => {
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
```

## Anti-Patterns to Avoid

- ❌ Don't put business logic here (use `services/`)
- ❌ Don't put React components here (use `components/`)
- ❌ Don't import from `react-native` (except for `Platform`)
- ❌ Don't make API calls from these files

## References

- `services/` — business logic
- `store/` — global state
- `types/` — shared TypeScript types

---

## Current State (June 16, 2026)

The only file in `lib/` today is **`registration.ts`** — a `useSyncExternalStore`-based shim for the multi-step signup draft. It exposes `Role`, `LocationValue`, `RegistrationState`, `useRegistration(selector)`, and a `registration` action object (`get`, `set`, `update`, `updateProfile`, `reset`).

The Phase 4 plan (see `Documentation/03-Implementation-Guides/IMPLEMENTATION_ROADMAP.md`) will replace this shim with a Zustand store under `store/registrationStore.ts`. The public API of `registration.ts` is intentionally identical to what the Zustand store will expose, so the swap will be a one-file body change with no call-site updates.

> **Update (June 16, 2026)** — `RoleSelection` no longer writes to the `registration` shim. The role now lives in `useAuthStore` (Zustand) and is mirrored to Firestore `users/{uid}.role`. The shim still tracks the in-progress profile draft (name, subjects, location, etc.) but the *role* itself is the store's job. See `screens/auth/RoleSelection.tsx` and `app/_layout.tsx` for the new flow.

**Do not add new utilities to `lib/` until Phase 4 begins.** Inline small helpers in the file that uses them; we'll relocate them to `lib/` when the patterns stabilize.
