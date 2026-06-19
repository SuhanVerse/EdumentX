import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Initialize Google Sign-In with the Web Client ID we extracted from
// google-services.json. The webClientId (NOT the Android client ID) is what
// the Android-side Google Sign-In library uses to request the ID token.
GoogleSignin.configure({
  webClientId: '343719549266-ue4i8d19kqel7sobu6vqheuqftdogndv.apps.googleusercontent.com',
});

// Modular API: get the auth instance once at module load. The namespaced
// `auth()` call is deprecated in RNFirebase v22+ and logs a warning on
// every invocation.
const auth = getAuth(getApp());

/**
 * Signs the user in using their Google Account.
 */
export const signInWithGoogle = async (): Promise<FirebaseAuthTypes.UserCredential> => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const { data } = await GoogleSignin.signIn();
  if (!data?.idToken) {
    throw new Error('No ID token found');
  }
  const googleCredential = GoogleAuthProvider.credential(data.idToken);
  return await auth.signInWithCredential(googleCredential);
};

/**
 * Sends an OTP to the given phone number using React Native Firebase.
 * Uses native device verification (Play Integrity/APNs), no reCAPTCHA needed.
 */
export const sendOTP = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  return await auth.signInWithPhoneNumber(phoneNumber);
};

/**
 * Confirms the OTP code received by the user.
 */
export const verifyOTP = async (
  confirmationResult: FirebaseAuthTypes.ConfirmationResult,
  code: string
): Promise<FirebaseAuthTypes.UserCredential> => {
  const credential = await confirmationResult.confirm(code);
  if (!credential) {
    throw new Error('OTP confirmation returned no credential');
  }
  return credential;
};

/**
 * Create a new account with email + password and immediately send the
 * Firebase Email Verification link. This is the "100% free" replacement
 * for SMS OTP — there is no per-message cost, the only limit is the
 * default Auth quota (a few hundred sends/day per project) which is
 * way more than we need for a single-country beta.
 *
 * Flow:
 *   1. `createUserWithEmailAndPassword` provisions the user.
 *   2. `sendEmailVerification` emails them a one-tap confirmation link.
 *   3. The `_layout.tsx` redirect guard checks `user.emailVerified` on
 *      every render and routes unverified users to `/verify-email` (a
 *      "tap the link we sent" placeholder) until they verify.
 *   4. The user re-opens the app after clicking the link, the layout
 *      guard sees `emailVerified === true`, and routes them on to
 *      `/role-selection` (or wherever the next step is).
 *
 * The newly-created user is returned so callers can stash it in the
 * Zustand auth store before navigating.
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // The verification email is best-effort: if it fails, the user can
  // re-trigger from the `/verify-email` screen via `sendVerificationAgain`.
  try {
    await sendEmailVerification(credential.user);
  } catch (err) {
    console.warn('signUpWithEmail: sendEmailVerification failed', err);
  }
  return credential;
};

/**
 * Re-send the verification email for the currently signed-in user.
 * Called by the "Resend verification email" button on the `/verify-email`
 * screen. Throws if no user is signed in or the email send fails.
 */
export const sendVerificationAgain = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to verify.');
  }
  await sendEmailVerification(user);
};

/**
 * Sign in an existing user with email + password. Unlike
 * `signUpWithEmail`, this does NOT call `sendEmailVerification` — if the
 * user's email isn't yet verified, the `_layout.tsx` guard will catch
 * it and route them to `/verify-email`.
 */
export const loginWithEmail = async (
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * Signs the user out.
 */
export const logout = async (): Promise<void> => {
  await auth.signOut();
};
