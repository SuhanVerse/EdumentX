/**
 * EdumentX — SSE Streaming Client
 *
 * Parses Server-Sent Events from the Edge Function.
 * Each event is parsed and yielded as a StreamEvent.
 *
 * Event format:
 *   data: {"type": "message", "content": "Hello..."}
 *   data: {"type": "tutor_card", "tutors": [...]}
 *   data: {"type": "done", "session_id": "..."}
 *   data: {"type": "error", "code": "...", "message": "..."}
 */

export type StreamEvent =
  | { type: "message"; content: string }
  | { type: "tutor_card"; tutors: import("@/ai/types/conversation.types").TutorResult[] }
  | { type: "done"; session_id: string; state?: Record<string, unknown> }
  | { type: "error"; code: string; message: string; suggestion?: string };

/**
 * Connect to the Edge Function and parse SSE stream.
 * Returns an async generator of StreamEvent objects.
 */
export async function* streamingClient(
  url: string,
  token: string,
  body: Record<string, unknown>,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Try to parse error from body
    const errorBody = await response.json().catch(() => ({}));
    yield {
      type: "error",
      code: errorBody.code ?? "http_error",
      message: errorBody.message ?? `HTTP ${response.status}`,
      suggestion: errorBody.suggestion,
    };
    return;
  }

  // For MVP: return the response as a single message event
  // (non-streaming mode — Edge Function returns JSON, not SSE yet)
  try {
    const data = await response.json();

    if (data.type === "error") {
      yield {
        type: "error",
        code: data.code,
        message: data.message,
        suggestion: data.suggestion,
      };
      return;
    }

    // Single message
    yield {
      type: "message",
      content: data.content ?? "",
    };

    // Tutor cards (if any)
    if (data.tutor_cards && data.tutor_cards.length > 0) {
      yield {
        type: "tutor_card",
        tutors: data.tutor_cards,
      };
    }

    // Done signal
    yield {
      type: "done",
      session_id: data.session_id ?? "",
      state: data.state,
    };
  } catch (err) {
    yield {
      type: "error",
      code: "parse_error",
      message: "Failed to parse server response",
    };
  }
}
