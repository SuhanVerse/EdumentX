/**
 * EdumentX — useAiChat Hook
 *
 * React hook that wraps the aiChatStore for easy consumption by chat UI
 * components. Provides a clean interface so AIChat.tsx doesn't need to
 * know about Zustand internals.
 *
 * Usage:
 *   const { messages, sendMessage, isLoading, error, resetSession } = useAiChat();
 *   await sendMessage("I need a Maths tutor");
 */

import { useCallback } from "react";
import { useAiChatStore } from "@/store/aiChatStore";
import { validateChatConfig } from "@/services/ai/chatService";

export function useAiChat() {
  const messages = useAiChatStore((s) => s.messages);
  const sessionId = useAiChatStore((s) => s.sessionId);
  const isLoading = useAiChatStore((s) => s.isLoading);
  const error = useAiChatStore((s) => s.error);
  const constraints = useAiChatStore((s) => s.constraints);

  const sendMessage = useAiChatStore((s) => s.sendMessage);
  const clearError = useAiChatStore((s) => s.clearError);
  const resetSession = useAiChatStore((s) => s.resetSession);
  const setConstraints = useAiChatStore((s) => s.setConstraints);
  const replaceConstraints = useAiChatStore((s) => s.replaceConstraints);

  /**
   * Check if the chat service is configured correctly.
   * Call this once on mount to surface env config issues early.
   */
  const checkConfig = useCallback(() => {
    return validateChatConfig();
  }, []);

  /**
   * Send a message and clear any previous error.
   */
  const handleSend = useCallback(
    async (text: string) => {
      clearError();
      await sendMessage(text);
    },
    [clearError, sendMessage],
  );

  return {
    messages,
    sessionId,
    isLoading,
    error,
    constraints,
    sendMessage: handleSend,
    clearError,
    resetSession,
    setConstraints,
    replaceConstraints,
    checkConfig,
  };
}
