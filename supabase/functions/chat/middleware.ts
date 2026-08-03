/**
 * EdumentX AI — Edge Function Middleware
 *
 * Middleware for the chat Edge Function.
 * Handles:
 *   1. CORS headers
 *   2. Firebase JWT verification (using Firebase public keys)
 *   3. Rate limiting (basic)
 *   4. Request validation
 *
 * ⚠️ IMPORTANT: Firebase ID tokens are NOT Supabase JWTs.
 * We verify them directly using Firebase's public JWKS endpoint.
 * The `jose` library handles the cryptographic verification.
 */

import * as jose from "npm:jose";

// ─── Firebase JWT Configuration ─────────────────────────────────────────────

/**
 * Firebase project ID — must be set as a Supabase Edge Function secret.
 * The user should have set this as `FIREBASE_PRODUCT_ID` in the Supabase
 * dashboard (Edge Functions → Secrets).
 *
 * Fallback to `FIREBASE_PROJECT_ID` for compatibility.
 */
const FIREBASE_PROJECT_ID: string | null =
  Deno.env.get("FIREBASE_PRODUCT_ID") ??
  Deno.env.get("FIREBASE_PROJECT_ID") ??
  null;

if (!FIREBASE_PROJECT_ID) {
  console.warn(
    "[middleware] ⚠️ FIREBASE_PRODUCT_ID not set in Supabase secrets. " +
    "Firebase JWT verification will fail until this is configured.",
  );
}

/**
 * Firebase public key set for verifying ID tokens.
 * Uses Google's securetoken service JWKS endpoint.
 *
 * `createRemoteJWKSet` fetches keys lazily on first verify and caches them
 * (following HTTP caching headers from Google), so cold starts only pay
 * the fetch cost once.
 */
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const firebaseJWKS = jose.createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function handleCORS(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  return null;
}

// ─── Firebase JWT Verification ───────────────────────────────────────────────

/**
 * Verify the Firebase ID token from the Authorization header.
 *
 * How it works:
 *   1. Extracts the Bearer token from the Authorization header
 *   2. Uses `jose.jwtVerify()` to verify the JWT signature against
 *      Firebase's public keys (fetched on-demand from Google's JWKS endpoint)
 *   3. Validates the token's issuer (`https://securetoken.google.com/<project>`)
 *      and audience (the Firebase project ID)
 *   4. Returns the decoded uid and email
 *
 * Why not `supabase.auth.getUser()`?
 *   Supabase Auth's `getUser()` expects a Supabase JWT, not a Firebase one.
 *   Firebase and Supabase are completely separate auth systems — they use
 *   different signing keys and different token formats. Using Supabase's
 *   method on a Firebase token will always return "Invalid JWT".
 *
 * @param req - The incoming HTTP request
 * @returns The authenticated user's uid and optional email
 * @throws AuthError if the token is missing, invalid, or expired
 */
