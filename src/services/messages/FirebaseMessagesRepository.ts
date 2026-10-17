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
  increment,
  onSnapshot,
  or,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import type {
  ChatMessage,
  Conversation,
  ConversationMeta,
} from "./types";
import { conversationKey, peerUidOf } from "./types";
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
  const rawUnread =
    raw.unreadCount && typeof raw.unreadCount === "object"
      ? (raw.unreadCount as Record<string, unknown>)
      : {};
  const unreadCount: Record<string, number> = {};
  for (const [uid, n] of Object.entries(rawUnread)) {
    if (typeof n === "number") unreadCount[uid] = n;
  }
  const rawTyping =
    raw.typing && typeof raw.typing === "object"
      ? (raw.typing as Record<string, unknown>)
      : {};
  const typing: Record<string, boolean> = {};
  for (const [uid, t] of Object.entries(rawTyping)) {
    if (typeof t === "boolean") typing[uid] = t;
  }
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
    unreadCount,
    typing,
    createdAt: tsToMs(raw.createdAt),
    updatedAt: tsToMs(raw.updatedAt),
  };
}

// Resolve the current user's own display identity (their OWN profile
// subdocs are owner-readable). Tries the tutor profile first, then
// the student profile, then falls back to empty. Cached per uid so
// sends don't re-read the profile every time.
const identityCache = new Map<string, ConversationMeta>();

/**
 * Aug 25 — resolved TUTOR-peer identities for hub enrichment. Public
 * `tutors/{uid}` docs are readable by any signed-in user, so the
 * viewer can label a thread even before the peer's first self-meta
 * write lands. Negative entries (empty name) prevent refetch storms.
 */
const tutorPeerCache = new Map<string, ConversationMeta>();

async function resolveOwnIdentity(uid: string): Promise<ConversationMeta> {
  // Aug 25: only trust a NON-empty cached identity. The previous
  // unconditional cache turned one early miss (profile not yet saved /
  // race at first send) into a permanent empty name — peers saw
  // "Chat" with a blank avatar until the OTHER side replied.
  const cached = identityCache.get(uid);
  if (cached && cached.name) return cached;
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
            status: raw.status === "read" ? "read" : "sent",
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
    // The rules gate conversations on the SORTED SCALAR pair
    // (`participantA` / `participantB` — see firestore.rules §1:1
    // messaging). A `where("participants", "array-contains", uid)`
    // filter is NOT provable against those scalar checks, so the hub
    // query was silently denied on every render (the Aug 2026
    // permission-denied storm). Filtering on the scalars directly
    // matches the rules exactly.
    const q = query(
      collection(db, "conversations"),
      or(
        where("participantA", "==", viewerUid),
        where("participantB", "==", viewerUid),
      ),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const conversations: Conversation[] = snap.docs.map((d) =>
          mapConversation(d.id, d.data() as Record<string, unknown>),
        );
        // Newest activity first — no composite index needed, the list
        // is small for the demo and the sort is client-side.
        conversations.sort((a, b) => b.updatedAt - a.updatedAt);

        // ── Aug 25: tutor-peer identity resolution (emit-then-enrich)
        // A conversation only carries each side's SELF-written meta.
        // Until the peer replies for the first time, their meta entry
        // doesn't exist and the hub rendered a generic "Chat" row.
        // Tutor peers are PUBLICLY readable (`tutors/{uid}`), so the
        // viewer's OWN copy of the list is enriched locally — no
        // Firestore write, no rules change. Student peers are covered
        // by sender-written meta on first message already.
        const applyTutorPeers = (
          list: Conversation[],
        ): Conversation[] =>
          list.map((c) => {
            const peer = peerUidOf(c, viewerUid);
            if (!peer) return c;
            const existing = c.meta[peer];
            if (existing && existing.name) return c; // already resolved
            const info = tutorPeerCache.get(peer);
            if (!info) return c;
            return {
              ...c,
              meta: {
                ...c.meta,
                [peer]: { name: info.name, avatar: info.avatar },
              },
            };
          });

        onData(applyTutorPeers(conversations));

        const missingPeers = [
          ...new Set(
            conversations
              .map((c) => peerUidOf(c, viewerUid))
              .filter((uid): uid is string =>
                !!uid &&
                !(tutorPeerCache.has(uid)) &&
                !(conversations.find(
                  (c) => c.meta[uid]?.name,
                )),
              ),
          ),
        ];
        if (missingPeers.length > 0) {
          void (async () => {
            await Promise.all(
              missingPeers.map(async (peerUid) => {
                try {
                  const tSnap = await getDoc(doc(db, "tutors", peerUid));
                  if (tSnap.exists()) {
                    const d = tSnap.data() as Record<string, unknown>;
                    tutorPeerCache.set(peerUid, {
                      name:
                        typeof d.fullName === "string" ? d.fullName : "",
                      avatar:
                        typeof d.photoUrl === "string" ? d.photoUrl : null,
                    });
                  } else {
                    // Not a tutor — student peer whose meta arrives on
                    // their first reply; mark resolved-negative so we
                    // stop re-fetching every snapshot.
                    tutorPeerCache.set(peerUid, { name: "", avatar: null });
                  }
                } catch {
                  tutorPeerCache.set(peerUid, { name: "", avatar: null });
                }
              }),
            );
            onData(applyTutorPeers(conversations));
          })();
        }
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
    // Dotted-path updates touch only the sender's own keys — the
    // peer's meta / unreadCount / typing entries survive.
    batch.update(convRef, {
      [`meta.${senderId}`]: await resolveOwnIdentity(senderId),
      // Bump the peer's unread badge; zero our own (we're composing).
      [`unreadCount.${peerUid}`]: increment(1),
      [`unreadCount.${senderId}`]: 0,
      // Sending clears our own typing flag.
      [`typing.${senderId}`]: false,
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
      status: "sent",
    });
    await batch.commit();
  },

  async markMessagesRead({ conversationId, viewerUid, messageIds }) {
    if (messageIds.length === 0) return;
    const db = getFirestore(getApp());
    const batch = writeBatch(db);
    for (const id of messageIds) {
      batch.update(
        doc(db, "conversations", conversationId, "messages", id),
        { status: "read", readAt: serverTimestamp() },
      );
    }
    batch.update(doc(db, "conversations", conversationId), {
      [`unreadCount.${viewerUid}`]: 0,
    });
    await batch.commit();
  },

  async setTyping({ conversationId, uid, isTyping }) {
    const db = getFirestore(getApp());
    await updateDoc(doc(db, "conversations", conversationId), {
      [`typing.${uid}`]: isTyping,
    });
  },
};
