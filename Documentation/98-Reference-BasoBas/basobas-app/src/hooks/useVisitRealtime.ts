import { useSession } from '@clerk/expo';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClerkSupabaseClient } from '@/src/lib/supabase';
import { useVisitsStore } from '@/src/store/visitsStore';
import type { TenantVisitRequest, VisitRequestRow } from '@/src/types/property.types';

/**
 * Live tenant-side visit sync via Supabase Realtime.
 *
 * ⚠️ This app authenticates with Clerk, not Supabase Auth — realtime channel
 * authorization would silently fail with the anon key alone. The Clerk session
 * JWT must be handed to the realtime socket explicitly via `setAuth()`:
 *
 *   client.realtime.setAuth(<fresh Clerk token>)
 *
 * Clerk tokens rotate frequently (~60s), and a stale socket stops delivering
 * updates with no error — so the token is re-applied every 45s and on
 * app-foreground. `useVisitRealtime` does not replace the fetch path; it only
 * makes updates immediate. Screens still re-fetch on focus as the fallback.
 *
 * Mount once where it outlives individual screens (tenant root layout) — the
 * channel is shared by every tenant screen that reads the visits store.
 *
 * RLS applies to realtime the same way as REST: the channel only receives rows
 * where `tenant_id = <Clerk sub>`.
 */
export function useVisitRealtime(clerkId: string | undefined) {
  const { session } = useSession();

  const supabase = useMemo(
    () => createClerkSupabaseClient(async () => (session ? await session.getToken() : null)),
    [session]
  );

  const upsertPartial = useVisitsStore((s) => s.upsertPartial);
  const removeVisit = useVisitsStore((s) => s.removeVisit);

  useEffect(() => {
    if (!clerkId || !session) return;

    let channel: RealtimeChannel | null = null;
    let tokenTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const refreshAuth = async () => {
      // skipCache forces a fresh Clerk token — the cached one may be expired
      // even though the socket still thinks it's fine.
      const token = await session.getToken({ skipCache: true });
      if (token && !disposed) supabase.realtime.setAuth(token);
    };

    const onChange = (payload: RealtimePostgresChangesPayload<VisitRequestRow>) => {
      if (payload.eventType === 'DELETE') {
        if (payload.old?.id) removeVisit(payload.old.id);
        return;
      }
      if (!payload.new) return;
      upsertPartial(rowToVisitPartial(payload.new));
    };

    const start = async () => {
      await refreshAuth();

      channel = supabase
        .channel(`visit_requests:tenant:${clerkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visit_requests',
            filter: `tenant_id=eq.${clerkId}`,
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
  }, [clerkId, session, supabase, upsertPartial, removeVisit]);
}

/**
 * Realtime payloads carry only the row (no property/tenant joins). Map to the
 * store's partial shape — joined display fields are preserved from the
 * existing store entry by `upsertPartial`.
 */
const rowToVisitPartial = (
  row: VisitRequestRow
): Partial<TenantVisitRequest> & {
  id: string;
  status: VisitRequestRow['status'];
  requestedDate: string;
} => ({
  id: row.id,
  propertyId: row.property_id,
  tenantId: row.tenant_id,
  landlordId: row.landlord_id,
  status: row.status,
  requestedDate: row.requested_date,
  timeSlot: row.time_slot,
  note: row.note,
  rescheduleCount: row.reschedule_count,
  landlordResponseNote: row.landlord_response_note,
  previousRequestedDate: row.previous_requested_date,
  previousTimeSlot: row.previous_time_slot,
  tenantFollowUpResponse:
    row.tenant_follow_up_response as TenantVisitRequest['tenantFollowUpResponse'],
  tenantFollowUpNote: row.tenant_follow_up_note,
  respondedAt: row.responded_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
});
