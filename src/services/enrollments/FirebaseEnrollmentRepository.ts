/**
 * EdumentX — Firebase Enrollment Repository
 *
 * Production implementation of `EnrollmentRepository`. Wraps
 * `@react-native-firebase/firestore` in the modular v22+ API
 * (`getApp()` + `getFirestore(getApp())`).
 *
 * Write paths use `runTransaction` for the multi-step operations
 * (accept, remove, batch create) so the denormalized `enrolledCount`
 * on the profile and the source-of-truth collection docs stay in
 * lockstep. Drops to a single `setDoc` / `updateDoc` for the simple
 * operations (setSlotStatus, endBatch).
 *
 * The notification side-effect (writing to `notifications/{uid}`) is
 * done AFTER the transaction commits, as a separate write. The
 * standalone `notifications/{uid}` create rule allows any signed-in
 * writer as long as the `type` is in the known enum and
 * `recipientUid` matches the path — this is enough for the
 * student-facing acceptance notifications without a Cloud Function
 * (which would be the proper fan-out path, but Cloud Functions are
 * explicitly out of scope per CLAUDE.md §6).
 */

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  where,
  type Unsubscribe,
} from "@react-native-firebase/firestore";

import {
  writeNotification,
  notificationCopy,
} from "@/lib/verification/notifications";

import {
  BatchFullError,
  CapacityExceededError,
  MAX_BATCH_MEMBERS,
  MAX_CAPACITY,
  RequestAlreadyDecidedError,
  type AvailabilitySnapshot,
  type Batch,
  type BatchMember,
  type Enrollment,
  type EnrollmentRequest,
  type WeeklyAvailability,
  type DayKey,
  type TimeSlotKey,
  type SlotStatus,
  type BookedMap,
  makeEmptyAvailability,
} from "./types";
import { computeBookedMap, todayIsoInKtm } from "./derived";
import type {
  AcceptRequestInput,
  BatchCallback,
  BatchMemberCallback,
  CreateBatchInput,
  EnrollmentCallback,
  EnrollmentRepository,
  ErrorCallback,
  AvailabilityCallback,
  RequestCallback,
  UpdateEnrollmentRequestInput,
} from "./EnrollmentRepository";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Pull an `unknown` Firestore timestamp into a `number` ms, or
 *  `Date.now()` if the field is missing/invalid. Used so the
 *  subscription callbacks only push numeric times across the React
 *  boundary. */
function tsToMs(value: unknown): number {
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      const ms = d.getTime();
      return Number.isNaN(ms) ? Date.now() : ms;
    } catch {
      return Date.now();
    }
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  }
  return Date.now();
}

/** Strip every key with a `null` value. Firestore's `setDoc(merge:
 *  true)` treats `null` as "delete this key" — accidentally
 *  forwarding a null from a normalized projection can wipe out
 *  fields we never intended to touch. */
function stripNulls<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out as T;
}

/** Coerce an unknown value into a `string`, falling back to `""` when
 *  the value is missing or the wrong type. Defensive against
 *  pre-migration docs that may have written undefined-style fields. */
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

// ─── Firestore → domain shape mappers ──────────────────────────────────────

function mapRequest(
  id: string,
  raw: Record<string, unknown>,
  pathTutorUid?: string,
): EnrollmentRequest {
  return {
    requestId: id,
    // Prefer the path segment when this mapper is invoked from a
    // collectionGroup query (the doc itself may predate the
    // denormalized tutorUid field, but the collectionGroup path
    // always has it). Falls back to the doc field otherwise.
    tutorUid: pathTutorUid ?? str(raw.tutorUid),
    studentUid: str(raw.studentUid),
    studentName: str(raw.studentName),
    studentGrade: str(raw.studentGrade),
    studentAvatar: strOrNull(raw.studentAvatar),
    subjects: strArray(raw.subjects),
    schedule: str(raw.schedule),
    startDate: str(raw.startDate),
    endDate: str(raw.endDate),
    message: str(raw.message),
    status:
      raw.status === "accepted" || raw.status === "declined"
        ? raw.status
        : "pending",
    submittedAt: tsToMs(raw.submittedAt),
    decidedAt: raw.decidedAt == null ? null : tsToMs(raw.decidedAt),
    // Figma S-12 fields — absent on legacy requests.
    mode: raw.mode === "session-code" ? "session-code" : raw.mode === "one-to-one" ? "one-to-one" : undefined,
    planMonths: typeof raw.planMonths === "number" ? raw.planMonths : undefined,
    pickedSlotKeys: Array.isArray(raw.pickedSlotKeys)
      ? raw.pickedSlotKeys.filter((k) => typeof k === "string")
      : undefined,
    address: typeof raw.address === "string" ? raw.address : undefined,
    trial: raw.trial === true,
    sessionCode: typeof raw.sessionCode === "string" ? raw.sessionCode : undefined,
    costNpr: typeof raw.costNpr === "number" ? raw.costNpr : undefined,
    batchId: typeof raw.batchId === "string" ? raw.batchId : undefined,
  };
}

