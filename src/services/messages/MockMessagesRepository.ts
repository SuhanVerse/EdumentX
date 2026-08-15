/**
 * EdumentX — Mock Messages Repository
 *
 * In-memory implementation of `MessagesRepository` for mock mode
 * (`EXPO_PUBLIC_USE_MOCK_DATA=true`). Mirrors the Firebase shape so
 * the screens don't branch on the data source.
 */

import type {
  ChatMessage,
  Conversation,
  ConversationMeta,
} from "./types";
import { conversationKey } from "./types";
import type { MessagesRepository } from "./MessagesRepository";

const conversations = new Map<string, Conversation>();
const messagesByConversation = new Map<string, ChatMessage[]>();
const identityCache = new Map<string, ConversationMeta>();

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const MockMessagesRepository: MessagesRepository = {
  getConversationId(uidA, uidB) {
    return conversationKey(uidA, uidB);
  },

  subscribeConversation(conversationId, onData, onError) {
    const emit = () =>
      onData(conversations.get(conversationId) ?? null);
    emit();
    return () => {};
  },

  subscribeMessages(conversationId, onData, onError) {
    const emit = () =>
      onData([...(messagesByConversation.get(conversationId) ?? [])]);
    emit();
    return () => {};
  },

  subscribeConversations(viewerUid, onData, onError) {
    const emit = () => {
      const list = [...conversations.values()]
        .filter((c) => c.participants.includes(viewerUid))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      onData(list);
    };
    emit();
    return () => {};
  },

  async sendMessage({ conversationId, senderId, peerUid, text }) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Message text is empty");
    const now = Date.now();

    const existing = conversations.get(conversationId);
    const meta =
      identityCache.get(senderId) ??
      (identityCache.set(senderId, { name: "", avatar: null }),
      identityCache.get(senderId)!);
    const conversation: Conversation = existing ?? {
      conversationId,
      participants: [senderId, peerUid],
      meta: {},
      lastMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    conversation.meta = { ...conversation.meta, [senderId]: meta };
    conversation.updatedAt = now;
    conversation.lastMessage = {
      senderId,
      text: trimmed,
      sentAt: now,
    };
    conversations.set(conversationId, conversation);

    const message: ChatMessage = {
      messageId: nextId(),
      senderId,
      text: trimmed,
      sentAt: now,
    };
    messagesByConversation.set(conversationId, [
      ...(messagesByConversation.get(conversationId) ?? []),
      message,
    ]);
  },
};
