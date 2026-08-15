/**
 * EdumentX — Chat Service
 *
 * Client-side API wrapper for the deployed AI chatbot Edge Function.
 *
 * Usage:
 *   import { sendChatMessage } from "@/services/ai/chatService";
 *   const response = await sendChatMessage(sessionId, "I need a Maths tutor");
 *
 * The service handles:
 *   - Firebase JWT token retrieval
 *   - POST request to the Edge Function
 *   - Response parsing
 *   - Error normalization
 */

import { getAuth } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { sendMockChatMessage } from "@/services/ai/mockChatService";

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Supabase Edge Function URL. Constructed from the Supabase project URL
 * which is populated in the Expo environment variables.
 *
 * Falls back to a placeholder if the env var is missing (so the app
 * doesn't crash in dev — it will just show an error message).
 */
const EDGE_FUNCTION_URL: string = (() => {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/chat`;
  }
  // Fallback for dev — the user will see an error message.
  return "https://placeholder.supabase.co/functions/v1/chat";
})();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatRequest {
  session_id: string;
  message: string;
  student_location?: {
    latitude: number;
    longitude: number;
  };
  student_profile?: {
    grade?: string;
    subjects?: string[];
  };
  /**
   * Client-side mirror of accumulated search constraints. Sent as a hint
   * so the server can short-circuit extraction when the LLM is offline
   * or the message is too short to extract from. The server still
   * authoritatively re-extracts from the message — this field is a hint,
   * not a source of truth.
   */
  current_constraints?: Record<string, unknown>;
  /**
   * Constraint keys the user removed by tapping a pill. The server session
   * must reset these BEFORE merging, or the stale value (e.g. "male")
   * survives and re-applies on every search. Sent with the next message.
   */
  removed_constraints?: string[];
  /**
   * Last few user/assistant turns, in chronological order. Sent to the
   * server (or mock pipeline) so the LLM has context for conversational
   * refinements like "actually make it female" or "in Kathmandu, not
   * Baneshwor". Without this, every turn starts cold.
   *
   * Capped at 4 messages by the caller. Each message is truncated to
   * ~280 characters inside the mock pipeline.
   */
  recent_messages?: { role: "user" | "assistant"; text: string }[];
}

export interface ChatResponse {
  type: "message" | "error";
  content: string;
  session_id: string;
  state?: {
    current_step: string;
    constraints: Record<string, unknown>;
  };
  tutor_cards?: {
    id: string;
    fullName: string;
    headline: string;
    subjects: string[];
    monthlyRateNpr: number;
    rating: number;
    reviewCount: number;
    yearsExperience?: number;
    location?: { neighborhood: string; city: string };
    photoUrl?: string | null;
    verificationStatus?: string;
  }[];
  usage?: {
    total_messages: number;
    search_count: number;
  };
}

export class ChatServiceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = "unknown", status: number = 500) {
    super(message);
    this.name = "ChatServiceError";
    this.code = code;
    this.status = status;
  }
}

// ─── Field Mapping ───────────────────────────────────────────────────────────

/**
 * Convert a snake_case string to camelCase.
 * e.g. "full_name" → "fullName", "monthly_rate_npr" → "monthlyRateNpr"
 */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert all object keys from snake_case to camelCase.
 */
function mapKeysToCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(mapKeysToCamel) as unknown as T;
  if (typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        snakeToCamel(key),
        mapKeysToCamel(value),
      ]),
    ) as T;
  }
  return obj as T;
}

/**
 * Map tutor_cards fields from the server's snake_case (TutorResult)
 * to the client's camelCase format. Also ensures `id` is always a string.
 */
function mapTutorCard(raw: Record<string, unknown>): NonNullable<ChatResponse["tutor_cards"]>[number] {
  const camel = mapKeysToCamel<Record<string, unknown>>(raw);
  return {
    id: String(camel.id ?? ""),
    fullName: String(camel.fullName ?? ""),
    headline: String(camel.headline ?? ""),
    subjects: Array.isArray(camel.subjects) ? camel.subjects as string[] : [],
    monthlyRateNpr: Number(camel.monthlyRateNpr ?? 0),
    rating: Number(camel.rating ?? 0),
    reviewCount: Number(camel.reviewCount ?? 0),
    yearsExperience:
      camel.yearsExperience != null ? Number(camel.yearsExperience) : undefined,
    location: camel.location
      ? { neighborhood: String((camel.location as Record<string, unknown>).neighborhood ?? ""),
          city: String((camel.location as Record<string, unknown>).city ?? "") }
      : undefined,
    photoUrl: camel.photoUrl != null ? String(camel.photoUrl) : null,
    verificationStatus: camel.verificationStatus ? String(camel.verificationStatus) : undefined,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Send a chat message to the AI chatbot Edge Function.
 *
 * @param sessionId - Unique session identifier (generated on the client)
 * @param message   - The user's message text
 * @param options   - Optional context (location, profile, and the
 *                    accumulated client-side constraint snapshot — sent
 *                    as a hint to the server, which still re-extracts
 *                    authoritatively).
 * @returns         - Parsed ChatResponse from the Edge Function
 * @throws          - ChatServiceError on failure
 */
export async function sendChatMessage(
  sessionId: string,
  message: string,
  currentConstraints?: Record<string, unknown>,
  options?: {
    student_location?: { latitude: number; longitude: number };
    student_profile?: { grade?: string; subjects?: string[] };
    recent_messages?: { role: "user" | "assistant"; text: string }[];
    /** Constraint keys removed by pill taps — server must reset them. */
    removed_constraints?: string[];
  },
): Promise<ChatResponse> {
  // ── Step 0: Mock toggle ──
  //
  // When EXPO_PUBLIC_USE_MOCK_DATA=true, bypass the Edge Function
  // entirely and run the client-side mock pipeline (constraint parser
  // + in-memory repository). Zero network, deterministic, offline.
  // Switch back by setting the flag to false and restarting Expo.
  if (process.env.EXPO_PUBLIC_USE_MOCK_DATA === "true") {
    return sendMockChatMessage(sessionId, message, currentConstraints, options);
  }

  // ── Step 1: Get Firebase ID token ──
  const auth = getAuth(getApp());
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new ChatServiceError(
      "You need to be signed in to use the AI assistant.",
      "not_authenticated",
      401,
    );
  }

  let idToken: string;
  try {
    // Explicit forceRefresh=false: call the METHOD (not the legacy
    // property-style accessor) — RNFirebase's modular-deprecation shim
    // warns if the namespace form is used. We don't force a refresh
    // here; the cached token is fine for the Edge Function call.
    idToken = await currentUser.getIdToken(false);
  } catch {
    throw new ChatServiceError(
      "Failed to authenticate. Please try signing in again.",
      "token_error",
      401,
    );
  }

  if (!idToken) {
    throw new ChatServiceError(
      "Could not retrieve authentication token.",
      "token_missing",
      401,
    );
  }

  // ── Step 2: Build request payload ──
  const body: ChatRequest = {
    session_id: sessionId,
    message,
  };

  if (options?.student_location) {
    body.student_location = options.student_location;
  }
  if (options?.student_profile) {
    body.student_profile = options.student_profile;
  }
  if (currentConstraints && Object.keys(currentConstraints).length > 0) {
    body.current_constraints = currentConstraints;
  }
  if (options?.recent_messages && options.recent_messages.length > 0) {
    body.recent_messages = options.recent_messages;
  }
  if (options?.removed_constraints && options.removed_constraints.length > 0) {
    body.removed_constraints = options.removed_constraints;
  }

  // ── Step 3: Send request ──
  //
  // IMPORTANT: We send TWO auth credentials:
  //   1. `apikey` — the Supabase anon key (so the Supabase gateway accepts the request)
  //   2. `Authorization: Bearer <FirebaseToken>` — the Firebase ID token
  //      (our Edge Function's middleware verifies this, NOT the Supabase gateway,
  //      because the function is deployed with `--no-verify-jwt`)
  //
  // Without the apikey header, the Supabase gateway blocks the request before
  // it reaches our handler.
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ChatServiceError(
      "Network error. Please check your connection and try again.",
      "network_error",
      0,
    );
  }

  // ── Step 4: Parse response ──
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new ChatServiceError(
      "The AI assistant returned an unreadable response. Please try again.",
      "parse_error",
      response.status,
    );
  }

  // ── Step 5: Handle error responses ──
  if (!response.ok) {
    const errorMessage =
      typeof data.message === "string"
        ? data.message
        : "The AI assistant is unavailable. Please try again later.";
    const errorCode =
      typeof data.code === "string" ? data.code : "server_error";
    throw new ChatServiceError(errorMessage, errorCode, response.status);
  }

  // ── Step 6: Validate response shape ──
  if (
    typeof data.content !== "string" ||
    typeof data.session_id !== "string"
  ) {
    throw new ChatServiceError(
      "The AI assistant returned an unexpected response format.",
      "invalid_response",
      200,
    );
  }

  // ── Step 7: Map snake_case fields to camelCase for tutor_cards ──
  //
  // The Edge Function returns TutorResult with snake_case fields
  // (full_name, photo_url, monthly_rate_npr). Our UI uses camelCase
  // (fullName, photoUrl, monthlyRateNpr). We map the keys here so the
  // rest of the app never sees snake_case fields.
  const rawTutorCards = data.tutor_cards as Record<string, unknown>[] | undefined;
  const mappedTutorCards = Array.isArray(rawTutorCards)
    ? rawTutorCards.map(mapTutorCard)
    : undefined;

  return {
    type: data.type === "error" ? "error" : "message",
    content: data.content as string,
    session_id: data.session_id as string,
    state: data.state as ChatResponse["state"],
    tutor_cards: mappedTutorCards,
    usage: data.usage as ChatResponse["usage"],
  };
}

/**
 * Generate a unique session ID client-side.
 * Format: "chat_" + timestamp + random suffix
 *
 * Used by the chat store (which persists it across app restarts).
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `chat_${timestamp}_${random}`;
}

/**
 * Validate that the Edge Function URL is set up properly.
 * Useful for debugging — call this on app mount to surface config issues.
 */
export function validateChatConfig(): {
  ok: boolean;
  url: string;
  error?: string;
} {
  const url = EDGE_FUNCTION_URL;

  if (!url || url === "https://placeholder.supabase.co/functions/v1/chat") {
    return {
      ok: false,
      url,
      error:
        "EXPO_PUBLIC_SUPABASE_URL is not set in your .env file. " +
        "The AI assistant will not work until this is configured.",
    };
  }

  return { ok: true, url };
}
