import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  acceptReschedule,
  acceptVisit,
  cancelVisitRequest,
  declineReschedule,
  finalizeRental,
  getVisitRequestsForTenant,
  markPastVisitsCompleted,
  rejectVisit,
  rescheduleVisit,
  submitFollowUp,
  submitLandlordFollowUp,
} from '@/src/services/visits.service';
import {
  toLandlordRequestUi,
  toTenantVisitStatusUi,
  type FollowUpResponse,
  type LandlordFollowUpOutcome,
  type LandlordVisitRequest,
  type TenantVisitRequest,
  type TimeSlot,
  type VisitStatus,
} from '@/src/types/property.types';
import type { Database } from '@/src/types/database.types';

type Supabase = SupabaseClient<Database>;

/**
 * Allowed transitions for the visit lifecycle. The store enforces this
 * before applying an optimistic update so a stray write can never move a
 * row into an invalid state — the spec's "state model built first" rule.
 */
const TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  PENDING: ['ACCEPTED', 'RESCHEDULED', 'REJECTED', 'CANCELLED_BY_TENANT'],
  ACCEPTED: ['CANCELLED_BY_TENANT', 'RESCHEDULED', 'VISIT_COMPLETED'],
  RESCHEDULED: ['ACCEPTED', 'REJECTED', 'CANCELLED_BY_TENANT', 'RESCHEDULED', 'VISIT_COMPLETED'],
  REJECTED: [],
  CANCELLED_BY_TENANT: [],
  CLOSED: [],
  VISIT_COMPLETED: ['DISCUSSION_ONGOING', 'RENTAL_FINALIZED', 'CLOSED', 'PENDING'],
  DISCUSSION_ONGOING: ['RENTAL_FINALIZED', 'CLOSED'],
  RENTAL_FINALIZED: [],
};

const canTransition = (from: VisitStatus, to: VisitStatus): boolean =>
  TRANSITIONS[from]?.includes(to) ?? false;

// ─── Tenant-side row (existing vocabulary, expanded) ─────────────────────────

type TenantRow = TenantVisitRequest;

/** Mirror row that landlord-side lists consume (same shape, different ui vocab). */
export type LandlordRow = LandlordVisitRequest & {
  uiStatus: ReturnType<typeof toLandlordRequestUi>;
};

/**
 * The store holds BOTH sides' visit lists in one place, keyed by role.
 * Tenant screens read `tenantVisits`; landlord screens read `landlordVisits`.
 * Every action routes through the service layer and reconciles optimistic
 * local state with the server response (or re-fetches on failure).
 */
interface VisitsState {
  tenantVisits: TenantRow[];
  landlordVisits: LandlordRow[];
  isLoading: boolean;
  lastClerkId: string | null;
  /** visitId → timestamp of last statusUi change (drives the card flash). */
  statusChangedAt: Record<string, number>;

  // ── Reads ────────────────────────────────────────────────────────────────
  fetchTenantVisits: (supabase: Supabase, clerkId: string) => Promise<void>;
  fetchLandlordVisits: (supabase: Supabase, clerkId: string) => Promise<void>;
  upsertTenantPartial: (
    partial: Partial<TenantRow> & {
      id: string;
      status: VisitStatus;
      requestedDate: string;
    }
  ) => void;
  upsertLandlordPartial: (
    partial: Partial<LandlordRow> & {
      id: string;
      status: VisitStatus;
      requestedDate: string;
    }
  ) => void;
  /** Remove a row after a realtime DELETE event. */
  removeTenantVisit: (visitId: string) => void;

  // ── Tenant transitions ───────────────────────────────────────────────────
  cancelVisit: (visitId: string, supabase: Supabase) => Promise<boolean>;
  acceptReschedule: (visitId: string, supabase: Supabase) => Promise<boolean>;
  declineReschedule: (visitId: string, supabase: Supabase) => Promise<boolean>;
  /**
   * Tenant follow-up answer. Routes the four options through the right
   * transitions:
   *   interested           → DISCUSSION_ONGOING (tenant wants to proceed)
   *   need_more_time       → DISCUSSION_ONGOING (still deciding)
   *   not_a_fit            → CLOSED (terminal archive)
   *   missed_visit_reschedule → brand-new PENDING (clones the request)
   */
  submitFollowUp: (
    visitId: string,
    response: FollowUpResponse,
    note: string | null,
    supabase: Supabase
  ) => Promise<boolean>;

