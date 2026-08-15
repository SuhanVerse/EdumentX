/**
 * Unit tests for the enrollment derived helpers (`src/services/enrollments/derived.ts`).
 *
 * Uses Node's built-in `node:test` runner — zero dependencies, no jest/vitest
 * install. Mirrors the other `scripts/*.ts` build flow:
 *
 *   npm run test:derived
 *
 * Exit code 0 = all tests passed; 1 = any test failed.
 */

import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import {
  cloneAvailability,
  computeBookedMap,
  countAvailabilityCells,
  countAvailabilityChanges,
  deriveTodaySessions,
  nextOccurrenceIsoInKtm,
  slotDurationMinutes,
  sortBatchesForBrowse,
  todayDayKeyInKtm,
  todayIsoInKtm,
} from "../src/services/enrollments/derived";
import {
  DAY_KEYS,
  makeEmptyAvailability,
  parseSlotKey,
  slotKey as buildSlotKey,
  TIME_SLOT_KEYS,
  BatchFullError,
  RequestAlreadyDecidedError,
  type AvailabilitySnapshot,
  type Batch,
  type BatchMember,
  type Enrollment,
  type EnrollmentRequest,
} from "../src/services/enrollments/types";
import {
  MockEnrollmentRepository,
  addMockBatchMember,
  removeMockBatchMember,
} from "../src/services/enrollments/MockEnrollmentRepository";
import {
  seatsRingColorKey,
  seatsRingFrac,
  seatsRingLabel,
} from "../src/components/domain/seatsRingMath";

// Deterministic fixtures. 2026-08-19T12:00:00Z is Wednesday in
// Asia/Kathmandu (UTC+5:45) — verify in the test itself.
const WED_NOON_UTC = new Date("2026-08-19T12:00:00Z");
const WED_KTM_DATE = "2026-08-19";

function activeEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    enrollmentId: "e1",
    tutorUid: "tutor-1",
    studentUid: "student-1",
    studentName: "Aarav Tamang",
    studentGrade: "Grade 9",
    studentAvatar: null,
    subjects: ["Mathematics"],
    slotKey: "wed:5-7",
    startDate: "2026-08-01",
    endDate: "2026-12-20",
    status: "active",
    acceptedAt: 1_752_000_000_000,
    removedAt: null,
    removeReason: null,
    requestId: "req-1",
    ...overrides,
  };
}

function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    batchId: "b1",
    tutorUid: "tutor-1",
    name: "Maths Batch A",
    subject: "Mathematics",
    monthlyRateNpr: 2200,
    slotKeys: ["mon:5-7"],
    startDate: "2026-08-01",
    endDate: null,
    status: "active",
    createdAt: 1_752_000_000_000,
    ...overrides,
  };
}

function batchMember(i: number) {
  return {
    enrollmentId: `enr-full-${i}`,
    studentUid: `stu-full-${i}`,
    studentName: `Student ${i}`,
    studentAvatar: null,
  };
}

const ACCEPT_STUDENT = {
  uid: "stu-1",
  name: "Aarav Tamang",
  grade: "Grade 10",
  avatar: null,
};

