import { create } from 'zustand';

// Roles are persisted to Firestore in lowercase so they match the values
// stored on `users/{uid}.role` and the `Role` union in lib/registration.ts.
// "Admin" is reserved for the `admins` collection and is not selectable
// from this store — it is granted out-of-band by the admin seed script.
export type UserRole = 'student' | 'tutor' | 'admin' | null;

/**
 * Lightweight Clerk user representation. We only mirror the fields the rest
 * of the app needs to read; pulling in Clerk's full `User` type would
 * unnecessary couple our screens to the Clerk SDK.
 *
 * `uid` is the Clerk user ID, which is also the Firestore document key
 * (the `ClerkFirebaseBridge` mints a Firebase custom token whose `uid`
 * claim matches the Clerk user ID). This is the single most important
 * invariant in the Clerk + Firestore hybrid stack — every Firestore write
 * uses `uid`, and the security rules trust it.
 */
export interface ClerkUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
}

interface AuthState {
  user: ClerkUser | null;
  role: UserRole;
  isLoading: boolean;
  setUser: (user: ClerkUser | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (isLoading: boolean) => void;
  /**
   * Clear the cached user / role. Called by the dashboards' "Log out"
   * buttons and by the `onAuthStateChanged` callback in `app/_layout.tsx`
   * when the Clerk session ends.
   * Note: this does NOT actually sign the user out of Clerk or Firebase —
   * call `useClerk().signOut()` and the `ClerkFirebaseBridge` will then
   * sign out of Firebase automatically.
   */
  reset: () => void;
}

// Initial state used by `reset()`. Kept module-local so the store and
// the reset path stay in lock-step.
const initialState: Pick<AuthState, 'user' | 'role'> = {
  user: null,
  role: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true, // true by default until Clerk auth initializes
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ ...initialState, isLoading: false }),
}));
