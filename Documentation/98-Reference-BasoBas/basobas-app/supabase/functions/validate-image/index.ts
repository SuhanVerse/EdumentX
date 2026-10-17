// ════════════════════════════════════════════════════════════════════
// validate-image
//
// AI content gate for user-uploaded images. Called by the mobile app at
// pick time (BEFORE any storage upload) so rejected images never leave
// the device and users get instant feedback.
//
// Two contexts:
//   avatar   — must show one clearly visible human face (portrait/selfie)
//   property — must look like a residential interior/exterior photo
//
// KYC documents are intentionally NOT validated here: free-tier AI
// providers may log request data, and government IDs are sensitive PII.
//
// Provider fallback chain (each skipped if its secret is absent):
//   1. Google Gemini Flash   (primary, ~1500 free req/day)
//   2. Groq llama-4-scout    (fallback, OpenAI-compatible)
//   3. OpenRouter free router (fallback, auto-picks vision model)
// If every provider fails, we DEGRADE (fail-open): the upload proceeds
// and a console.warn is logged. This is a UX guardrail, not security —
// an outage must never block signups or listings.
//
// Env:
//   GEMINI_API_KEY     (optional) Google AI Studio key
//   GEMINI_MODEL       (optional) default "gemini-2.5-flash"
//   GROQ_API_KEY       (optional) Groq key
//   OPENROUTER_API_KEY (optional) OpenRouter key
//
// Request body:
//   { imageBase64: string, mimeType: string, context: 'avatar' | 'property' }
// Returns:
//   { valid: boolean, reason?: string, provider: string, degraded?: boolean }
// ════════════════════════════════════════════════════════════════════

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'npm:@supabase/server';
import { verifyClerkJwt } from '../_shared/auth.ts';

type Context = 'avatar' | 'property';

interface Verdict {
  valid: boolean;
  reason?: string;
}

const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // ~3MB binary; client sends ~60KB
const PROVIDER_TIMEOUT_MS = 10_000;
const GEMINI_RETRY_DELAY_MS = 800;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const PROMPTS: Record<Context, string> = {
  avatar:
    'You are an image moderator for a housing rental app. Decide if this image is acceptable as a user profile picture. Accept ONLY if it shows exactly ONE clearly visible human face with the person as the main subject (a portrait or selfie). Reject group photos, landscapes, buildings, food, pets, objects, memes, screenshots, artwork/cartoons, or anything without a visible human face. Reply ONLY with JSON.',
  property:
    'You are an image moderator for a housing rental app. Decide if this image is acceptable as a rental listing photo. Accept residential interiors or exteriors: rooms, kitchens, bathrooms, living spaces, balconies, courtyards, house/apartment/building facades. Reject selfies or people portraits, food closeups, memes, screenshots, documents/text pages, animals, or unrelated random photos. Reply ONLY with JSON.',
};

const SCHEMA_INSTRUCTION =
  'Respond exactly as JSON: {"valid": boolean, "reason": string}. ' +
  '"reason" is required when valid is false — a short friendly instruction (max 100 chars) telling the user what kind of photo to use instead, e.g. "Please use a photo that clearly shows your face."';

// ─── Shared fetch helper with timeout ───────────────────────────────

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    throw new Error(`Non-JSON response (${response.status})`);
  }
}

/** Extract the first JSON object from a model reply (strips code fences). */
function parseVerdict(raw: string | undefined | null): Verdict | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof parsed.valid === 'boolean') {
      return {
        valid: parsed.valid,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const isTransient = (status: number) => status === 429 || status >= 500;

// ─── Provider 1: Google Gemini Flash ────────────────────────────────

async function tryGemini(
  base64: string,
  mimeType: string,
  context: Context,
): Promise<Verdict | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `${PROMPTS[context]} ${SCHEMA_INSTRUCTION}` },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };

  // One quick retry on transient failures (free tier 429s are common).
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, GEMINI_RETRY_DELAY_MS));
    }
    try {
      const { status, body } = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (isTransient(status)) continue;
      if (status !== 200) throw new Error(`Gemini ${status}`);

      const candidate = (
        body as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        }
      ).candidates?.[0];
      const verdict = parseVerdict(candidate?.content?.parts?.[0]?.text);
      if (!verdict) throw new Error('Gemini returned unparseable verdict');
      return verdict;
    } catch (err) {
      if (attempt === 1) {
        console.warn('[validate-image] gemini failed:', err);
        return null;
      }
    }
  }
  return null;
}

