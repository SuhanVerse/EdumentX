// ════════════════════════════════════════════════════════════════
// groq-proxy
//
// Thin authenticated proxy for Groq chat-completions. Replaces the
// old client-side path that bundled EXPO_PUBLIC_GROQ_API_KEY into the
// shipped JS (Aug 24 audit: extractable from any APK/IPA → free-tier
// quota theft). The Groq key now lives ONLY in Supabase secrets.
//
// Contract:
//   POST { messages: [{role, content}], temperature?, max_tokens? }
//   ←    { content: string }            on success
//   ←    { error: string }              with 4xx/5xx otherwise
//
// The client owns ALL prompt construction + JSON parsing — this
// function is deliberately model-plumbing only, so prompt iteration
// never requires an edge deploy.
//
// Rate limit: per-user 20 req/min via the same PG RPC the chat
// function uses (fails open on DB error, matching chat's posture).
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthError, verifyFirebaseJwt } from "../_shared/firebase-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.1-70b-versatile was deprecated by Groq; newer variant.
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 20_000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 4_000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function enforceRateLimit(userId: string): Promise<void> {
  try {
    const { getSupabaseClient } = await import("../../ai/utils/supabaseClient.ts");
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("rate_limit_check", {
      p_user_id: userId,
      p_limit: RATE_LIMIT,
      p_window_ms: RATE_WINDOW_MS,
    });
    if (error) {
      console.error("[groq-proxy] rate_limit_check failed:", error.message);
      return; // fail open
    }
    const result = data as { allowed: boolean } | null;
    if (result && !result.allowed) {
      throw new AuthError("Rate limit exceeded", 429);
    }
  } catch (err) {
    if (err instanceof AuthError) throw err;
    console.error("[groq-proxy] rate limit unavailable, failing open:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  let apiKey: string | undefined;
  try {
    // 1. Authenticate + rate-limit.
    const auth = await verifyFirebaseJwt(req);
    await enforceRateLimit(auth.uid);

    // 2. Validate body.
    const body = await req.json().catch(() => null);
    const messages = (body as { messages?: unknown } | null)?.messages;
    if (
      !Array.isArray(messages)
      || messages.length === 0
      || messages.length > MAX_MESSAGES
      || !messages.every(
        (m: { role?: unknown; content?: unknown }) =>
          typeof m?.role === "string"
          && ["system", "user", "assistant"].includes(m.role)
          && typeof m?.content === "string"
          && m.content.length <= MAX_MESSAGE_CHARS,
      )
    ) {
      return json({ error: "Invalid messages payload" }, 400);
    }

    const temperature =
      typeof (body as { temperature?: unknown }).temperature === "number"
        ? (body as { temperature: number }).temperature
        : 0.2;
    const max_tokens =
      typeof (body as { max_tokens?: unknown }).max_tokens === "number"
        ? Math.min((body as { max_tokens: number }).max_tokens, 1024)
        : 512;

    // 3. Call Groq server-side.
    apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      console.error("[groq-proxy] GROQ_API_KEY not configured");
      return json({ error: "LLM proxy not configured" }, 500);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error(
        `[groq-proxy] Groq error ${groqRes.status}: ${errText.slice(0, 300)}`,
      );
      return json({ error: "Upstream LLM error" }, 502);
    }
    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return json({ error: "Upstream LLM returned no content" }, 502);
    }
    return json({ content });
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.status);
    }
    console.error("[groq-proxy] unhandled error:", err);
    return json({ error: "LLM proxy error" }, 500);
  }
});
