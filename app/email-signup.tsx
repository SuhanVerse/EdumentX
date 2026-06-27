/**
 * /email-signup — Email + password (free) authentication.
 *
 * The 100%-free alternative to SMS OTP. Flow:
 *   1. `EmailSignUp` calls `signUpWithEmail(...)` → `createUserWithEmailAndPassword` + `sendEmailVerification`.
 *   2. Screen flips to the "check your inbox" pending state.
 *   3. User taps the link in their email → Firebase sets `emailVerified = true`.
 *   4. User taps "I've verified — continue" → `currentUser.reload()` re-reads the server
 *      claims and routes to `/role-selection`.
 *   5. The `_layout.tsx` guard also enforces this — see the emailVerified check there.
 *
 * Google Sign-In users are auto-verified by Google, so they bypass this route entirely.
 */
import { EmailSignUp } from "@/screens/auth/EmailSignUp";

export default EmailSignUp;