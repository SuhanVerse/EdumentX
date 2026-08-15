/**
 * EdumentX — Mock Enrollment Repository
 *
 * In-memory implementation of `EnrollmentRepository` for offline dev
 * and demos. Mirrors the shape of `FirebaseEnrollmentRepository`
 * exactly so the two are drop-in interchangeable from the consumer's
 * perspective.
 *
 * Uses a tiny `EventEmitter` to push snapshots on every mutation.
 * Subscribers reattach to the same emitter and receive the latest
 * array on every change. The data is per-tutor (keyed by uid) so
 * two tutors in the same session never see each other's data.
 *
 * Seed data per tutor (only when the in-memory store is empty):
 *   - 3 enrollment requests (varied status: 2 pending, 1 historically
 *     accepted).
 *   - 2 active enrollments (1 ordinary, 1 already past `endDate` to
 *     trigger the auto-expiry sweep on first render).
 *   - 1 active batch with 2 members.
 *   - 4 available slots, 1 booked (already via the first enrollment),
 *     25 off.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import {
  BatchFullError,
  CapacityExceededError,
  MAX_BATCH_MEMBERS,
  MAX_CAPACITY,
  RequestAlreadyDecidedError,
  makeEmptyAvailability,
  parseSlotKey,
  slotKey as buildSlotKey,
  type AvailabilitySnapshot,
  type Batch,
  type BatchMember,
  type Enrollment,
  type EnrollmentRequest,
  type WeeklyAvailability,
  type DayKey,
  type TimeSlotKey,
  type SlotStatus,
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
} from "./EnrollmentRepository";

// ─── Event-emitter store ──────────────────────────────────────────────────

type AnyCallback = (payload: unknown) => void;

class Emitter {
  private listeners = new Map<string, Set<AnyCallback>>();

  on<T>(key: string, cb: (payload: T) => void): Unsubscribe {
    const set = this.listeners.get(key) ?? new Set<AnyCallback>();
    set.add(cb as AnyCallback);
    this.listeners.set(key, set);
    return () => {
      set.delete(cb as AnyCallback);
    };
  }

  emit<T>(key: string, payload: T) {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        console.warn("MockEnrollmentRepository: listener failed", err);
      }
    }
  }
}

type Store = {
  requests: EnrollmentRequest[];
  enrollments: Enrollment[];
  batches: Batch[];
  members: Record<string, BatchMember[]>;
  availability: WeeklyAvailability;
  enrolledCount: number;
  studentCapacity: number;
  emitter: Emitter;
  seeded: boolean;
};

const STORE = new Map<string, Store>();

/**
 * Per-student aggregate — Phase 6. Mirrors every `Store`'s
 * `requests` and `enrollments` fields so the student-side
 * "My Enrollments" surface can subscribe to a single stream
 * regardless of how many tutors the student is engaged with.
 *
 * Each `writeEnrollmentRequest` call writes through to the matching
 * tutor's `Store` AND this student aggregate. In dev/test, both
 * streams re-emit so a phase 5 (tutor) subscriber AND a phase 6
 * (student) subscriber see the change consistently.
 */
type StudentStore = {
  studentUid: string;
  requests: EnrollmentRequest[];
  enrollments: Enrollment[];
  emitter: Emitter;
};

const STUDENT_STORES = new Map<string, StudentStore>();

function createStudentStore(studentUid: string): StudentStore {
  const s: StudentStore = {
    studentUid,
    requests: [],
    enrollments: [],
    emitter: new Emitter(),
  };
  STUDENT_STORES.set(studentUid, s);
  return s;
}

function emitRequestsForStudent(s: StudentStore) {
  // Newest first
  const list = [...s.requests].sort((a, b) => b.submittedAt - a.submittedAt);
  s.emitter.emit("requestsByStudent", list);
}

function emitEnrollmentsForStudent(s: StudentStore) {
  // Newest first
  const list = [...s.enrollments].sort((a, b) => b.acceptedAt - a.acceptedAt);
  s.emitter.emit("enrollmentsByStudent", list);
}

function getStore(tutorUid: string): Store {
  let s = STORE.get(tutorUid);
  if (!s) {
    s = {
      requests: [],
      enrollments: [],
      batches: [],
      members: {},
      availability: makeEmptyAvailability(),
      enrolledCount: 0,
      studentCapacity: MAX_CAPACITY,
      emitter: new Emitter(),
      seeded: false,
    };
    STORE.set(tutorUid, s);
  }
  if (!s.seeded) {
    seed(s);
    s.seeded = true;
  }
  return s;
}

