/**
 * Map a Firebase Auth / Firestore error to a short, user-friendly
 * message. Falls back to the error's own `message` if we don't have
 * a mapping (e.g. for unmapped native SDK errors), and finally to
 * a generic "something went wrong" so the alert always reads as
 * something a human wrote.
 *
 * Why a separate module: keeps the auth screens free of Firebase
 * error-code branching (the `e.code` shape is Firebase-specific and
 * the screens shouldn't care). If a new error code is added, this
 * is the one place to update.
 *
 * Sources for the error code strings:
 *   https://firebase.google.com/docs/auth/admin/errors
 */
const ERROR_MESSAGES: Record<string, string> = {
  // --- Auth: account creation ---
  "auth/email-already-in-use":
    "An account with this email already exists. Switch to Log in or use a different email.",
  "auth/invalid-email":
    "That email address doesn't look right. Please double-check it.",
  "auth/operation-not-allowed":
    "Email/password sign-up is disabled. Please use Google Sign-In instead.",
  "auth/weak-password":
    "Please pick a stronger password (at least 6 characters).",

  // --- Auth: sign-in ---
  "auth/invalid-credential":
    "That email or password didn't work. Please try again.",
  "auth/invalid-login-credentials":
    "That email or password didn't work. Please try again.",
  "auth/wrong-password":
    "Incorrect password. Please try again.",
  "auth/user-not-found":
    "We couldn't find an account with that email. Please sign up first.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",
  "auth/too-many-requests":
    "Too many failed attempts. Please wait a minute and try again.",
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",

  // --- Auth: account linking (email+password ↔ Google on the same email) ---
  "auth/credential-already-in-use":
    "This Google account is already linked to a different sign-in method. Please use the original method to log in.",
  "auth/email-already-exists":
    "An account with this email already exists. Please sign in with your original method.",

  // --- Auth: email verification ---
  "auth/invalid-action-code":
    "That verification link is invalid or has expired. Please request a new one.",
  "auth/expired-action-code":
    "That verification link has expired. Please request a new one.",

  // --- Firestore ---
  "firestore/permission-denied":
    "You don't have permission to perform that action.",
  "firestore/unavailable":
    "Firestore is temporarily unavailable. Please try again.",
  "firestore/deadline-exceeded":
    "The request took too long. Please check your connection and try again.",
};

/**
 * Convert a thrown error from any of our Firebase calls into a
 * short, screen-ready string. Never returns an empty string — if
 * we don't recognize the code, we use the error's own message, and
 * if that's empty too, we fall back to a generic line.
 */
export function formatFirebaseError(error: unknown, fallback?: string): string {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    if (e.code && ERROR_MESSAGES[e.code]) {
      return ERROR_MESSAGES[e.code];
    }
    if (e.message && e.message.trim().length > 0) {
      return e.message;
    }
  }
  return fallback ?? "Something went wrong. Please try again.";
}

/**
 * The Firebase error codes that should suggest the user flip the
 * EmailSignUp mode toggle from "Sign up" to "Log in" (or vice
 * versa). The EmailSignUp screen can read this and surface an
 * actionable CTA inline instead of a plain alert.
 */
export function authErrorSuggestsModeFlip(error: unknown): "login" | "signup" | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { code?: string };
  if (e.code === "auth/email-already-in-use") return "login";
  if (
    e.code === "auth/user-not-found" ||
    e.code === "auth/invalid-credential" ||
    e.code === "auth/invalid-login-credentials" ||
    e.code === "auth/wrong-password"
  ) {
    return "signup";
  }
  return null;
}