export async function verifyAuthToken(
  req: Request,
): Promise<{ uid: string; email?: string }> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header", 401);
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  if (!FIREBASE_PROJECT_ID) {
    throw new AuthError(
      "Firebase project ID not configured on server",
      500,
    );
  }

  try {
    // Verify the JWT signature, issuer, and audience using Firebase's keys.
    const { payload } = await jose.jwtVerify(token, firebaseJWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    return {
      uid: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch (err) {
    // jose throws descriptive errors (e.g. "signature verification failed",
    // "token expired", "invalid audience"). We map them to a generic message
    // to avoid leaking internal details to the client.
    console.warn("[middleware] JWT verification failed:", (err as Error).message);
    throw new AuthError("Invalid or expired authentication token", 401);
  }
}

// ─── Request Validation ──────────────────────────────────────────────────────

export interface ValidatedRequest {
  session_id: string;
  message: string;
  student_location?: {
    latitude: number;
    longitude: number;
  };
  student_profile?: {
    grade?: string;
    subjects?: string[];
  };
  /**
   * Constraint keys the user removed by tapping a pill. The state machine
   * resets these in the session BEFORE merging, so a stale value (e.g.
   * "male") can't survive and re-apply on every search.
   */
  removed_constraints?: string[];
}

/**
 * Validate the incoming request body.
 */
export function validateRequest(body: Record<string, unknown>): ValidatedRequest {
  if (!body.session_id || typeof body.session_id !== "string") {
    throw new ValidationError("Missing or invalid 'session_id' (must be a string)");
  }

  if (!body.message || typeof body.message !== "string") {
    throw new ValidationError("Missing or invalid 'message' (must be a string)");
  }

  if (body.message.trim().length === 0) {
    throw new ValidationError("Message cannot be empty");
  }

  if (body.message.length > 2000) {
    throw new ValidationError("Message too long (max 2000 characters)");
  }

  const validated: ValidatedRequest = {
    session_id: body.session_id as string,
    message: (body.message as string).trim(),
  };

  // Optional student_location
  if (body.student_location && typeof body.student_location === "object") {
    const loc = body.student_location as Record<string, unknown>;
    if (
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number"
    ) {
      validated.student_location = {
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
    }
  }

  // Optional student_profile
  if (body.student_profile && typeof body.student_profile === "object") {
    const profile = body.student_profile as Record<string, unknown>;
    validated.student_profile = {
      grade: typeof profile.grade === "string" ? profile.grade : undefined,
      subjects: Array.isArray(profile.subjects)
        ? (profile.subjects as string[])
        : undefined,
    };
  }

  // Optional removed_constraints — a list of constraint keys to reset in
  // the session (from pill taps). Validate shape; drop anything invalid.
  if (body.removed_constraints !== undefined) {
    if (Array.isArray(body.removed_constraints)) {
      const keys = (body.removed_constraints as unknown[]).filter(
        (k): k is string => typeof k === "string" && k.trim().length > 0,
      );
      if (keys.length > 0) validated.removed_constraints = keys;
    } else {
      throw new ValidationError(
        "Invalid 'removed_constraints' (must be an array of strings)",
      );
    }
  }

  return validated;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

/**
 * PostgreSQL-backed rate limiter (per-user). Counters live in the
 * `rate_limits` table (migration 012) so the limit SURVIVES cold starts —
 * the old in-memory Map reset on every instance spin-up, letting a client
 * bypass the limit (C17).
 */
const RATE_LIMIT = 20; // requests
const RATE_WINDOW_MS = 60_000; // 1 minute

export async function checkRateLimit(userId: string): Promise<void> {
  try {
    const { getSupabaseClient } = await import("../../ai/utils/supabaseClient.ts");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc("rate_limit_check", {
      p_user_id: userId,
      p_limit: RATE_LIMIT,
      p_window_ms: RATE_WINDOW_MS,
    });

    if (error) {
      // Fail open: a rate-limit DB error must not brick the whole chat.
      console.error("[middleware] rate_limit_check failed:", error.message);
      return;
    }

    const result = data as { allowed: boolean; retry_after_ms: number | null } | null;
    if (result && !result.allowed) {
      const retryAfter = Math.ceil((result.retry_after_ms ?? RATE_WINDOW_MS) / 1000);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        429,
        retryAfter,
      );
    }
  } catch (err) {
    // Fail open: a missing/misconfigured service key or any DB error must
    // not take down the chat endpoint. Only the intentional RateLimitError
    // propagates as a 429.
    if (err instanceof RateLimitError) throw err;
    console.error("[middleware] Rate limit unavailable, failing open:", err);
  }
}

// ─── Error Classes ───────────────────────────────────────────────────────────

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class ValidationError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

export class RateLimitError extends Error {
  status: number;
  retryAfter: number;
  constructor(message: string, status: number = 429, retryAfter: number = 60) {
    super(message);
    this.name = "RateLimitError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// ─── Error Response ──────────────────────────────────────────────────────────

export function errorResponse(
  error: Error,
): Response {
  let status = 500;
  let message = "Internal server error";

  if (error instanceof AuthError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof ValidationError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof RateLimitError) {
    status = error.status;
    message = error.message;
  }

  return new Response(
    JSON.stringify({
      type: "error",
      code: error.name.replace("Error", "").toLowerCase(),
      message,
    }),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}