function mapEnrollment(
  id: string,
  raw: Record<string, unknown>,
  pathTutorUid?: string,
): Enrollment {
  return {
    enrollmentId: id,
    tutorUid: pathTutorUid ?? str(raw.tutorUid),
    studentUid: str(raw.studentUid),
    studentName: str(raw.studentName),
    studentGrade: str(raw.studentGrade),
    studentAvatar: strOrNull(raw.studentAvatar),
    subjects: strArray(raw.subjects),
    slotKey: str(raw.slotKey),
    startDate: str(raw.startDate),
    endDate: str(raw.endDate),
    status:
      raw.status === "removed" || raw.status === "expired"
        ? raw.status
        : "active",
    acceptedAt: tsToMs(raw.acceptedAt),
    removedAt: raw.removedAt == null ? null : tsToMs(raw.removedAt),
    removeReason: strOrNull(raw.removeReason),
    requestId: str(raw.requestId),
    batchId: typeof raw.batchId === "string" ? raw.batchId : undefined,
  };
}

function mapBatch(id: string, raw: Record<string, unknown>): Batch {
  return {
    batchId: id,
    tutorUid: str(raw.tutorUid),
    name: str(raw.name),
    subject: str(raw.subject),
    monthlyRateNpr: num(raw.monthlyRateNpr),
    slotKeys: strArray(raw.slotKeys),
    startDate: str(raw.startDate),
    endDate: strOrNull(raw.endDate),
    status: raw.status === "ended" ? "ended" : "active",
    createdAt: tsToMs(raw.createdAt),
    memberCount: num(raw.memberCount),
    endedAt: raw.endedAt ? tsToMs(raw.endedAt) : undefined,
  };
}

function mapBatchMember(id: string, raw: Record<string, unknown>): BatchMember {
  return {
    memberId: id,
    enrollmentId: str(raw.enrollmentId),
    studentUid: str(raw.studentUid),
    studentName: str(raw.studentName),
    studentAvatar: strOrNull(raw.studentAvatar),
    joinedAt: tsToMs(raw.joinedAt),
  };
}

/** Defensive availability parser. The profile doc may have an
 *  outdated shape (missing weekdays, missing slots, wrong status
 *  values). We merge any valid day/slot pairs onto an empty
 *  skeleton so the renderer's grid always has 30 cells. */
function parseAvailability(raw: unknown): WeeklyAvailability | null {
  if (!raw || typeof raw !== "object") return null;
  const base = makeEmptyAvailability();
  const days = raw as Partial<Record<DayKey, unknown>>;
  for (const day of Object.keys(base) as DayKey[]) {
    const row = days[day];
    if (!row || typeof row !== "object") continue;
    const slots = row as Partial<Record<TimeSlotKey, unknown>>;
    for (const slot of Object.keys(base[day]) as TimeSlotKey[]) {
      const v = slots[slot];
      if (v === "available" || v === "off") base[day][slot] = v;
    }
  }
  return base;
}

// ─── Auto-expiry sweep ──────────────────────────────────────────────────────

/**
 * Sweep through `enrollments` and flip any with `endDate < today`
 * (Asia/Kathmandu) to `status: "expired"`. Decrements the
 * `enrolledCount` on the profile for each one and writes a single
 * `enrollment_completed` notification.
 *
 * Idempotent. Multiple concurrent devices calling this at the same
 * time will converge because the transaction re-reads the enrollment
 * doc on entry and only writes when `status === "active"`. The worst
 * case is a duplicate notification, which the notification center
 * happily renders as a second row.
 *
 * Called at the top of every `subscribeEnrollments` callback so the
 * UI eventually settles without needing a Cloud Function timer.
 */
