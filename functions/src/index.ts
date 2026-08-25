/**
 * EdumentX — Cloud Functions (Blaze, no-cost quota)
 *
 * ── onNewChatMessage (v2 Firestore trigger) ────────────────────────
 * Fires when a message lands in `conversations/{cid}/messages/{mid}`.
 * Pushes a notification to the RECIPIENT's devices via the Expo push
 * API using the Expo push tokens already persisted by the app
 * (`users/{uid}.pushTokens` — see src/services/notifications/
 * pushService.ts). Zero extra client SDK, zero FCM plumbing; the Expo
 * push endpoint is free.
 *
 * Skips silently when:
 *   - sender == recipient (self echo)
 *   - message status !== "sent" (read-receipt flips re-fire written)
 *
 * Cost: 2 reads + 1 write per message at most — trivially inside the
 * free quota for demo scale.
 */

import * as functionsV1 from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

interface ChatMessage {
  senderId?: string;
  text?: string;
  status?: string;
}

interface ParticipantDoc {
  participantA?: string;
  participantB?: string;
  meta?: Record<string, { name?: string }>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const onNewChatMessage = functionsV1
  .region("asia-south1")
  .runWith({ maxInstances: 5 })
  .firestore.document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snap, event) => {
    if (!snap.exists) return;

    const msg = snap.data() as ChatMessage;
    const senderId = msg.senderId;
    const text = typeof msg.text === "string" ? msg.text : "";
    if (!senderId) return;
    // Read-receipt updates use `update`; only creations land here, but
    // guard anyway against non-"sent" echoes.
    if (msg.status && msg.status !== "sent") return;

    const db = getFirestore();

    // 1. Load the conversation to find the other participant + the
    //    sender's display name from either side's meta entry.
    const convoSnap = await db
      .doc(`conversations/${event.params.conversationId}`)
      .get();
    const convo = convoSnap.data() as ParticipantDoc | undefined;
    if (!convo) return;

    const recipientUid =
      convo.participantA === senderId
        ? convo.participantB
        : convo.participantA === convo.participantB
          ? undefined // self-thread edge case
          : convo.participantA === senderId
            ? convo.participantB
            : convo.participantA;
    if (!recipientUid) return;

    // Sender display name: whichever meta entry the SENDER wrote.
    const senderName =
      convo.meta?.[senderId]?.name ?? "New message";

    // 2. Recipient's Expo push tokens.
    const recipSnap = await db.doc(`users/${recipientUid}`).get();
    const tokens = (recipSnap.get("pushTokens") as unknown) ?? [];
    const tokenList = Array.isArray(tokens)
      ? tokens.filter((t): t is string => typeof t === "string" && t.length > 0)
      : [];
    if (tokenList.length === 0) {
      logger.info("no push tokens for recipient", { recipientUid });
      return;
    }

    // 3. Send via Expo push (free; supports Expo push tokens natively).
    const payload = tokenList.map((to) => ({
      to,
      title: senderName,
      body: text.length > 140 ? `${text.slice(0, 137)}…` : text,
      data: {
        type: "chat",
        conversationId: event.params.conversationId,
        peerId: senderId,
      },
      sound: "default",
      priority: "high",
      channelId: "messages", // matches ensureAndroidChannel in pushService
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        logger.error("expo push failed", res.status, (await res.text()).slice(0, 200));
        return;
      }
      const out = (await res.json()) as {
        data?: { status: string; message?: string }[];
      };
      const errors = (out.data ?? []).filter((d) => d.status !== "ok");
      if (errors.length > 0) {
        logger.warn("expo push partial errors", JSON.stringify(errors).slice(0, 300));
      } else {
        logger.info("push delivered", { count: tokenList.length, recipientUid });
      }
    } catch (err) {
      logger.error("expo push threw", err);
    }
  },
);
