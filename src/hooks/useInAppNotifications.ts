import { getApp } from "@react-native-firebase/app";
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/authStore";
import { markNotificationRead } from "@/lib/verification/notifications";

/**
 * EdumentX — Live in-app notification queue.
 *
 * Watches the signed-in user's `notifications/{uid}/items`
 * SUBCOLLECTION (history model — one doc per notification) filtered
 * to unread docs (single-field query, no composite index) and queues
 * NEW unread payloads for the in-app banner. The FIRST snapshot is
 * the seen baseline, so the banner never nags about content that
 * predates the current app session (same policy as
 * `pushService.subscribeInboxNotifications`).
 *
 * Items leave the queue via three paths:
 *   - `remove(id)`     — the banner timed out; pure local, no write
 *   - `handleRead(id)` — flips `read` / `readAt` on that doc
 *   - `handleDismiss(id)` — local-only: closes the banner, keeps the
 *     doc unread (badge untouched). The Firestore rules deliberately
 *     restrict notification updates to `["read", "readAt"]`, so
 *     Dismiss is a pure-UI action here — same contract as the OS
 *     tray's "Dismiss" button in `pushService`.
 *
 * Because the query only returns unread docs, a doc marked read
 * elsewhere (the center, another device) leaves the snapshot — we
 * drop any queued item whose id is no longer present so all surfaces
 * stay in lockstep.
 */

export type InAppNotif = {
  /** The notification doc id (per-history-doc key). */
  id: string;
  title: string;
  body: string;
  category: string;
  timeMs: number;
};

/** Pull a millisecond timestamp out of a Firestore `Timestamp` /
 *  `Date` / ISO string. */
function readTimestampMs(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().getTime();
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  return null;
}

type UnreadDoc = {
  title?: string;
  body?: string;
  category?: string;
  updatedAt?: unknown;
  createdAt?: unknown;
};

export function useInAppNotifications() {
  const user = useAuthStore((state) => state.user);
  const [queue, setQueue] = useState<InAppNotif[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstSnapshotRef = useRef(true);

  useEffect(() => {
    // Reset the baseline + seen-keys whenever the effect re-runs
    // (sign-in/out, user switch) so a different user's pre-existing
    // unread content is never treated as "new" by the banner.
    seenIdsRef.current = new Set();
    firstSnapshotRef.current = true;
    if (!user?.uid) {
      setQueue([]);
      return;
    }
    const db = getFirestore(getApp());
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      where("read", "==", false),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const byId = new Map<string, UnreadDoc>();
        snap.docs.forEach((d) => byId.set(d.id, d.data() as UnreadDoc));

        // Drop queued items that left the unread set (read
        // elsewhere) — all surfaces stay in lockstep.
        setQueue((prev) =>
          prev.filter((n) => byId.has(n.id)),
        );

        // Baseline: remember the current unread docs so opening the
        // app never re-alerts for content from a previous session.
        if (firstSnapshotRef.current) {
          firstSnapshotRef.current = false;
          byId.forEach((_, id) => seenIdsRef.current.add(id));
          return;
        }

        for (const [id, data] of byId) {
          if (seenIdsRef.current.has(id)) continue;
          seenIdsRef.current.add(id);
          // Title is the writer's invariant — legacy noise must not
          // light up the banner.
          const hasTitle =
            typeof data.title === "string" && data.title.length > 0;
          if (!hasTitle) continue;
          setQueue((prev) => [
            ...prev,
            {
              id,
              title: data.title as string,
              body: data.body ?? "",
              category: data.category ?? "system",
              timeMs:
                readTimestampMs(data.updatedAt) ??
                readTimestampMs(data.createdAt) ??
                0,
            },
          ]);
        }
      },
      (err) => {
        // Mid-sign-out reads can race with auth teardown — log and
        // stay quiet rather than erroring the app.
        console.warn("[useInAppNotifications] snapshot error", err);
      },
    );
    return unsub;
  }, [user?.uid]);

  /** Drop an item without any Firestore write (banner timed out). */
  function remove(id: string) {
    setQueue((prev) => prev.filter((n) => n.id !== id));
  }

  /** Mark the notification doc read and drop the item. */
  function handleRead(id: string) {
    if (!user?.uid) return;
    void markNotificationRead(user.uid, id).catch((err) =>
      console.warn("[useInAppNotifications] mark read failed", err),
    );
    remove(id);
  }

  /** Close the banner locally — the doc stays unread (badge
   *  untouched). No Firestore write: the rules restrict notification
   *  updates to `["read", "readAt"]`, and the OS-tray "Dismiss" in
   *  `pushService` follows the same local-only contract. */
  function handleDismiss(id: string) {
    remove(id);
  }

  return {
    /** The banner currently on screen, or null when the queue is empty. */
    active: queue[0] ?? null,
    remove,
    handleRead,
    handleDismiss,
  };
}
