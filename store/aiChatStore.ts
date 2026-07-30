/**
 * EdumentX — AI Chat Store
 *
 * Zustand store that manages AI chat state:
 *   - Message history
 *   - Session ID lifecycle
 *   - Loading / thinking state
 *   - Error handling
 *   - sendMessage() action that calls the Edge Function
 *   - Constraints slice (the client-side mirror of the server's
 *     `session.constraints` JSONB) so the Zustand store is the
 *     single source of truth for the UI's pill strip and chip handlers.
 */

import { create } from "zustand";
import {
  sendChatMessage,
  generateSessionId,
  ChatServiceError,
  type ChatResponse,
} from "@/services/ai/chatService";
import type { ClientSearchConstraints } from "@/lib/ai/minimumConstraints";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  /** Optional tutor cards attached to this message (for assistant messages). */
  tutorCards?: ChatResponse["tutor_cards"];
  /** True if this message is an error notification. */
  isError?: boolean;
  /** Timestamp of when the message was created. */
  createdAt: string;
};

export interface AiChatState {
  // ── State ──
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Accumulated constraints across the conversation. Mirrors the server's
   * `session.constraints` JSONB. The pill strip and chip handlers read
   * this directly — no LLM roundtrip needed for "what does the bot
   * already know?".
   *
   * Reconciled in two places:
   *   1. Optimistically via `setConstraints()` from chip / pill handlers.
   *   2. Authoritatively via `replaceConstraints()` after each server
   *      response (see sendMessage).
   */
  constraints: ClientSearchConstraints;

  // ── Actions ──
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
  resetSession: () => void;
  /** Re-initialize with an existing session ID (e.g. from storage). */
  setSessionId: (id: string) => void;
  /** Merge a partial patch into the constraints slice. Used by chip / pill handlers. */
  setConstraints: (patch: Partial<ClientSearchConstraints>) => void;
  /** Replace the entire constraints slice. Called after each server response. */
  replaceConstraints: (next: ClientSearchConstraints) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let messageCounter = 0;

function createMessageId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAiChatStore = create<AiChatState>((set, get) => ({
  // ── Initial state ──
  messages: [],
  sessionId: null,
  isLoading: false,
  error: null,
  constraints: {},

  // ── Actions ──

  /**
   * Send a message to the AI chatbot.
   * Handles: optimistic user message, API call, assistant response, errors.
   */
  sendMessage: async (text: string) => {
    const state = get();

    // Guard against double-sends
    if (state.isLoading) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    // Generate or reuse session ID
    let sessionId = state.sessionId;
    if (!sessionId) {
      sessionId = generateSessionId();
      set({ sessionId });
    }

    // ── 1. Optimistically add user message ──
    const userMessage: Message = {
      id: createMessageId(),
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    set((prev) => ({
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    // ── 2. Call the Edge Function ──
    //
    // We send the current constraint snapshot as a hint. The server still
    // re-extracts from the message authoritatively — the hint only helps
    // when the LLM is offline or the message is too short to extract.
    //
    // We also send the last few turns (excluding errors) so the LLM has
    // context for conversational refinements like "actually make it
    // female" or "in Kathmandu, not Baneshwor". Without this, every turn
    // starts cold.
    const recentMessages = state.messages
      .filter((m) => !m.isError)
      .slice(-4)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const response: ChatResponse = await sendChatMessage(
        sessionId,
        trimmed,
        state.constraints as Record<string, unknown>,
        { recent_messages: recentMessages },
      );

      // ── 3. Add assistant response ──
      const assistantMessage: Message = {
        id: createMessageId(),
        role: "assistant",
        text: response.content,
        tutorCards: response.tutor_cards,
        createdAt: new Date().toISOString(),
      };

      // ── 4. Reconcile server-authoritative constraints back into the store ──
      // The server returns `state.constraints` in the SSE-style payload.
      // We coerce the field through snake→camel mapKeys done in chatService.
      // If the field is missing (older server build), keep the local mirror.
      const serverConstraints =
        (response.state?.constraints as ClientSearchConstraints | undefined) ??
        state.constraints;

      set((prev) => ({
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        sessionId: response.session_id || sessionId,
        constraints: serverConstraints,
      }));
    } catch (err) {
      // ── 5. Handle errors gracefully ──
      const errorMessage =
        err instanceof ChatServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";

      const errorMsg: Message = {
        id: createMessageId(),
        role: "assistant",
        text: errorMessage,
        isError: true,
        createdAt: new Date().toISOString(),
      };

      set((prev) => ({
        messages: [...prev.messages, errorMsg],
        isLoading: false,
        error: errorMessage,
      }));
    }
  },

  clearError: () => set({ error: null }),

  resetSession: () =>
    set({
      messages: [],
      sessionId: null,
      isLoading: false,
      error: null,
      constraints: {},
    }),

  setSessionId: (id: string) => set({ sessionId: id }),

  /**
   * Optimistically merge a partial patch into the constraints slice.
   * Keys with `undefined` values are treated as deletions so the pill
   * strip can "remove" a constraint by tapping it.
   *
   * NOTE: this is purely a UI mirror. The server still re-extracts
   * constraints authoritatively from the next message and `replaceConstraints`
   * is called after each response. So this method can't drift permanently —
   * it only optimises the UI between user input and server response.
   */
  setConstraints: (patch: Partial<ClientSearchConstraints>) => {
    set((prev) => {
      const next: ClientSearchConstraints = { ...prev.constraints };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") {
          delete (next as Record<string, unknown>)[key];
        } else {
          (next as Record<string, unknown>)[key] = value;
        }
      }
      return { constraints: next };
    });
  },

  /**
   * Authoritatively replace the constraints slice with the server's view.
   * Called from `sendMessage` after each assistant response.
   */
  replaceConstraints: (next: ClientSearchConstraints) =>
    set({ constraints: { ...next } }),
}));
