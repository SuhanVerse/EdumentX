import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  acceptReschedule,
  cancelVisitRequest,
  declineReschedule,
  getVisitRequestsForTenant,
  submitFollowUp,
} from '@/src/services/visits.service';
import {
  toTenantVisitStatusUi,
  type FollowUpResponse,
  type TenantVisitRequest,
  type VisitStatus,
} from '@/src/types/property.types';
import type { Database } from '@/src/types/database.types';

type Supabase = SupabaseClient<Database>;

/**
 * The tenant's visit list, kept in sync from three sources:
 *  1. `fetchVisits` — the initial/refresh read (joins included)
 *  2. realtime `postgres_changes` (via `useVisitRealtime`) — partial rows,
 *     merged with `upsertPartial` while preserving joined display fields
 *  3. optimistic local mutations — applied immediately, reconciled when the
 *     server responds; the realtime event that follows just confirms it
 *
 * All writes go through the service layer; this store is the single place
 * that reconciles optimistic updates against the server.
 */
interface VisitsState {
  visits: TenantVisitRequest[];
  isLoading: boolean;
  /** clerk id of the last fetch — used to re-fetch on optimistic-reconcile. */
  lastClerkId: string | null;
  /**
   * visitId → timestamp of the last statusUi change, for the list card
   * flash micro-interaction. Consumers read it once and animate.
   */
  statusChangedAt: Record<string, number>;

  fetchVisits: (supabase: Supabase, clerkId: string) => Promise<void>;
  upsertPartial: (
    partial: Partial<TenantVisitRequest> & {
      id: string;
      status: VisitStatus;
      requestedDate: string;
    }
  ) => void;
  removeVisit: (visitId: string) => void;
  cancelVisit: (visitId: string, supabase: Supabase) => Promise<boolean>;
  acceptReschedule: (visitId: string, supabase: Supabase) => Promise<boolean>;
  declineReschedule: (visitId: string, supabase: Supabase) => Promise<boolean>;
  submitFollowUp: (
    visitId: string,
    response: FollowUpResponse,
    note: string | null,
    supabase: Supabase
  ) => Promise<boolean>;
  clearVisits: () => void;
}

/** Derives statusUi for a row that may have changed since last known. */
const deriveStatusUi = (
  existing: TenantVisitRequest | undefined,
  partial: { status?: VisitStatus; requestedDate?: string }
): TenantVisitRequest['statusUi'] => {
  const status = partial.status ?? existing?.status;
  const requestedDate = partial.requestedDate ?? existing?.requestedDate;
  if (status && requestedDate) {
    return toTenantVisitStatusUi(status, requestedDate);
  }
  return existing?.statusUi ?? 'pending';
};

const markStatusChange = (
  state: Pick<VisitsState, 'statusChangedAt'>,
  visitId: string,
  statusUi: TenantVisitRequest['statusUi'],
  prevUi: TenantVisitRequest['statusUi'] | undefined
): Record<string, number> =>
  prevUi && prevUi !== statusUi
    ? { ...state.statusChangedAt, [visitId]: Date.now() }
    : state.statusChangedAt;

