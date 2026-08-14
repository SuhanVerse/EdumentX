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
