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
  computeBookedMap,
  countAvailabilityCells,
  deriveTodaySessions,
  nextOccurrenceIsoInKtm,
  slotDurationMinutes,
  todayDayKeyInKtm,
  todayIsoInKtm,
} from "../src/services/enrollments/derived";
import {
  DAY_KEYS,
  makeEmptyAvailability,
  parseSlotKey,
  slotKey as buildSlotKey,
  TIME_SLOT_KEYS,
  type Batch,
  type Enrollment,
} from "../src/services/enrollments/types";

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
  });

  it("never returns today for same-day requests", () => {
    // From Wednesday 2026-08-19, next Wednesday is 2026-08-26 (7 days),
    // never the anchor itself.
    assert.equal(
      nextOccurrenceIsoInKtm("wed", local(2026, 8, 19)),
      "2026-08-26",
    );
  });
});
