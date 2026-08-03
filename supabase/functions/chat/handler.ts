/**
 * EdumentX AI — Chat Handler
 *
 * Request handler for the /chat Edge Function endpoint.
 * Processes incoming requests and returns SSE-streamed responses.
 */

import {
  handleCORS,
  verifyAuthToken,
  validateRequest,
  checkRateLimit,
  errorResponse,
  type ValidatedRequest,
} from "./middleware.ts";
import { orchestrateChat } from "./orchestrator.ts";

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handleRequest(req: Request): Promise<Response> {
  // Step 1: Handle CORS preflight
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  // Step 2: Verify auth
  let user: { uid: string; email?: string };
  try {
    user = await verifyAuthToken(req);
  } catch (err) {
    return errorResponse(err instanceof Error ? err : new Error("Authentication failed"));
  }

  // Step 3: Validate and parse request body
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ type: "error", code: "invalid_json", message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let validatedRequest: ValidatedRequest;
  try {
    validatedRequest = validateRequest(body);
  } catch (err) {
    return errorResponse(err instanceof Error ? err : new Error("Validation failed"));
  }

  // Step 4: Rate limit check (per user) — PostgreSQL-backed (C17),
  // survives Edge Function cold starts.
  try {
    await checkRateLimit(user.uid);
  } catch (err) {
    return errorResponse(err instanceof Error ? err : new Error("Rate limit exceeded"));
  }

  // Step 5: Process the message through the AI pipeline
  try {
    const result = await orchestrateChat({
      session_id: validatedRequest.session_id,
      student_id: user.uid,
      message: validatedRequest.message,
      removed_constraints: validatedRequest.removed_constraints,
    });

    // Step 6: Return response as JSON (non-streaming MVP)
    // Future: Upgrade to SSE streaming
    return new Response(
      JSON.stringify({
        type: "message",
        content: result.response,
        session_id: result.session_id,
        state: result.state,
        tutor_cards: result.tutor_cards,
        usage: result.usage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (err) {
    console.error("[chat handler] Orchestration error:", err);

    return new Response(
      JSON.stringify({
        type: "error",
        code: "internal_error",
        message: "I'm having trouble processing your request. Please try again.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
