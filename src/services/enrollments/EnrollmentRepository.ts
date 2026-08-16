/**
 * EdumentX — Enrollment Repository abstraction
 *
 * The single contract between the tutor-side screens (inbox, home,
 * batch creation, capacity) and the underlying data source
 * (Firestore or in-memory mock).
 *
 * Two concrete implementations:
 *   - `FirebaseEnrollmentRepository` — production. Reads/writes via
 *     `@react-native-firebase/firestore` modular API.
 *   - `MockEnrollmentRepository` — in-memory, fully offline.
 *
 * Selection is gated by `EXPO_PUBLIC_USE_MOCK_DATA` and performed by
 * `services/enrollments/dataSource.ts` at module load.
 *
 * Pipeline summary (per plan §4.3):
 *   - `subscribeRequests(tutorUid, …)` — live list of all requests
 *     (pending + historical). The UI filters by `status === "pending"`.
 *   - `subscribeEnrollments(tutorUid, …)` — live list of the tutor's
 *     active roster. Used by the home dashboard's "Active students"
 *     widget and the capacity screen's "Booked" derivation.
 *   - `subscribeBatches(tutorUid, …)` — live list of the tutor's
 *     group batches (consumed by /batches + the capacity grid).
 *   - `subscribeAvailability(tutorUid, …)` — live availability
 *     portion of the profile subdoc. The repo reads the full
 *     profile doc and pulls only `availability` + `enrolledCount` so
 *     the caller doesn't have to merge two sources.
 *   - `acceptRequest({…})` — atomic transaction: reads profile +
 *     request, writes enrollment, decrements capacity on accept,
 *     updates request status, writes a notification to the student.
 *   - `declineRequest(requestId, reason)` — hard delete + decline
 *     notification.   *   - `removeEnrollment(tutorUid, enrollmentId, reason)` — atomic
   *     transaction that soft-deletes the enrollment by direct path,
   *     decrements capacity, cascades to the batch member doc via
   *     the roster's `batchId`, and notifies the student. (No
   *     collectionGroup scans — those are rule-unprovable.)
 *   - `setSlotStatus(tutorUid, day, slot, status)` — dot-path write
 *     to the profile's `availability.<day>.<slot>` field. No merge
 *     with siblings — only the touched cell changes.
 *   - `createBatch({…})` — atomic transaction that creates the
 *     batch + one member doc per active enrollment.
 *   - `endBatch(batchId)` — flips the batch to `"ended"`.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import type {
  Batch,
  BatchMember,
  Enrollment,
  EnrollmentRequest,
  WeeklyAvailability,
  DayKey,
  TimeSlotKey,
  SlotStatus,
} from "./types";

// ─── Live snapshot helpers ─────────────────────────────────────────────────

export type RequestCallback = (requests: EnrollmentRequest[]) => void;
export type EnrollmentCallback = (enrollments: Enrollment[]) => void;
export type BatchCallback = (batches: Batch[]) => void;
export type BatchMemberCallback = (members: BatchMember[]) => void;
export type AvailabilityCallback = (snapshot: AvailabilitySnapshot) => void;
export type ErrorCallback = (err: Error) => void;

export type AvailabilitySnapshot = {
  availability: WeeklyAvailability | null;
  enrolledCount: number;
  studentCapacity: number;
};

// ─── Write inputs ──────────────────────────────────────────────────────────

export type AcceptRequestInput = {
  tutorUid: string;
  /** Auth uid of the tutor — used to populate `enrolledBy` and
   *  verify the writer is the tutor themselves. */
  authorUid: string;
  requestId: string;
  /** Student's `users/{uid}` snapshot — copied onto the enrollment
   *  so the dashboard can render the roster without a second read. */
  student: {
    uid: string;
    name: string;
    grade: string;
    avatar: string | null;
  };
  subjects: string[];
  slotKey: string;
  startDate: string;
  endDate: string;
  /** Batch to add the student to on accept — present on session-code
   *  join requests. When set, `acceptRequest` also writes the
   *  member doc + bumps the batch's `memberCount`. */
  batchId?: string;
};

