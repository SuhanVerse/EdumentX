import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Roles are persisted to Firestore in lowercase so they match the values
// stored on `users/{uid}.role` and the `Role` union in lib/registration.ts.
// "admin" is granted via a separate `admins/{uid}` document in Firestore
// (checked in the auth guard) and is not selectable from the onboarding flow.
export type UserRole = 'student' | 'tutor' | 'admin' | null;

/**
 * Verification state for a tutor account, mirrored from
 * `users/{uid}/tutorProfile/default.verificationStatus` (the
 * denormalized cache) and `tutorVerifications/{uid}.status` (the
 * source of truth — written by the admin's approve/reject handlers).
 *
 * - `"pending"`     — initial signup, awaiting admin review. Layout
 *                      guard sends the tutor to `/tutor-pending` and
 *                      blocks the real dashboard.
 * - `"approved"`    — admin approved. Tutor sees the full dashboard.
 * - `"rejected"`    — admin sent a reason. Tutor sees the dashboard
 *                      with a red `ReviewBanner` above the metrics,
 *                      plus the rejection reason in
 *                      `rejectionReason`.
 * - `"more_info"`   — admin asked for more documents. Tutor sees the
 *                      dashboard with an info-tone `ReviewBanner`.
 *
 * For non-tutor roles the value is always `null` and the layout
 * guard ignores it.
 */
export type TutorVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'more_info'
  | null;

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  role: UserRole;
  /**
   * True once we have confirmed that the signed-in user (whose role is
   * "admin") has a populated `users/{uid}/adminProfile/default` doc.
   *
   * Why this lives in the store: the layout guard in `app/_layout.tsx`
   * needs to know on every redirect pass whether an admin user is
   * brand-new (no adminProfile doc yet) — in which case we route them
   * to `/admin-profile` for first-time setup — or a returning admin
   * (doc exists), in which case we route them straight to
   * `/admin-home`.
   *
   * Defaulted to `false`. Set to `true` after the auth listener reads
   * the adminProfile doc and finds it (or after the profile screen
   * itself saves it). Non-admin users leave this at `false` — the
   * guard only reads it on the `role === "admin"` branch, so the
   * value is meaningless for them.
   */
  hasAdminProfile: boolean;
  /**
   * True when the user's role was read from Firestore (i.e. the user
   * already has a `users/{uid}.role` or `admins/{uid}` doc in the
   * database). False for first-time users whose role was set locally
   * by `RoleSelection.handleContinue` but not yet persisted.
   *
   * The profile-setup screens read this flag to decide what to do
   * when the user presses Back:
   *   - `true`:  the user is a returning visitor (or a rejected tutor
   *              resubmitting). The Back button routes to the matching
   *              dashboard without losing any data.
   *   - `false`: the user is brand-new. The Back button resets the
   *              local role to `null` and routes to /role-selection,
   *              where the "Leave role selection?" Alert lets them
   *              sign out cleanly.
   *
   * Defaulted to `false`. Set to `true` by the auth listener in
   * `_layout.tsx` when the Firestore user doc has a role, and set to
   * `false` by `RoleSelection.handleContinue` when the user is on
   * their first-time flow (no existing role in Firestore).
   */
  hasExistingRole: boolean;
  /**
   * Denormalized mirror of the tutor's verification status. Read
   * from `users/{uid}/tutorProfile/default.verificationStatus` by the
   * `onAuthStateChanged` callback and kept in sync via `onSnapshot`
   * subscriptions on the dashboards.
   *
   * The layout guard reads this on every render to decide between
   * `/tutor-pending` (status === "pending") and `/tutor-home`
   * (anything else). `null` is the default for non-tutor roles.
   */
  tutorVerificationStatus: TutorVerificationStatus;
  isLoading: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setRole: (role: UserRole) => void;
  setHasAdminProfile: (hasAdminProfile: boolean) => void;
  setHasExistingRole: (hasExistingRole: boolean) => void;
  setTutorVerificationStatus: (status: TutorVerificationStatus) => void;
  setLoading: (isLoading: boolean) => void;
  /**
   * Clear the cached user / role / adminProfile flag. Called by the
   * dashboards' "Log out" buttons and by the `onAuthStateChanged`
   * callback in `app/_layout.tsx` when the native auth session ends.
   *
   * Note: this does NOT actually sign the user out of Firebase — call
   * `authService.logout()` first.
   */
  reset: () => void;
}

// Initial state used by `reset()`. Kept module-local so the store and
// the reset path stay in lock-step.
const initialState: Pick<
  AuthState,
  'user' | 'role' | 'hasAdminProfile' | 'hasExistingRole' | 'tutorVerificationStatus'
> = {
  user: null,
  role: null,
  hasAdminProfile: false,
  hasExistingRole: false,
  tutorVerificationStatus: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  hasAdminProfile: false,
  hasExistingRole: false,
  tutorVerificationStatus: null,
  isLoading: true, // true by default until Firebase auth initializes
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setHasAdminProfile: (hasAdminProfile) => set({ hasAdminProfile }),
  setHasExistingRole: (hasExistingRole) => set({ hasExistingRole }),
  setTutorVerificationStatus: (tutorVerificationStatus) =>
    set({ tutorVerificationStatus }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({ ...initialState, isLoading: false }),
}));
