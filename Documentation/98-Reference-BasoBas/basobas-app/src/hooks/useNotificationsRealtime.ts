import { useSession } from '@clerk/expo';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClerkSupabaseClient } from '@/src/lib/supabase';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import {
  toNotification,
  type Notification,
  type NotificationRow,
} from '@/src/types/notification.types';

/**
 * Live notification inbox sync via Supabase Realtime.
 *
 * ⚠️ Same Clerk-auth caveat as `useVisitRealtime`: realtime channel
 * authorization would silently fail with the anon key alone. The
 * Clerk session JWT must be handed to the realtime socket explicitly
 * via `setAuth()`. Clerk tokens rotate every ~60 s and the socket
 * can't tell the cached one expired — so the token is re-applied
 * every 45 s and on app-foreground.
 *
 * RLS applies to realtime the same way as REST: the channel only
 * receives rows where `recipient_id = <Clerk sub>`.
 *
 * Mount once per layout (tenant root + landlord tabs layout). The
 * channel is shared across every screen that reads the notifications
 * store.
 */
export function useNotificationsRealtime(clerkId: string | undefined) {
  const { session } = useSession();

  const supabase = useMemo(
    () => createClerkSupabaseClient(async () => (session ? await session.getToken() : null)),
    [session]
  );

  const upsertPartial = useNotificationsStore((s) => s.upsertPartial);

  useEffect(() => {
    if (!clerkId || !session) return;

    let channel: RealtimeChannel | null = null;
    let tokenTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const refreshAuth = async () => {
      // skipCache forces a fresh Clerk token — the cached one may be
      // expired even though the socket still thinks it's fine.
      const token = await session.getToken({ skipCache: true });
      if (token && !disposed) supabase.realtime.setAuth(token);
    };

    const onChange = (
      payload: RealtimePostgresChangesPayload<NotificationRow>
    ) => {
      // The table is append-only on the server and notifications have
      // no DELETE policy, so the only events we ever see are INSERT
      // and UPDATE. Be defensive anyway — DELETE is harmless (no-op
      // for the user) and we don't surface it.
      if (payload.eventType === 'DELETE') return;
      if (!payload.new) return;

      upsertPartial(toNotification(payload.new));
    };

    const start = async () => {
      await refreshAuth();

      channel = supabase
        .channel(`notifications:user:${clerkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${clerkId}`,
          },
          onChange
        )
        .subscribe();

      // Clerk token rotation safety net — keeps the socket's auth fresh.
      tokenTimer = setInterval(refreshAuth, 45_000);
    };

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAuth();
    });

    start();

    return () => {
      disposed = true;
      if (tokenTimer) clearInterval(tokenTimer);
      appStateSub.remove();
      channel?.unsubscribe();
      channel = null;
    };
  }, [clerkId, session, supabase, upsertPartial]);
}

// Re-export so screens that import this hook also have a stable
// reference to the merged-Notification type (no-op import costs
// nothing — here in case future helpers land in this file).
export type { Notification };