export type CreateBatchInput = {
  tutorUid: string;
  authorUid: string;
  name: string;
  subject: string;
  monthlyRateNpr: number;
  slotKeys: string[];
  startDate: string;
  endDate: string | null;
  /** Active enrollments to seed as initial members. Each member's
   *  `studentName` / `studentAvatar` is snapshotted from the local
   *  enrollment array so the batch doc remains self-contained. */
  members: readonly {
    enrollmentId: string;
    studentUid: string;
    studentName: string;
    studentAvatar: string | null;
  }[];
};

// ─── Write inputs ──────────────────────────────────────────────────────────

/**
 * Input for `writeEnrollmentRequest` — a student asking a tutor to
 * be added to their roster. The student-side "Enroll" CTA on
 * TutorDetailsScreen posts one of these.
 *
 * The `student` block is snapshotted from the student's
 * `users/{uid}/studentProfile/default` doc so the tutor's inbox
 * renders the request without a second read. The repository fills
 * in `tutorUid`, `submittedAt`, and `status: "pending"` — the
 * caller only supplies the human content.
 */
export type WriteEnrollmentRequestInput = {
  tutorUid: string;
  /** Auth uid of the student — must equal `student.uid`. The rule
   *  enforces this match. */
  studentUid: string;
  student: {
    uid: string;
    name: string;
    grade: string;
    avatar: string | null;
  };
  subjects: string[];
  schedule: string;
  startDate: string;
  endDate: string;
  message: string;
  /** Figma S-12 — enrollment mode (one-to-one vs session-code join). */
  mode?: "one-to-one" | "session-code";
  /** Plan duration in months (one-to-one mode). */
  planMonths?: number;
  /** Chosen `day:slot` keys from the tutor's availability grid. */
  pickedSlotKeys?: string[];
  /** Teaching address (one-to-one mode). */
  address?: string;
  /** Trial-week discount (one-to-one mode). */
  trial?: boolean;
  /** Uppercase session code (session-code mode). */
  sessionCode?: string;
  /** Cost summary snapshot (one-to-one mode). */
  costNpr?: number;
  /** Target batch for a session-code join request. On accept, the
   *  student is added to this batch's `members` subcollection. */
  batchId?: string;
};

/**
 * Input for `updateEnrollmentRequest`. The student mutates the
 * human content of a pending request (message + schedule + dates)
 * ahead of the tutor's decision. The repository re-checks
 * `studentUid` ownership and the request's `pending` status before
 * committing — a tutor accept that lands in the gap between the
 * user opening the edit sheet and the submit coming back throws
 * `RequestAlreadyDecidedError` so the UI can refresh.
 */
export type UpdateEnrollmentRequestInput = {
  /** Auth uid of the student — must match the request's
   *  `studentUid`. The rule enforces this on the Firestore path. */
  studentUid: string;
  tutorUid: string;
  requestId: string;
  schedule: string;
  startDate: string;
  endDate: string;
  message: string;
};

// ─── Interface ─────────────────────────────────────────────────────────────

export interface EnrollmentRepository {
  /** Live list of all enrollment requests addressed to the tutor.
   *  UI filters by `status === "pending"`. */
  subscribeRequests(
    tutorUid: string,
    onData: RequestCallback,
    onError?: ErrorCallback,
  ): Unsubscribe;

  /** Live list of THIS student's own requests to every tutor. Used
   *  by the student-side "My Enrollments" tab's Pending list. */
  subscribeRequestsByStudent(
    studentUid: string,
    onData: RequestCallback,
    onError?: ErrorCallback,
  ): Unsubscribe;

  /** Live list of THIS student's active enrollments (across all
   *  tutors). Used by the student-side "My Enrollments" tab's
   *  Active + Past lists. The repo does a collectionGroup query
   *  scoped by `studentUid`. */
  subscribeEnrollmentsByStudent(
    studentUid: string,
    onData: EnrollmentCallback,
    onError?: ErrorCallback,
  ): Unsubscribe;

  /** Write a new enrollment request from a student. Returns the
   *  auto-generated `requestId` so the UI can deep-link to it. */
  writeEnrollmentRequest(
    input: WriteEnrollmentRequestInput,
  ): Promise<{ requestId: string }>;

