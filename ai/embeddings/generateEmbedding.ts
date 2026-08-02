/**
 * EdumentX AI — Embedding Generator
 *
 * Generates 384-dim embeddings using HuggingFace Serverless Inference API.
 * Model: BAAI/bge-small-en-v1.5 (free tier, no credit card required).
 *
 * Environment variable: HF_API_TOKEN
 *
 * Caching: Results are cached by query text hash in the embedding_cache table.
 */

import { getSupabaseClient } from "@/ai/utils/supabaseClient";

const HF_API_BASE = "https://api-inference.huggingface.co/pipeline/feature-extraction";
const DEFAULT_MODEL = "BAAI/bge-small-en-v1.5";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 15000; // 15 seconds (model cold start)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmbeddingOptions {
  model?: string;
  /** Whether to check cache first (default: true) */
  useCache?: boolean;
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text.
 * Checks the cache first to avoid redundant API calls.
 *
 * @param text - The text to embed (min 5 chars, ideally 20+)
 * @param options - Optional configuration
 * @returns 384-dim array of floats, or null if generation failed
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {},
): Promise<number[] | null> {
  if (!text || text.trim().length < 5) {
    console.warn("[generateEmbedding] Text too short to embed:", text);
    return null;
  }

  const queryText = text.trim();
  const useCache = options.useCache ?? true;

  // Step 1: Check cache (if enabled)
  if (useCache) {
    const cached = await getCachedEmbedding(queryText);
    if (cached) {
      console.log("[generateEmbedding] Cache hit for:", queryText.slice(0, 50));
      return cached;
    }
  }

  // Step 2: Generate embedding via HuggingFace
  const model = options.model ?? DEFAULT_MODEL;
  const apiToken = getHfToken();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const embedding = await callHuggingFaceAPI(queryText, model, apiToken);

      if (embedding && Array.isArray(embedding)) {
        // Step 3: Cache the result
        if (useCache) {
          await cacheEmbedding(queryText, embedding).catch(() => {
            // Non-fatal: cache failure doesn't affect the result
          });
        }

        return embedding;
      }

      return null;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Check if it's a 503 model-loading error — retry after delay
      if (
        lastError.message.includes("503") ||
        lastError.message.includes("loading")
      ) {
        console.log(
          `[generateEmbedding] Model loading, retry ${attempt + 1}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`,
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
      } else {
        // Non-retryable error
        break;
      }
    }
  }

  console.error("[generateEmbedding] All retries failed:", lastError?.message);
  return null;
}

/**
 * Generate embeddings for multiple texts in batch.
 * HuggingFace supports batch inference — send multiple inputs at once.
 *
 * @param texts - Array of texts to embed
 * @returns Array of embeddings (same order as input), or nulls for failures
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: EmbeddingOptions = {},
): Promise<(number[] | null)[]> {
  const validTexts = texts.filter((t) => t && t.trim().length >= 5);
  if (validTexts.length === 0) return texts.map(() => null);

  const model = options.model ?? DEFAULT_MODEL;
  const apiToken = getHfToken();

  try {
    const response = await fetch(
      `${HF_API_BASE}/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: validTexts,
          options: { wait_for_model: true },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const result = await response.json();
    // Result is [[float, ...], [float, ...], ...] for batch inputs
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result as number[][];
    }

    return texts.map(() => null);
  } catch (err) {
    console.error("[generateEmbeddingsBatch] Failed:", err);
    return texts.map(() => null);
  }
}

// ─── Internals ───────────────────────────────────────────────────────────────

function getHfToken(): string {
  // RUNTIME-AGNOSTIC (C6): probe `globalThis.Deno` first (Edge Function),
  // fall back to `process.env` (Node / React Native). Never reference
  // `Deno` directly — it throws ReferenceError outside the Deno runtime.
  const runtime = globalThis as unknown as {
    Deno?: { env?: { get: (key: string) => string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };
  const token =
    runtime.Deno?.env?.get("HF_API_TOKEN") ??
    runtime.process?.env?.EXPO_PUBLIC_HF_API_TOKEN ??
    runtime.process?.env?.HF_API_TOKEN;
  if (!token) {
    throw new Error("HF_API_TOKEN environment variable is not set");
  }
  return token;
}

async function callHuggingFaceAPI(
  text: string,
  model: string,
  apiToken: string,
): Promise<number[] | null> {
  const response = await fetch(`${HF_API_BASE}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HuggingFace API error (${response.status}): ${body}`);
  }

  const result = await response.json();

  // Single input returns [[float, float, ...]]
  // Batch input returns [[float, ...], [float, ...], ...]
  if (Array.isArray(result)) {
    if (Array.isArray(result[0]) && typeof result[0][0] === "number") {
      return result[0] as number[];
    }
    if (typeof result[0] === "number") {
      return result as number[];
    }
  }

  console.warn("[callHuggingFaceAPI] Unexpected response format:", typeof result);
  return null;
}

async function getCachedEmbedding(queryText: string): Promise<number[] | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .rpc("get_cached_embedding", { query_text: queryText })
      .maybeSingle();

    if (error || !data) return null;

    // Parse the embedding from the response
    if (data.embedding && Array.isArray(data.embedding)) {
      return data.embedding as number[];
    }

    return null;
  } catch {
    return null; // Cache failure is non-fatal
  }
}

async function cacheEmbedding(queryText: string, embedding: number[]): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.rpc("cache_embedding", {
      query_text: queryText,
      new_embedding: `[${embedding.join(",")}]`,
    });
  } catch (err) {
    console.warn("[cacheEmbedding] Failed to cache:", err);
  }
}
