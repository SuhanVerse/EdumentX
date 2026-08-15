import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithCredential,
  signOut,
  fetchSignInMethodsForEmail,
} from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Initialize Google Sign-In with the Web Client ID we extracted from
// google-services.json. The webClientId (NOT the Android client ID) is
// what the Android-side Google Sign-In library uses to request the ID
// token.
GoogleSignin.configure({
  webClientId: '343719549266-ue4i8d19kqel7sobu6vqheuqftdogndv.apps.googleusercontent.com',
});

// Modular API: get the auth instance once at module load. The namespaced
// `auth()` call is deprecated in RNFirebase v22+ and logs a warning on
// every invocation.
const auth = getAuth(getApp());

/**
 * Signs the user in with their Google account. Google users are
 * auto-verified by Google, so they skip the email-link step and land
 * directly in the role/profile flow.
 *
 * Why we call `GoogleSignin.signOut()` first: the native Google SDK
 * caches the previously-signed-in Google account on the device. On
 * Android, that cache means `signIn()` auto-selects the last account
 * without showing the picker — which made the user land on whichever
 * account happened to be cached, not the one they wanted. Clearing
 * the cache forces the picker to appear every time.
 *
 * This only touches the **Google SDK's** session — Firebase Auth's
 * session is independent and is set / cleared by the modular
 * `signInWithCredential` / `signOut` helpers (see `logout()`). The
 * two are not interchangeable.
 */
export const signInWithGoogle = async (): Promise<FirebaseAuthTypes.UserCredential> => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Force-clear any previously-remembered Google account so the
  // account picker appears every time. Wrapped in try/catch because
  // the SDK throws if the user wasn't previously signed in at the
  // Google layer — that's fine, swallow it.
  try {
    await GoogleSignin.signOut();
  } catch {
    // No prior Google session to clear. Safe to ignore.
  }

  const { data } = await GoogleSignin.signIn();
  if (!data?.idToken) {
    throw new Error('No ID token returned by Google Sign-In.');
  }
  const googleCredential = GoogleAuthProvider.credential(data.idToken);
  // Modular API — the namespaced `auth.signInWithCredential(cred)`
  // form is deprecated in RNFirebase v22+ and logs a warning per call.
  return await signInWithCredential(auth, googleCredential);
};

/**
 * Create a new account with email + password and immediately send a
 * Firebase Email Verification link. This is the primary free signup
 * method — no SMS cost, no phone-provider quota concerns.
 *
 * Flow:
 *   1. `createUserWithEmailAndPassword` provisions the user.
 *   2. `sendEmailVerification` emails them a one-tap confirmation link.
 *   3. `EmailSignUp` flips to a "check your inbox" pending state.
 *   4. The user taps the link, then taps "I've verified — continue" on
 *      the pending screen. That handler calls
 *      `auth.currentUser.reload()` to pull a fresh token from the
 *      server (this is the critical step — without `reload()` the local
 *      `currentUser.emailVerified` flag stays stale and the layout
 *      guard refuses to advance the user).
 *   5. Once verified, the user is routed on to `/role-selection`.
 *
 * The sendEmailVerification call is best-effort: if it fails the user
 * can re-trigger via `sendVerificationAgain()`.
 */
/**
 * Fetch the list of sign-in methods (providers) associated with an email
 * address. Returns an array like `["password"]`, `["google.com"]`,
 * `["password", "google.com"]`, or an empty array if the email is not
 * registered with any auth provider.
 *
 * This is the Firebase-recommended way to detect account collisions
 * before or after a failed `createUserWithEmailAndPassword` call.
 * Importantly, `"password"` in the list means the user has an
 * email/password credential; `"google.com"` means they signed up via
 * Google. An empty array means the `auth/email-already-in-use` error
 * from a prior call was stale — the account no longer exists.
 *
 * We wrap it in try/catch because a network failure here should never
 * block the signup flow.
 */
export const getSignInMethodsForEmail = async (
  email: string,
): Promise<string[]> => {
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch {
    return [];
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(credential.user);
  } catch (err) {
    console.warn('signUpWithEmail: sendEmailVerification failed', err);
  }
  return credential;
};

/**
 * Re-send the verification email for the currently signed-in user.
 * Called by the "Resend verification email" link on the
 * `EmailSignUp` pending state. Throws if no user is signed in or the
 * email send fails.
 */
export const sendVerificationAgain = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to verify.');
  }
  await sendEmailVerification(user);
};

/**
 * Sign in an existing user with email + password. The caller is
 * responsible for checking `credential.user.emailVerified` afterwards:
 * if it is false, route to the "check your inbox" pending state on
 * `EmailSignUp` (the user might have signed up but never verified).
 */
export const loginWithEmail = async (
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out the current user. Clears the native Firebase Auth session
 * so the next render of `app/_layout.tsx` sees `user === null` and
 * routes to the auth screen.
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
};