describe("BatchFullError (mock accept flow)", () => {
  it("rejects an accept into a batch at capacity", async () => {
    const tutorUid = "tutor-batch-full-a";
    const repo = MockEnrollmentRepository;
    const { batchId } = await repo.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Full Batch",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      // 6 members = the seat cap (mirrors BatchCreation MAX_MEMBERS).
      members: Array.from({ length: 6 }, (_, i) => batchMember(i)),
    });
    await assert.rejects(
      repo.acceptRequest({
        tutorUid,
        authorUid: tutorUid,
        requestId: "req-1", // every seeded store has a pending req-1
        student: ACCEPT_STUDENT,
        subjects: ["Mathematics"],
        slotKey: "mon:5-7",
        startDate: "2026-08-01",
        endDate: "2026-12-20",
        batchId,
      }),
      BatchFullError,
    );
  });

  it("leaves the request pending after a full-batch rejection (atomic)", async () => {
    const tutorUid = "tutor-batch-full-b";
    const repo = MockEnrollmentRepository;
    const fullBatch = await repo.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Full Batch",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      members: Array.from({ length: 6 }, (_, i) => batchMember(i)),
    });
    await assert.rejects(
      repo.acceptRequest({
        tutorUid,
        authorUid: tutorUid,
        requestId: "req-1",
        student: ACCEPT_STUDENT,
        subjects: ["Mathematics"],
        slotKey: "mon:5-7",
        startDate: "2026-08-01",
        endDate: "2026-12-20",
        batchId: fullBatch.batchId,
      }),
      BatchFullError,
    );
    // The failed attempt must not have flipped the request or created
    // an enrollment — accepting the SAME request into a batch with
    // room now succeeds.
    const openBatch = await repo.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Open Batch",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["wed:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      members: [batchMember(0), batchMember(1)],
    });
    const result = await repo.acceptRequest({
      tutorUid,
      authorUid: tutorUid,
      requestId: "req-1",
      student: ACCEPT_STUDENT,
      subjects: ["Mathematics"],
      slotKey: "wed:5-7",
      startDate: "2026-08-01",
      endDate: "2026-12-20",
      batchId: openBatch.batchId,
    });
    assert.ok(result.enrollmentId.length > 0);
  });

  it("accepts normally into a batch below capacity (control)", async () => {
    const tutorUid = "tutor-batch-full-c";
    const repo = MockEnrollmentRepository;
    const { batchId } = await repo.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Open Batch",
      subject: "Physics",
      monthlyRateNpr: 2500,
      slotKeys: ["fri:9-12"],
      startDate: "2026-08-01",
      endDate: null,
      members: [batchMember(1), batchMember(2)],
    });
    const result = await repo.acceptRequest({
      tutorUid,
      authorUid: tutorUid,
      requestId: "req-1",
      student: ACCEPT_STUDENT,
      subjects: ["Physics"],
      slotKey: "fri:9-12",
      startDate: "2026-08-01",
      endDate: "2026-12-20",
      batchId,
    });
    assert.ok(result.enrollmentId.length > 0);
    // Re-accepting the same (now accepted) request fails with the
    // already-decided error — proving the first accept committed.
    await assert.rejects(
      repo.acceptRequest({
        tutorUid,
        authorUid: tutorUid,
        requestId: "req-1",
        student: ACCEPT_STUDENT,
        subjects: ["Physics"],
        slotKey: "fri:9-12",
        startDate: "2026-08-01",
        endDate: "2026-12-20",
        batchId,
      }),
      RequestAlreadyDecidedError,
    );
  });
});

/** A batch member with `memberId === enrollmentId` — the mock's
 *  add/remove convention (mirrors the Firebase member doc id). */
function batchMemberRecord(enrollmentId: string): BatchMember {
  return {
    memberId: enrollmentId,
    enrollmentId,
    studentUid: `stu-${enrollmentId}`,
    studentName: "Test Student",
    studentAvatar: null,
    joinedAt: Date.now(),
  };
}