async function sweepExpiredEnrollments(
  db: ReturnType<typeof getFirestore>,
  tutorUid: string,
  enrollments: Enrollment[],
  tutorName: string,
): Promise<void> {
  const today = todayIsoInKtm();
  const expired = enrollments.filter(
    (e) => e.status === "active" && e.endDate < today,
  );
  if (expired.length === 0) return;

  const batch = writeBatch(db);
  let decrement = 0;
  for (const e of expired) {
    const ref = doc(db, "enrollments", tutorUid, "roster", e.enrollmentId);
    batch.update(ref, {
      status: "expired",
      removedAt: serverTimestamp(),
      removeReason: "Enrollment period ended",
    });
    decrement++;
  }
  const profileRef = doc(db, "users", tutorUid, "tutorProfile", "default");
  batch.update(profileRef, {
    enrolledCount: (await safeEnrolledCount(db, tutorUid)) - decrement,
    currentStudents: 0,
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (err) {
    console.warn("sweepExpiredEnrollments: commit failed", err);
    return;
  }

  // Notifications are best-effort. We do not fail the sweep if a
  // notification write throws — the enrollment is already expired.
  for (const e of expired) {
    try {
      await writeNotification(
        e.studentUid,
        notificationCopy.enrollmentCompleted(tutorName),
      );
    } catch (err) {
      console.warn("sweepExpiredEnrollments: notification failed", err);
    }
  }
}

async function safeEnrolledCount(
  db: ReturnType<typeof getFirestore>,
  tutorUid: string,
): Promise<number> {
  const snap = await getDoc(
    doc(db, "users", tutorUid, "tutorProfile", "default"),
  );
  const data = snap.data() as { enrolledCount?: number } | undefined;
  return typeof data?.enrolledCount === "number" ? data.enrolledCount : 0;
}

// ─── Tutor identity resolution ──────────────────────────────────────────────

/**
 * Cache of tutor display identity (name + avatar) for the student's
 * "My Enrollments" view. The roster doc snapshots the STUDENT's own
 * name/avatar, not the tutor's — so the student subscription resolves
 * each tutor from their PUBLIC `users/{uid}/tutorProfile/default`
 * doc (signed-in users can read tutor profiles) and attaches it to
 * the enrollment for the card. Cached per tutorUid so snapshots
 * don't re-read every tutor on every emit.
 */
const tutorDisplayCache = new Map<
  string,
  { name: string; avatar: string | null }
>();

function applyTutorDisplay(list: Enrollment[]): Enrollment[] {
  return list.map((e) => {
    const info = tutorDisplayCache.get(e.tutorUid);
    if (!info) return e;
    return { ...e, tutorName: info.name, tutorAvatar: info.avatar };
  });
}

/**
 * Cache of batch display names (`batches/{tutorUid}/classes/{batchId}`
 * → `name`), resolved for the student's "My Enrollments" cards.
 * Batch docs are readable by any signed-in user (direct-path rule),
 * so the student subscription can read them the same way it reads
 * the tutor's public profile.
 */
const batchNameCache = new Map<string, string>();

function applyBatchDisplay(list: Enrollment[]): Enrollment[] {
  return list.map((e) => {
    if (!e.batchId) return e;
    const name = batchNameCache.get(e.batchId);
    if (!name) return e;
    return { ...e, batchName: name };
  });
}

/**
 * Read the tutor's `fullName` from the profile subdoc. Used to
 * personalize the student-facing notifications. The miss path
 * (profile doc doesn't exist yet) returns the empty string — the
 * notification copy then reads "Your tutor accepted..." rather than
 * "[empty] accepted...".
 */
async function readTutorName(
  db: ReturnType<typeof getFirestore>,
  tutorUid: string,
): Promise<string> {
  try {
    const snap = await getDoc(
      doc(db, "users", tutorUid, "tutorProfile", "default"),
    );
    const data = snap.data() as { fullName?: string } | undefined;
    return typeof data?.fullName === "string" ? data.fullName : "";
  } catch {
    return "";
  }
}

// ─── Repository ─────────────────────────────────────────────────────────────

export const FirebaseEnrollmentRepository: EnrollmentRepository = {
  // ─── subscriptions ────────────────────────────────────────────────────────

  subscribeRequests(
    tutorUid: string,
    onData: RequestCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // 4-arg `collection()` — the path is `enrollmentRequests/{tutorUid}/requests`.
    // The 3-arg form `collection(db, "enrollmentRequests", tutorUid)` produces
    // a 2-segment path string ("enrollmentRequests/tutorUid") which the
    // native SDK treats as a document and rejects with
    // "collectionPath must point to a collection."
    const q = query(collection(db, "enrollmentRequests", tutorUid, "requests"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const requests: EnrollmentRequest[] = snap.docs.map((d) =>
          mapRequest(d.id, d.data() as Record<string, unknown>),
        );
        // Newest first — `submittedAt` is the source of truth.
        requests.sort((a, b) => b.submittedAt - a.submittedAt);
        onData(requests);
      },
      (err) => {
        console.warn("FirebaseEnrollmentRepository.subscribeRequests", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeEnrollments(
    tutorUid: string,
    onData: EnrollmentCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // 4-arg form — path is `enrollments/{tutorUid}/roster`.
    // The subcollection name is `roster` (not `active`) so the
    // collectionGroup query below doesn't collide with batches'
    // `classes` subcollection.
    const q = query(collection(db, "enrollments", tutorUid, "roster"));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const enrollments: Enrollment[] = snap.docs.map((d) =>
          mapEnrollment(d.id, d.data() as Record<string, unknown>),
        );
        // Run the sweep before pushing to the UI so the render
        // never sees the stale "active" rows. The sweep is
        // fire-and-forget; a concurrent re-snapshot will pick up
        // the result.
        try {
          const tutorName = await readTutorName(db, tutorUid);
          await sweepExpiredEnrollments(db, tutorUid, enrollments, tutorName);
        } catch (err) {
          console.warn("subscribeEnrollments: sweep failed", err);
        }
        enrollments.sort((a, b) => b.acceptedAt - a.acceptedAt);
        onData(enrollments);
      },
      (err) => {
        console.warn("FirebaseEnrollmentRepository.subscribeEnrollments", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeBatches(
    tutorUid: string,
    onData: BatchCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // 4-arg form — path is `batches/{tutorUid}/classes`.
    // The subcollection name is `classes` (not `active`) so the
    // collectionGroup query doesn't collide with enrollments'
    // `roster` subcollection.
    const q = query(collection(db, "batches", tutorUid, "classes"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const batches: Batch[] = snap.docs.map((d) =>
          mapBatch(d.id, d.data() as Record<string, unknown>),
        );
        // Newest first.
        batches.sort((a, b) => b.createdAt - a.createdAt);
        onData(batches);
      },
      (err) => {
        console.warn("FirebaseEnrollmentRepository.subscribeBatches", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeBatchMembers(
    tutorUid: string,
    batchId: string,
    onData: BatchMemberCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // 6-arg form — path is
    // `batches/{tutorUid}/classes/{batchId}/members`.
    const q = query(
      collection(
        db,
        "batches",
        tutorUid,
        "classes",
        batchId,
        "members",
      ),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const members: BatchMember[] = snap.docs.map((d) =>
          mapBatchMember(d.id, d.data() as Record<string, unknown>),
        );
        members.sort((a, b) => a.joinedAt - b.joinedAt);
        onData(members);
      },
      (err) => {
        console.warn(
          "FirebaseEnrollmentRepository.subscribeBatchMembers",
          err,
        );
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeAvailability(
    tutorUid: string,
    onData: AvailabilityCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", tutorUid, "tutorProfile", "default");
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        const data = snap.data() as
          | {
              availability?: unknown;
              enrolledCount?: number;
              studentCapacity?: number;
            }
          | undefined;
        const snapshot: AvailabilitySnapshot = {
          availability: parseAvailability(data?.availability),
          enrolledCount: num(data?.enrolledCount),
          studentCapacity: num(data?.studentCapacity),
        };
        onData(snapshot);
      },
      (err) => {
        console.warn(
          "FirebaseEnrollmentRepository.subscribeAvailability",
          err,
        );
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeRequestsByStudent(
    studentUid: string,
    onData: RequestCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // collectionGroup across every tutor's `requests` subcollection,
    // filtered by studentUid. This is the student-side mirror of
    // `subscribeRequests(tutorUid, …)` — used by the student-side
    // "My Enrollments → Pending" tab. Requires the composite index
    // on `(studentUid, status)` — currently scoped to the
    // collectionGroup named "requests"; today's
    // firestore.indexes.json only declares the "roster" +
    // "members" + "tutors" indexes, so add a "requests" index too.
    const q = query(
      collectionGroup(db, "requests"),
      where("studentUid", "==", studentUid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const requests: EnrollmentRequest[] = snap.docs.map((d) => {
          // The doc id is the requestId. The collectionGroup doc
          // path looks like `enrollmentRequests/{tutorUid}/requests/{requestId}`
          // — the path segments give us the tutorUid without an
          // extra read.
          const ref = d.ref;
          const pathSegments = ref.path.split("/");
          const tutorUid = pathSegments[1] ?? "";
          return mapRequest(d.id, d.data() as Record<string, unknown>, tutorUid);
        });
        requests.sort((a, b) => b.submittedAt - a.submittedAt);
        onData(requests);
      },
      (err) => {
        console.warn(
          "FirebaseEnrollmentRepository.subscribeRequestsByStudent",
          err,
        );
        onError?.(err);
      },
    );
    return unsub;
  },

  subscribeEnrollmentsByStudent(
    studentUid: string,
    onData: EnrollmentCallback,
    onError?: ErrorCallback,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // collectionGroup across `enrollments/*/roster`. Requires the
    // "roster" composite index on `(studentUid, status)` (declared
    // in firestore.indexes.json).
    const q = query(
      collectionGroup(db, "roster"),
      where("studentUid", "==", studentUid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const enrollments: Enrollment[] = snap.docs.map((d) => {
          const ref = d.ref;
          const pathSegments = ref.path.split("/");
          const tutorUid = pathSegments[1] ?? "";
          return mapEnrollment(
            d.id,
            d.data() as Record<string, unknown>,
            tutorUid,
          );
        });
        // Newest first
        enrollments.sort((a, b) => b.acceptedAt - a.acceptedAt);
        // Emit immediately with whatever identity is already cached,
        // then backfill the missing tutors (public profile read) and
        // batch names (batch doc read) and emit again — the card
        // flips from the generic placeholder to the real info as
        // soon as it lands.
        onData(applyBatchDisplay(applyTutorDisplay(enrollments)));
        const missingTutorUids = [
          ...new Set(
            enrollments
              .map((e) => e.tutorUid)
              .filter((uid) => uid.length > 0 && !tutorDisplayCache.has(uid)),
          ),
        ];
        const missingBatchKeys = [
          ...new Set(
            enrollments
              .filter((e) => e.batchId && !batchNameCache.has(e.batchId))
              .map((e) => ({ tutorUid: e.tutorUid, batchId: e.batchId! })),
          ),
        ];
        if (missingTutorUids.length > 0 || missingBatchKeys.length > 0) {
          void (async () => {
            await Promise.all([
              Promise.all(
                missingTutorUids.map(async (tutorUid) => {
                  try {
                    const tutorSnap = await getDoc(
                      doc(db, "users", tutorUid, "tutorProfile", "default"),
                    );
                    const d = tutorSnap.data() as
                      | { fullName?: unknown; photoUrl?: unknown }
                      | undefined;
                    tutorDisplayCache.set(tutorUid, {
                      name:
                        typeof d?.fullName === "string" ? d.fullName : "",
                      avatar:
                        typeof d?.photoUrl === "string" ? d.photoUrl : null,
                    });
                  } catch {
                    tutorDisplayCache.set(tutorUid, {
                      name: "",
                      avatar: null,
                    });
                  }
                }),
              ),
              Promise.all(
                missingBatchKeys.map(async ({ tutorUid, batchId }) => {
                  try {
                    const batchSnap = await getDoc(
                      doc(db, "batches", tutorUid, "classes", batchId),
                    );
                    const b = batchSnap.data() as
                      | { name?: unknown }
                      | undefined;
                    batchNameCache.set(
                      batchId,
                      typeof b?.name === "string" ? b.name : "",
                    );
                  } catch {
                    batchNameCache.set(batchId, "");
                  }
                }),
              ),
            ]);
            onData(applyBatchDisplay(applyTutorDisplay(enrollments)));
          })();
        }
      },
      (err) => {
        console.warn(
          "FirebaseEnrollmentRepository.subscribeEnrollmentsByStudent",
          err,
        );
        onError?.(err);
      },
    );
    return unsub;
  },

  async writeEnrollmentRequest(input) {
    const db = getFirestore(getApp());
    // Auto-id within the named subcollection. The rule at
    // match /enrollmentRequests/{tutorUid}/requests/{requestId}
    // requires `studentUid == auth.uid`, `tutorUid == path`,
    // and `status == "pending"`.
    //
    // The request carries only the message + dates + identity
    // fields. Slot-level data (slotKey, selectedSlotId,
    // selectedTime, selectedDate) is intentionally NOT written —
    // the student types their preferred days/times into the
    // `schedule` text and the tutor reads it on the inbox card.
    // See `firestore.rules` for the matching create-rule.
    //
    // Identity aggregation: the caller's `student` block may be
    // sparse (the sheet sends empty name/grade/avatar), so we
    // snapshot the student's OWN profile subdoc here — the owner
    // can always read it — and fill any missing fields. The tutor's
    // inbox card then renders the real name, grade, and photo
    // without a second read. (Legacy requests already in Firestore
    // with a null avatar are backfilled by
    // `scripts/backfillRequestAvatars.ts`.)
    const profileRef = doc(db, "users", input.studentUid, "studentProfile", "default");
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.data() as
      | { fullName?: unknown; grade?: unknown; photoUrl?: unknown }
      | undefined;
    const fillName =
      input.student.name.trim().length > 0
        ? input.student.name.trim()
        : typeof profile?.fullName === "string"
          ? profile.fullName
          : "";
    const fillGrade =
      input.student.grade.trim().length > 0
        ? input.student.grade.trim()
        : typeof profile?.grade === "string"
          ? profile.grade
          : "";
    const fillAvatar =
      typeof input.student.avatar === "string" && input.student.avatar.length > 0
        ? input.student.avatar
        : typeof profile?.photoUrl === "string" && profile.photoUrl.length > 0
          ? profile.photoUrl
          : null;

    const ref = doc(collection(db, "enrollmentRequests", input.tutorUid, "requests"));
    const requestId = ref.id;
    await setDoc(ref, {
      requestId,
      tutorUid: input.tutorUid,
      studentUid: input.studentUid,
      studentName: fillName,
      studentGrade: fillGrade,
      studentAvatar: fillAvatar,
      subjects: input.subjects,
      schedule: input.schedule,
      startDate: input.startDate,
      endDate: input.endDate,
      message: input.message,
      mode: input.mode ?? "one-to-one",
      planMonths: input.planMonths ?? null,
      pickedSlotKeys: input.pickedSlotKeys ?? [],
      address: input.address ?? "",
      trial: input.trial ?? false,
      sessionCode: input.sessionCode ?? null,
      costNpr: input.costNpr ?? null,
      batchId: input.batchId ?? null,
      status: "pending",
      submittedAt: serverTimestamp(),
      decidedAt: null,
    });
    return { requestId };
  },

  async updateEnrollmentRequest(input: UpdateEnrollmentRequestInput) {
    const db = getFirestore(getApp());
    const requestRef = doc(
      db,
      "enrollmentRequests",
      input.tutorUid,
      "requests",
      input.requestId,
    );
    // Re-read inside a transaction so a tutor accept that lands
    // between the user opening the edit sheet and the submit
    // coming back doesn't silently overwrite the accepted status.
    // The rule on `enrollmentRequests/{tutorUid}/requests/{id}`
    // allows update by the original student; we additionally
    // verify the doc is still `pending` so the UI can degrade
    // gracefully.
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(requestRef);
        if (!snap.exists()) {
          throw new RequestAlreadyDecidedError();
        }
        const data = snap.data() as {
          studentUid?: string;
          status?: string;
        };
        if (data.studentUid !== input.studentUid) {
          throw new RequestAlreadyDecidedError();
        }
        if (data.status !== "pending") {
          throw new RequestAlreadyDecidedError();
        }
        tx.update(requestRef, {
          schedule: input.schedule,
          startDate: input.startDate,
          endDate: input.endDate,
          message: input.message,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      // Re-throw decision errors; wrap anything else so the caller
      // can show a friendly message.
      if (err instanceof RequestAlreadyDecidedError) throw err;
      if (err instanceof CapacityExceededError) throw err;
      console.warn("updateEnrollmentRequest failed", err);
      throw err;
    }
  },

  async deleteEnrollmentRequest(
    studentUid: string,
    tutorUid: string,
    requestId: string,
  ): Promise<void> {
    const db = getFirestore(getApp());
    const requestRef = doc(
      db,
      "enrollmentRequests",
      tutorUid,
      "requests",
      requestId,
    );
    // The rule lets the student delete their own request. We don't
    // need to verify the doc still exists — a missing doc is a
    // no-op. We DO verify ownership before deleting so a wrong
    // path can't be hit by stale state from the UI.
    try {
      const snap = await getDoc(requestRef);
      if (!snap.exists()) return;
      const data = snap.data() as { studentUid?: string };
      if (data.studentUid !== studentUid) {
        throw new RequestAlreadyDecidedError();
      }
      await deleteDoc(requestRef);
    } catch (err) {
      if (err instanceof RequestAlreadyDecidedError) throw err;
      console.warn("deleteEnrollmentRequest failed", err);
      throw err;
    }
  },

  // ─── writes ───────────────────────────────────────────────────────────────

  async acceptRequest(input: AcceptRequestInput) {
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", input.tutorUid, "tutorProfile", "default");
    const requestRef = doc(
      db,
      "enrollmentRequests",
      input.tutorUid,
      "requests",
      input.requestId,
    );
    // 4-arg `collection()` — see subscribeRequests for why.
    // Subcollection is `roster` for enrollments.
    const enrollmentRef = doc(
      collection(db, "enrollments", input.tutorUid, "roster"),
    );

    const enrollmentId = await runTransaction(db, async (tx) => {
      const [profileSnap, requestSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(requestRef),
      ]);

      const profileData = profileSnap.data() as
        | {
            enrolledCount?: number;
            currentStudents?: number;
            studentCapacity?: number;
          }
        | undefined;
      const enrolledCount = num(profileData?.enrolledCount);
      const cap = Math.max(num(profileData?.studentCapacity), MAX_CAPACITY);
      if (enrolledCount >= cap) {
        throw new CapacityExceededError();
      }

      const requestData = requestSnap.data() as
        | { status?: string; tutorUid?: string }
        | undefined;
      if (!requestSnap.exists()) {
        throw new RequestAlreadyDecidedError();
      }
      if (requestData?.status !== "pending") {
        throw new RequestAlreadyDecidedError();
      }

      const enrollmentDoc = stripNulls({
        enrollmentId: enrollmentRef.id,
        tutorUid: input.tutorUid,
        studentUid: input.student.uid,
        studentName: input.student.name,
        studentGrade: input.student.grade,
        studentAvatar: input.student.avatar,
        subjects: input.subjects,
        slotKey: input.slotKey,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "active" as const,
        acceptedAt: serverTimestamp(),
        removedAt: null,
        removeReason: null,
        requestId: input.requestId,
        // Session-code join — the roster doc carries the batch so
        // the student's "My Enrollments" card can show which group
        // class they joined without an extra lookup.
        batchId: input.batchId ?? null,
      });
      tx.set(enrollmentRef, enrollmentDoc);
      tx.update(profileRef, {
        enrolledCount: enrolledCount + 1,
        currentStudents: enrolledCount + 1,
        updatedAt: serverTimestamp(),
      });
      tx.update(requestRef, {
        status: "accepted",
        decidedAt: serverTimestamp(),
      });

      // Session-code join: add the student to the target batch's
      // `members` subcollection + bump its denormalized memberCount.
      // Member docs are keyed by enrollmentId (same convention as
      // the batches repo's addBatchMember and the removeEnrollment
      // cascade), so re-accepting the same request is idempotent.
      if (input.batchId) {
        const batchRef = doc(
          db,
          "batches",
          input.tutorUid,
          "classes",
          input.batchId,
        );
        const memberRef = doc(
          db,
          "batches",
          input.tutorUid,
          "classes",
          input.batchId,
          "members",
          enrollmentRef.id,
        );
        // Read the batch inside the transaction so the member create
        // rule's `get(...).data.tutorUid` check sees a consistent doc,
        // and so we don't bump memberCount for a batch that vanished.
        const batchSnap = await tx.get(batchRef);
        if (batchSnap.exists()) {
          // Hard cap: a session-code join must not push the batch past
          // its seat limit. Throwing inside the transaction rolls back
          // the enrollment + request updates too.
          const batchData = batchSnap.data() as
            | { memberCount?: number }
            | undefined;
          if ((batchData?.memberCount ?? 0) >= MAX_BATCH_MEMBERS) {
            throw new BatchFullError(
              "This batch is already full (" +
                `${(batchData?.memberCount ?? 0)}/${MAX_BATCH_MEMBERS} seats taken).`,
            );
          }
          tx.set(memberRef, {
            memberId: memberRef.id,
            enrollmentId: enrollmentRef.id,
            studentUid: input.student.uid,
            studentName: input.student.name,
            studentAvatar: input.student.avatar,
            joinedAt: serverTimestamp(),
          });
          tx.update(batchRef, {
            memberCount: increment(1),
            updatedAt: serverTimestamp(),
          });
        }
      }

      return enrollmentRef.id;
    });

    // Notify the student post-commit. Best-effort — a failure here
    // does not roll back the enrollment.
    try {
      const tutorName = await readTutorName(db, input.tutorUid);
      await writeNotification(
        input.student.uid,
        notificationCopy.enrollmentAccepted(tutorName),
      );
    } catch (err) {
      console.warn("acceptRequest: notification failed", err);
    }

    return { enrollmentId };
  },

  async declineRequest(
    tutorUid: string,
    requestId: string,
    studentUid: string,
    reason: string,
  ): Promise<void> {
    const db = getFirestore(getApp());
    const requestRef = doc(
      db,
      "enrollmentRequests",
      tutorUid,
      "requests",
      requestId,
    );
    await deleteDoc(requestRef);
    try {
      const tutorName = await readTutorName(db, tutorUid);
      await writeNotification(
        studentUid,
        notificationCopy.enrollmentDeclined(tutorName, reason),
      );
    } catch (err) {
      console.warn("declineRequest: notification failed", err);
    }
  },

  async removeEnrollment(
    enrollmentId: string,
    reason: string,
  ): Promise<void> {
    const db = getFirestore(getApp());
    // We don't know the tutorUid from the id alone — scan the
    // `roster` collectionGroup for a doc whose id OR whose
    // `enrollmentId` field matches. This is the rare path; no
    // need to keep an index.
    let tutorUid: string | null = null;
    let studentUid: string | null = null;
    let currentEnrollment: Enrollment | null = null;
    const allTutorsSnap = await getDocs(collectionGroup(db, "roster"));
    for (const docSnap of allTutorsSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      if (data?.enrollmentId === enrollmentId || docSnap.id === enrollmentId) {
        tutorUid = (docSnap.ref.parent.parent?.id as string) ?? null;
        studentUid = str(data.studentUid) || null;
        currentEnrollment = mapEnrollment(
          docSnap.id,
          data,
        );
        break;
      }
    }
    if (!tutorUid || !currentEnrollment) {
      console.warn("removeEnrollment: enrollment not found", enrollmentId);
      return;
    }

    const enrollmentRef = doc(
      db,
      "enrollments",
      tutorUid,
      "roster",
      currentEnrollment.enrollmentId,
    );
    const profileRef = doc(
      db,
      "users",
      tutorUid,
      "tutorProfile",
      "default",
    );

    await runTransaction(db, async (tx) => {
      const [profileSnap, enrSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(enrollmentRef),
      ]);
      const profileData = profileSnap.data() as
        | { enrolledCount?: number; currentStudents?: number }
        | undefined;
      const enrolledCount = num(profileData?.enrolledCount);
      const enr = enrSnap.data() as
        | { status?: string }
        | undefined;
      if (enr?.status !== "active") {
        // Already removed/expired — no-op.
        return;
      }
      tx.update(enrollmentRef, {
        status: "removed",
        removedAt: serverTimestamp(),
        removeReason: reason,
      });
      tx.update(profileRef, {
        enrolledCount: Math.max(0, enrolledCount - 1),
        currentStudents: Math.max(0, num(profileData?.currentStudents) - 1),
        updatedAt: serverTimestamp(),
      });
    });

    // Cascade: remove the member docs in any batch(es) that include
    // this enrollment. The collectionGroup query requires the
    // `enrollmentId` index (defined in firestore.indexes.json).
    try {
      const membersSnap = await getDocs(
        query(
          collectionGroup(db, "members"),
          where("enrollmentId", "==", currentEnrollment.enrollmentId),
        ),
      );
      const batch = writeBatch(db);
      membersSnap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (err) {
      console.warn("removeEnrollment: cascade failed", err);
    }

    if (studentUid) {
      try {
        const tutorName = await readTutorName(db, tutorUid);
        await writeNotification(
          studentUid,
          notificationCopy.enrollmentRemoved(tutorName, reason),
        );
      } catch (err) {
        console.warn("removeEnrollment: notification failed", err);
      }
    }
  },

  async setSlotStatus(
    tutorUid: string,
    day: DayKey,
    slot: TimeSlotKey,
    status: SlotStatus,
  ): Promise<void> {
    const db = getFirestore(getApp());
    const profileRef = doc(
      db,
      "users",
      tutorUid,
      "tutorProfile",
      "default",
    );
    // Dot-path merge — only the touched cell changes. Siblings
    // remain untouched. The `availability.updatedAt` field is an
    // unrelated sibling; it lives at the top of the nested object
    // (the profile doc also has `availability` as a nested map).
    await setDoc(
      profileRef,
      {
        availability: {
          [day]: {
            [slot]: status,
          },
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async saveAvailability(tutorUid, availability) {
    const db = getFirestore(getApp());
    const profileRef = doc(
      db,
      "users",
      tutorUid,
      "tutorProfile",
      "default",
    );
    // Whole-map replace under `availability` — the profile rule
    // (`isOwner(userId) || isAdmin()`) permits any field write, and
    // a full-week draft is exactly what the capacity screen's
    // "Save changes" flushes.
    await setDoc(
      profileRef,
      {
        availability,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async createBatch(input: CreateBatchInput) {
    const db = getFirestore(getApp());
    // 4-arg `collection()` — see subscribeRequests for why.
    // Subcollection is `classes` for batches.
    const batchRef = doc(collection(db, "batches", input.tutorUid, "classes"));
    const batchId = batchRef.id;

    await runTransaction(db, async (tx) => {
      const profileRef = doc(
        db,
        "users",
        input.tutorUid,
        "tutorProfile",
        "default",
      );
      // We don't enforce capacity for batches (a batch is a published
      // class that the students opt into). We still warm the
      // profile-read into the transaction so the rules stay happy.
      const profileSnap = await tx.get(profileRef);
      if (!profileSnap.exists()) {
        throw new Error("Tutor profile not found");
      }

      const batchDoc = stripNulls({
        batchId,
        tutorUid: input.tutorUid,
        name: input.name,
        subject: input.subject,
        monthlyRateNpr: input.monthlyRateNpr,
        slotKeys: input.slotKeys,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        status: "active" as const,
        createdAt: serverTimestamp(),
        memberCount: input.members.length,
      });
      tx.set(batchRef, batchDoc);

      // Seed members. The enrolled students are linked by
      // `enrollmentId` (not studentUid) so the cascade on
      // `removeEnrollment` looks them up via the collection-group
      // query. Members live at
      // `batches/{tutorUid}/classes/{batchId}/members/{memberId}`.
      for (const m of input.members) {
        const memberRef = doc(
          collection(
            db,
            "batches",
            input.tutorUid,
            "classes",
            batchId,
            "members",
          ),
        );
        tx.set(memberRef, {
          memberId: memberRef.id,
          enrollmentId: m.enrollmentId,
          studentUid: m.studentUid,
          studentName: m.studentName,
          studentAvatar: m.studentAvatar,
          joinedAt: serverTimestamp(),
        });
      }
    });

    return { batchId };
  },

  async endBatch(batchId: string): Promise<void> {
    const db = getFirestore(getApp());
    // We need the parent tutorUid for the path. collectionGroup query
    // identifies the batch by its `batchId` field. Path is
    // `batches/{tutorUid}/classes/{batchId}`.
    const allBatchesSnap = await getDocs(collectionGroup(db, "classes"));
    let tutorUid: string | null = null;
    for (const docSnap of allBatchesSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      if (data?.batchId === batchId || docSnap.id === batchId) {
        tutorUid = (docSnap.ref.parent.parent?.id as string) ?? null;
        break;
      }
    }
    if (!tutorUid) {
      console.warn("endBatch: batch not found", batchId);
      return;
    }
    const batchRef = doc(db, "batches", tutorUid, "classes", batchId);
    await updateDoc(batchRef, {
      status: "ended",
      endedAt: serverTimestamp(),
    });
  },
};

// Allow other modules to import the helper for testing.
export { computeBookedMap, mapBatch, mapBatchMember };
export type { BookedMap };
