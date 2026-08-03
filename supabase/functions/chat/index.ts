/**
 * EdumentX AI — Chat Edge Function
 *
 * Supabase Edge Function entry point.
 *
 * POST /chat
 *
 * Request:
 *   { session_id, message, student_location?, student_profile? }
 *
 * Response (JSON):
 *   { type, content, session_id, state, tutor_cards?, usage? }
 *
 * Environment variables needed:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, HF_API_TOKEN
 */

import { handleRequest } from "./handler.ts";

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[chat function] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        type: "error",
        code: "internal_error",
        message: "Something went wrong. Please try again.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
