// ════════════════════════════════════════════════════════════════════
// delete-account
//
// Called by the mobile app after the user confirms account deletion.
// Requires a valid Clerk JWT (verified manually via jose).
//
// Deletes the Clerk user via the Clerk Backend API.
// Requires CLERK_SECRET_KEY env var set in Supabase.
//
// Important: Supabase data (profiles, storage, etc.) is deleted
// client-side by the caller. This function only handles the Clerk
// user deletion, which requires the Clerk Backend API secret key
// and cannot be done from the client.
// ════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { verifyClerkJwt } from "../_shared/auth.ts";

const CLERK_API_BASE = "https://api.clerk.com/v1";

export default {
  fetch: withSupabase({ auth: "none" }, async (req) => {
    // ── 1. Verify the Clerk JWT ────────────────────────────────────
    let clerkId: string;
    try {
      clerkId = await verifyClerkJwt(req);
    } catch (err) {
      console.error("Clerk JWT verification failed:", err);
      return Response.json(
        { error: "Unauthorized — invalid or missing session token" },
        { status: 401 },
      );
    }

    // ── 2. Get the Clerk secret key from environment ───────────────
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) {
      console.error("CLERK_SECRET_KEY is not set");
      return Response.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    // ── 3. Delete the Clerk user via Backend API ───────────────────
    try {
      const response = await fetch(
        `${CLERK_API_BASE}/users/${clerkId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const body = await response.text();
        console.error("Clerk API deletion failed:", response.status, body);
        return Response.json(
          { error: "Failed to delete Clerk user" },
          { status: 500 },
        );
      }

      return Response.json({ success: true });
    } catch (err) {
      console.error("Clerk API request failed:", err);
      return Response.json(
        { error: "Failed to delete Clerk user" },
        { status: 500 },
      );
    }
  }),
};
