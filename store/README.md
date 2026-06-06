# Store

Global state management using **Zustand**. Each store is a single-purpose module — don't mix concerns.

## Folder Structure

```
store/
├── authStore.ts           # Current user, role, loading
├── registrationStore.ts   # Multi-step signup form data (persisted)
└── uiStore.ts             # Sidebar collapsed, theme mode
```

## Why Zustand?

- ✅ **Tiny** (~1KB) vs Redux Toolkit (~10KB)
- ✅ **No provider** required — works anywhere
- ✅ **Built-in persistence** via `zustand/middleware`
- ✅ **TypeScript-first** with great inference
- ✅ **Selector-based subscriptions** prevent unnecessary re-renders

## Rules

- **One store per concern** — don't put auth AND registration in the same store
- **Persist only what's necessary** — never persist tokens, passwords, or PII
- **Use selectors** when reading from a store: `useAuthStore(s => s.user)` not `useAuthStore()`
- **Actions are part of the store** — don't expose setters separately
- **Reset on logout** — call `authStore.getState().reset()` in the signOut flow

## Pattern: Basic Store

```ts
// store/authStore.ts
import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { Role } from '@/types/user';

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: Role | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, role: null, isLoading: false }),
}));
```

## Pattern: Persisted Store

```ts
// store/registrationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set) => ({
      // ... state and actions
    }),
    {
      name: 'edumentx-registration',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist sensitive fields:
      partialize: (state) => ({
        phone: state.phone,
        role: state.role,
        fullName: state.fullName,
        email: state.email,
        grade: state.grade,
        subject: state.subject,
        // NOT persisted: password, confirmationResult, avatarUri
      }),
    }
  )
);
```

## Pattern: Using a Store in a Component

```tsx
import { useAuthStore } from '@/store/authStore';

function HomeScreen() {
  // Subscribe to specific values to avoid re-renders:
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  
  // Call actions:
  const setRole = useAuthStore((s) => s.setRole);
  
  return <Text>Welcome, {user?.displayName} ({role})</Text>;
}
```

## Pattern: Calling Actions From Outside React

```ts
import { useAuthStore } from '@/store/authStore';

// In a service file (no React):
async function signOut() {
  await firebaseSignOut();
  useAuthStore.getState().reset();
}
```

## When to Use a Store vs Local State

| Use a Store | Use Local State |
|-------------|-----------------|
| Data shared across multiple screens | Form input values |
| Data that needs to survive app restart | UI toggle (e.g., modal open) |
| Data that triggers global side effects | Animation state |
| Server data (cache in store) | Transient validation errors |
| Auth, user profile, role | OTP digit boxes |

## Anti-Patterns to Avoid

- ❌ **Don't mirror server state directly** — use React Query / TanStack Query for that
- ❌ **Don't put derived state in stores** — compute in selectors
- ❌ **Don't mutate store state outside actions** — always go through `set()`
- ❌ **Don't subscribe to entire store** — use selectors to limit re-renders

## Inventory

| Store | Persisted? | Purpose |
|-------|-----------|---------|
| `authStore.ts` | ❌ No (session) | Current Firebase user, role, loading |
| `registrationStore.ts` | ✅ Yes (AsyncStorage) | Multi-step signup form data |
| `uiStore.ts` | ✅ Yes (AsyncStorage) | Sidebar collapsed, theme mode |

## References

- `hooks/useAuth.ts` — wraps authStore with Firebase subscription
- `services/firebase/auth.ts` — called by auth actions
- `Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` — Phase 3 details