describe("mock batch memberCount denormalization", () => {
  // subscribeBatches delivers the current list synchronously on
  // subscribe (and re-emits on every mutation), so the helper just
  // tracks the latest list for post-mutation assertions.
  function observeBatches(tutorUid: string) {
    let latest: Batch[] = [];
    const unsub = MockEnrollmentRepository.subscribeBatches(tutorUid, (list) => {
      latest = list;
    });
    return {
      unsub,
      read: () => latest,
    };
  }

  it("delivers initial data immediately to fresh subscribers (no replay quirk)", () => {
    const tutorUid = "tutor-initial-a";
    const captured: {
      batches: Batch[] | null;
      requests: EnrollmentRequest[] | null;
      availability: AvailabilitySnapshot | null;
    } = { batches: null, requests: null, availability: null };
    const unsubs = [
      MockEnrollmentRepository.subscribeBatches(
        tutorUid,
        (l) => (captured.batches = l),
      ),
      MockEnrollmentRepository.subscribeRequests(
        tutorUid,
        (l) => (captured.requests = l),
      ),
      MockEnrollmentRepository.subscribeAvailability(
        tutorUid,
        (s) => (captured.availability = s),
      ),
    ];
    // Subscribing alone must deliver the seeded state synchronously —
    // no mutation required. (Regression: emit-before-register used to
    // drop the initial push entirely.)
    assert.ok(
      captured.batches !== null && captured.batches.length >= 1,
      "batches initial data",
    );
    assert.ok(
      captured.requests !== null && captured.requests.length >= 2,
      "requests initial data (seeded pending)",
    );
    assert.ok(captured.availability !== null, "availability initial data");
    unsubs.forEach((u) => u());
  });

  it("createBatch seeds memberCount from its members", async () => {
    const tutorUid = "tutor-count-a";
    const obs = observeBatches(tutorUid);
    const { batchId } = await MockEnrollmentRepository.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Count Batch A",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      members: Array.from({ length: 3 }, (_, i) => batchMember(i)),
    });
    const b = obs.read().find((x) => x.batchId === batchId);
    assert.equal(b?.memberCount, 3);
    obs.unsub();
  });

  it("addMockBatchMember bumps memberCount, idempotent per enrollment", async () => {
    const tutorUid = "tutor-count-b";
    const obs = observeBatches(tutorUid);
    const { batchId } = await MockEnrollmentRepository.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Count Batch B",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      members: [],
    });
    const count = () =>
      obs.read().find((x) => x.batchId === batchId)?.memberCount;
    addMockBatchMember(tutorUid, batchId, batchMemberRecord("enr-x"));
    assert.equal(count(), 1);
    // Re-adding the same enrollmentId is a no-op (idempotent).
    addMockBatchMember(tutorUid, batchId, batchMemberRecord("enr-x"));
    assert.equal(count(), 1);
    addMockBatchMember(tutorUid, batchId, batchMemberRecord("enr-y"));
    assert.equal(count(), 2);
    obs.unsub();
  });

  it("removeMockBatchMember decrements memberCount and floors at 0", async () => {
    const tutorUid = "tutor-count-c";
    const obs = observeBatches(tutorUid);
    const { batchId } = await MockEnrollmentRepository.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Count Batch C",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      members: [],
    });
    const count = () =>
      obs.read().find((x) => x.batchId === batchId)?.memberCount;
    addMockBatchMember(tutorUid, batchId, batchMemberRecord("enr-a"));
    addMockBatchMember(tutorUid, batchId, batchMemberRecord("enr-b"));
    assert.equal(count(), 2);
    removeMockBatchMember(tutorUid, batchId, "enr-a");
    assert.equal(count(), 1);
    removeMockBatchMember(tutorUid, batchId, "enr-b");
    assert.equal(count(), 0);
    // Removing an already-gone member stays at 0 (no negative count).
    removeMockBatchMember(tutorUid, batchId, "enr-a");
    assert.equal(count(), 0);
    obs.unsub();
  });

  it("acceptRequest bumps memberCount for a session-code join", async () => {
    const tutorUid = "tutor-count-d";
    const obs = observeBatches(tutorUid);
    const { batchId } = await MockEnrollmentRepository.createBatch({
      tutorUid,
      authorUid: tutorUid,
      name: "Count Batch D",
      subject: "Mathematics",
      monthlyRateNpr: 2000,
      slotKeys: ["mon:5-7"],
      startDate: "2026-08-01",
      endDate: null,
      members: [batchMember(1)],
    });
    await MockEnrollmentRepository.acceptRequest({
      tutorUid,
      authorUid: tutorUid,
      requestId: "req-1", // seeded pending request
      student: ACCEPT_STUDENT,
      subjects: ["Mathematics"],
      slotKey: "mon:5-7",
      startDate: "2026-08-01",
      endDate: "2026-12-20",
      batchId,
    });
    const b = obs.read().find((x) => x.batchId === batchId);
    assert.equal(b?.memberCount, 2);
    obs.unsub();
  });
});

describe("seatsRing math", () => {
  it("clamps the arc fraction to [0, 1]", () => {
    // Half the seats → half the ring.
    assert.equal(seatsRingFrac(3, 6), 0.5);
    // No seats → empty arc; full seats → complete ring.
    assert.equal(seatsRingFrac(0, 6), 0);
    assert.equal(seatsRingFrac(6, 6), 1);
    // Over-capacity / negative seats can't exceed the bounds.
    assert.equal(seatsRingFrac(-2, 6), 0);
    assert.equal(seatsRingFrac(99, 6), 1);
    // Degenerate max is treated as empty, not NaN/Infinity.
    assert.equal(seatsRingFrac(4, 0), 0);
  });

  it("labels the center with the count or Full", () => {
    assert.equal(seatsRingLabel(4), "4");
    assert.equal(seatsRingLabel(1), "1");
    assert.equal(seatsRingLabel(0), "Full");
    assert.equal(seatsRingLabel(-1), "Full");
  });

  it("picks the status color key by seat count", () => {
    assert.equal(seatsRingColorKey(0), "danger");
    assert.equal(seatsRingColorKey(-1), "danger");
    assert.equal(seatsRingColorKey(1), "accent");
    assert.equal(seatsRingColorKey(2), "verification");
    assert.equal(seatsRingColorKey(6), "verification");
  });
});

