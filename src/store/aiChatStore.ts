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
 *
 * Persistence (Phase 7 — W14 / W15 / W16):
 *   - The session (messages, sessionId, constraints) is persisted to
 *     AsyncStorage, so a conversation survives an app restart within
 *     the inactivity window (W14).
 *   - Only the last 6 messages are persisted and sent as LLM context —
 *     matching the server's `getRecentMessages(limit = 6)` window so
 *     both pipelines agree (W15).
 *   - Sessions auto-reset after 30 minutes of inactivity — the same
 *     TTL as the server-side `SESSION_TTL_MINUTES` in
 *     `supabase/ai/memory/sessionStore.ts` (W16).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import {
  sendChatMessage,
  generateSessionId,
  ChatServiceError,
  type ChatResponse,
} from "@/services/ai/chatService";
import type { ClientSearchConstraints } from "@/lib/ai/minimumConstraints";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Same TTL as the server-side session store (`SESSION_TTL_MINUTES = 30`). */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** Same context window as the server's `getRecentMessages(limit = 6)`. */
const MAX_HISTORY_MESSAGES = 6;

const STORAGE_KEY = "edumentx-ai-chat";

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
  /** Exact authenticated owner; no history is loaded before this is confirmed. */
  ownerUid: string | null;
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  /** Epoch ms of the last interaction. Drives the 30-min auto-reset (W16). */
  lastActivity: number;
  /**
   * True once persisted state has been rehydrated from AsyncStorage.
   * The chat screen uses this to avoid flashing the welcome bubble
   * while a saved conversation is still loading.
   */
  hasHydrated: boolean;
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

  /**
   * Keys the user removed by tapping a pill ("x"). The client mirror is
   * cleared immediately, but the SERVER session still holds the stale
   * value (its merge rule preserves existing constraints). We send these
   * keys with the NEXT message so the Edge Function can reset them too —
   * otherwise "remove male filter" re-applies male on every search.
   */
  removedConstraints: string[];

  // ── Actions ──
  sendMessage: (text: string) => Promise<void>;
  /** Called centrally by the root auth listener on confirmed identity changes. */
  setOwnerUid: (uid: string | null) => void;
  clearError: () => void;
  resetSession: () => void;
  /** Merge a partial patch into the constraints slice. Used by chip / pill handlers. */
  setConstraints: (patch: Partial<ClientSearchConstraints>) => void;
  /**
   * Remove a constraint from the client mirror AND queue it for the server
   * (sent with the next message as `removed_constraints`).
   */
  removeConstraint: (key: keyof ClientSearchConstraints) => void;
  /** Replace the entire constraints slice. Called after each server response. */
  replaceConstraints: (next: ClientSearchConstraints) => void;
}

// ─── Persisted shape ─────────────────────────────────────────────────────────

