/**
 * EdumentX — Messaging domain types
 *
 * Schema:
 *   conversations/{conversationId}
 *     participants: [uidA, uidB]          — exactly 2 uids (sorted for
 *                                           a deterministic key)
 *     meta: { [uid]: { name, avatar } }   — self-written display info so
 *                                           the list/hub needs no extra
 *                                           reads (each side writes only
 *                                           its own key)
 *     lastMessage: { senderId, text, sentAt } | null
 *     unreadCount: { [uid]: number }      — per-participant unread
 *                                           count, bumped by the sender
 *                                           and zeroed by the receiver
 *                                           on open
 *     typing: { [uid]: boolean }          — debounced typing indicator
 *                                           (each participant writes
 *                                           only its own key)
 *     createdAt / updatedAt               — server timestamps
 *
 *   conversations/{conversationId}/messages/{messageId}
 *     senderId: string
 *     text: string
 *     sentAt: timestamp
 *     status: "sent" | "read"            — read receipts; the receiver
 *                                           flips incoming messages to
 *                                           "read" when the chat opens
 *
 * The conversationId is deterministic — the two participant uids
 * joined by `__` in sorted order — so either side can address the same
 * conversation without a `where participants == me` query.
 */

export type ConversationMeta = {
  name: string;
  avatar: string | null;
};

export type ConversationLastMessage = {
  senderId: string;
  text: string;
  /** epoch ms (Firestore Timestamp.milliseconds) */
  sentAt: number;
};

export type Conversation = {
  conversationId: string;
  participants: string[];
  meta: Record<string, ConversationMeta>;
  lastMessage: ConversationLastMessage | null;
  /** Per-participant unread counts — `unreadCount[viewerUid]` is the
   *  badge number for that user. */
  unreadCount: Record<string, number>;
  /** Live typing flags — `typing[uid] === true` while a participant
   *  is composing. */
  typing: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
};

export type MessageStatus = "sent" | "read";

export type ChatMessage = {
  messageId: string;
  senderId: string;
  text: string;
  /** epoch ms */
  sentAt: number;
  /** Read receipt: "sent" while the peer hasn't opened the chat,
   *  flipped to "read" by the receiver (see markMessagesRead). */
  status: MessageStatus;
};

/** Build the deterministic conversation id for a participant pair. */
export function conversationKey(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("__");
}

/** The OTHER participant of a conversation, from the viewer's uid. */
export function peerUidOf(
  conversation: Pick<Conversation, "participants">,
  viewerUid: string,
): string {
  return conversation.participants.find((p) => p !== viewerUid) ?? "";
}