describe("sortBatchesForBrowse", () => {
  it("puts batches with seats left before full batches", () => {
    const full = makeBatch({ batchId: "full", memberCount: 6, createdAt: 1 });
    const open = makeBatch({ batchId: "open", memberCount: 2, createdAt: 2 });
    const sorted = sortBatchesForBrowse([full, open]).map((b) => b.batchId);
    assert.deepEqual(sorted, ["open", "full"]);
  });

  it("treats legacy docs without memberCount as having seats", () => {
    const legacy = makeBatch({ batchId: "legacy" }); // no memberCount key
    const full = makeBatch({ batchId: "full", memberCount: 6, createdAt: 2 });
    const sorted = sortBatchesForBrowse([full, legacy]).map((b) => b.batchId);
    assert.deepEqual(sorted, ["legacy", "full"]);
  });

  it("keeps newest-first ordering within the same availability group", () => {
    const older = makeBatch({ batchId: "older", memberCount: 2, createdAt: 100 });
    const newer = makeBatch({ batchId: "newer", memberCount: 3, createdAt: 200 });
    const sorted = sortBatchesForBrowse([older, newer]).map((b) => b.batchId);
    assert.deepEqual(sorted, ["newer", "older"]);
  });

  it("sinks a newer full batch below an older open one", () => {
    const fullNewer = makeBatch({
      batchId: "fullNewer",
      memberCount: 6,
      createdAt: 300,
    });
    const openOlder = makeBatch({
      batchId: "openOlder",
      memberCount: 1,
      createdAt: 100,
    });
    const sorted = sortBatchesForBrowse([fullNewer, openOlder]).map(
      (b) => b.batchId,
    );
    assert.deepEqual(sorted, ["openOlder", "fullNewer"]);
  });

  it("does not mutate the input array", () => {
    const a = makeBatch({ batchId: "a", memberCount: 6 });
    const b = makeBatch({ batchId: "b", memberCount: 1 });
    const input = [a, b];
    sortBatchesForBrowse(input);
    assert.equal(input[0].batchId, "a");
    assert.equal(input[1].batchId, "b");
  });

  it("handles empty input", () => {
    assert.deepEqual(sortBatchesForBrowse([]), []);
  });
});

describe("todayIsoInKtm / todayDayKeyInKtm", () => {
  it("resolves the KTM date for a known instant", () => {
    assert.equal(todayIsoInKtm(WED_NOON_UTC), WED_KTM_DATE);
  });

  it("resolves Wednesday for a Wednesday noon in KTM", () => {
    assert.equal(todayDayKeyInKtm(WED_NOON_UTC), "wed");
  });

  it("resolves each weekday correctly", () => {
    // 2026-08-16 is a Sunday in KTM.
    assert.equal(todayDayKeyInKtm(new Date("2026-08-16T12:00:00Z")), "sun");
    // 2026-08-17 is a Monday in KTM.
    assert.equal(todayDayKeyInKtm(new Date("2026-08-17T12:00:00Z")), "mon");
    // 2026-08-22 is a Saturday in KTM.
    assert.equal(todayDayKeyInKtm(new Date("2026-08-22T12:00:00Z")), "sat");
  });

  it("never returns undefined (falls back to Monday)", () => {
    const day = todayDayKeyInKtm(WED_NOON_UTC);
    assert.ok(typeof day === "string" && day.length > 0);
  });
});

describe("slotDurationMinutes", () => {
  it("computes minutes for standard slots", () => {
    assert.equal(slotDurationMinutes("5-7"), 120);
    assert.equal(slotDurationMinutes("6-9"), 180);
    assert.equal(slotDurationMinutes("12-3"), 180);
  });

  it("returns 0 for malformed input", () => {
    assert.equal(slotDurationMinutes("x-y" as never), 0);
  });
});

