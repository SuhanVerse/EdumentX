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
      unreadCount: {},
      typing: {},
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
    // Bump the peer's unread badge; zero our own; clear our typing flag.
    conversation.unreadCount = {
      ...conversation.unreadCount,
      [peerUid]: (conversation.unreadCount[peerUid] ?? 0) + 1,
      [senderId]: 0,
    };
    conversation.typing = { ...conversation.typing, [senderId]: false };
    conversations.set(conversationId, conversation);

    const message: ChatMessage = {
      messageId: nextId(),
      senderId,
      text: trimmed,
      sentAt: now,
      status: "sent",
    };
    messagesByConversation.set(conversationId, [
      ...(messagesByConversation.get(conversationId) ?? []),
      message,
    ]);
  },

  async markMessagesRead({ conversationId, viewerUid, messageIds }) {
    const list = messagesByConversation.get(conversationId) ?? [];
    const byId = new Set(messageIds);
    if (byId.size > 0) {
      messagesByConversation.set(
        conversationId,
        list.map((m) =>
          byId.has(m.messageId) ? { ...m, status: "read" } : m,
        ),
      );
    }
    const conv = conversations.get(conversationId);
    if (conv) {
      conv.unreadCount = { ...conv.unreadCount, [viewerUid]: 0 };
    }
  },

  async setTyping({ conversationId, uid, isTyping }) {
    const conv = conversations.get(conversationId);
    if (!conv) return;
    conv.typing = { ...conv.typing, [uid]: isTyping };
  },
};