/** The slice of state written to AsyncStorage (see `partialize`). */
interface PersistedChatState {
  ownerUid: string | null;
  messages: Message[];
  sessionId: string | null;
  constraints: ClientSearchConstraints;
  /**
   * Pill-tap removals not yet acknowledged by the server. Persisted too
   * (W14-style) so a force-close between "tap the x" and "send a message"
   * doesn't lose the removal — otherwise the server session's stale value
   * (e.g. "male") would re-apply on the next message after restart.
   */
  removedConstraints: string[];
  lastActivity: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let messageCounter = 0;
let chatGeneration = 0;
let hydrationGeneration = -1;
let persistenceReady = false;
let storageWrites = Promise.resolve();

const nativeUid = () => getAuth(getApp()).currentUser?.uid ?? null;
const ownerStorageKey = (uid: string) => `${STORAGE_KEY}:v2:${encodeURIComponent(uid)}`;

// Writes carry their original owner key and are serialized. A queued A write
// cannot overwrite B's cache. Unscoped legacy history is never read/migrated.
const ownerStorage = {
  async getItem(name: string): Promise<string | null> {
    if (name === STORAGE_KEY) return null;
    const ticket = chatGeneration;
    const value = await AsyncStorage.getItem(name);
    return ticket === chatGeneration ? value : null;
  },
  setItem(name: string, value: string): Promise<void> {
    if (!persistenceReady || name === STORAGE_KEY) return Promise.resolve();
    storageWrites = storageWrites.then(() => AsyncStorage.setItem(name, value)).catch(() => {
      // Persistence failure must not reveal private content in logs or block logout.
    });
    return storageWrites;
  },
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

function createMessageId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

/** Fresh initial state — shared by the store creator and `resetSession`. */
function initialState(): Pick<
  AiChatState,
  | "messages"
  | "sessionId"
  | "isLoading"
  | "error"
  | "lastActivity"
  | "constraints"
  | "removedConstraints"
> {
  return {
    messages: [],
    sessionId: null,
    isLoading: false,
    error: null,
    lastActivity: Date.now(),
    constraints: {},
    removedConstraints: [],
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      ...initialState(),
      ownerUid: null,
      hasHydrated: false,

      // ── Actions ──

      setOwnerUid: (uid) => {
        // Never bind a caller-supplied UID that the native provider has not confirmed.
        if (uid !== null && nativeUid() !== uid) return;
        void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        if (get().ownerUid === uid && (uid !== null || get().hasHydrated)) return;
        const ticket = ++chatGeneration;
        persistenceReady = false;
        useAiChatStore.persist.setOptions({ name: uid === null ? STORAGE_KEY : ownerStorageKey(uid) });
        set({ ...initialState(), ownerUid: uid, hasHydrated: uid === null });
        // Rehydrating even on signout invalidates Zustand's older pending hydration.
        void Promise.resolve(useAiChatStore.persist.rehydrate()).finally(() => {
          if (ticket !== chatGeneration || get().ownerUid !== uid || (uid !== null && nativeUid() !== uid)) return;
          persistenceReady = uid !== null;
          set({ hasHydrated: true });
        });
      },

      /**
       * Send a message to the AI chatbot.
       * Handles: optimistic user message, API call, assistant response, errors.
       *
       * Also enforces the 30-minute inactivity TTL (W16): if the app was
       * left open past the window, the stale session is silently reset
       * and a fresh conversation starts (mirrors the server's expiry
       * behavior on `getOrCreateSession`).
       */
      sendMessage: async (text: string) => {
        // Guard against double-sends
        const ownerUid = get().ownerUid;
        if (!ownerUid || nativeUid() !== ownerUid || !get().hasHydrated || get().isLoading) return;

        const trimmed = text.trim();
        if (!trimmed) return;

        // ── W16: auto-reset a stale session (> 30 min inactivity) ──
        if (
          get().sessionId &&
          Date.now() - get().lastActivity > SESSION_TTL_MS
        ) {
          console.log(
            "[aiChatStore] Session stale (>30 min) — auto-resetting",
          );
          get().resetSession();
        }

        // Generate or reuse session ID
        let sessionId = get().sessionId;
        if (!sessionId) {
          sessionId = generateSessionId();
          set({ sessionId });
        }

        // ── 1. Snapshot prior history BEFORE appending the current message ──
        //
        // We send the last few turns (excluding errors) so the LLM has context
        // for conversational refinements like "actually make it female" or
        // "in Kathmandu, not Baneshwor". Without this, every turn starts cold.
        //
        // IMPORTANT: this must NOT include the current message — the pipeline
        // (mock + server) adds it itself as the latest turn. Snapshotting
        // before the optimistic append keeps the current message out.
        //
        // W15: the window is capped at MAX_HISTORY_MESSAGES (6) to match the
        // server's `getRecentMessages(limit = 6)` — both pipelines agree.
        const recentMessages = get()
          .messages.filter((m) => !m.isError)
          .slice(-MAX_HISTORY_MESSAGES)
          .map((m) => ({ role: m.role, text: m.text }));

        // Touch the activity clock — every interaction resets the TTL.
        set({ lastActivity: Date.now() });

        // ── 2. Optimistically add user message ──
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

        // ── 3. Call the Edge Function ──
        //
        // We send the current constraint snapshot as a hint. The server still
        // re-extracts from the message authoritatively — the hint only helps
        // when the LLM is offline or the message is too short to extract.
        //
        // We ALSO send any constraints the user removed by tapping a pill.
        // The server must reset those in ITS session or the stale filter
        // (e.g. "male") survives and re-applies on every search.
        const pendingRemovals = get().removedConstraints;
        const ticket = chatGeneration;
        const isCurrent = () => ticket === chatGeneration && get().ownerUid === ownerUid && nativeUid() === ownerUid;

        try {
          const response: ChatResponse = await sendChatMessage(
            sessionId,
            trimmed,
            get().constraints as Record<string, unknown>,
            {
              recent_messages: recentMessages,
              removed_constraints: pendingRemovals,
            },
          );

          if (!isCurrent()) return;

          // Removals were acknowledged by the server — clear the queue so
          // the next message doesn't re-send stale removals.
          if (pendingRemovals.length > 0) {
            set({ removedConstraints: [] });
          }

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
            get().constraints;

          set((prev) => ({
            messages: [...prev.messages, assistantMessage],
            isLoading: false,
            sessionId: response.session_id || sessionId,
            constraints: serverConstraints,
            lastActivity: Date.now(),
          }));
        } catch (err) {
          if (!isCurrent()) return;
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
            lastActivity: Date.now(),
          }));
        }
      },

