import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

/**
 * EdumentX — Notification helpers.
 *
 * The admin's verification decisions (approve, reject, request
 * more info, approve / reject a profile edit) write a notification
 * doc to `notifications/{uid}/{notificationId}` so the tutor sees
 * the result in their inbox. The doc shape is intentionally tiny
 * — the notification center renders everything from these fields.
 *
 * Why this is a separate module from
 * `screens/admin/VerificationQueue.tsx`: the helper is also reused
 * by the tutor's "discard" / "resubmit" flows in case we ever want
 * to surface those, and a single function is easier to test than
 * a one-off inline write inside a 30-line `writeBatch`.
 */

/** Notification categories used by the notification center. The
 *  center filters by `type` — a verification notification shows
 *  up under the "Verification" tab and not the "Enrollments" tab. */
export type NotificationType =
  | "verification_approved"
  | "verification_rejected"
  | "verification_more_info"
  | "edit_approved"
  | "edit_rejected"
  | "enrollment_accepted"
  | "enrollment_declined"
  | "enrollment_removed"
  | "enrollment_completed";

export type NotificationDoc = {
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Free-form reason text captured by the admin (rejection
   *  notes, missing document details, etc.). Empty string when
   *  not applicable. */
  reason?: string;
  createdAt: unknown; // serverTimestamp
  read: boolean;
  readAt: unknown | null;
};

/**
 * Write a notification doc to `notifications/{uid}/items/{autoId}`.
 * Returns the generated id so the caller can navigate to it (e.g. open
 * the notification center and scroll to the row).
 *
 * We use `doc(collection(...))` to generate an auto-id — the
 * notification center renders in chronological order, and the
 * id is only used for `key` props in a list.
 *
 * The `items` subcollection is named so the SDK's `collection()`
 * helper resolves to a real CollectionReference (it requires odd
 * path segments: collection → doc → collection). The parent doc
 * (`notifications/{uid}`) is auto-created by Firestore the first
 * time a child is written.
 *
 * Security note: Firestore rules do NOT cascade from a parent match
 * (`match /notifications/{uid}`) to its subcollections. The rules
 * file therefore has a dedicated `match /notifications/{uid}/items/
 * {itemId}` block (added Aug 9 2026) — without it every read/write
 * to this path fell through to the catch-all deny and the
 * notification bell + center failed with `permission-denied`.
 */
export async function writeNotification(
  recipientUid: string,
  payload: Omit<
    NotificationDoc,
    "recipientUid" | "createdAt" | "read" | "readAt"
  >,
): Promise<string> {
  const db = getFirestore(getApp());
  const ref = doc(collection(db, "notifications", recipientUid, "items"));
  await setDoc(ref, {
    recipientUid,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    reason: payload.reason ?? "",
    createdAt: serverTimestamp(),
    read: false,
    readAt: null,
  });
  return ref.id;
}

/**
 * Mark one notification doc as read — the same write the
 * notification center's tap handler does. Shared with the push
 * service so the OS-tray "Mark as Read" action stays in lockstep
 * with the in-app surfaces.
 *
 * The rules only allow the owner to update `["read", "readAt"]` on
 * `notifications/{uid}/items/{itemId}` — this update stays inside
 * that allowed-key set.
 */
export async function markNotificationRead(
  recipientUid: string,
  notificationId: string,
): Promise<void> {
  const db = getFirestore(getApp());
  await updateDoc(
    doc(db, "notifications", recipientUid, "items", notificationId),
    {
      read: true,
      readAt: serverTimestamp(),
    },
  );
}

/** Convenience helpers for the common cases. Keeping the
 *  user-facing copy here means the same wording ships across the
 *  admin's "approve" button, the notification bell, and the
 *  tutor's banner. */
export const notificationCopy = {
  approved: {
    type: "verification_approved" as const,
    title: "Welcome to EdumentX",
    body:
      "Your tutor profile is verified. You can now be discovered by students on the map.",
    reason: "",
  },
  rejected: (reason: string) => ({
    type: "verification_rejected" as const,
    title: "Verification needs more work",
    body:
      "We could not verify your profile this round. Update your details and resubmit.",
    reason,
  }),
  moreInfo: (prompt: string) => ({
    type: "verification_more_info" as const,
    title: "More info needed",
    body:
      "Please update the requested details so we can finish your verification.",
    reason: prompt,
  }),
  editApproved: {
    type: "edit_approved" as const,
    title: "Profile changes approved",
    body:
      "Your recent changes to subjects, rate, or location are now live on your profile.",
    reason: "",
  },
  editRejected: (reason: string) => ({
    type: "edit_rejected" as const,
    title: "Profile changes not approved",
    body:
      "Your recent changes were not applied. Your profile still shows the previous values.",
    reason,
  }),
  enrollmentAccepted: (tutorName: string) => ({
    type: "enrollment_accepted" as const,
    title: "You're enrolled",
    body: `${tutorName} accepted your request. Check the schedule for your first session.`,
    reason: "",
  }),
  enrollmentDeclined: (tutorName: string, reason: string) => ({
    type: "enrollment_declined" as const,
    title: "Request not accepted",
    body: `${tutorName} couldn't accept your enrollment request.`,
    reason,
  }),
  enrollmentRemoved: (tutorName: string, reason: string) => ({
    type: "enrollment_removed" as const,
    title: `Removed by ${tutorName}`,
    body:
      "Your tutor has ended your enrollment. You can request a different tutor from the marketplace.",
    reason,
  }),
  enrollmentCompleted: (tutorName: string) => ({
    type: "enrollment_completed" as const,
    title: "Enrollment completed",
    body: `Your enrollment with ${tutorName} has finished. Hope you had a great experience!`,
    reason: "",
  }),
};
