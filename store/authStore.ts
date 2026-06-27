import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Roles are persisted to Firestore in lowercase so they match the values
// stored on `users/{uid}.role` and the `Role` union in lib/registration.ts.
// "Admin" is reserved for the `admins` collection and is not selectable
// from this store — it is granted out-of-band by the admin seed script
// (or directly from the Firebase Console).
export type UserRole = 'student' | 'tutor' | 'admin' | null;

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  role: UserRole;
  isLoading: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (isLoading: boolean) => void;
  /**
   * Clear the cached user / role. Called by the dashboards' "Log out"
   * buttons and by the `onAuthStateChanged` callback in
   * `app/_layout.tsx` when the native auth session ends.
   *
   * Note: this does NOT actually sign the user out of Firebase — call
   * `authService.logout()` first.
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
  isLoading: true, // true by default until Firebase auth initializes
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ ...initialState, isLoading: false }),
}));