// ─── Providers 2 & 3: Groq / OpenRouter (OpenAI-compatible vision) ──

async function tryOpenAICompatible(
  name: 'groq' | 'openrouter',
  baseUrl: string,
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string,
  context: Context,
): Promise<Verdict | null> {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const payload = {
    model,
    temperature: 0,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${PROMPTS[context]} ${SCHEMA_INSTRUCTION}` },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  try {
    const { status, body } = await fetchJson(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(name === 'openrouter'
          ? {
              // Recommended attribution headers per OpenRouter docs.
              'HTTP-Referer': 'https://basobas.app',
              'X-Title': 'Basobas App',
            }
          : {}),
      },
      body: JSON.stringify(payload),
    });
    if (status !== 200) throw new Error(`${name} ${status}`);

    const content = (body as {
      choices?: { message?: { content?: string } }[];
    }).choices?.[0]?.message?.content;
    const verdict = parseVerdict(content);
    if (!verdict) throw new Error(`${name} returned unparseable verdict`);
    return verdict;
  } catch (err) {
    console.warn(`[validate-image] ${name} failed:`, err);
    return null;
  }
}

function tryGroq(
  base64: string,
  mimeType: string,
  context: Context,
): Promise<Verdict | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return Promise.resolve(null);
  return tryOpenAICompatible(
    'groq',
    'https://api.groq.com/openai/v1/chat/completions',
    apiKey,
    'meta-llama/llama-4-scout-17b-16e-instruct',
    base64,
    mimeType,
    context,
  );
}

function tryOpenRouter(
  base64: string,
  mimeType: string,
  context: Context,
): Promise<Verdict | null> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return Promise.resolve(null);
  return tryOpenAICompatible(
    'openrouter',
    'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    // Free Models Router — filters for models supporting image input.
    'openrouter/free',
    base64,
    mimeType,
    context,
  );
}

// ─── Handler ────────────────────────────────────────────────────────

export default {
  fetch: withSupabase({ auth: 'none' }, async (req) => {
    // ── 1. Verify the Clerk JWT ────────────────────────────────────
    let clerkId: string;
    try {
      clerkId = await verifyClerkJwt(req);
    } catch (err) {
      console.error('Clerk JWT verification failed:', err);
      return Response.json(
        { error: 'Unauthorized — invalid or missing session token' },
        { status: 401 },
      );
    }

    // ── 2. Parse and validate the request body ─────────────────────
    let body: { imageBase64?: string; mimeType?: string; context?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { imageBase64, mimeType, context } = body;
    if (
      !imageBase64 ||
      typeof imageBase64 !== 'string' ||
      imageBase64.length < 100 ||
      imageBase64.length > MAX_BASE64_LENGTH
    ) {
      return Response.json(
        { error: 'imageBase64 must be between 100 chars and 4MB' },
        { status: 400 },
      );
    }
    if (!mimeType || !ALLOWED_MIME.has(mimeType.toLowerCase())) {
      return Response.json(
        { error: 'mimeType must be jpeg, png or webp' },
        { status: 400 },
      );
    }
    if (context !== 'avatar' && context !== 'property') {
      return Response.json(
        { error: "context must be 'avatar' or 'property'" },
        { status: 400 },
      );
    }

    // ── 3. Run the provider chain ──────────────────────────────────
    const startedAt = Date.now();
    try {
      let provider = 'gemini';
      let verdict = await tryGemini(imageBase64, mimeType, context);

      if (!verdict) {
        provider = 'groq';
        verdict = await tryGroq(imageBase64, mimeType, context);
      }
      if (!verdict) {
        provider = 'openrouter';
        verdict = await tryOpenRouter(imageBase64, mimeType, context);
      }

      if (!verdict) {
        // All providers unavailable → fail-open so uploads never block.
        console.warn(
          `[validate-image] degraded: all providers failed for user=${clerkId} context=${context}`,
        );
        return Response.json({
          valid: true,
          provider: 'none',
          degraded: true,
        });
      }

      console.log(
        `[validate-image] user=${clerkId} ctx=${context} provider=${provider} ` +
          `valid=${verdict.valid} ms=${Date.now() - startedAt}`,
      );
      return Response.json({
        valid: verdict.valid,
        reason: verdict.reason,
        provider,
      });
    } catch (err) {
      console.error('[validate-image] unexpected error:', err);
      return Response.json({
        valid: true,
        provider: 'none',
        degraded: true,
      });
    }
  }),
};
