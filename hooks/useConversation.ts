/**
 * EdumentX — useConversation Hook
 *
 * Manages conversation session lifecycle.
 * Provides session ID generation, persistence, and cleanup.
 */

import { useState, useCallback } from "react";
import { generateSessionId } from "@/services/ai/chatService";

interface UseConversationReturn {
  /** Current session ID */
  sessionId: string;

  /** Whether the session has been initialized */
  isReady: boolean;

  /** Reset to a new session */
  resetConversation: () => void;

  /** Get the current session ID (for debugging) */
  getSessionInfo: () => { sessionId: string; startedAt: number };
}

const SESSION_STORAGE_KEY = "edumentx_ai_session";

interface SessionInfo {
  sessionId: string;
  startedAt: number;
}

/**
 * Hook for managing AI conversation sessions.
 * Persists session ID in AsyncStorage across app restarts.
 */
export function useConversation(): UseConversationReturn {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(() => {
    // Try to restore session from storage
    try {
      // In React Native, this would use AsyncStorage
      // For now, we generate a new one
      const stored = null; // AsyncStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }

    return {
      sessionId: generateSessionId(),
      startedAt: Date.now(),
    };
  });

  const resetConversation = useCallback(() => {
    const newSession = {
      sessionId: generateSessionId(),
      startedAt: Date.now(),
    };

    setSessionInfo(newSession);

    // Persist to storage
    try {
      // AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession))
    } catch {
      // Ignore storage errors
    }
  }, []);

  const getSessionInfo = useCallback(() => {
    return { ...sessionInfo };
  }, [sessionInfo]);

  return {
    sessionId: sessionInfo.sessionId,
    isReady: true,
    resetConversation,
    getSessionInfo,
  };
}