  // ── Landlord transitions ─────────────────────────────────────────────────
  acceptVisit: (visitId: string, supabase: Supabase) => Promise<boolean>;
  rescheduleVisit: (
    visitId: string,
    iso: string,
    slot: TimeSlot,
    message: string | null,
    supabase: Supabase
  ) => Promise<boolean>;
  declineVisit: (visitId: string, reason: string, supabase: Supabase) => Promise<boolean>;
  /**
   * Landlord-side cancel (CONFIRMED → CANCELLED). There is no landlord
   * cancel RPC yet, so this is a local state transition only — mirrors
   * `landlordSubmitFollowUp`, which also records until a backend call
   * exists.
   */
  landlordCancelVisit: (visitId: string, supabase: Supabase) => Promise<boolean>;
  /**
   * COMPLETED / DISCUSSION → FINALIZED. Also closes every other
   * PENDING / RESCHEDULED / DISCUSSION row for the same property so the
   * landlord's active tabs collapse to one tenant.
   */
  finalizeVisit: (visitId: string, supabase: Supabase) => Promise<boolean>;
  /**
   * Landlord follow-up on COMPLETED. Drives DISCUSSION_ONGOING or
   * CLOSED; "finalize_rental" routes through `finalizeVisit`.
   */
  landlordSubmitFollowUp: (
    visitId: string,
    outcome: LandlordFollowUpOutcome,
    supabase: Supabase
  ) => Promise<boolean>;

