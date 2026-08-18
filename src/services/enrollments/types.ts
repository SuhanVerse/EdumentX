/**
 * EdumentX — Enrollments domain types
 *
 * Canonical domain model for the tutor-side enrollment management
 * feature (Phase 5). Covers:
 *   - weekly availability grid (Mon–Sun × 6 time slots, rendered
 *     as a vertically-scrolling week strip — each day is its own row)
 *   - enrollment requests (pending student asks)
 *   - enrollments (active students on a tutor's roster)
 *   - group batches (a tutor's published classes with shared slots)
 *   - derived "Booked" cell state (computed at read time)
 *
 * NOT coupled to the Firestore document shape — the repository hides
 * the translation.
 */

// ─── Capacity ────────────────────────────────────────────────────────────────

/**
 * Maximum simultaneous active enrollments a tutor can hold. Mirrors
 * the Firestore rule's capacity guard; if the field is missing from
 * the profile doc OR `studentCapacity === 0`, the service falls back
 * to this cap so the rule still applies.
 */
export const MAX_CAPACITY = 6;

/**
 * FREE-tier cap on simultaneous active students (Pro subscription
 * gate, Phase 2 Advanced Architecture). Free tutors are limited to 5
 * active students and 1 active batch; Pro tutors keep the existing
 * `MAX_CAPACITY`/`studentCapacity` limits (raised, not removed — the
 * quality-protection intent of the cap stays intact).
 */
export const FREE_TIER_MAX_STUDENTS = 5;

/** FREE-tier cap on simultaneous active batches. */
export const FREE_TIER_MAX_BATCHES = 1;

/**
 * Maximum students in one group batch. The single source of truth
 * for the seat cap: batch creation (wizard min/max), the accept
 * transaction's `BatchFullError` guard, the student marketplace
 * capacity meter + seats ring, and the enrollment form's full-batch
 * block all read this. Mirrors the product's "2-6 students per
 * batch" contract.
 */
export const MAX_BATCH_MEMBERS = 6;

// ─── Weekly availability grid ───────────────────────────────────────────────

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: readonly DayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export type TimeSlotKey =
  | "6-9"
  | "9-12"
  | "12-3"
  | "3-5"
  | "5-7"
  | "7-9";

export const TIME_SLOT_KEYS: readonly TimeSlotKey[] = [
  "6-9",
  "9-12",
  "12-3",
  "3-5",
  "5-7",
  "7-9",
];

export const TIME_SLOT_LABELS: Record<TimeSlotKey, string> = {
  "6-9": "6–9 AM",
  "9-12": "9 AM–12 PM",
  "12-3": "12–3 PM",
  "3-5": "3–5 PM",
  "5-7": "5–7 PM",
  "7-9": "7–9 PM",
};

export type SlotStatus = "off" | "available";

export type WeeklyAvailability = {
  [K in DayKey]: { [S in TimeSlotKey]: SlotStatus };
};

/**
 * Build a fully-populated availability grid initialized to all-`"off"`.
 * Used as the default when a tutor has never opened the capacity
 * screen (the field is absent / null on the profile doc).
 */
export function makeEmptyAvailability(): WeeklyAvailability {
  const row: { [S in TimeSlotKey]: SlotStatus } = {
    "6-9": "off",
    "9-12": "off",
    "12-3": "off",
    "3-5": "off",
    "5-7": "off",
    "7-9": "off",
  };
  return {
    mon: { ...row },
    tue: { ...row },
    wed: { ...row },
    thu: { ...row },
    fri: { ...row },
    sat: { ...row },
    sun: { ...row },
  };
}

export const DEFAULT_AVAILABILITY: WeeklyAvailability = makeEmptyAvailability();

/**
 * Cell status extends the base `SlotStatus` with `"booked"` — the
 * derived state that means "this slot is occupied by an active
 * enrollment or batch member set". The grid UI reads this exact
 * union.
 */
export type CellStatus = SlotStatus | "booked";

/**
 * Snapshot returned by `subscribeAvailability` — bundles the
 * weekly availability grid with the denormalized counters the
 * dashboard renders alongside it (`enrolledCount`, `studentCapacity`).
 * Re-exported here from the repository interface so callers can
 * import the snapshot shape from a single place.
 */
export type AvailabilitySnapshot = {
  availability: WeeklyAvailability | null;
  enrolledCount: number;
  studentCapacity: number;
};

export function slotKey(day: DayKey, slot: TimeSlotKey): string {
  return `${day}:${slot}`;
}

export function parseSlotKey(
  key: string,
): { day: DayKey; slot: TimeSlotKey } | null {
  const [day, slot] = key.split(":") as [string, string];
  if (!DAY_KEYS.includes(day as DayKey)) return null;
  if (!TIME_SLOT_KEYS.includes(slot as TimeSlotKey)) return null;
  return { day: day as DayKey, slot: slot as TimeSlotKey };
}

// ─── Booked-map (derived state) ─────────────────────────────────────────────

export type BookedCellSource = "enrollment" | "batch";

export type BookedMap = Map<string, { source: BookedCellSource; refId: string }>;

// ─── Enrollment requests ────────────────────────────────────────────────────