describe("deriveTodaySessions", () => {
  it("includes an active enrollment on today's day within its date window", () => {
    const rows = deriveTodaySessions([activeEnrollment()], WED_NOON_UTC);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      key: "e1",
      time: "5–7 PM",
      student: "Aarav Tamang",
      subject: "Mathematics",
      duration: "120 min",
    });
  });

  it("excludes enrollments whose date window ended before today", () => {
    const rows = deriveTodaySessions(
      [
        activeEnrollment({
          enrollmentId: "e2",
          startDate: "2026-01-01",
          endDate: "2026-08-18", // yesterday in KTM
        }),
      ],
      WED_NOON_UTC,
    );
    assert.equal(rows.length, 0);
  });

  it("excludes enrollments not yet started", () => {
    const rows = deriveTodaySessions(
      [
        activeEnrollment({
          enrollmentId: "e3",
          startDate: "2026-08-20", // tomorrow in KTM
          endDate: "2026-12-20",
        }),
      ],
      WED_NOON_UTC,
    );
    assert.equal(rows.length, 0);
  });

  it("excludes enrollments on a different weekday", () => {
    const rows = deriveTodaySessions(
      [
        activeEnrollment({
          enrollmentId: "e4",
          slotKey: "mon:5-7",
        }),
      ],
      WED_NOON_UTC,
    );
    assert.equal(rows.length, 0);
  });

  it("excludes non-active enrollments (removed / expired)", () => {
    const rows = deriveTodaySessions(
      [
        activeEnrollment({ enrollmentId: "r", status: "removed" }),
        activeEnrollment({ enrollmentId: "x", status: "expired" }),
      ],
      WED_NOON_UTC,
    );
    assert.equal(rows.length, 0);
  });

  it("excludes enrollments with an unparseable slotKey", () => {
    const rows = deriveTodaySessions(
      [activeEnrollment({ enrollmentId: "e5", slotKey: "wed:99-00" })],
      WED_NOON_UTC,
    );
    assert.equal(rows.length, 0);
  });

  it("orders multiple sessions by canonical slot order (morning first)", () => {
    const rows = deriveTodaySessions(
      [
        activeEnrollment({ enrollmentId: "evening", slotKey: "wed:7-9" }),
        activeEnrollment({ enrollmentId: "morning", slotKey: "wed:6-9" }),
        activeEnrollment({ enrollmentId: "midday", slotKey: "wed:12-3" }),
      ],
      WED_NOON_UTC,
    );
    assert.deepEqual(
      rows.map((r) => r.key),
      ["morning", "midday", "evening"],
    );
  });

  it("joins multiple subjects and falls back when empty", () => {
    const multi = deriveTodaySessions(
      [
        activeEnrollment({
          enrollmentId: "m",
          subjects: ["Math", "Physics"],
        }),
      ],
      WED_NOON_UTC,
    );
    assert.equal(multi[0].subject, "Math · Physics");

    const empty = deriveTodaySessions(
      [activeEnrollment({ enrollmentId: "z", subjects: [] })],
      WED_NOON_UTC,
    );
    assert.equal(empty[0].subject, "Session");
  });

  it("returns an empty array for an empty roster", () => {
    assert.deepEqual(deriveTodaySessions([], WED_NOON_UTC), []);
  });

  it("includes today's boundary dates (inclusive window)", () => {
    const startsToday = deriveTodaySessions(
      [activeEnrollment({ enrollmentId: "s", startDate: WED_KTM_DATE })],
      WED_NOON_UTC,
    );
    assert.equal(startsToday.length, 1);

    const endsToday = deriveTodaySessions(
      [activeEnrollment({ enrollmentId: "en", endDate: WED_KTM_DATE })],
      WED_NOON_UTC,
    );
    assert.equal(endsToday.length, 1);
  });
});

function activeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    batchId: "b1",
    tutorUid: "tutor-1",
    name: "Weekend Math",
    subject: "Mathematics",
    monthlyRateNpr: 2500,
    slotKeys: ["sat:9-12"],
    startDate: "2026-08-01",
    endDate: null,
    status: "active",
    createdAt: 1_752_000_000_000,
    ...overrides,
  };
}

