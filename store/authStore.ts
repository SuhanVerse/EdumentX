import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Roles are persisted to Firestore in lowercase so they match the values
// stored on `users/{uid}.role` and the `Role` union in lib/registration.ts.
// "Admin" is reserved for the `admins` collection and is not selectable
// from this store — it is granted out-of-band by the admin seed script.
export type UserRole = 'student' | 'tutor' | 'admin' | null;

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  role: UserRole;
  isLoading: boolean;
  confirmationResult: FirebaseAuthTypes.ConfirmationResult | null;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (isLoading: boolean) => void;
  setConfirmationResult: (result: FirebaseAuthTypes.ConfirmationResult | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true, // true by default until Firebase auth initializes
  confirmationResult: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  setConfirmationResult: (confirmationResult) => set({ confirmationResult }),
}));
