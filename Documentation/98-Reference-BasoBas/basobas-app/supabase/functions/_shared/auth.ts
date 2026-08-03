// ════════════════════════════════════════════════════════════════════
// Clerk JWT Verification (Shared)
//
// Manually verifies a Clerk-issued session JWT in Supabase Edge
// Functions. This is needed because @supabase/server's
// withSupabase({ auth: ['user'] }) middleware only accepts Supabase-
// native JWTs — it cannot verify raw Clerk tokens.
//
// Approach:
//   - Use `jose` library with Clerk's JWKS endpoint to verify the
//     JWT's signature, expiry, etc.
//   - The JWKS URL is constructed from the CLERK_JWKS_URL env var
//     (e.g. https://<your-clerk-instance>.clerk.accounts.dev/.well-known/jwks.json)
//   - The JWKS is fetched once and cached by createRemoteJWKSet.
//
// Usage in any Edge Function:
//
//   import { verifyClerkJwt } from "../_shared/auth.ts"
//
//   export default {
//     fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
//       const clerkId = await verifyClerkJwt(req);
//       ...
//     }),
//   };
// ════════════════════════════════════════════════════════════════════

import { createRemoteJWKSet, jwtVerify } from "npm:jose@^6.0.0";

// ─── Cached JWKS loader ─────────────────────────────────────────────
// createRemoteJWKSet fetches the JWKS document lazily (on first call)
// and caches it. If a token arrives with a key ID not in the cache, it
// refetches automatically — handling Clerk's key rotation smoothly.

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwksUrl(): URL {
  const url = Deno.env.get("CLERK_JWKS_URL");
  if (!url) {
    throw new Error(
      "Missing CLERK_JWKS_URL environment variable. " +
      "Set it to your Clerk instance's JWKS URL, e.g.: " +
      "https://<your-clerk-instance>.clerk.accounts.dev/.well-known/jwks.json",
    );
  }
  return new URL(url);
}

function getJwks() {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(getJwksUrl());
  }
  return JWKS;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Extract and verify a Clerk JWT from the Authorization header.
 *
 * @param req - The incoming Request object
 * @returns The Clerk user ID (the `sub` claim from the JWT)
 * @throws If the auth header is missing, the token is invalid,
 *         expired, or the `sub` claim is absent.
 */
export async function verifyClerkJwt(req: Request): Promise<string> {
  // 1. Extract the Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  // 2. Isolate the JWT string
  const token = authHeader.split(" ")[1];

  // 3. Verify the JWT against Clerk's JWKS
  // jwtVerify checks: signature, exp, nbf, iss (if provided), etc.
  const { payload } = await jwtVerify(token, getJwks());

  // 4. Extract and return the user ID
  const userId = payload.sub;
  if (!userId) {
    throw new Error("JWT is valid but missing the 'sub' claim");
  }

  return userId;
}