      clearError: () => set({ error: null }),

      resetSession: () => {
        chatGeneration += 1;
        persistenceReady = get().ownerUid !== null && nativeUid() === get().ownerUid;
        set({
          ...initialState(),
          hasHydrated: true,
        });
      },

      /**
       * Remove a constraint from the client mirror AND queue it for the
       * server (sent with the next message as `removed_constraints`).
       * Mirrors the pill-tap semantics: the user wants that filter gone.
       */
      removeConstraint: (key: keyof ClientSearchConstraints) => {
        const prev = get().removedConstraints;
        const next: ClientSearchConstraints = { ...get().constraints };
        delete (next as Record<string, unknown>)[key];
        set({
          constraints: next,
          removedConstraints: prev.includes(key as string)
            ? prev
            : [...prev, key as string],
        });
      },

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
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => ownerStorage),
      onRehydrateStorage: () => {
        // Storage resolution precedes middleware merge; reset must invalidate that gap too.
        hydrationGeneration = chatGeneration;
      },

      // Persist only what's needed to resume a conversation. Never persist
      // transient fields (isLoading / error). Chat remains local private data.
      partialize: (state): PersistedChatState => ({
        ownerUid: state.ownerUid,
        messages: state.messages.slice(-MAX_HISTORY_MESSAGES),
        sessionId: state.sessionId,
        constraints: state.constraints,
        removedConstraints: state.removedConstraints,
        lastActivity: state.lastActivity,
      }),

      /**
       * Rehydration rules (W14 / W16):
       *   - Fresh install or expired session (> 30 min since last activity)
       *     → start with a clean conversation.
       *   - Otherwise → resume the persisted session.
       */
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedChatState> | undefined;
        const lastActivity =
          typeof p?.lastActivity === "number" ? p.lastActivity : Date.now();
        // First-ever launch (no persisted state) or an expired session
        // (> 30 min since last activity) → start with a clean conversation.
        if (
          hydrationGeneration !== chatGeneration ||
          !p || !current.ownerUid || p.ownerUid !== current.ownerUid ||
          nativeUid() !== current.ownerUid || !Number.isFinite(lastActivity) ||
          Date.now() - lastActivity > SESSION_TTL_MS
        ) {
          return { ...current, hasHydrated: true };
        }
        return {
          ...current,
          messages: Array.isArray(p.messages) ? p.messages : [],
          sessionId: typeof p.sessionId === "string" ? p.sessionId : null,
          constraints:
            p.constraints && typeof p.constraints === "object"
              ? (p.constraints as ClientSearchConstraints)
              : {},
          removedConstraints: Array.isArray(p.removedConstraints)
            ? p.removedConstraints
            : [],
          lastActivity,
          hasHydrated: true,
        };
      },
    },
  ),
);
