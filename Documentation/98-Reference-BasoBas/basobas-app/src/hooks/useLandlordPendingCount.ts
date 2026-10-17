import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@clerk/expo';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClerkSupabaseClient } from '@/src/lib/supabase';
import { getPendingVisitCount } from '@/src/services/visits.service';

/**
 * Live pending visit-request count for the landlord's requests-tab badge.
 *
 * Re-queries `getPendingVisitCount` whenever a `visit_requests` row the
 * landlord owns changes (INSERT / UPDATE / DELETE), so the badge stays in
 * sync with the DB — a new request appears the moment the tenant sends it,
 * and accepting/declining removes it. Falls back to a fresh query on focus
 * (via the returned `refresh`) in case an event was missed while the app
 * was backgrounded.
 *
 * ⚠️ Same Clerk-token caveat as `useVisitRealtime`: Supabase realtime needs
 * the raw Clerk JWT on the socket (`realtime.setAuth`) or the channel
 * silently stops delivering. The token is refreshed every 45s and on
 * foreground.
 */
export function useLandlordPendingCount(clerkId: string | undefined) {
  const { session } = useSession();
  const [count, setCount] = useState(0);

  const supabase = useMemo(
    () => createClerkSupabaseClient(async () => (session ? await session.getToken() : null)),
    [session]
  );

  const refresh = useCallback(async () => {
    if (!clerkId) return;
    const result = await getPendingVisitCount(clerkId, supabase);
    if (result.success) setCount(result.data);
  }, [clerkId, supabase]);

  // Initial load.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: any change to the landlord's visit_requests rows re-queries.
  useEffect(() => {
    if (!clerkId || !session) return;

    let channel: RealtimeChannel | null = null;
    let tokenTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const refreshAuth = async () => {
      const token = await session.getToken({ skipCache: true });
      if (token && !disposed) supabase.realtime.setAuth(token);
    };

    const start = async () => {
      await refreshAuth();

      channel = supabase
        .channel(`visit_requests:landlord:${clerkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visit_requests',
            filter: `landlord_id=eq.${clerkId}`,
          },
          () => {
            refresh();
          }
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
  }, [clerkId, session, supabase, refresh]);

  return { count, refresh };
}
