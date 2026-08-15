/**
 * EdumentX — Messages repository interface
 *
 * Live Firestore-backed 1:1 chat between students and tutors.
 * Conversations live at `conversations/{conversationId}` with a
 * `messages` subcollection. See `types.ts` for the schema.
 */

import type { ChatMessage, Conversation } from "./types";

export type ConversationCallback = (conversation: Conversation | null) => void;
export type MessagesCallback = (messages: ChatMessage[]) => void;
export type ConversationsCallback = (conversations: Conversation[]) => void;
export type ErrorCallback = (err: Error) => void;

export interface MessagesRepository {
  /** Deterministic id for a participant pair — see `conversationKey`. */
  getConversationId(uidA: string, uidB: string): string;

  /** Live conversation doc (participants, meta, lastMessage). */
  subscribeConversation(
    conversationId: string,
    onData: ConversationCallback,
    onError?: ErrorCallback,
  ): () => void;

  /** Live messages for a conversation, oldest first. */
  subscribeMessages(
    conversationId: string,
    onData: MessagesCallback,
    onError?: ErrorCallback,
  ): () => void;

  /** Live list of the user's conversations (array-contains query),
   *  newest-first by `updatedAt`. */
  subscribeConversations(
    viewerUid: string,
    onData: ConversationsCallback,
    onError?: ErrorCallback,
  ): () => void;

  /** Append a message and bump the conversation's lastMessage /
   *  updatedAt. Also (re)writes the sender's own display meta so the
   *  conversation list can render peer names without extra reads. */
  sendMessage(input: {
    conversationId: string;
    senderId: string;
    peerUid: string;
    text: string;
  }): Promise<void>;
}
