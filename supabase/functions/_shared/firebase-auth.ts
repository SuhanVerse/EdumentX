/**
 * EdumentX — Shared Firebase JWT verification for Supabase Edge
 * Functions.
 *
 * EdumentX uses native Firebase Auth, NOT Supabase Auth. Supabase
 * Edge Functions therefore verify Firebase ID tokens directly against
 * Google's securetoken JWKS endpoint (same pattern as
 * `supabase/functions/chat/middleware.ts`, extracted here so the
 * eSewa + verification functions share one implementation).
 */

import * as jose from "npm:jose";

const FIREBASE_PROJECT_ID: string | null =
  Deno.env.get("FIREBASE_PRODUCT_ID") ??
  Deno.env.get("FIREBASE_PROJECT_ID") ??
  null;

if (!FIREBASE_PROJECT_ID) {
  console.warn(
    "[firebase-auth] ⚠️ FIREBASE_PRODUCT_ID not set in Supabase secrets. " +
      "Firebase JWT verification will fail until this is configured.",
  );
}

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const firebaseJWKS = jose.createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function verifyFirebaseJwt(
  req: Request,
): Promise<{
  uid: string;
  email?: string;
  /** Full decoded token claims (custom claims like `admin: true`
   *  minted by scripts/seedAdmin.ts live here). */
  claims: Record<string, unknown>;
}> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header", 401);
  }
  const token = authHeader.slice(7);
  if (!FIREBASE_PROJECT_ID) {
    throw new AuthError("Firebase project ID not configured on server", 500);
  }
  try {
    const { payload } = await jose.jwtVerify(token, firebaseJWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const { sub, email, ...claims } = payload as Record<string, unknown>;
    return {
      uid: sub as string,
      email: email as string | undefined,
      claims,
    };
  } catch (err) {
    console.warn("[firebase-auth] JWT verification failed:", (err as Error).message);
    throw new AuthError("Invalid or expired authentication token", 401);
  }
}
