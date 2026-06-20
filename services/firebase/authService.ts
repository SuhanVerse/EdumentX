import { getApp } from "@react-native-firebase/app";
import { getAuth, signOut as firebaseSignOut } from "@react-native-firebase/auth";

/**
 * EdumentX — Firebase Auth shim (post-Clerk pivot).
 *
 * The pivot on June 20, 2026 removed Firebase Auth entirely. Clerk is
 * now the source of truth for identity (sign-in, sign-up, sessions,
 * email OTPs, Google OAuth). Firebase is only the database
 * (Firestore). The `ClerkFirebaseBridge` (see
 * `components/ClerkFirebaseBridge.tsx`) silently signs the Firebase
 * Auth client in/out as the Clerk session changes, which is what makes
 * the Firestore writes work.
 *
 * The old `sendOTP`, `verifyOTP`, `signInWithGoogle`, `signUpWithEmail`,
 * `loginWithEmail`, and `sendVerificationAgain` functions have been
 * deleted. They were Firebase Auth primitives; equivalent flows now
 * live in `screens/auth/PhoneEntryScreen.tsx` (Unified Gateway) and
 * `screens/auth/OtpVerify.tsx` (Clerk `email_code` verify), backed by
 * `@clerk/clerk-expo`.
 *
 * The only thing we still need from the Firebase Auth side is a
 * sign-out helper, kept here for backwards compatibility with the
 * dashboards' logout handlers. New code should call
 * `useClerk().signOut()` directly from `@clerk/clerk-expo`; the
 * `ClerkFirebaseBridge` will then call `firebaseSignOut` for us when
 * it sees the Clerk session end.
 */

// Modular API: get the auth instance once at module load. The namespaced
// `auth()` call is deprecated in RNFirebase v22+ and logs a warning on
// every invocation.
const auth = getAuth(getApp());

/**
 * Sign the Firebase Auth client out. Called by the dashboards as a
 * belt-and-suspenders fallback if the `ClerkFirebaseBridge` hasn't
 * already done it.
 */
export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
};
