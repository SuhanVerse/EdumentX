/**
 * EdumentX — Firebase Messages Repository
 *
 * Production implementation of `MessagesRepository` on
 * `conversations/{conversationId}` + `conversations/{conversationId}/messages`.
 * Rules live under `match /conversations/{conversationId}` in
 * `firebase/firestore.rules` (participant-only read/write).
 */

import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import type {
  ChatMessage,
  Conversation,
  ConversationMeta,
} from "./types";
import { conversationKey } from "./types";
import type { MessagesRepository } from "./MessagesRepository";

function tsToMs(value: unknown): number {
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      const ms = (value as { toDate: () => Date }).toDate().getTime();
      return Number.isNaN(ms) ? Date.now() : ms;
    } catch {
      return Date.now();
    }
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  }
  return Date.now();
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapConversation(
  id: string,
  raw: Record<string, unknown>,
): Conversation {
  const participants = Array.isArray(raw.participants)
    ? raw.participants.filter((p): p is string => typeof p === "string")
    : [];
  const rawMeta =
    raw.meta && typeof raw.meta === "object" ? (raw.meta as Record<string, unknown>) : {};
  const meta: Record<string, ConversationMeta> = {};
  for (const [uid, m] of Object.entries(rawMeta)) {
    if (!m || typeof m !== "object") continue;
    const mm = m as Record<string, unknown>;
    meta[uid] = {
      name: str(mm.name),
      avatar: strOrNull(mm.avatar),
    };
  }
  const rawLast =
    raw.lastMessage && typeof raw.lastMessage === "object"
      ? (raw.lastMessage as Record<string, unknown>)
      : null;
  return {
    conversationId: id,
    participants,
    meta,
    lastMessage: rawLast
      ? {
          senderId: str(rawLast.senderId),
          text: str(rawLast.text),
          sentAt: tsToMs(rawLast.sentAt),
        }
      : null,
    createdAt: tsToMs(raw.createdAt),
    updatedAt: tsToMs(raw.updatedAt),
  };
}

// Resolve the current user's own display identity (their OWN profile
// subdocs are owner-readable). Tries the tutor profile first, then
// the student profile, then falls back to empty. Cached per uid so
// sends don't re-read the profile every time.
const identityCache = new Map<string, ConversationMeta>();

async function resolveOwnIdentity(uid: string): Promise<ConversationMeta> {
  const cached = identityCache.get(uid);
  if (cached) return cached;
  const db = getFirestore(getApp());
  let meta: ConversationMeta = { name: "", avatar: null };
  const tutorSnap = await getDoc(doc(db, "users", uid, "tutorProfile", "default"));
  if (tutorSnap.exists()) {
    const d = tutorSnap.data() as Record<string, unknown>;
    meta = {
      name: str(d.fullName),
      avatar: strOrNull(d.photoUrl),
    };
  }
  if (!meta.name) {
    const studentSnap = await getDoc(doc(db, "users", uid, "studentProfile", "default"));
    if (studentSnap.exists()) {
      const d = studentSnap.data() as Record<string, unknown>;
      meta = {
        name: str(d.fullName),
        avatar: strOrNull(d.photoUrl),
      };
    }
  }
  identityCache.set(uid, meta);
  return meta;
}

export const FirebaseMessagesRepository: MessagesRepository = {
  getConversationId(uidA, uidB) {
    return conversationKey(uidA, uidB);
  },

  subscribeConversation(conversationId, onData, onError) {
    const db = getFirestore(getApp());
    const ref = doc(db, "conversations", conversationId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        onData(
          snap.exists()
            ? mapConversation(snap.id, snap.data() as Record<string, unknown>)
            : null,
        );
      },
      (err) => {
        console.warn("FirebaseMessagesRepository.subscribeConversation", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeMessages(conversationId, onData, onError) {
    const db = getFirestore(getApp());
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("sentAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const messages: ChatMessage[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            messageId: d.id,
            senderId: str(raw.senderId),
            text: str(raw.text),
            sentAt: tsToMs(raw.sentAt),
          };
        });
        onData(messages);
      },
      (err) => {
        console.warn("FirebaseMessagesRepository.subscribeMessages", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeConversations(viewerUid, onData, onError) {
    const db = getFirestore(getApp());
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", viewerUid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const conversations: Conversation[] = snap.docs.map((d) =>
          mapConversation(d.id, d.data() as Record<string, unknown>),
        );
        // Newest activity first — no composite index needed, the list
        // is small for a demo and the sort is client-side.
        conversations.sort((a, b) => b.updatedAt - a.updatedAt);
        onData(conversations);
      },
      (err) => {
        console.warn("FirebaseMessagesRepository.subscribeConversations", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  async sendMessage({ conversationId, senderId, peerUid, text }) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Message text is empty");
    const db = getFirestore(getApp());
    const convRef = doc(db, "conversations", conversationId);

    // Ensure the conversation doc exists before the message write —
    // the message-create rule reads the parent's participants, and
    // `get()` on a missing doc denies.
    const existing = await getDoc(convRef);
    if (!existing.exists()) {
      // Sorted scalar pair — the rules check membership via these two
      // fields (list-membership ops fail the local rules emulator).
      const [participantA, participantB] = [senderId, peerUid].sort();
      await setDoc(convRef, {
        participants: [senderId, peerUid],
        participantA,
        participantB,
        meta: { [senderId]: await resolveOwnIdentity(senderId) },
        lastMessage: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
    const batch = writeBatch(db);
    // Dotted-path update touches only the sender's own meta key — the
    // peer's meta entry survives.
    batch.update(convRef, {
      [`meta.${senderId}`]: await resolveOwnIdentity(senderId),
      lastMessage: {
        senderId,
        text: trimmed,
        sentAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
    batch.set(messageRef, {
      senderId,
      text: trimmed,
      sentAt: serverTimestamp(),
    });
    await batch.commit();
  },
};
