/**
 * Canonical notification types for the BasoBas inbox.
 *
 * Mirrors the `notifications` table created in
 * `supabase/migrations/20260805120000_notifications.sql`. Triggers on
 * `visit_requests` INSERT/UPDATE write rows here; the client reads
 * them via `notifications.service.ts` and renders via the shared
 * `<NotificationsList />` component.
 *
 * `kind` is the only classifier — there's no UI-vocabulary collapse
 * (unlike visit statuses, which diverge per screen). The screens
 * switch on `kind` directly via the `NOTIFICATION_KINDS_BY_TAB`
 * table in `notifications.service.ts`.
 */
import type { Database } from './database.types';

// ─── DB aliases ──────────────────────────────────────────────────────────────

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export type NotificationKind = Database['public']['Enums']['notification_kind_enum'];

/**
 * Joined columns for the inbox feed. The `notifications` table has one
 * FK into `profiles` (the actor), so an unqualified embed is safe — but
 * matching `visits.service.ts`'s pattern with an explicit constraint
 * name future-proofs the query if a second FK is added later.
 */
export interface NotificationJoins {
  actor?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Deep-link contract. Each notification row carries a `target_kind`
 * and (when meaningful) a `target_id`; the client resolves these to
 * an expo-router route via `getNotificationRoute()` in
 * `notifications.service.ts`.
 */
export type NotificationTargetKind = 'visit' | 'property' | 'request' | 'system';

// ─── Domain model (camelCase, screen-facing) ─────────────────────────────────

export interface Notification {
  id: string;
  /** Clerk sub of the recipient — always the current signed-in user. */
  recipientId: string;
  /** Clerk sub of whoever caused the notification. Null for SYSTEM. */
  actorId: string | null;
  /** Pulled in via the actor profile join; null when the profile is missing. */
  actorName: string | null;
  actorAvatarUrl: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  targetKind: NotificationTargetKind;
  targetId: string | null;
  /** Direct FK joins — nullable for SYSTEM and list-only kinds. */
  relatedVisitId: string | null;
  relatedPropertyId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Day-bucketed groups used by the list UI for section headers. */
export interface NotificationDateGroups {
  today: Notification[];
  yesterday: Notification[];
  earlier: Notification[];
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Convert a row + optional actor join into the screen-facing Notification.
 * Missing actor profile row is tolerated — `actorName`/`actorAvatarUrl`
 * default to null and the list row falls back to the actor's clerk-id
 * initials.
 */
export const toNotification = (
  row: NotificationRow & Partial<NotificationJoins>
): Notification => ({
  id: row.id,
  recipientId: row.recipient_id,
  actorId: row.actor_id,
  actorName: row.actor?.full_name ?? null,
  actorAvatarUrl: row.actor?.avatar_url ?? null,
  kind: row.kind,
  title: row.title,
  body: row.body,
  targetKind: row.target_kind as NotificationTargetKind,
  targetId: row.target_id,
  relatedVisitId: row.related_visit_id,
  relatedPropertyId: row.related_property_id,
  readAt: row.read_at,
  createdAt: row.created_at,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bucket notifications into Today / Yesterday / Earlier. Caller must
 * pass `notifications` already ordered newest-first — the helper just
 * walks once and pushes. Stable inside `useMemo`.
 *
 * `now` is parameterised for testability; the default is `new Date()`.
 */
export const groupByDate = (
  notifications: Notification[],
  now: Date = new Date()
): NotificationDateGroups => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS);

  const groups: NotificationDateGroups = { today: [], yesterday: [], earlier: [] };

  for (const n of notifications) {
    const created = new Date(n.createdAt).getTime();
    if (created >= startOfToday.getTime()) {
      groups.today.push(n);
    } else if (created >= startOfYesterday.getTime()) {
      groups.yesterday.push(n);
    } else {
      groups.earlier.push(n);
    }
  }

  return groups;
};

/**
 * `true` when the notification hasn't been read. Centralised so
 * consumers don't compare `readAt == null` everywhere.
 */
export const isUnread = (n: { readAt: string | null }): boolean => n.readAt == null;
