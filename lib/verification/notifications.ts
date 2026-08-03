import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
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
  | "edit_rejected";

export type NotificationDoc = {
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Free-form reason text captured by the admin (rejection
   *  reason, info-request prompt). Empty string when N/A. */
  reason: string;
  createdAt: unknown; // serverTimestamp
  read: boolean;
  readAt: unknown | null;
};

/**
 * Write a notification doc to the recipient's inbox. Returns the
 * generated id so the caller can navigate to it (e.g. open the
 * notification center and scroll to the row).
 *
 * We use `doc(collection(...))` to generate an auto-id — the
 * notification center renders in chronological order, and the
 * id is only used for `key` props in a list.
 */
export async function writeNotification(
  recipientUid: string,
  payload: Omit<
    NotificationDoc,
    "recipientUid" | "createdAt" | "read" | "readAt"
  >,
): Promise<string> {
  const db = getFirestore(getApp());
  const ref = doc(collection(db, "notifications", recipientUid));
  await ref.set({
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
};