export const useVisitsStore = create<VisitsState>((set, get) => ({
  visits: [],
  isLoading: false,
  lastClerkId: null,
  statusChangedAt: {},

  fetchVisits: async (supabase, clerkId) => {
    set({ isLoading: true });
    const result = await getVisitRequestsForTenant(clerkId, supabase);
    if (result.success) {
      set((state) => {
        const changedAt: Record<string, number> = { ...state.statusChangedAt };
        const visits = result.data.map((visit) => {
          const existing = state.visits.find((v) => v.id === visit.id);
          if (existing && existing.statusUi !== visit.statusUi) {
            changedAt[visit.id] = Date.now();
          }
          return visit;
        });
        return { visits, changedAt, lastClerkId: clerkId, isLoading: false };
      });
    } else {
      set({ isLoading: false });
    }
  },

  /**
   * Realtime merge. Payload rows have no property/tenant joins, so joined
   * display fields are preserved from the existing entry when present.
   */
  upsertPartial: (partial) => {
    set((state) => {
      const existing = state.visits.find((v) => v.id === partial.id);
      const statusUi = deriveStatusUi(existing, partial);
      const merged: TenantVisitRequest = {
        id: partial.id,
        propertyId: partial.propertyId ?? existing?.propertyId ?? '',
        tenantId: partial.tenantId ?? existing?.tenantId ?? '',
        landlordId: partial.landlordId ?? existing?.landlordId ?? '',
        status: partial.status,
        statusUi,
        statusLabel: existing?.statusLabel ?? 'Pending Approval',
        requestedDate: partial.requestedDate,
        timeSlot: partial.timeSlot ?? existing?.timeSlot ?? 'MORNING',
        note: partial.note ?? existing?.note ?? null,
        rescheduleCount: partial.rescheduleCount ?? existing?.rescheduleCount ?? 0,
        landlordResponseNote:
          partial.landlordResponseNote ?? existing?.landlordResponseNote ?? null,
        previousRequestedDate:
          partial.previousRequestedDate ?? existing?.previousRequestedDate ?? null,
        previousTimeSlot: partial.previousTimeSlot ?? existing?.previousTimeSlot ?? null,
        tenantFollowUpResponse:
          partial.tenantFollowUpResponse ?? existing?.tenantFollowUpResponse ?? null,
        tenantFollowUpNote: partial.tenantFollowUpNote ?? existing?.tenantFollowUpNote ?? null,
        respondedAt: partial.respondedAt ?? existing?.respondedAt ?? null,
        completedAt: partial.completedAt ?? existing?.completedAt ?? null,
        createdAt: partial.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
        followUpPending: statusUi === 'completed' && !mergedFollowUp(partial, existing),
        tenantName: partial.tenantName ?? existing?.tenantName ?? null,
        tenantAvatarUrl: partial.tenantAvatarUrl ?? existing?.tenantAvatarUrl ?? null,
        landlordName: partial.landlordName ?? existing?.landlordName ?? null,
        landlordAvatarUrl: partial.landlordAvatarUrl ?? existing?.landlordAvatarUrl ?? null,
        propertyTitle: partial.propertyTitle ?? existing?.propertyTitle ?? null,
        propertyArea: partial.propertyArea ?? existing?.propertyArea ?? null,
        propertyPrice: partial.propertyPrice ?? existing?.propertyPrice ?? null,
        propertyPhotoUrl: partial.propertyPhotoUrl ?? existing?.propertyPhotoUrl ?? null,
      };
      return {
        visits: [merged, ...state.visits.filter((v) => v.id !== partial.id)],
        statusChangedAt: markStatusChange(state, partial.id, statusUi, existing?.statusUi),
      };
    });
  },

  removeVisit: (visitId) => {
    set((state) => ({ visits: state.visits.filter((v) => v.id !== visitId) }));
  },

  /** Optimistic cancel; re-fetches on failure so the UI reverts. */
  cancelVisit: async (visitId, supabase) => {
    patchOptimistic(set, get, visitId, {
      status: 'CANCELLED_BY_TENANT',
      statusUi: 'cancelled',
    });
    const result = await cancelVisitRequest(visitId, supabase);
    return reconcile(set, get, supabase, result, visitId);
  },

  acceptReschedule: async (visitId, supabase) => {
    patchOptimistic(set, get, visitId, {
      status: 'ACCEPTED',
      statusUi: 'accepted',
      previousRequestedDate: null,
      previousTimeSlot: null,
    });
    const result = await acceptReschedule(visitId, supabase);
    return reconcile(set, get, supabase, result, visitId);
  },

  declineReschedule: async (visitId, supabase) => {
    patchOptimistic(set, get, visitId, {
      status: 'CANCELLED_BY_TENANT',
      statusUi: 'cancelled',
    });
    const result = await declineReschedule(visitId, supabase);
    return reconcile(set, get, supabase, result, visitId);
  },

  submitFollowUp: async (visitId, response, note, supabase) => {
    patchOptimistic(set, get, visitId, {
      tenantFollowUpResponse: response,
      tenantFollowUpNote: note,
      followUpPending: false,
    });
    const result = await submitFollowUp(visitId, response, note, supabase);
    return reconcile(set, get, supabase, result, visitId);
  },

  clearVisits: () => {
    set({ visits: [], isLoading: false, lastClerkId: null, statusChangedAt: {} });
  },
}));

const mergedFollowUp = (
  partial: Partial<TenantVisitRequest>,
  existing: TenantVisitRequest | undefined
): boolean => (partial.tenantFollowUpResponse ?? existing?.tenantFollowUpResponse ?? null) != null;

type Patch = Partial<
  Pick<
    TenantVisitRequest,
    | 'status'
    | 'statusUi'
    | 'previousRequestedDate'
    | 'previousTimeSlot'
    | 'tenantFollowUpResponse'
    | 'tenantFollowUpNote'
    | 'followUpPending'
  >
>;

const patchOptimistic = (
  set: (fn: (state: VisitsState) => Partial<VisitsState> | VisitsState) => void,
  get: () => VisitsState,
  visitId: string,
  patch: Patch
) => {
  set((state) => {
    const existing = state.visits.find((v) => v.id === visitId);
    if (!existing) return state;
    const updated: TenantVisitRequest = { ...existing, ...patch };
    return {
      visits: state.visits.map((v) => (v.id === visitId ? updated : v)),
      statusChangedAt: markStatusChange(state, visitId, updated.statusUi, existing.statusUi),
    };
  });
};

/**
 * Applies the server's authoritative row when the mutation succeeded;
 * otherwise re-fetches so optimistic state reverts. Returns success.
 */
const reconcile = async (
  set: (fn: (state: VisitsState) => Partial<VisitsState> | VisitsState) => void,
  get: () => VisitsState,
  supabase: Supabase,
  result: { success: boolean; data?: TenantVisitRequest },
  visitId: string
): Promise<boolean> => {
  if (result.success && result.data) {
    set((state) => {
      const existing = state.visits.find((v) => v.id === visitId);
      return {
        visits: state.visits.map((v) => (v.id === visitId ? result.data! : v)),
        statusChangedAt: markStatusChange(
          state,
          visitId,
          result.data!.statusUi,
          existing?.statusUi
        ),
      };
    });
    return true;
  }
  const { lastClerkId } = get();
  if (lastClerkId) await get().fetchVisits(supabase, lastClerkId);
  return false;
};