export type EnrollmentRequest = {
  requestId: string;
  tutorUid: string;
  studentUid: string;
  studentName: string;
  studentGrade: string;
  studentAvatar: string | null;
  subjects: string[];
  /** Free-form schedule summary typed by the student. The student
   *  writes whatever they like — e.g. "Mon · Wed · Fri 5–7 PM" or
   *  "Flexible on weekday evenings". The tutor reads it on the
   *  inbox card and decides whether the slot can be honoured. */
  schedule: string;
  startDate: string;
  endDate: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  submittedAt: number;
  decidedAt: number | null;
  /** Figma S-12 — the enrollment mode the student picked. Absent on
   *  legacy requests written by the old sheet. */
  mode?: "one-to-one" | "session-code";
  /** Plan duration in months (one-to-one mode: 1/3/6/12). */
  planMonths?: number;
  /** Chosen slot keys (`day:slot`) from the tutor's availability
   *  grid (one-to-one mode). The `schedule` string is derived from
   *  these for the inbox card. */
  pickedSlotKeys?: string[];
  /** Teaching address (one-to-one mode). */
  address?: string;
  /** Trial-week discount applied (one-to-one mode). */
  trial?: boolean;
  /** Uppercase session code (session-code mode). */
  sessionCode?: string;
  /** Cost summary snapshot shown to the tutor (one-to-one mode). */
  costNpr?: number;
  /** The batch the student wants to join (session-code mode). When
   *  the tutor accepts the request, the student is added to
   *  `batches/{tutorUid}/classes/{batchId}/members`. Absent on
   *  legacy requests and one-to-one requests. */
  batchId?: string;
};

// ─── Enrollments (active roster) ────────────────────────────────────────────

export type Enrollment = {
  enrollmentId: string;
  tutorUid: string;
  studentUid: string;
  studentName: string;
  studentGrade: string;
  studentAvatar: string | null;
  subjects: string[];
  slotKey: string;
  startDate: string;
  endDate: string;
  status: "active" | "removed" | "expired";
  acceptedAt: number;
  removedAt: number | null;
  removeReason: string | null;
  /** Back-reference to the originating `enrollmentRequests/{id}`. */
  requestId: string;
  /** Enriched display info for the STUDENT's "My Enrollments" view:
   *  the roster doc snapshots the student's own name/avatar, so the
   *  tutor's identity is resolved separately (public tutor-profile
   *  read) during `subscribeEnrollmentsByStudent`. Undefined on the
   *  tutor's own roster subscription (not needed there). */
  tutorName?: string;
  tutorAvatar?: string | null;
  /** TUTOR-facing location label, resolved from the student's
   *  `studentProfile/default.location` doc. The read is rules-gated
   *  to tutors with an ACTIVE `locationAccess` marker (written by
   *  acceptRequest, deleted on removal/expiry), so this is only
   *  populated for enrolled students — non-enrolled rows stay
   *  `null` and the roster card renders "Location hidden until
   *  enrolled". */
  studentLocationLabel?: string | null;
  /** The batch this enrollment belongs to — set on session-code
   *  joins when the tutor accepts. Written onto the enrollment doc
   *  by `acceptRequest` (batchId), then enriched with the batch's
   *  display name during `subscribeEnrollmentsByStudent`. */
  batchId?: string;
  batchName?: string;
};

// ─── Batches ────────────────────────────────────────────────────────────────

export type Batch = {
  batchId: string;
  tutorUid: string;
  name: string;
  subject: string;
  monthlyRateNpr: number;
  slotKeys: string[];
  startDate: string;
  endDate: string | null;
  status: "active" | "ended";
  createdAt: number;
  /** Denormalized member count, maintained by the batches repo
   *  (create / add / remove member). Students read batch docs
   *  directly (rules allow it) so the marketplace capacity bar
   *  works without exposing the members subcollection. Absent on
   *  legacy docs → treated as 0. */
  memberCount?: number;
  /** When the tutor ended the batch (`status: "ended"`), in epoch
   *  ms. Set by `endBatch`; absent on active/legacy docs. */
  endedAt?: number;
  /** Enriched display info for the STUDENT's "Browse Batches"
   *  screen: resolved from the tutor's public profile during
   *  `subscribePublicBatches`. Undefined on the tutor's own
   *  batch subscriptions (not needed there). */
  tutorName?: string;
  tutorAvatar?: string | null;
};

export type BatchMember = {
  memberId: string;
  enrollmentId: string;
  studentUid: string;
  studentName: string;
  studentAvatar: string | null;
  joinedAt: number;
};

// ─── Errors ─────────────────────────────────────────────────────────────────

/**
 * Thrown by `acceptRequest` when the tutor's denormalized
 * `enrolledCount` already meets or exceeds the cap. The transaction
 * re-reads the profile inside the rule; the client pre-check is a
 * fast-fail path so the UI can show the user a friendly message
 * without waiting for the round-trip.
 */
export class CapacityExceededError extends Error {
  constructor(message = "Capacity is full. Remove a student or wait until one expires.") {
    super(message);
    this.name = "CapacityExceededError";
  }
}

/**
 * Thrown by `acceptRequest` when the request has already been acted
 * on by another device (race condition). The UI should re-fetch the
 * inbox and let the user try again.
 */
export class RequestAlreadyDecidedError extends Error {
  constructor(message = "This request has already been decided.") {
    super(message);
    this.name = "RequestAlreadyDecidedError";
  }
}

/**
 * Thrown by `acceptRequest` when the target batch is at full
 * capacity (`memberCount >= MAX_BATCH_MEMBERS`) — a session-code
 * join cannot add another student. The transaction rolls back, so
 * neither the enrollment nor the member doc is created.
 */
export class BatchFullError extends Error {
  constructor(
    message = "This batch is already full — no more seats are available.",
  ) {
    super(message);
    this.name = "BatchFullError";
  }
}
