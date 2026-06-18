import { getApp } from '@react-native-firebase/app';
import { getAuth, GoogleAuthProvider } from '@react-native-firebase/auth';
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
 * Signs the user out.
 */
export const logout = async (): Promise<void> => {
  await auth.signOut();
};
