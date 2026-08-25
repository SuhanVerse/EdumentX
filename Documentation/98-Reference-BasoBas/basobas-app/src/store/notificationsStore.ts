import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getNotifications,
  getUnreadCount,
  markAllRead as markAllReadService,
  markNotificationRead as markNotificationReadService,
  type GetNotificationsOpts,
} from '@/src/services/notifications.service';
import type { Notification } from '@/src/types/notification.types';
import type { Database } from '@/src/types/database.types';

type Supabase = SupabaseClient<Database>;

/**
 * The recipient's notification inbox, kept in sync from three sources:
 *  1. `fetchNotifications` / `fetchUnreadCount` — initial/refresh reads
 *  2. realtime `postgres_changes` via `useNotificationsRealtime` — the
 *     merge happens in `upsertPartial`; display fields (actorName /
 *     actorAvatarUrl) are preserved from any existing entry that has them
 *  3. optimistic local mutations — applied immediately, reconciled when
 *     the server responds
 *
 * All writes go through the service layer. This store is the single
 * place that reconciles optimistic updates against the server (mirrors
 * `visitsStore.ts`'s pattern exactly).
 */
interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  /** clerk id of the last fetch — used to re-fetch on optimistic-reconcile. */
  lastClerkId: string | null;

  fetchNotifications: (
    supabase: Supabase,
    opts?: GetNotificationsOpts
  ) => Promise<void>;
  fetchUnreadCount: (supabase: Supabase) => Promise<void>;
  /** Realtime merge — payload rows may lack the actor join. */
  upsertPartial: (partial: Partial<Notification> & { id: string }) => void;
  markRead: (
    notificationId: string,
    supabase: Supabase
  ) => Promise<boolean>;
  markAllRead: (supabase: Supabase) => Promise<boolean>;
  /** Clears every per-user field on logout / user change. */
  clearNotifications: () => void;
}

// ─── Optimistic + reconcile helpers ────────────────────────────────────────

type Patch = Partial<Pick<Notification, 'readAt'>>;

const patchOptimistic = (
  state: NotificationsState,
  notificationId: string,
  patch: Patch
): { notifications: Notification[]; unreadCount: number } => {
  const notifications = state.notifications.map((n) =>
    n.id === notificationId ? { ...n, ...patch } : n
  );
  const wasUnread = state.notifications.find((n) => n.id === notificationId)?.readAt == null;
  const unreadCount =
    patch.readAt && wasUnread && state.unreadCount > 0
      ? state.unreadCount - 1
      : state.unreadCount;
  return { notifications, unreadCount };
};

/**
 * On mutation failure, re-fetch so optimistic state reverts. The
 * realtime channel auth scope guarantees RLS won't leak rows, but for
 * the in-flight re-fetch we keep it tied to the last successful fetch.
 */
const reconcile = async (
  set: (fn: (state: NotificationsState) => Partial<NotificationsState> | NotificationsState) => void,
  get: () => NotificationsState,
  supabase: Supabase,
  result: { success: boolean; data?: { updated: number } }
): Promise<boolean> => {
  if (result.success) return true;
  await get().fetchNotifications(supabase);
  await get().fetchUnreadCount(supabase);
  return false;
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  lastClerkId: null,

  fetchNotifications: async (supabase, opts) => {
    set({ isLoading: true });
    const result = await getNotifications(supabase, opts);
    if (result.success) {
      set({
        notifications: result.data,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async (supabase) => {
    const result = await getUnreadCount(supabase);
    if (result.success) {
      set({ unreadCount: result.data });
    }
  },

  /**
   * Realtime merge. Payload rows from the channel don't carry the actor
   * join; we preserve the joined display fields from any existing entry
   * that already has them. INSERT places the row at the head (newest
   * first); UPDATE keeps the existing position.
   */
  upsertPartial: (partial) => {
    set((state) => {
      const existing = state.notifications.find((n) => n.id === partial.id);

      const wasUnreadBefore = existing != null && existing.readAt == null;
      const isNowRead = partial.readAt != null;
      const deltaUnread =
        existing == null
          ? isNowRead
            ? 0
            : 1
          : wasUnreadBefore && isNowRead
            ? -1
            : !wasUnreadBefore && !isNowRead
              ? 1
              : 0;

      const merged: Notification = {
        id: partial.id,
        recipientId: partial.recipientId ?? existing?.recipientId ?? '',
        actorId: partial.actorId ?? existing?.actorId ?? null,
        actorName: partial.actorName ?? existing?.actorName ?? null,
        actorAvatarUrl: partial.actorAvatarUrl ?? existing?.actorAvatarUrl ?? null,
        kind: partial.kind ?? existing?.kind ?? 'SYSTEM',
        title: partial.title ?? existing?.title ?? '',
        body: partial.body ?? existing?.body ?? '',
        targetKind: partial.targetKind ?? existing?.targetKind ?? 'system',
        targetId: partial.targetId ?? existing?.targetId ?? null,
        relatedVisitId: partial.relatedVisitId ?? existing?.relatedVisitId ?? null,
        relatedPropertyId:
          partial.relatedPropertyId ?? existing?.relatedPropertyId ?? null,
        readAt: partial.readAt ?? existing?.readAt ?? null,
        createdAt: partial.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
      };

      const nextList = existing
        ? state.notifications.map((n) => (n.id === partial.id ? merged : n))
        : [merged, ...state.notifications];

      return {
        notifications: nextList,
        unreadCount: Math.max(0, state.unreadCount + deltaUnread),
      };
    });
  },

  markRead: async (notificationId, supabase) => {
    const before = get();
    set(patchOptimistic(before, notificationId, { readAt: new Date().toISOString() }));
    const result = await markNotificationReadService(supabase, notificationId);
    return reconcile(set, get, supabase, result);
  },

  markAllRead: async (supabase) => {
    // Optimistic: stamp every unread row with now(). Realtime UPDATEs
    // arriving afterwards will reconcile to the server-side timestamp;
    // the merge is idempotent (any non-null readAt is "read").
    const stamp = new Date().toISOString();
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.readAt == null ? { ...n, readAt: stamp } : n
      ),
      unreadCount: 0,
    }));
    const result = await markAllReadService(supabase);
    return reconcile(set, get, supabase, result);
  },

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      lastClerkId: null,
    }),
}));