describe("computeBookedMap", () => {
  it("books a slot for an active in-window enrollment", () => {
    const map = computeBookedMap(
      [activeEnrollment({ slotKey: "wed:5-7" })],
      [],
      WED_NOON_UTC,
    );
    assert.deepEqual(map.get("wed:5-7"), {
      source: "enrollment",
      refId: "e1",
    });
    assert.equal(map.size, 1);
  });

  it("skips non-active, out-of-window, and missing-slot enrollments", () => {
    const map = computeBookedMap(
      [
        activeEnrollment({ enrollmentId: "r", status: "removed" }),
        activeEnrollment({ enrollmentId: "x", status: "expired" }),
        activeEnrollment({
          enrollmentId: "old",
          startDate: "2026-01-01",
          endDate: "2026-08-18",
        }),
        activeEnrollment({ enrollmentId: "fut", startDate: "2026-08-20" }),
        activeEnrollment({ enrollmentId: "nokey", slotKey: "" }),
      ],
      [],
      WED_NOON_UTC,
    );
    assert.equal(map.size, 0);
  });

  it("books every slotKey of an active batch", () => {
    const map = computeBookedMap(
      [],
      [activeBatch({ slotKeys: ["sat:9-12", "sat:12-3"] })],
      WED_NOON_UTC,
    );
    assert.deepEqual(map.get("sat:9-12"), {
      source: "batch",
      refId: "b1",
    });
    assert.deepEqual(map.get("sat:12-3"), {
      source: "batch",
      refId: "b1",
    });
    assert.equal(map.size, 2);
  });

  it("skips ended batches", () => {
    const map = computeBookedMap(
      [],
      [activeBatch({ status: "ended" })],
      WED_NOON_UTC,
    );
    assert.equal(map.size, 0);
  });

  it("keeps the enrollment when a batch overlaps the same slot", () => {
    const map = computeBookedMap(
      [activeEnrollment({ slotKey: "sat:9-12" })],
      [activeBatch({ slotKeys: ["sat:9-12"] })],
      WED_NOON_UTC,
    );
    assert.deepEqual(map.get("sat:9-12"), {
      source: "enrollment",
      refId: "e1",
    });
    assert.equal(map.size, 1);
  });

  it("lets the batch claim a slot when the enrollment holds a different one", () => {
    const map = computeBookedMap(
      [activeEnrollment({ slotKey: "wed:5-7" })],
      [activeBatch({ slotKeys: ["sat:9-12"] })],
      WED_NOON_UTC,
    );
    assert.equal(map.size, 2);
    assert.equal(map.get("sat:9-12")?.source, "batch");
    assert.equal(map.get("wed:5-7")?.source, "enrollment");
  });
});

describe("countAvailabilityCells", () => {
  it("counts 42 cells total (7 days × 6 slots) with all-off availability", () => {
    const counts = countAvailabilityCells(makeEmptyAvailability(), new Map());
    assert.equal(counts.off, 42);
    assert.equal(counts.available, 0);
    assert.equal(counts.booked, 0);
    assert.equal(counts.off + counts.available + counts.booked, 42);
  });

  it("counts available cells and ignores non-available cells", () => {
    const availability = makeEmptyAvailability();
    availability.mon["6-9"] = "available";
    availability.mon["9-12"] = "available";
    availability.tue["5-7"] = "available";
    const counts = countAvailabilityCells(availability, new Map());
    assert.equal(counts.available, 3);
    assert.equal(counts.off, 39);
    assert.equal(counts.booked, 0);
  });

  it("counts booked slots and lets booked override available", () => {
    const availability = makeEmptyAvailability();
    availability.mon["6-9"] = "available";
    availability.mon["9-12"] = "available";
    const bookedMap = new Map([
      ["mon:6-9", { source: "enrollment", refId: "e1" } as const],
      ["sun:7-9", { source: "batch", refId: "b1" } as const],
    ]);
    const counts = countAvailabilityCells(availability, bookedMap);
    assert.equal(counts.booked, 2);
    assert.equal(counts.available, 1); // mon:9-12
    assert.equal(counts.off, 39);
  });

  it("handles a fully-booked week", () => {
    const availability = makeEmptyAvailability();
    const bookedMap = new Map();
    for (const day of ["mon", "tue"] as const) {
      for (const slot of ["6-9", "9-12", "12-3", "3-5", "5-7", "7-9"] as const) {
        bookedMap.set(`${day}:${slot}`, {
          source: "enrollment",
          refId: day,
        });
      }
    }
    const counts = countAvailabilityCells(availability, bookedMap);
    assert.equal(counts.booked, 12);
    assert.equal(counts.available, 0);
    assert.equal(counts.off, 30);
  });
});

