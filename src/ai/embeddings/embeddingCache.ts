/**
 * EdumentX AI — Embedding Cache
 *
 * Client-side cache for generated embeddings to avoid redundant
 * HuggingFace API calls. Works alongside the database cache in
 * the embedding_cache PostgreSQL table.
 *
 * Two-tier cache:
 *   Tier 1: In-memory Map (fast, session-scoped)
 *   Tier 2: PostgreSQL embedding_cache table (persistent, shared)
 */

import { getSupabaseClient } from "@/ai/utils/supabaseClient";

// ─── In-Memory Cache ─────────────────────────────────────────────────────────

/**
 * Simple in-memory LRU cache for embeddings.
 * Automatically evicts oldest entries when max size is reached.
 */
class MemoryEmbeddingCache {
  private cache = new Map<string, number[]>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): number[] | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: number[]): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton in-memory cache
const memoryCache = new MemoryEmbeddingCache();

// ─── Database Cache ──────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of query text (matches PostgreSQL DIGEST function).
 * Uses Web Crypto API (available in Deno and modern browsers).
 *
 * Note: We use SHA-256 instead of MD5 because Web Crypto API
 * does not support MD5 (only SHA-1, SHA-256, SHA-384, SHA-512 are valid).
 * The PostgreSQL side uses sha256 via pgcrypto's DIGEST function.
 */
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Try to get a cached embedding, checking memory first, then database.
 */
export async function getCachedEmbedding(
  queryText: string,
): Promise<number[] | null> {
  const normalizedKey = queryText.toLowerCase().trim();

  // Tier 1: In-memory cache
  const memoryHit = memoryCache.get(normalizedKey);
  if (memoryHit) {
    return memoryHit;
  }

  // Tier 2: Database cache
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("embedding_cache")
      .select("embedding")
      .eq("query_hash", await computeHash(normalizedKey))
      .maybeSingle();

    if (error || !data) return null;

    // Parse the embedding array
    const embedding = data.embedding as unknown as number[];
    if (Array.isArray(embedding)) {
      // Store in memory cache for future lookups
      memoryCache.set(normalizedKey, embedding);
      return embedding;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store an embedding in both memory and database caches.
 */
export async function setCachedEmbedding(
  queryText: string,
  embedding: number[],
): Promise<void> {
  const normalizedKey = queryText.toLowerCase().trim();

  // Tier 1: In-memory
  memoryCache.set(normalizedKey, embedding);

  // Tier 2: Database (fire-and-forget)
  try {
    const supabase = getSupabaseClient();
    const hash = await computeHash(normalizedKey);

    await supabase.from("embedding_cache").upsert(
      {
        query_hash: hash,
        query_text: normalizedKey,
        embedding: `[${embedding.join(",")}]`,
      },
      { onConflict: "query_hash" },
    );
  } catch (err) {
    console.warn("[embeddingCache] Database cache write failed:", err);
  }
}

/**
 * Clear the in-memory cache.
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Get the current size of the in-memory cache.
 */
export function getMemoryCacheSize(): number {
  return memoryCache.size;
}