  /**
   * Update an existing pending request authored by the student.
   * The repo re-asserts that the request is still `pending` and
   * owned by `studentUid` before writing; concurrent tutor-accept
   * races surface as `RequestAlreadyDecidedError`. Only the fields
   * the student types — `schedule`, `startDate`, `endDate`,
   * `message` — are mutable; identity fields (tutorUid, studentUid,
   * subjects) are immutable post-create.
   */
  updateEnrollmentRequest(input: UpdateEnrollmentRequestInput): Promise<void>;

  /** Hard-delete a pending request authored by the student. The
   *  tutor's inbox (live subscription) will see the row vanish on
   *  the next snapshot. Returns silently if the request is
   *  already gone. */
  deleteEnrollmentRequest(
    studentUid: string,
    tutorUid: string,
    requestId: string,
  ): Promise<void>;

  /** Live list of the tutor's enrollments (active + removed/expired).
   *
   *  `options.runSweep` (default true) controls whether the
   *  auto-expiry sweep runs on every snapshot. The sweep WRITES the
   *  tutor's roster + profile, so it must only run when the caller
   *  is the tutor themself — student-facing screens (TutorDetails,
   *  EnrollmentForm) subscribe to a tutor's roster just to read it
   *  and would otherwise trigger the sweep as the wrong actor and
   *  log a permission-denied flood. */
  subscribeEnrollments(
    tutorUid: string,
    onData: EnrollmentCallback,
    onError?: ErrorCallback,
    options?: { runSweep?: boolean },
  ): Unsubscribe;

  /** Live list of the tutor's batches (active + ended). */
  subscribeBatches(
    tutorUid: string,
    onData: BatchCallback,
    onError?: ErrorCallback,
  ): Unsubscribe;

  /** Live members of a single batch. */
  subscribeBatchMembers(
    tutorUid: string,
    batchId: string,
    onData: BatchMemberCallback,
    onError?: ErrorCallback,
  ): Unsubscribe;

  /** Live availability + enrolledCount + studentCapacity. */
  subscribeAvailability(
    tutorUid: string,
    onData: AvailabilityCallback,
    onError?: ErrorCallback,
  ): Unsubscribe;

  /** Atomic accept. Throws `CapacityExceededError` if the tutor is
   *  at cap. Returns the new enrollment id. */
  acceptRequest(input: AcceptRequestInput): Promise<{ enrollmentId: string }>;

  /** Hard delete + write a decline notification to the student. */
  declineRequest(
    tutorUid: string,
    requestId: string,
    studentUid: string,
    reason: string,
  ): Promise<void>;

  /** Soft-delete the enrollment by direct path, decrement capacity,
   *  cascade to the batch member doc via the roster's `batchId`
   *  (`batches/{tutorUid}/classes/{batchId}/members/{enrollmentId}`),
   *  notify the student. `tutorUid` is the caller's own auth uid —
   *  it pins every write to paths the tutor owns, so no collectionGroup
   *  scan is needed (and no scan is rule-legal anyway). */
  removeEnrollment(
    tutorUid: string,
    enrollmentId: string,
    reason: string,
  ): Promise<void>;

  /** Dot-path write to `availability.<day>.<slot>`. */
  setSlotStatus(
    tutorUid: string,
    day: DayKey,
    slot: TimeSlotKey,
    status: SlotStatus,
  ): Promise<void>;

  /** Bulk-write the full weekly availability map (replace). Used by
   *  the capacity screen's explicit "Save changes" flow, which
   *  accumulates edits in local state and flushes them in one
   *  write instead of one round-trip per cell tap. */
  saveAvailability(
    tutorUid: string,
    availability: WeeklyAvailability,
  ): Promise<void>;

  /** Atomic batch creation with seed members. */
  createBatch(input: CreateBatchInput): Promise<{ batchId: string }>;

  /** Flip a batch to `"ended"`. Batch doc remains for historical
   *  reads but cells become "Off" again. */
  endBatch(batchId: string): Promise<void>;
}
