# Services

Backend integrations and business logic. **No screen or component should ever call Firebase directly** — always go through a service module.

## Folder Structure

```
services/
├── firebase/    # Firebase Auth, Firestore, Storage wrappers
├── api/         # External HTTP APIs (AI, Maps, etc.)
├── validation/  # Pure validation functions (no side effects)
└── analytics/   # Event tracking wrappers
```

## Rules

- **No React imports** in service files — services are pure TypeScript
- **No UI dependencies** (no `tamagui`, no `react-native`)
- **Return Promises**, not callbacks
- **Throw typed errors** with messages suitable for user display
- **Never log secrets** (API keys, tokens, passwords)
- **Always handle errors** at the call site, not silently in the service

## Pattern: Firebase Service Module

```ts
// services/firebase/auth.ts
import { signInWithEmailAndPassword, type User } from 'firebase/auth';
import { auth } from './config';
import { formatFirebaseError } from './errors';

export async function signInWithPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(formatFirebaseError(error));
  }
}
```

## Pattern: Validation Module

```ts
// services/validation/phone.ts
export function isValidPhone(phone: string, countryCode: string): boolean {
  const digits = phone.replace(/\D/g, '');
  switch (countryCode) {
    case '+977': return digits.length === 10;
    case '+1':   return digits.length === 10;
    case '+91':  return digits.length === 10;
    default:     return digits.length >= 7 && digits.length <= 15;
  }
}
```

## Pattern: Calling From a Screen

```tsx
// In a screen component
import { signInWithPassword } from '@/services/firebase/auth';

async function handleLogin() {
  try {
    setLoading(true);
    await signInWithPassword(email, password);
    router.replace('/home');
  } catch (error) {
    showToast({ message: (error as Error).message, variant: 'error' });
  } finally {
    setLoading(false);
  }
}
```

## Inventory

### `firebase/`
- `config.ts` — Firebase app initialization
- `auth.ts` — Phone OTP, Email/Password, session management
- `firestore.ts` — User CRUD, tutor queries, enrollment queries
- `storage.ts` — Avatar + document uploads
- `errors.ts` — `formatFirebaseError(err)` → user-friendly string

### `api/`
- `ai.ts` — AI tutor matching API
- `maps.ts` — Google Maps geocoding, distance calculation

### `validation/`
- `phone.ts` — `isValidPhone(phone, countryCode)`
- `password.ts` — `getPasswordStrength(p)` → `{ score, label, color, width }`
- `email.ts` — `isValidEmail(e)`
- `profile.ts` — Zod schema + `validateProfile(input)`

### `analytics/`
- `events.ts` — `trackEvent(name, properties)`, `trackScreenView(name)`

## Error Handling

Use the `formatFirebaseError` helper in `services/firebase/errors.ts` to map Firebase error codes to user-friendly messages:

```ts
const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-verification-code': 'Incorrect OTP. Please try again.',
  'auth/invalid-phone-number':      'Invalid phone number format.',
  'auth/email-already-in-use':      'An account with this email already exists.',
  'auth/wrong-password':            'Incorrect password. Please try again.',
  'auth/network-request-failed':    'Network error. Check your connection.',
  'auth/too-many-requests':         'Too many attempts. Please try again later.',
  // ... add more as needed
};
```

## Testing

Service modules should be testable without React Native. Use Jest:

```ts
// services/__tests__/validation/phone.test.ts
import { isValidPhone } from '../validation/phone';

describe('isValidPhone', () => {
  it('accepts 10-digit Nepali numbers', () => {
    expect(isValidPhone('9800000000', '+977')).toBe(true);
  });
  it('rejects 9-digit numbers', () => {
    expect(isValidPhone('980000000', '+977')).toBe(false);
  });
});
```

## References

- `firebase/firestore.rules` — security rules
- `firebase/storage.rules` — storage rules
- `lib/env.ts` — typed environment variables
- `hooks/useAuth.ts` — auth state hook