function seed(s: Store) {
  // 4 available slots, 1 booked off; rest off.
  s.availability = makeEmptyAvailability();
  s.availability.mon["5-7"] = "available";
  s.availability.mon["3-5"] = "available";
  s.availability.wed["5-7"] = "available";
  s.availability.fri["9-12"] = "available";
  s.studentCapacity = MAX_CAPACITY;

  // 3 requests — 2 pending, 1 already accepted (historical). The
  //  request no longer carries slot-level data (the student types
  //  their preferred days/times into `schedule` and `message`); the
  //  inbox card surfaces that text directly.
  s.requests = [
    {
      requestId: "req-1",
      tutorUid: "tutor-self",
      studentUid: "stu-1",
      studentName: "Aarav Tamang",
      studentGrade: "Grade 10",
      studentAvatar: "https://i.pravatar.cc/100?img=68",
      subjects: ["Mathematics"],
      schedule: "Mon · Wed · Fri 5–7 PM",
      startDate: todayIsoInKtm(),
      endDate: "2026-12-31",
      message: "Hoping to start next week. Need help with quadratic equations.",
      status: "pending",
      submittedAt: Date.now() - 5 * 60_000,
      decidedAt: null,
    },
    {
      requestId: "req-2",
      tutorUid: "tutor-self",
      studentUid: "stu-2",
      studentName: "Priya Maharjan",
      studentGrade: "Grade 11 (Science)",
      studentAvatar: "https://i.pravatar.cc/100?img=47",
      subjects: ["Physics", "Chemistry"],
      schedule: "Tue · Thu 5–7 PM",
      startDate: todayIsoInKtm(),
      endDate: "2026-12-31",
      message: "Looking for help with mechanics and organic chemistry basics.",
      status: "pending",
      submittedAt: Date.now() - 60 * 60_000,
      decidedAt: null,
    },
    {
      requestId: "req-3",
      tutorUid: "tutor-self",
      studentUid: "stu-3",
      studentName: "Sanjay Pandey",
      studentGrade: "Grade 9",
      studentAvatar: null,
      subjects: ["Mathematics"],
      schedule: "Flexible — weekday evenings",
      startDate: "2026-08-01",
      endDate: "2026-12-31",
      message: "Need general support to catch up on the syllabus.",
      status: "accepted",
      submittedAt: Date.now() - 24 * 60 * 60_000,
      decidedAt: Date.now() - 23 * 60 * 60_000,
    },
  ];

  // 2 active enrollments — one normal, one already past endDate so the
  // sweep exercises immediately.
  s.enrollments = [
    {
      enrollmentId: "enr-1",
      tutorUid: "tutor-self",
      studentUid: "stu-3",
      studentName: "Sanjay Pandey",
      studentGrade: "Grade 9",
      studentAvatar: null,
      subjects: ["Mathematics"],
      slotKey: "fri:9-12",
      startDate: "2026-08-01",
      endDate: "2026-12-31",
      status: "active",
      acceptedAt: Date.now() - 23 * 60 * 60_000,
      removedAt: null,
      removeReason: null,
      requestId: "req-3",
    },
    {
      enrollmentId: "enr-2",
      tutorUid: "tutor-self",
      studentUid: "stu-4",
      studentName: "Sita Karki",
      studentGrade: "Grade 9",
      studentAvatar: "https://i.pravatar.cc/100?img=12",
      subjects: ["Mathematics", "Physics"],
      slotKey: "mon:3-5",
      startDate: "2026-07-01",
      endDate: "2026-07-15", // already past → expired
      status: "active",
      acceptedAt: Date.now() - 30 * 24 * 60 * 60_000,
      removedAt: null,
      removeReason: null,
      requestId: "req-old",
    },
  ];
  s.enrolledCount = s.enrollments.filter((e) => e.status === "active").length;

  // 1 active batch with 2 members.
  s.batches = [
    {
      batchId: "batch-1",
      tutorUid: "tutor-self",
      name: "Grade 10 Maths Batch A",
      subject: "Mathematics",
      monthlyRateNpr: 2200,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      status: "active",
      createdAt: Date.now() - 7 * 24 * 60 * 60_000,
      // Mirrors the Firebase doc — 2 seeded members below.
      memberCount: 2,
    },
  ];
  s.members["batch-1"] = [
    {
      memberId: "mem-1",
      enrollmentId: "enr-1",
      studentUid: "stu-3",
      studentName: "Sanjay Pandey",
      studentAvatar: null,
      joinedAt: Date.now() - 7 * 24 * 60 * 60_000,
    },
    {
      memberId: "mem-2",
      enrollmentId: "enr-2",
      studentUid: "stu-4",
      studentName: "Sita Karki",
      studentAvatar: "https://i.pravatar.cc/100?img=12",
      joinedAt: Date.now() - 7 * 24 * 60 * 60_000,
    },
  ];
}

