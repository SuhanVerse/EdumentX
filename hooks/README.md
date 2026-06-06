# Hooks

Reusable React hooks. **Hooks should be pure, typed, and tested.**

## Folder Structure

```
hooks/
├── useAuth.ts                # Wraps authStore + Firebase subscription
├── useRegistration.ts        # Typed wrapper around registrationStore
├── useForm.ts                # Generic form state + validation
├── useDebounce.ts            # Debounce any value
├── useDebouncedValue.ts      # Debounced version of a value
├── useKeyboard.ts            # Keyboard show/hide state
├── useOtpCountdown.ts        # OTP timer logic
└── useCountryPicker.ts       # Country detection + picker state
```

## Naming Conventions

- **Always start with `use`** — `useAuth`, not `getAuth`
- **Single responsibility** — one hook = one concern
- **Return tuples for state** — `[value, setValue]`
- **Return objects for complex APIs** — `{ user, isLoading, signOut }`
- **TypeScript generic where appropriate** — `useForm<T>()`

## Pattern: Wrapping a Store

```ts
// hooks/useAuth.ts
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { onAuthChanged } from '@/services/firebase/auth';
import { getUserProfile } from '@/services/firebase/firestore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const setLoading = useAuthStore((s) => s.setLoading);
  
  useEffect(() => {
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(firebaseUser);
        setRole(profile?.role ?? null);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setRole, setLoading]);
  
  return { user, role, isLoading, isAuthenticated: !!user };
}
```

## Pattern: Stateful Hook

```ts
// hooks/useOtpCountdown.ts
import { useEffect, useState, useCallback } from 'react';

export function useOtpCountdown(seconds: number = 60) {
  const [remaining, setRemaining] = useState(seconds);
  const [isActive, setIsActive] = useState(true);
  
  useEffect(() => {
    if (!isActive || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(r - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, remaining]);
  
  const reset = useCallback(() => {
    setRemaining(seconds);
    setIsActive(true);
  }, [seconds]);
  
  const stop = useCallback(() => setIsActive(false), []);
  
  const formatted = `00:${String(remaining).padStart(2, '0')}`;
  
  return { remaining, isActive, formatted, reset, stop };
}
```

## Pattern: Generic Hook

```ts
// hooks/useForm.ts
import { useState, useCallback, useMemo } from 'react';

export interface UseFormOptions<T> {
  initialValues: T;
  validate: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);
  
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);
  
  const handleSubmit = useCallback(async () => {
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  return { values, errors, isValid, isSubmitting, setValue, handleSubmit, reset };
}
```

## Pattern: Debounce Hook

```ts
// hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debounced;
}
```

## Testing

Hooks can be tested with `@testing-library/react-hooks` or `renderHook` from React Testing Library:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useOtpCountdown } from '../useOtpCountdown';

describe('useOtpCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  
  it('counts down from initial value', () => {
    const { result } = renderHook(() => useOtpCountdown(5));
    expect(result.current.remaining).toBe(5);
    
    act(() => { jest.advanceTimersByTime(2000); });
    
    expect(result.current.remaining).toBe(3);
  });
  
  it('formats time as MM:SS', () => {
    const { result } = renderHook(() => useOtpCountdown(45));
    expect(result.current.formatted).toBe('00:45');
  });
});
```

## References

- `store/` — state stores that some hooks wrap
- `services/` — service functions called by hooks
- `lib/` — pure utility functions