  clearVisits: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const deriveStatusUi = (
  existing: TenantRow | undefined,
  partial: { status?: VisitStatus; requestedDate?: string }
): TenantRow['statusUi'] => {
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
  nextUi: string,
  prevUi: string | undefined
): Record<string, number> =>
  prevUi && prevUi !== nextUi
    ? { ...state.statusChangedAt, [visitId]: Date.now() }
    : state.statusChangedAt;

// ─── Store ──────────────────────────────────────────────────────────────────

export const useVisitsStore = create<VisitsState>((set, get) => ({
  tenantVisits: [],
  landlordVisits: [],
  isLoading: false,
  lastClerkId: null,
  statusChangedAt: {},

  // ── Reads ────────────────────────────────────────────────────────────────

  fetchTenantVisits: async (supabase, clerkId) => {
    set({ isLoading: true });
    const result = await getVisitRequestsForTenant(clerkId, supabase);
    if (result.success) {
      set((state) => {
        const changedAt: Record<string, number> = { ...state.statusChangedAt };
        const visits = result.data.map((visit) => {
          const existing = state.tenantVisits.find((v) => v.id === visit.id);
          if (existing && existing.statusUi !== visit.statusUi) {
            changedAt[visit.id] = Date.now();
          }
          return visit;
        });
        return {
          tenantVisits: visits,
          statusChangedAt: changedAt,
          lastClerkId: clerkId,
          isLoading: false,
        };
      });
    } else {
      set({ isLoading: false });
    }
  },

  fetchLandlordVisits: async (supabase, clerkId) => {
    set({ isLoading: true });
    const { getVisitRequestsForLandlord } = await import('@/src/services/visits.service');
    const result = await getVisitRequestsForLandlord(clerkId, supabase);
    if (result.success) {
      const rows: LandlordRow[] = result.data.map((row) => ({
        ...row,
        uiStatus: toLandlordRequestUi(row.status, row.requestedDate),
      }));
      set({ landlordVisits: rows, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  upsertTenantPartial: (partial) => {
    set((state) => {
      const existing = state.tenantVisits.find((v) => v.id === partial.id);
      const statusUi = deriveStatusUi(existing, partial);
      const merged: TenantRow = {
        id: partial.id,
        propertyId: partial.propertyId ?? existing?.propertyId ?? '',
        tenantId: partial.tenantId ?? existing?.tenantId ?? '',
        landlordId: partial.landlordId ?? existing?.landlordId ?? '',
        status: partial.status,
        statusUi,
        statusLabel: existing?.statusLabel ?? 'Pending Approval',
        requestedDate: partial.requestedDate,        timeSlot: partial.timeSlot ?? existing?.timeSlot ?? 'MORNING',
        note: partial.note ?? existing?.note ?? null,
        rescheduleCount: partial.rescheduleCount ?? existing?.rescheduleCount ?? 0,
        landlordResponseNote:
          partial.landlordResponseNote ?? existing?.landlordResponseNote ?? null,
        tenantRescheduleNote:
          partial.tenantRescheduleNote ?? existing?.tenantRescheduleNote ?? null,
        previousRequestedDate:
          partial.previousRequestedDate ?? existing?.previousRequestedDate ?? null,
        previousTimeSlot: partial.previousTimeSlot ?? existing?.previousTimeSlot ?? null,
        tenantFollowUpResponse:
          partial.tenantFollowUpResponse ?? existing?.tenantFollowUpResponse ?? null,
        tenantFollowUpNote: partial.tenantFollowUpNote ?? existing?.tenantFollowUpNote ?? null,
        tenantFollowUpAt: partial.tenantFollowUpAt ?? existing?.tenantFollowUpAt ?? null,
        landlordFollowUpOutcome:
          partial.landlordFollowUpOutcome ?? existing?.landlordFollowUpOutcome ?? null,
        landlordFollowUpNote:
          partial.landlordFollowUpNote ?? existing?.landlordFollowUpNote ?? null,
        landlordFollowUpAt: partial.landlordFollowUpAt ?? existing?.landlordFollowUpAt ?? null,
        respondedAt: partial.respondedAt ?? existing?.respondedAt ?? null,
        completedAt: partial.completedAt ?? existing?.completedAt ?? null,
        createdAt: partial.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
        followUpPending: statusUi === 'completed' && !existing?.tenantFollowUpResponse,
        tenantName: partial.tenantName ?? existing?.tenantName ?? null,
        tenantAvatarUrl: partial.tenantAvatarUrl ?? existing?.tenantAvatarUrl ?? null,
        landlordName: partial.landlordName ?? existing?.landlordName ?? null,
        landlordAvatarUrl: partial.landlordAvatarUrl ?? existing?.landlordAvatarUrl ?? null,
        landlordPhone: partial.landlordPhone ?? existing?.landlordPhone ?? null,
        propertyTitle: partial.propertyTitle ?? existing?.propertyTitle ?? null,
        propertyArea: partial.propertyArea ?? existing?.propertyArea ?? null,
        propertyPrice: partial.propertyPrice ?? existing?.propertyPrice ?? null,
        propertyPhotoUrl: partial.propertyPhotoUrl ?? existing?.propertyPhotoUrl ?? null,
      };
      return {
        tenantVisits: [merged, ...state.tenantVisits.filter((v) => v.id !== partial.id)],
        statusChangedAt: markStatusChange(state, partial.id, statusUi, existing?.statusUi),
      };
    });
  },

  removeTenantVisit: (visitId) => {
    set((state) => ({
      tenantVisits: state.tenantVisits.filter((v) => v.id !== visitId),
    }));
  },

  upsertLandlordPartial: (partial) => {
    set((state) => {
      const existing = state.landlordVisits.find((v) => v.id === partial.id);
      const status = partial.status ?? existing?.status ?? 'PENDING';
      const requestedDate = partial.requestedDate ?? existing?.requestedDate ?? '';
      const uiStatus = toLandlordRequestUi(status, requestedDate);
      const merged: LandlordRow = {
        id: partial.id,
        propertyId: partial.propertyId ?? existing?.propertyId ?? '',
        tenantId: partial.tenantId ?? existing?.tenantId ?? '',
        landlordId: partial.landlordId ?? existing?.landlordId ?? '',
        status,
        statusUi: existing?.statusUi ?? 'pending',
        statusLabel: existing?.statusLabel ?? 'Pending Approval',
        uiStatus,
        requestedDate,
        timeSlot: partial.timeSlot ?? existing?.timeSlot ?? 'MORNING',
        note: partial.note ?? existing?.note ?? null,
        rescheduleCount: partial.rescheduleCount ?? existing?.rescheduleCount ?? 0,
        landlordResponseNote:
          partial.landlordResponseNote ?? existing?.landlordResponseNote ?? null,
        tenantRescheduleNote:
          partial.tenantRescheduleNote ?? existing?.tenantRescheduleNote ?? null,
        previousRequestedDate:
          partial.previousRequestedDate ?? existing?.previousRequestedDate ?? null,
        previousTimeSlot: partial.previousTimeSlot ?? existing?.previousTimeSlot ?? null,
        tenantFollowUpResponse:
          partial.tenantFollowUpResponse ?? existing?.tenantFollowUpResponse ?? null,
        tenantFollowUpNote: partial.tenantFollowUpNote ?? existing?.tenantFollowUpNote ?? null,
        tenantFollowUpAt: partial.tenantFollowUpAt ?? existing?.tenantFollowUpAt ?? null,
        landlordFollowUpOutcome:
          partial.landlordFollowUpOutcome ?? existing?.landlordFollowUpOutcome ?? null,
        landlordFollowUpNote:
          partial.landlordFollowUpNote ?? existing?.landlordFollowUpNote ?? null,
        landlordFollowUpAt: partial.landlordFollowUpAt ?? existing?.landlordFollowUpAt ?? null,
        respondedAt: partial.respondedAt ?? existing?.respondedAt ?? null,
        completedAt: partial.completedAt ?? existing?.completedAt ?? null,
        createdAt: partial.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
        tenantName: partial.tenantName ?? existing?.tenantName ?? null,
        tenantAvatarUrl: partial.tenantAvatarUrl ?? existing?.tenantAvatarUrl ?? null,
        landlordName: partial.landlordName ?? existing?.landlordName ?? null,
        landlordAvatarUrl: partial.landlordAvatarUrl ?? existing?.landlordAvatarUrl ?? null,
        landlordPhone: partial.landlordPhone ?? existing?.landlordPhone ?? null,
        propertyTitle: partial.propertyTitle ?? existing?.propertyTitle ?? null,
        propertyArea: partial.propertyArea ?? existing?.propertyArea ?? null,
        propertyPrice: partial.propertyPrice ?? existing?.propertyPrice ?? null,
        propertyPhotoUrl: partial.propertyPhotoUrl ?? existing?.propertyPhotoUrl ?? null,
      };
      return {
        landlordVisits: [merged, ...state.landlordVisits.filter((v) => v.id !== partial.id)],
        statusChangedAt: markStatusChange(state, partial.id, uiStatus, existing?.uiStatus),
      };
    });
  },

  // ── Tenant transitions ───────────────────────────────────────────────────

  cancelVisit: async (visitId, supabase) =>
    patchTenant(
      set,
      get,
      visitId,
      { status: 'CANCELLED_BY_TENANT', statusUi: 'cancelled' },
      () => cancelVisitRequest(visitId, supabase),
      supabase
    ),

  acceptReschedule: async (visitId, supabase) =>
    patchTenant(
      set,
      get,
      visitId,
      {
        status: 'ACCEPTED',
        statusUi: 'accepted',
        previousRequestedDate: null,
        previousTimeSlot: null,
      },
      () => acceptReschedule(visitId, supabase),
      supabase
    ),

  declineReschedule: async (visitId, supabase) =>
    patchTenant(
      set,
      get,
      visitId,
      { status: 'CANCELLED_BY_TENANT', statusUi: 'cancelled' },
      () => declineReschedule(visitId, supabase),
      supabase
    ),

  submitFollowUp: async (visitId, response, note, supabase) => {
    const outcomeMap: Record<
      FollowUpResponse,
      { status: VisitStatus; statusUi: TenantRow['statusUi'] }
    > = {
      interested: { status: 'DISCUSSION_ONGOING', statusUi: 'discussion' },
      need_more_time: { status: 'DISCUSSION_ONGOING', statusUi: 'discussion' },
      not_a_fit: { status: 'CLOSED', statusUi: 'cancelled' },
      missed_visit_reschedule: { status: 'PENDING', statusUi: 'pending' },
    };
    const patch = outcomeMap[response];
    return patchTenant(
      set,
      get,
      visitId,
      {
        ...patch,
        tenantFollowUpResponse: response,
        tenantFollowUpNote: note,
        followUpPending: false,
      },
      () => submitFollowUp(visitId, response, note, supabase),
      supabase
    );
  },

  // ── Landlord transitions ─────────────────────────────────────────────────

  acceptVisit: async (visitId, supabase) =>
    patchLandlord(
      set,
      get,
      visitId,
      { status: 'ACCEPTED', uiStatus: 'upcoming' },
      () => acceptVisit(visitId, supabase),
      supabase
    ),

  rescheduleVisit: async (visitId, iso, slot, message, supabase) =>
    patchLandlord(
      set,
      get,
      visitId,
      {
        status: 'RESCHEDULED',
        uiStatus: 'rescheduled',
        requestedDate: iso,
        timeSlot: slot,
        previousRequestedDate: get().landlordVisits.find((v) => v.id === visitId)?.requestedDate,
        previousTimeSlot: get().landlordVisits.find((v) => v.id === visitId)?.timeSlot,
        landlordResponseNote: message,
      },
      () => rescheduleVisit(visitId, iso, slot, message, supabase),
      supabase
    ),

  declineVisit: async (visitId, reason, supabase) =>
    patchLandlord(
      set,
      get,
      visitId,
      { status: 'REJECTED', uiStatus: 'rejected', landlordResponseNote: reason },
      () => rejectVisit(visitId, reason, supabase),
      supabase
    ),

  landlordCancelVisit: async (visitId, supabase) =>
    patchLandlord(
      set,
      get,
      visitId,
      { status: 'CANCELLED_BY_TENANT', uiStatus: 'cancelled' },
      // Local-only — no landlord cancel RPC exists yet.
      async () => ({ success: true, data: undefined }),
      supabase
    ),

  finalizeVisit: async (visitId, supabase) => {
    // Optimistic: flip the row to FINALIZED and close siblings.
    set((state) => {
      const target = state.landlordVisits.find((v) => v.id === visitId);
      if (!target) return state;
      const propertyId = target.propertyId;
      const changedAt: Record<string, number> = { ...state.statusChangedAt };
      const next = state.landlordVisits.map((v) => {
        if (v.id === visitId) {
          changedAt[v.id] = Date.now();
          return {
            ...v,
            status: 'RENTAL_FINALIZED' as VisitStatus,
            uiStatus: 'finalized' as const,
          };
        }
        // Close every other open row for the same property.
        if (
          v.propertyId === propertyId &&
          (v.status === 'PENDING' ||
            v.status === 'ACCEPTED' ||
            v.status === 'RESCHEDULED' ||
            v.status === 'DISCUSSION_ONGOING')
        ) {
          changedAt[v.id] = Date.now();
          return { ...v, status: 'CLOSED' as VisitStatus, uiStatus: 'cancelled' as const };
        }
        return v;
      });
      return { landlordVisits: next, statusChangedAt: changedAt };
    });

    const result = await finalizeRental(visitId, supabase);
    if (result.success) return true;
    // Rollback by re-fetching.
    const { lastClerkId } = get();
    if (lastClerkId) await get().fetchLandlordVisits(supabase, lastClerkId);
    return false;
  },

  landlordSubmitFollowUp: async (visitId, outcome, supabase) => {
    if (outcome === 'finalize_rental') {
      // Full finalize path — closes siblings + flips the property to
      // OCCUPIED via the finalize_rental RPC (optimistic UI included).
      return get().finalizeVisit(visitId, supabase);
    }
    // Persisted via submit_landlord_follow_up; the server reconciles
    // once the tenant has answered too. Until then the row stays
    // VISIT_COMPLETED ("completed" in the landlord's tabs).
    const next: Record<Exclude<LandlordFollowUpOutcome, 'finalize_rental'>, VisitStatus> = {
      tenant_visited: 'VISIT_COMPLETED',
      tenant_did_not_visit: 'CLOSED',
      discussion_ongoing: 'VISIT_COMPLETED',
    };
    const ui: Record<Exclude<LandlordFollowUpOutcome, 'finalize_rental'>, LandlordRow['uiStatus']> = {
      tenant_visited: 'completed',
      tenant_did_not_visit: 'cancelled',
      discussion_ongoing: 'completed',
    };
    return patchLandlord(
      set,
      get,
      visitId,
      { status: next[outcome], uiStatus: ui[outcome] },
      () => submitLandlordFollowUp(visitId, outcome, null, supabase),
      supabase
    );
  },

  clearVisits: () => {
    set({
      tenantVisits: [],
      landlordVisits: [],
      isLoading: false,
      lastClerkId: null,
      statusChangedAt: {},
    });
  },
}));

// ─── Patch helpers (private) ─────────────────────────────────────────────────

type PatchTenant = Partial<
  Pick<
    TenantRow,
    | 'status'
    | 'statusUi'
    | 'previousRequestedDate'
    | 'previousTimeSlot'
    | 'tenantFollowUpResponse'
    | 'tenantFollowUpNote'
    | 'followUpPending'
  >
>;

const patchTenant = async (
  set: (fn: (state: VisitsState) => Partial<VisitsState> | VisitsState) => void,
  get: () => VisitsState,
  visitId: string,
  patch: PatchTenant,
  run: () => Promise<{ success: boolean; data?: TenantRow }>,
  supabase: Supabase
): Promise<boolean> => {
  // Guard against invalid transitions.
  const existing = get().tenantVisits.find((v) => v.id === visitId);
  if (!existing) return false;
  if (patch.status && !canTransition(existing.status, patch.status)) return false;

  set((state) => {
    const found = state.tenantVisits.find((v) => v.id === visitId);
    if (!found) return state;
    const updated: TenantRow = { ...found, ...patch };
    return {
      tenantVisits: state.tenantVisits.map((v) => (v.id === visitId ? updated : v)),
      statusChangedAt: markStatusChange(state, visitId, updated.statusUi, found.statusUi),
    };
  });

  const result = await run();
  if (result.success && result.data) {
    set((state) => {
      const found = state.tenantVisits.find((v) => v.id === visitId);
      return {
        tenantVisits: state.tenantVisits.map((v) => (v.id === visitId ? result.data! : v)),
        statusChangedAt: markStatusChange(state, visitId, result.data!.statusUi, found?.statusUi),
      };
    });
    return true;
  }
  const { lastClerkId } = get();
  if (lastClerkId) await get().fetchTenantVisits(supabase, lastClerkId);
  return false;
};

type PatchLandlord = Partial<
  Pick<
    LandlordRow,
    | 'status'
    | 'uiStatus'
    | 'requestedDate'
    | 'timeSlot'
    | 'previousRequestedDate'
    | 'previousTimeSlot'
    | 'landlordResponseNote'
  >
>;

const patchLandlord = async (
  set: (fn: (state: VisitsState) => Partial<VisitsState> | VisitsState) => void,
  get: () => VisitsState,
  visitId: string,
  patch: PatchLandlord,
  run: () => Promise<{ success: boolean; data?: LandlordVisitRequest }>,
  supabase: Supabase
): Promise<boolean> => {
  const existing = get().landlordVisits.find((v) => v.id === visitId);
  if (!existing) return false;
  if (patch.status && !canTransition(existing.status, patch.status)) return false;

  set((state) => {
    const found = state.landlordVisits.find((v) => v.id === visitId);
    if (!found) return state;
    const merged: LandlordRow = { ...found, ...patch };
    return {
      landlordVisits: state.landlordVisits.map((v) => (v.id === visitId ? merged : v)),
      statusChangedAt: markStatusChange(state, visitId, merged.uiStatus, found.uiStatus),
    };
  });

  const result = await run();
  if (result.success && result.data) {
    const row: LandlordRow = {
      ...result.data,
      uiStatus: toLandlordRequestUi(result.data.status, result.data.requestedDate),
    };
    set((state) => {
      const found = state.landlordVisits.find((v) => v.id === visitId);
      return {
        landlordVisits: state.landlordVisits.map((v) => (v.id === visitId ? row : v)),
        statusChangedAt: markStatusChange(state, visitId, row.uiStatus, found?.uiStatus),
      };
    });
    return true;
  }
  const { lastClerkId } = get();
  if (lastClerkId) await get().fetchLandlordVisits(supabase, lastClerkId);
  return false;
};

// ─── Follow-up prompt selectors ──────────────────────────────────────────────

/**
 * Visits whose window has passed but this tenant hasn't answered the
 * follow-up for yet — drives the auto-prompt drawer. Ordered oldest first
 * so the longest-overdue visit prompts first.
 */
export const selectTenantPendingFollowUps = (state: VisitsState): TenantRow[] =>
  state.tenantVisits
    .filter((v) => v.followUpPending)
    .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));

/** Landlord equivalent — completed visits still missing the landlord's outcome. */
export const selectLandlordPendingFollowUps = (state: VisitsState): LandlordRow[] =>
  state.landlordVisits
    .filter(
      (v) =>
        v.status === 'VISIT_COMPLETED' &&
        v.landlordFollowUpOutcome == null &&
        v.tenantFollowUpResponse != null
    )
    .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));

/**
 * Refresh completion states then re-read. Called by the follow-up prompt
 * hook on app open/focus: lazily flips past-window ACCEPTED visits to
 * VISIT_COMPLETED server-side before the lists are refetched.
 */
export async function refreshVisitCompletion(
  supabase: Supabase,
  clerkId: string,
  role: 'tenant' | 'landlord'
): Promise<void> {
  const flipped = await markPastVisitsCompleted(supabase);
  if (!flipped.success) return; // Non-fatal — derivation on read still works.
  if (flipped.data > 0) {
    const store = useVisitsStore.getState();
    if (role === 'tenant') await store.fetchTenantVisits(supabase, clerkId);
    else await store.fetchLandlordVisits(supabase, clerkId);
  }
}