// ─── Subscription helpers ─────────────────────────────────────────────────

function emitRequests(s: Store) {
  const copy = [...s.requests].sort((a, b) => b.submittedAt - a.submittedAt);
  s.emitter.emit("requests", copy);
}

function emitEnrollments(s: Store) {
  const copy = [...s.enrollments].sort((a, b) => b.acceptedAt - a.acceptedAt);
  s.emitter.emit("enrollments", copy);
}

function emitBatches(s: Store) {
  const copy = [...s.batches].sort((a, b) => b.createdAt - a.createdAt);
  s.emitter.emit("batches", copy);
}

function emitAvailability(s: Store) {
  const snapshot: AvailabilitySnapshot = {
    availability: s.availability,
    enrolledCount: s.enrolledCount,
    studentCapacity: s.studentCapacity,
  };
  s.emitter.emit("availability", snapshot);
}

// ─── Repository ─────────────────────────────────────────────────────────────

export const MockEnrollmentRepository: EnrollmentRepository = {
  subscribeRequests(
    tutorUid: string,
    onData: RequestCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    const s = getStore(tutorUid);
    // Register FIRST, then emit — the synchronous emit delivers the
    // current state to the fresh subscriber. The emitter has no
    // replay, so emit-before-register dropped the initial data.
    const unsub = s.emitter.on<EnrollmentRequest[]>("requests", onData);
    emitRequests(s);
    return unsub;
  },

  subscribeEnrollments(
    tutorUid: string,
    onData: EnrollmentCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    const s = getStore(tutorUid);
    // Run the sweep first so the seed data with the past `endDate`
    // exercises immediately.
    const today = todayIsoInKtm();
    s.enrollments = s.enrollments.map((e) =>
      e.status === "active" && e.endDate < today
        ? { ...e, status: "expired", removedAt: Date.now() }
        : e,
    );
    s.enrolledCount = s.enrollments.filter((e) => e.status === "active").length;
    // Register FIRST so the synchronous emits below deliver the
    // current enrollments (and wake availability listeners) to the
    // fresh subscriber.
    const unsub = s.emitter.on<Enrollment[]>("enrollments", onData);
    emitEnrollments(s);
    emitAvailability(s);
    return unsub;
  },

  subscribeBatches(
    tutorUid: string,
    onData: BatchCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    const s = getStore(tutorUid);
    const unsub = s.emitter.on<Batch[]>("batches", onData);
    emitBatches(s);
    return unsub;
  },

  subscribeBatchMembers(
    tutorUid: string,
    batchId: string,
    onData: BatchMemberCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    const s = getStore(tutorUid);
    const initial = [...(s.members[batchId] ?? [])].sort(
      (a, b) => a.joinedAt - b.joinedAt,
    );
    onData(initial);
    return s.emitter.on<{ batchId: string; members: BatchMember[] }>(
      "members",
      (p) => {
        if (p.batchId === batchId) onData(p.members);
      },
    );
  },

  subscribeAvailability(
    tutorUid: string,
    onData: AvailabilityCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    const s = getStore(tutorUid);
    const unsub = s.emitter.on<AvailabilitySnapshot>("availability", onData);
    emitAvailability(s);
    return unsub;
  },

  subscribeRequestsByStudent(
    studentUid: string,
    onData: RequestCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    // Aggregate from every store keyed by studentUid. In mock
    // mode the stores are seeded lazily on demand.
    const all = STUDENT_STORES.get(studentUid) ?? createStudentStore(studentUid);
    const unsub = all.emitter.on<EnrollmentRequest[]>(
      "requestsByStudent",
      onData,
    );
    emitRequestsForStudent(all);
    return unsub;
  },

  subscribeEnrollmentsByStudent(
    studentUid: string,
    onData: EnrollmentCallback,
    _onError?: ErrorCallback,
  ): Unsubscribe {
    const all = STUDENT_STORES.get(studentUid) ?? createStudentStore(studentUid);
    // Enrich with batch display names — mirror of the Firebase repo's
    // batchName resolution. Looks up the tutor's store for the batch
    // doc so the card can show which group class the student joined.
    const enrich = (list: Enrollment[]) => {
      const enriched = list.map((e) => {
        if (!e.batchId) return e;
        const tutorStore = STORE.get(e.tutorUid);
        const batch = tutorStore?.batches.find((b) => b.batchId === e.batchId);
        if (!batch) return e;
        return { ...e, batchName: batch.name };
      });
      onData(enriched);
    };
    const unsub = all.emitter.on<Enrollment[]>("enrollmentsByStudent", (list) => {
      enrich(list);
    });
    // Emit AFTER registering so the fresh subscriber receives the
    // current (enriched) list immediately.
    emitEnrollmentsForStudent(all);
    return unsub;
  },

  async writeEnrollmentRequest(input) {
    const all = STUDENT_STORES.get(input.studentUid) ?? createStudentStore(input.studentUid);
    const request: EnrollmentRequest = {
      requestId: `req-mock-${Date.now()}`,
      tutorUid: input.tutorUid,
      studentUid: input.studentUid,
      studentName: input.student.name,
      studentGrade: input.student.grade,
      studentAvatar: input.student.avatar,
      subjects: input.subjects,
      schedule: input.schedule,
      startDate: input.startDate,
      endDate: input.endDate,
      message: input.message,
      mode: input.mode ?? "one-to-one",
      planMonths: input.planMonths,
      pickedSlotKeys: input.pickedSlotKeys ?? [],
      address: input.address ?? "",
      trial: input.trial ?? false,
      sessionCode: input.sessionCode,
      costNpr: input.costNpr,
      batchId: input.batchId,
      status: "pending",
      submittedAt: Date.now(),
      decidedAt: null,
    };
    all.requests.push(request);
    emitRequestsForStudent(all);
    return { requestId: request.requestId };
  },

  async updateEnrollmentRequest(input) {
    const s = getStore(input.tutorUid);
    const idx = s.requests.findIndex((r) => r.requestId === input.requestId);
    if (idx === -1) {
      throw new RequestAlreadyDecidedError();
    }
    const existing = s.requests[idx];
    if (existing.studentUid !== input.studentUid) {
      // Refuse to mutate someone else's request from the mock.
      throw new Error("Not authorized to update this request.");
    }
    if (existing.status !== "pending") {
      throw new RequestAlreadyDecidedError();
    }
    const updated: EnrollmentRequest = {
      ...existing,
      schedule: input.schedule,
      startDate: input.startDate,
      endDate: input.endDate,
      message: input.message,
    };
    s.requests = s.requests.map((r) =>
      r.requestId === input.requestId ? updated : r,
    );
    emitRequests(s);

    // Mirror to the student store so the Pending tab re-renders.
    const studentStore =
      STUDENT_STORES.get(input.studentUid) ?? createStudentStore(input.studentUid);
    studentStore.requests = studentStore.requests.map((r) =>
      r.requestId === input.requestId ? updated : r,
    );
    emitRequestsForStudent(studentStore);
  },

  async deleteEnrollmentRequest(
    studentUid: string,
    tutorUid: string,
    requestId: string,
  ): Promise<void> {
    const s = getStore(tutorUid);
    const before = s.requests.length;
    s.requests = s.requests.filter((r) => r.requestId !== requestId);
    if (s.requests.length !== before) {
      emitRequests(s);
    }

    // Mirror to the student store.
    const studentStore =
      STUDENT_STORES.get(studentUid) ?? createStudentStore(studentUid);
    const beforeStudent = studentStore.requests.length;
    studentStore.requests = studentStore.requests.filter(
      (r) => r.requestId !== requestId,
    );
    if (studentStore.requests.length !== beforeStudent) {
      emitRequestsForStudent(studentStore);
    }
  },

  async acceptRequest(input: AcceptRequestInput) {
    const s = getStore(input.tutorUid);
    const cap = Math.max(s.studentCapacity, MAX_CAPACITY);
    if (s.enrolledCount >= cap) throw new CapacityExceededError();

    // Hard cap mirror — checked BEFORE any state mutates so the
    // failure is atomic like the Firebase transaction (which rolls
    // back enrollment + request on a full batch).
    if (input.batchId && (s.members[input.batchId] ?? []).length >= MAX_BATCH_MEMBERS) {
      throw new BatchFullError();
    }

    const request = s.requests.find((r) => r.requestId === input.requestId);
    if (!request || request.status !== "pending") {
      throw new RequestAlreadyDecidedError();
    }

    const enrollmentId = `enr-${Date.now()}`;
    const newEnrollment: Enrollment = {
      enrollmentId,
      tutorUid: input.tutorUid,
      studentUid: input.student.uid,
      studentName: input.student.name,
      studentGrade: input.student.grade,
      studentAvatar: input.student.avatar,
      subjects: input.subjects,
      slotKey: input.slotKey,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "active",
      acceptedAt: Date.now(),
      removedAt: null,
      removeReason: null,
      requestId: input.requestId,
      batchId: input.batchId,
    };
    s.enrollments = [...s.enrollments, newEnrollment];
    s.enrolledCount = s.enrollments.filter((e) => e.status === "active").length;
    s.requests = s.requests.map((r) =>
      r.requestId === input.requestId
        ? { ...r, status: "accepted", decidedAt: Date.now() }
        : r,
    );

    // Session-code join: mirror the member-add into the target
    // batch (same convention as the Firebase repo — keyed by
    // enrollmentId, idempotent per enrollment).
    if (input.batchId) {
      const existing = s.members[input.batchId] ?? [];
      if (!existing.some((m) => m.enrollmentId === enrollmentId)) {
        s.members[input.batchId] = [
          ...existing,
          {
            memberId: enrollmentId,
            enrollmentId,
            studentUid: input.student.uid,
            studentName: input.student.name,
            studentAvatar: input.student.avatar,
            joinedAt: Date.now(),
          },
        ];
        // Keep memberCount in sync (mirrors the Firebase accept
        // transaction's increment).
        s.batches = s.batches.map((b) =>
          b.batchId === input.batchId
            ? { ...b, memberCount: (b.memberCount ?? 0) + 1 }
            : b,
        );
        s.emitter.emit("members", {
          batchId: input.batchId,
          members: s.members[input.batchId],
        });
      }
    }

    emitEnrollments(s);
    emitBatches(s);
    emitRequests(s);
    emitAvailability(s);
    return { enrollmentId };
  },

  async declineRequest(
    tutorUid: string,
    requestId: string,
    _studentUid: string,
    _reason: string,
  ): Promise<void> {
    const s = getStore(tutorUid);
    s.requests = s.requests.filter((r) => r.requestId !== requestId);
    emitRequests(s);
  },

  async removeEnrollment(enrollmentId: string, reason: string): Promise<void> {
    for (const s of STORE.values()) {
      const target = s.enrollments.find((e) => e.enrollmentId === enrollmentId);
      if (!target) continue;
      if (target.status !== "active") return;
      s.enrollments = s.enrollments.map((e) =>
        e.enrollmentId === enrollmentId
          ? {
              ...e,
              status: "removed",
              removedAt: Date.now(),
              removeReason: reason,
            }
          : e,
      );
      s.enrolledCount = s.enrollments.filter((e) => e.status === "active").length;
      // Cascade to members.
      for (const batchId of Object.keys(s.members)) {
        s.members[batchId] = s.members[batchId].filter(
          (m) => m.enrollmentId !== enrollmentId,
        );
        s.emitter.emit("members", {
          batchId,
          members: s.members[batchId],
        });
      }
      emitEnrollments(s);
      emitAvailability(s);
      return;
    }
  },

  async setSlotStatus(
    tutorUid: string,
    day: DayKey,
    slot: TimeSlotKey,
    status: SlotStatus,
  ): Promise<void> {
    const s = getStore(tutorUid);
    s.availability = {
      ...s.availability,
      [day]: { ...s.availability[day], [slot]: status },
    };
    emitAvailability(s);
  },

  async saveAvailability(tutorUid, availability) {
    const s = getStore(tutorUid);
    s.availability = {
      ...s.availability,
      ...availability,
    };
    emitAvailability(s);
  },

  async createBatch(input: CreateBatchInput) {
    const s = getStore(input.tutorUid);
    const batchId = `batch-${Date.now()}`;
    const newBatch: Batch = {
      batchId,
      tutorUid: input.tutorUid,
      name: input.name,
      subject: input.subject,
      monthlyRateNpr: input.monthlyRateNpr,
      slotKeys: input.slotKeys,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "active",
      createdAt: Date.now(),
      // Mirrors the Firebase createBatch doc (memberCount: members.length).
      memberCount: input.members.length,
    };
    s.batches = [...s.batches, newBatch];
    s.members[batchId] = input.members.map((m, i) => ({
      memberId: `mem-${Date.now()}-${i}`,
      enrollmentId: m.enrollmentId,
      studentUid: m.studentUid,
      studentName: m.studentName,
      studentAvatar: m.studentAvatar,
      joinedAt: Date.now(),
    }));
    emitBatches(s);
    s.emitter.emit("members", { batchId, members: s.members[batchId] });
    return { batchId };
  },

  async endBatch(batchId: string): Promise<void> {
    const now = Date.now();
    for (const s of STORE.values()) {
      s.batches = s.batches.map((b) =>
        b.batchId === batchId ? { ...b, status: "ended", endedAt: now } : b,
      );
      emitBatches(s);
      return;
    }
  },
};

