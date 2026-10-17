/**
 * EdumentX — Cloud Functions (Blaze, no-cost quota)
 *
 * Three Firestore triggers push notifications to devices via the free
 * Expo push API, using the Expo push tokens the app persists on
 * `users/{uid}.pushTokens` (see src/services/notifications/pushService.ts).
 *
 * ── onNewChatMessage ───────────────────────────────────────────────
 * onCreate on `conversations/{cid}/messages/{mid}`. Pushes the
 * RECIPIENT (either participant — the trigger resolves "the one who
 * didn't send") when a chat message lands.
 *
 * ── onEnrollmentRequestCreated / Decided / Deleted ───────────────
 * The full enrollment lifecycle. Created → push the TUTOR (student
 * just asked to enroll); accepted → push the student; declined
 * (hard-delete) → push the student.
 *
 * Channel note (Aug 25 fix): the app creates the Android channel
 * "inbox" (pushService INBOX_CHANNEL_ID) — every payload MUST target
 * that id. A push with an unknown channel id is silently dropped on
 * Android 8+ ("messages" was the old, wrong value here).
 *
 * Skips silently when:
 *   - sender == recipient (self echo)
 *   - message status !== "sent" (read-receipt flips re-fire writes)
 *
 * Cost: 2–3 reads per event — trivially inside the free quota.
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

interface EnrollmentRequestDoc {
  studentUid?: string;
  studentName?: string;
  slotKey?: string;
  status?: string;
  pickedSlotKeys?: string[];
  subjects?: string[];
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** MUST match INBOX_CHANNEL_ID in src/services/notifications/pushService.ts */
const PUSH_CHANNEL_ID = "inbox";

/** Format a `"<day>:<slot>"` slotKey as "Tue 7–9 PM". */
function formatSlotKey(key: string): string {
  const parsed = /^([a-z]{3}):(.+)$/.exec(key);
  if (!parsed) return key;
  const days: Record<string, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };
  const slots: Record<string, string> = {
    "6-9": "6–9 AM",
    "9-12": "9 AM–12 PM",
    "12-3": "12–3 PM",
    "3-5": "3–5 PM",
    "5-7": "5–7 PM",
    "7-9": "7–9 PM",
  };
  const day = days[parsed[1]] ?? parsed[1];
  const slot = slots[parsed[2]] ?? parsed[2];
  return `${day} ${slot}`;
}

/**
 * Push one notification to every registered device of `uid` via the
 * Expo push API. Logs (never throws) — a push failure must not fail
 * the business write that triggered it.
 */
async function pushToUser(
  uid: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const db = getFirestore();
  const snap = await db.doc(`users/${uid}`).get();
  const tokens = (snap.get("pushTokens") as unknown) ?? [];
  const tokenList = Array.isArray(tokens)
    ? tokens.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];
  if (tokenList.length === 0) {
    logger.info("no push tokens for recipient", { uid });
    return;
  }

  const payload = tokenList.map((to) => ({
    to,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
    channelId: PUSH_CHANNEL_ID,
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
      logger.info("push delivered", { count: tokenList.length, uid });
    }
  } catch (err) {
    logger.error("expo push threw", err);
  }
}

// ── Chat message push ─────────────────────────────────────────────────────────

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
          : convo.participantA;

    // Sender display name: whichever meta entry the SENDER wrote.
    const senderName = convo.meta?.[senderId]?.name ?? "New message";
    if (!recipientUid) return;

    await pushToUser(recipientUid, senderName, text.length > 140 ? `${text.slice(0, 137)}…` : text, {
      type: "chat",
      conversationId: event.params.conversationId,
      peerId: senderId,
    });
  });

// ── Enrollment request pushes ─────────────────────────────────────────────────

/**
 * New request (student → tutor): onCreate on
 * `enrollmentRequests/{tutorUid}/requests/{requestId}`. Push the
 * TUTOR that a student just asked to enroll.
 */
export const onEnrollmentRequestCreated = functionsV1
  .region("asia-south1")
  .runWith({ maxInstances: 5 })
  .firestore.document("enrollmentRequests/{tutorUid}/requests/{requestId}")
  .onCreate(async (snap, event) => {
    const req = snap.data() as EnrollmentRequestDoc | undefined;
    const studentName = req?.studentName || "A student";
    const slot = req?.pickedSlotKeys?.[0] ?? req?.slotKey;
    const slotLabel = slot ? ` for ${formatSlotKey(slot)}` : "";

    await pushToUser(
      event.params.tutorUid,
      "New enrollment request",
      `${studentName} wants to enroll${slotLabel}. Open your inbox to respond.`,
      {
        type: "enrollment",
        studentUid: req?.studentUid ?? "",
        requestId: event.params.requestId,
      },
    );
  });

// ── Enrollment decision pushes (tutor → student) ─────────────────────────────

/**
 * Accept path: `acceptRequest`'s transaction updates the request doc
 * `status` pending → "accepted" once the enrollment is booked. Push
 * the student with the confirmed weekly slot.
 */
export const onEnrollmentRequestDecided = functionsV1
  .region("asia-south1")
  .runWith({ maxInstances: 5 })
  .firestore.document("enrollmentRequests/{tutorUid}/requests/{requestId}")
  .onUpdate(async (change, event) => {
    const before = change.before.data() as EnrollmentRequestDoc | undefined;
    const after = change.after.data() as EnrollmentRequestDoc | undefined;
    if (!after) return;
    // Only the pending → accepted transition pushes (a second write to
    // an already-accepted doc shouldn't re-notify).
    if (after.status !== "accepted" || before?.status === "accepted") return;

    const studentUid = after.studentUid;
    if (!studentUid) return;

    const db = getFirestore();
    const tutorSnap = await db.doc(`users/${event.params.tutorUid}`).get();
    const tutorName = (tutorSnap.get("fullName") as string) || "Your tutor";
    const slot = after.slotKey ? formatSlotKey(after.slotKey) : "";

    await pushToUser(
      studentUid,
      "Enrollment accepted 🎉",
      slot
        ? `${tutorName} accepted your request for ${slot}.`
        : `${tutorName} accepted your enrollment request.`,
      {
        type: "enrollment",
        tutorUid: event.params.tutorUid,
        requestId: event.params.requestId,
      },
    );
  });

/**
 * Decline path: `declineRequest` hard-deletes the request doc. The
 * deleted snapshot still carries the student uid, so we can push the
 * decline notice. (Cleanup sweeps that delete decided docs will also
 * fire this — acceptable for demo scale; the notice is accurate.)
 */
export const onEnrollmentRequestDeleted = functionsV1
  .region("asia-south1")
  .runWith({ maxInstances: 5 })
  .firestore.document("enrollmentRequests/{tutorUid}/requests/{requestId}")
  .onDelete(async (snap, event) => {
    const req = snap.data() as EnrollmentRequestDoc | undefined;
    if (!req?.studentUid) return;
    // Docs deleted AFTER being accepted are cleanup, not a decline —
    // don't send the student a confusing "declined" notice.
    if (req.status === "accepted") return;

    const db = getFirestore();
    const tutorSnap = await db.doc(`users/${event.params.tutorUid}`).get();
    const tutorName = (tutorSnap.get("fullName") as string) || "The tutor";

    await pushToUser(
      req.studentUid,
      "Enrollment update",
      `${tutorName} couldn't accept your enrollment request this time.`,
      {
        type: "enrollment",
        tutorUid: event.params.tutorUid,
        requestId: event.params.requestId,
      },
    );
  });