// ─── Malformed-slotKey guard ────────────────────────────────────────────────
// The warn-once dedupe is module-level state keyed by `kind:refId:slotKey`,
// so each test below uses a unique bad key to avoid cross-test suppression.

describe("malformed slotKey guard", () => {
  it("logs a warning when deriveTodaySessions hits a bad slotKey", () => {
    const warn = mock.method(console, "warn", () => {});
    try {
      const rows = deriveTodaySessions(
        [activeEnrollment({ enrollmentId: "bad-1", slotKey: "mon-5-7" })],
        WED_NOON_UTC,
      );
      assert.equal(rows.length, 0);
      assert.equal(warn.mock.callCount(), 1);
      const msg = String(warn.mock.calls[0].arguments[0]);
      assert.match(msg, /bad-1/);
      assert.match(msg, /mon-5-7/);
      assert.match(msg, /mon:5-7/);
    } finally {
      warn.mock.restore();
    }
  });

  it("logs a warning when computeBookedMap hits a bad enrollment slotKey", () => {
    const warn = mock.method(console, "warn", () => {});
    try {
      const map = computeBookedMap(
        [activeEnrollment({ enrollmentId: "bad-2", slotKey: "wed-5-7" })],
        [],
        WED_NOON_UTC,
      );
      assert.equal(map.size, 0);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0].arguments[0]), /bad-2/);
    } finally {
      warn.mock.restore();
    }
  });

  it("logs a warning when computeBookedMap hits a bad batch slotKey", () => {
    const warn = mock.method(console, "warn", () => {});
    try {
      const map = computeBookedMap(
        [],
        [activeBatch({ batchId: "bad-batch-1", slotKeys: ["sat:9-12", "sat-12-3"] })],
        WED_NOON_UTC,
      );
      // Valid key books, bad key is skipped + warned once.
      assert.equal(map.size, 1);
      assert.equal(map.get("sat:9-12")?.source, "batch");
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0].arguments[0]), /bad-batch-1/);
    } finally {
      warn.mock.restore();
    }
  });

  it("does not warn on valid slotKeys", () => {
    const warn = mock.method(console, "warn", () => {});
    try {
      computeBookedMap(
        [activeEnrollment({ enrollmentId: "ok-1", slotKey: "wed:5-7" })],
        [activeBatch({ batchId: "ok-batch-1", slotKeys: ["sat:9-12"] })],
        WED_NOON_UTC,
      );
      deriveTodaySessions(
        [activeEnrollment({ enrollmentId: "ok-2", slotKey: "wed:5-7" })],
        WED_NOON_UTC,
      );
      assert.equal(warn.mock.callCount(), 0);
    } finally {
      warn.mock.restore();
    }
  });

  it("warns only once for the same bad key across repeated calls", () => {
    const warn = mock.method(console, "warn", () => {});
    try {
      const e = activeEnrollment({ enrollmentId: "dup-1", slotKey: "mon-9-12" });
      deriveTodaySessions([e], WED_NOON_UTC);
      deriveTodaySessions([e], WED_NOON_UTC);
      deriveTodaySessions([e], WED_NOON_UTC);
      assert.equal(warn.mock.callCount(), 1);
    } finally {
      warn.mock.restore();
    }
  });
});

describe("slotKey / parseSlotKey", () => {
  it("builds the canonical day:slot format", () => {
    assert.equal(buildSlotKey("mon", "5-7"), "mon:5-7");
    assert.equal(buildSlotKey("sun", "6-9"), "sun:6-9");
  });

  it("round-trips every day × slot combination", () => {
    for (const day of DAY_KEYS) {
      for (const slot of TIME_SLOT_KEYS) {
        const key = buildSlotKey(day, slot);
        assert.deepEqual(parseSlotKey(key), { day, slot });
      }
    }
  });

  it("parses a valid key into its day and slot", () => {
    assert.deepEqual(parseSlotKey("wed:5-7"), { day: "wed", slot: "5-7" });
  });

  it("rejects an invalid day", () => {
    assert.equal(parseSlotKey("xyz:5-7"), null);
  });

  it("rejects an invalid slot", () => {
    assert.equal(parseSlotKey("wed:99-00"), null);
  });

  it("rejects the wrong separator (hyphen instead of colon)", () => {
    assert.equal(parseSlotKey("mon-5-7"), null);
  });

  it("rejects empty and colon-only input", () => {
    assert.equal(parseSlotKey(""), null);
    assert.equal(parseSlotKey(":"), null);
  });

  it("rejects a key with the day and slot swapped", () => {
    assert.equal(parseSlotKey("5-7:mon"), null);
  });
});

