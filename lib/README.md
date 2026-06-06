# Lib

Pure utility functions, helpers, and infrastructure code. **No React, no UI, no business logic.**

## Folder Structure

```
lib/
├── env.ts           # Typed environment variable reader
├── navigation.ts    # Route helper functions
├── haptics.ts       # Tactile feedback wrappers
└── format.ts        # Currency, date, distance formatters
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
// lib/env.ts
import Constants from 'expo-constants';

function requireEnv(key: string): string {
  const value = Constants.expoConfig?.extra?.[key] as string | undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return (Constants.expoConfig?.extra?.[key] as string | undefined) ?? fallback;
}

export const env = {
  firebase: {
    apiKey:            requireEnv('firebaseApiKey'),
    authDomain:        requireEnv('firebaseAuthDomain'),
    projectId:         requireEnv('firebaseProjectId'),
    storageBucket:     requireEnv('firebaseStorageBucket'),
    messagingSenderId: requireEnv('firebaseMessagingSenderId'),
    appId:             requireEnv('firebaseAppId'),
  },
  googleMapsApiKey: requireEnv('googleMapsApiKey'),
  appEnv:           optionalEnv('appEnv', 'development') as 'development' | 'staging' | 'production',
  useEmulator:      optionalEnv('useFirebaseEmulator', 'false') === 'true',
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
import { useAuthStore } from '@/store/authStore';

export function navigateToRoleHome(role: 'student' | 'tutor' | 'admin') {
  router.replace(`/(app)/${role}/home`);
}

export function navigateToAuth() {
  router.replace('/(auth)/phone-entry');
}

export function redirectAfterAuth() {
  const role = useAuthStore.getState().role;
  if (role) {
    navigateToRoleHome(role);
  } else {
    router.replace('/(auth)/role-selection');
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
