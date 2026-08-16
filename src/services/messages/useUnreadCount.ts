/**
 * EdumentX — useUnreadCount hook
 *
 * Subscribes to the signed-in user's conversations and returns the
 * TOTAL unread message count across all of them (sum of each
 * conversation's `unreadCount[viewerUid]`). Used by the dashboards'
 * header chat icons to render a live red badge — same subscription
 * the Messages hub uses, so the badge and the list can never drift.
 *
 * Zero when signed out or when the subscription errors (the badge is
 * decorative; the hub is the source of truth).
 */

import { useEffect, useState } from "react";

import { getMessagesRepository } from "./dataSource";
import type { Conversation } from "./types";

export function useUnreadCount(viewerUid: string | null | undefined): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!viewerUid) {
      setUnread(0);
      return;
    }
    const repo = getMessagesRepository();
    const unsub = repo.subscribeConversations(
      viewerUid,
      (conversations: Conversation[]) => {
        let total = 0;
        for (const c of conversations) {
          total += c.unreadCount?.[viewerUid] ?? 0;
        }
        setUnread(total);
      },
      () => setUnread(0),
    );
    return unsub;
  }, [viewerUid]);

  return unread;
}