describe("nextOccurrenceIsoInKtm", () => {
  // NOTE: this helper uses LOCAL calendar math (its doc comment says
  // so explicitly), so fixtures construct `now` via local-time Date
  // constructors — NOT UTC instants like the KTM-date helpers above.
  // Verified with node: JS getDay() for 2026-08-16..08-22 is
  // sun,mon,tue,wed,thu,fri,sat — so 08-18=tue, 08-19=wed, 08-21=fri,
  // 08-22=sat, 08-23=sun, 08-24=mon, 08-25=tue.
  const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

  it("pushes same-day requests to next week (offset 0 → +7)", () => {
    // From Tuesday 2026-08-18, next Tuesday is 2026-08-25.
    assert.equal(
      nextOccurrenceIsoInKtm("tue", local(2026, 8, 18)),
      "2026-08-25",
    );
  });

  it("walks forward to the next weekday when it is later this week", () => {
    // From Tuesday 2026-08-18, Wednesday is 2026-08-19.
    assert.equal(
      nextOccurrenceIsoInKtm("wed", local(2026, 8, 18)),
      "2026-08-19",
    );
    // From Tuesday 2026-08-18, Sunday is 2026-08-23 (end of week).
    assert.equal(
      nextOccurrenceIsoInKtm("sun", local(2026, 8, 18)),
      "2026-08-23",
    );
  });

  it("wraps past the weekend to next week's Monday", () => {
    // From Friday 2026-08-21, next Monday is 2026-08-24.
    assert.equal(
      nextOccurrenceIsoInKtm("mon", local(2026, 8, 21)),
      "2026-08-24",
    );
    // From Saturday 2026-08-22, next Monday is 2026-08-24.
    assert.equal(
      nextOccurrenceIsoInKtm("mon", local(2026, 8, 22)),
      "2026-08-24",
    );
  });

  it("handles a mid-week anchor for a day earlier in the week", () => {
    // From Wednesday 2026-08-19, the next Saturday is 2026-08-22 (3 days).
    assert.equal(
      nextOccurrenceIsoInKtm("sat", local(2026, 8, 19)),
      "2026-08-22",
    );
    // From Wednesday 2026-08-19, next Monday is 2026-08-24 (5 days).
    assert.equal(
      nextOccurrenceIsoInKtm("mon", local(2026, 8, 19)),
      "2026-08-24",
    );
  });  it("never returns today for same-day requests", () => {
    // From Wednesday 2026-08-19, next Wednesday is 2026-08-26 (7 days),
    // never the anchor itself.
    assert.equal(
      nextOccurrenceIsoInKtm("wed", local(2026, 8, 19)),
      "2026-08-26",
    );
  });
});

describe("cloneAvailability / countAvailabilityChanges", () => {
  function sample() {
    // Full 42-cell grid from the canonical factory, with a few
    // cells toggled to "available" so the fixture is realistic.
    const grid = makeEmptyAvailability();
    grid.mon["5-7"] = "available";
    grid.tue["7-9"] = "available";
    return grid;
  }

  it("cloneAvailability returns a deep copy that can be mutated freely", () => {
    const base = sample();
    const copy = cloneAvailability(base);
    copy.mon["5-7"] = "off";
    // Mutating the copy never leaks into the source.
    assert.equal(base.mon["5-7"], "available");
    assert.equal(copy.mon["5-7"], "off");
    // Unrelated day rows are independent objects too.
    copy.tue["5-7"] = "available";
    assert.equal(base.tue["5-7"], "off");
  });

  it("countAvailabilityChanges is zero for identical grids", () => {
    const a = sample();
    const b = cloneAvailability(a);
    assert.equal(countAvailabilityChanges(a, b), 0);
  });

  it("counts exactly the differing cells", () => {
    const base = sample();
    const draft = cloneAvailability(base);
    draft.mon["5-7"] = "off";
    draft.tue["7-9"] = "off";
    assert.equal(countAvailabilityChanges(base, draft), 2);
  });
});