// Helpers exposed for component tests.
export { computeBookedMap, parseSlotKey, buildSlotKey };

/**
 * Aggregate live feed of every store's batches — the mock behind
 * `BatchesRepository.subscribePublicBatches`. Merges all tutor
 * stores, sorts newest-first, and re-emits on any store's
 * `batches` event. Tutor display names are resolved from the seed
 * names (the mock doesn't track users), falling back to a uid-based
 * name.
 */
export function subscribeAllBatches(
  onData: (batches: Batch[]) => void,
  _onError?: ErrorCallback,
): Unsubscribe {
  const collect = () => {
    const all: Batch[] = [];
    for (const s of STORE.values()) {
      all.push(...s.batches);
    }
    all.sort((a, b) => b.createdAt - a.createdAt);
    onData(all);
  };
  collect();
  const offs: Unsubscribe[] = [];
  for (const s of STORE.values()) {
    offs.push(s.emitter.on<Batch[]>("batches", collect));
  }
  return () => offs.forEach((off) => off());
}

/** Mock tutor display name — the mock store doesn't track users. */
export function mockTutorName(tutorUid: string): string {
  const known: Record<string, string> = {
    "tutor-self": "Bishal Acharya",
    "tutor-1": "Aarav Sharma",
    "tutor-2": "Riya Shrestha",
  };
  return known[tutorUid] ?? `Tutor ${tutorUid.slice(0, 6)}`;
}

