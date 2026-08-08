/**
 * EdumentX AI — Message Store
 *
 * Manages chat message history in the PostgreSQL `messages` table.
 * Messages are immutable — once written, they are never updated.
 * The last 6 messages (3 user + 3 assistant) are included in each
 * LLM prompt for conversation context.
 */

import { getSupabaseClient } from "@/ai/utils/supabaseClient";
import type { Message } from "@/ai/types/conversation.types";

// ─── Message CRUD ────────────────────────────────────────────────────────────

/**
 * Save a message to the conversation history.
 */
export async function saveMessage(
  conversationId: string,
  message: Omit<Message, "id" | "created_at" | "conversation_id">,
): Promise<Message | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      message_type: message.message_type ?? "text",
      metadata: message.metadata ?? null,
      response_time_ms: message.response_time_ms ?? null,
      prompt_tokens: message.prompt_tokens ?? null,
      completion_tokens: message.completion_tokens ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[messageStore] Save message error:", error);
    return null;
  }

  return data as Message;
}

/**
 * Get recent messages for a conversation.
 * Returns the last N messages ordered by creation time.
 *
 * @param conversationId - The conversation UUID
 * @param limit - Number of messages to return (default: 6 = 3 user + 3 assistant)
 * @returns Array of messages
 */
export async function getRecentMessages(
  conversationId: string,
  limit = 6,
): Promise<Message[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[messageStore] Get messages error:", error);
    return [];
  }

  // Reverse to get chronological order
  return (data as Message[]).reverse();
}

/**
 * Get all messages for a conversation (for session export/debug).
 */
export async function getAllMessages(
  conversationId: string,
): Promise<Message[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messageStore] Get all messages error:", error);
    return [];
  }

  return data as Message[];
}

/**
 * Build a conversation history string for LLM context.
 * Formats the last N messages as a simple text transcript.
 *
 * @param messages - Array of messages
 * @returns Formatted history string
 */
export function buildHistoryString(messages: Message[]): string {
  if (messages.length === 0) return "";

  return messages
    .map((m) => {
      const prefix = m.role === "user" ? "Student" : "Assistant";
      return `${prefix}: ${m.content}`;
    })
    .join("\n");
}

/**
 * Count messages in a conversation.
 */
export async function countMessages(conversationId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (error) {
    console.error("[messageStore] Count messages error:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Delete all messages for a conversation (cleanup).
 */
export async function deleteMessages(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);
}
