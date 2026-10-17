import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result';
import {
  toNotification,
  type Notification,
  type NotificationJoins,
  type NotificationKind,
  type NotificationRow,
} from '@/src/types/notification.types';
import type { Database } from '@/src/types/database.types';

type Supabase = SupabaseClient<Database>;

// ─── Select string ───────────────────────────────────────────────────────────
//
// Embeds the actor profile for avatar+display-name. Only one FK from
// `notifications` to `profiles`, so the explicit constraint name is for
// symmetry with `visits.service.ts` (where two FKs force naming).
const NOTIFICATION_SELECT = `
  *,
  actor:profiles!notifications_actor_id_fkey(full_name, avatar_url)
` as const;

type NotificationSelectRow = NotificationRow & Partial<NotificationJoins>;

// ─── Reads ───────────────────────────────────────────────────────────────────

export interface GetNotificationsOpts {
  /** Default 100 — caller can dial down for snappy screens. */
  limit?: number;
  /** Filter to a subset of kinds (tab filtering). */
  kinds?: NotificationKind[];
  /** Only unread rows (used by the bell badge). */
  unreadOnly?: boolean;
}

/**
 * The recipient's inbox, newest first. RLS already scopes reads to
 * `recipient_id = requesting_user_id()`, but we assert the filter on
 * the client too as belt-and-braces (matches `visits.service.ts`).
 */
export async function getNotifications(
  supabase: Supabase,
  opts: GetNotificationsOpts = {}
): Promise<Result<Notification[]>> {
  try {
    const { limit = 100, kinds, unreadOnly = false } = opts;

    let query = supabase
      .from('notifications')
      .select(NOTIFICATION_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kinds?.length) query = query.in('kind', kinds);
    if (unreadOnly) query = query.is('read_at', null);

    const { data, error } = await query;

    if (error) return err(getErrorMessage(error));
    return ok(
      ((data ?? []) as unknown as NotificationSelectRow[]).map(toNotification)
    );
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

/**
 * Unread badge count — single cheap count query. Drives both the
 * tenant header bell and the landlord dock badge.
 */
export async function getUnreadCount(
  supabase: Supabase
): Promise<Result<number>> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);

    if (error) return err(getErrorMessage(error));
    return ok(count ?? 0);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Mark a single notification read via the SECURITY DEFINER RPC. Direct
 * UPDATE is also allowed by RLS, but routing through RPC keeps the
 * call sites consistent with the rest of the app and lets us add
 * analytics/etc. in one place.
 *
 * Returns the number of rows updated (0 if the row was already read,
 * or the caller doesn't own it — caller treats both as success).
 */
export async function markNotificationRead(
  supabase: Supabase,
  notificationId: string
): Promise<Result<{ updated: number }>> {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) return err(getErrorMessage(error));
    return ok({ updated: Number(data ?? 0) });
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

/**
 * Bulk version — for the "Mark all read" affordance on each screen.
 */
export async function markAllRead(supabase: Supabase): Promise<Result<{ updated: number }>> {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) return err(getErrorMessage(error));
    return ok({ updated: Number(data ?? 0) });
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export type NotificationViewer = 'tenant' | 'landlord';

export interface NotificationRoute {
  pathname: string;
  params?: { id: string };
}

/**
 * Map a notification to its deep-link target. Pure function — the
 * screens call this after marking the row read, then push the route.
 *
 * Returns `null` when no tap action makes sense (e.g. SYSTEM rows
 * before any SYSTEM-emitting flow exists).
 */
export const getNotificationRoute = (
  notification: Notification,
  viewer: NotificationViewer
): NotificationRoute | null => {
  const visitId = notification.relatedVisitId;

  switch (notification.kind) {
    case 'VISIT_REQUESTED':
    case 'VISIT_CANCELLED_BY_TENANT':
    case 'RESCHEDULE_ACCEPTED':
    case 'VISIT_RESCHEDULED_BY_TENANT':
    case 'TENANT_FOLLOW_UP_SUBMITTED':
      // Landlord-side: the visit is the "request" they manage.
      if (viewer !== 'landlord' || !visitId) return null;
      return { pathname: '/(landlord)/request/[id]', params: { id: visitId } };

    case 'VISIT_ACCEPTED':
    case 'VISIT_RESCHEDULED':
    case 'VISIT_REJECTED':
    case 'LISTING_FINALIZED':
    case 'LISTING_CLOSED':
      // Tenant-side: open the visit detail screen.
      if (viewer !== 'tenant' || !visitId) return null;
      return { pathname: '/(tenant)/visit/[id]', params: { id: visitId } };

    case 'SYSTEM':
    default:
      return null;
  }
};
