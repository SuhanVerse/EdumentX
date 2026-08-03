/**
 * EdumentX AI — Groq API Wrapper
 *
 * Lightweight Groq API client for Supabase Edge Functions (Deno runtime).
 * Uses raw fetch() instead of the groq-sdk npm package for Deno compatibility.
 *
 * Environment variables:
 *   GROQ_API_KEY — from console.groq.com
 *
 * Model: llama-3.1-70b-versatile (free tier on Groq)
 */

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.1-70b-versatile";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface GroqResponse {
  content: string | null;
  tool_calls: GroqToolCall[] | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GroqStreamChunk {
  content: string | null;
  finish_reason: "stop" | "length" | null;
}

export interface GroqConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" } | { type: "text" };
}

/**
 * Get the Groq API key from environment
 */
function getApiKey(): string {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Send a chat completion request to Groq.
 * Returns the full response (non-streaming).
 */
export async function groqChat(
  messages: GroqMessage[],
  config: GroqConfig = {},
): Promise<GroqResponse> {
  const apiKey = getApiKey();

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model ?? DEFAULT_MODEL,
      messages,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: config.max_tokens ?? DEFAULT_MAX_TOKENS,
      response_format: config.response_format ?? { type: "text" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content ?? null,
    tool_calls: choice?.message?.tool_calls?.map((tc: Record<string, unknown>) => ({
      name: (tc.function as Record<string, unknown>)?.name as string,
      arguments: JSON.parse((tc.function as Record<string, unknown>)?.arguments as string),
    })) ?? null,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
      total_tokens: data.usage?.total_tokens ?? 0,
    },
  };
}

/**
 * Send a chat completion request and parse the response as JSON.
 * Useful for structured output (intent classification, constraint extraction).
 *
 * The response_format is automatically set to { type: "json_object" }.
 */
export async function groqChatJSON<T>(
  messages: GroqMessage[],
  config: GroqConfig = {},
): Promise<T> {
  const response = await groqChat(messages, {
    ...config,
    response_format: { type: "json_object" },
  });

  if (!response.content) {
    throw new Error("Groq returned empty content for JSON response");
  }

  try {
    return JSON.parse(response.content) as T;
  } catch (err) {
    throw new Error(`Failed to parse Groq JSON response: ${err}\nRaw: ${response.content}`);
  }
}

/**
 * Create a streaming chat completion to Groq.
 * Returns a ReadableStream that yields GroqStreamChunk objects.
 *
 * Usage:
 *   const stream = groqChatStream(messages);
 *   for await (const chunk of stream) {
 *     if (chunk.content) writeToSSE(chunk.content);
 *   }
 */
export function groqChatStream(
  messages: GroqMessage[],
  config: GroqConfig = {},
): ReadableStream<GroqStreamChunk> {
  const apiKey = getApiKey();

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.model ?? DEFAULT_MODEL,
            messages,
            temperature: config.temperature ?? DEFAULT_TEMPERATURE,
            max_tokens: config.max_tokens ?? DEFAULT_MAX_TOKENS,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          controller.error(new Error(`Groq streaming error (${response.status}): ${errorText}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error("Groq streaming response has no body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              const finish = parsed.choices?.[0]?.finish_reason;

              controller.enqueue({
                content: delta?.content ?? null,
                finish_reason: finish ?? null,
              });
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Estimate token count for a string (rough approximation).
 * Used for prompt budget management.
 */
export function estimateTokens(text: string): number {
  // ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}