/**
 * In-memory batch-member mutations for the batches domain
 * (`MockBatchesRepository`). The batches repo is a facade over this
 * module, so member add/remove must be able to reach the same store
 * that `subscribeBatchMembers` reads from — otherwise the mock UI
 * would show members that never appear in the live list.
 */
export function addMockBatchMember(
  tutorUid: string,
  batchId: string,
  member: BatchMember,
): void {
  const s = getStore(tutorUid);
  const existing = s.members[batchId] ?? [];
  // Idempotent per enrollment — mirrors the Firebase repo's
  // member doc keyed by enrollmentId (re-adding is a no-op).
  if (existing.some((m) => m.enrollmentId === member.enrollmentId)) return;
  s.members[batchId] = [...existing, member];
  // Keep the denormalized memberCount in sync (marketplace seats).
  s.batches = s.batches.map((b) =>
    b.batchId === batchId
      ? { ...b, memberCount: (b.memberCount ?? 0) + 1 }
      : b,
  );
  s.emitter.emit("members", { batchId, members: s.members[batchId] });
  emitBatches(s);
}

export function removeMockBatchMember(
  tutorUid: string,
  batchId: string,
  memberId: string,
): void {
  const s = getStore(tutorUid);
  const existing = s.members[batchId] ?? [];
  s.members[batchId] = existing.filter((m) => m.memberId !== memberId);
  // Decrement (floored at 0) — mirrors Firebase's increment(-1).
  s.batches = s.batches.map((b) =>
    b.batchId === batchId
      ? { ...b, memberCount: Math.max(0, (b.memberCount ?? 0) - 1) }
      : b,
  );
  s.emitter.emit("members", { batchId, members: s.members[batchId] });
  emitBatches(s);
}
