/**
 * EdumentX — Enrollment derived helpers
 *
 * Pure functions that compute cell-level state from the raw
 * enrollments + batches arrays. No Firestore imports — easy to unit
 * test in isolation.
 *
 * The "Booked" state is *derived* at read time, not stored on the
 * profile. Storing it would force a 3-way write coordination
 * (accept request → write enrollment → update profile.availability.derived)
 * on every action. Derived state is the simplest correct model and
 * keeps the Firestore rules sane.
 */

import {
  type BookedMap,
  type Enrollment,
  type Batch,
  type DayKey,
  type TimeSlotKey,
  DAY_KEYS,
  MAX_BATCH_MEMBERS,
  TIME_SLOT_KEYS,
  TIME_SLOT_LABELS,
  parseSlotKey,
  slotKey as buildSlotKey,
} from "./types";

/**
 * Re-export the `DayKey` type so call sites that already import
 * from `derived.ts` (TutorDetailsScreen) can grab both
 * `nextOccurrenceIsoInKtm` and the day-key union from one place.
 */
export type { DayKey };

/**
 * Asia/Kathmandu is the project timezone (Nepal, +05:45). Construct
 * a `today` ISO string by clipping the local Date to YYYY-MM-DD.
 * Avoids the off-by-one bug of `toISOString().slice(0, 10)` which
 * uses UTC and can flip the date in the early hours.
 */
export function todayIsoInKtm(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA formats as YYYY-MM-DD, which is exactly what we want.
  return formatter.format(now);
}

/**
 * Today's weekday as an EdumentX `DayKey`, resolved in the
 * Asia/Kathmandu calendar (the project timezone — same anchor as
 * `todayIsoInKtm`). Used to answer "which enrollments have a
 * session today": compare each active enrollment's `slotKey` day
 * against this value, then verify `todayIsoInKtm()` falls inside
 * the enrollment's `[startDate, endDate]` window.
 *
 * `Intl` gives us a localized weekday abbreviation; map it back to
 * the canonical `DayKey` rather than guessing from `getDay()` so a
 * device in any locale still resolves "today" correctly in KTM.
 */
export function todayDayKeyInKtm(now: Date = new Date()): DayKey {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
  });
  const abbrev = formatter.format(now); // e.g. "Mon", "Tue"
  const key = DAY_KEYS.find((d) => d.toUpperCase() === abbrev.toUpperCase());
  // `find` always succeeds for the 7 real weekdays; fall back to
  // Monday defensively so the caller never gets `undefined`.
  return key ?? "mon";
}

/**
 * Compute the next ISO date (YYYY-MM-DD) on which the given
 * weekday falls, in the device's local calendar. Walks forward at
 * most 7 days from `now`.
 *
 * Phase 1 contract: when the user picks a slot today for a
 * weekday that already happened today (offset === 0), push to next
 * week's same day. Sessions are for future study periods — never
 * for a partially-elapsed today.
 *
 * Uses `Date.getDay()` (JS convention: 0 = Sunday) and remaps to
 * the EdumentX `DayKey` order (0 = Monday). Local-time math is
 * fine here — `todayIsoInKtm` already gives us a date string; we
 * just need to find the next occurrence in the same calendar.
 */
export function nextOccurrenceIsoInKtm(
  day: DayKey,
  now: Date = new Date(),
): string {
  const target = DAY_KEYS.indexOf(day); // 0 = mon … 6 = sun
  // Anchor on `now`'s local Y/M/D, not the KTM-clipped one — this
  // is a "next day-of-week" calc, not a "today" calc, so the
  // device's local clock is the right reference.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIdx = (today.getDay() + 6) % 7; // JS sun=0 → mon=0
  const offset = (target - todayIdx + 7) % 7;
  today.setDate(today.getDate() + (offset === 0 ? 7 : offset));
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Inclusive ISO string comparison. `"2026-05-10" <= "2026-05-10"` is
 * true; `"2026-05-09" <= "2026-05-10"` is true. Both endpoints are
 * inclusive — a student enrolled `[startDate, endDate]` is "active"
 * on both boundary days (the same convention the rest of the app
 * uses for date picks).
 */
function isBetween(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

/**
 * Warn once (per process) about a malformed slotKey so bad data can't
 * hide in the derived views. A slotKey that fails `parseSlotKey` is
 * silently dropped everywhere (dashboard sessions, booked map,
 * capacity counts) — that silence is exactly why a typo like
 * `"mon-5-7"` instead of `"mon:5-7"` goes unnoticed. The dedupe
 * matters because `deriveTodaySessions` runs twice per dashboard
 * render and `computeBookedMap` re-runs on every snapshot; without
 * it this would spam the console on every re-render.
 */
const warnedBadSlotKeys = new Set<string>();

function warnBadSlotKey(
  kind: "enrollment" | "batch",
  refId: string,
  slotKey: string,
): void {
  const dedupeKey = `${kind}:${refId}:${slotKey}`;
  if (warnedBadSlotKeys.has(dedupeKey)) return;
  warnedBadSlotKeys.add(dedupeKey);
  console.warn(
    `[enrollments] ${kind} "${refId}" has a malformed slotKey ` +
      `"${slotKey}" (expected \"<day>:<slot>\", e.g. \"mon:5-7\"). ` +
      `It is excluded from derived views. Fix the data or the writer.`,
  );
}

/**
 * Build a `BookedMap` from the current enrollments + batches arrays.
 *
 * Rules:
 *   - Enrollments whose `slotKey` falls inside `[startDate, endDate]`
 *     AND have status `"active"` mark the slot as booked (source:
 *     "enrollment").
 *   - Every active batch's `slotKeys[i]` is marked booked (source:
 *     "batch").
 *   - When both apply to the same slot, the enrollment wins — the
 *     batch loop only fills slots no active enrollment already
 *     holds (`if (!map.has(slot))`). This is rare because a single
 *     `slotKey` is exclusive to one enrollment at a time, but the
 *     guard keeps the renderer from rendering two overlapping
 *     owner names.
 *   - A slotKey that fails `parseSlotKey` is skipped (it can never
 *     match a rendered cell) and logged once — see `warnBadSlotKey`.
 */
export function computeBookedMap(
  enrollments: readonly Enrollment[],
  batches: readonly Batch[],
  now: Date = new Date(),
): BookedMap {
  const map: BookedMap = new Map();
  const today = todayIsoInKtm(now);

  for (const e of enrollments) {
    if (e.status !== "active") continue;
    if (!isBetween(today, e.startDate, e.endDate)) continue;
    if (!e.slotKey) continue;
    if (!parseSlotKey(e.slotKey)) {
      warnBadSlotKey("enrollment", e.enrollmentId, e.slotKey);
      continue;
    }
    map.set(e.slotKey, { source: "enrollment", refId: e.enrollmentId });
  }

  for (const b of batches) {
    if (b.status !== "active") continue;
    for (const slot of b.slotKeys) {
      // Enrollment wins on overlap — a batch only claims a slot that
      // no active enrollment holds. A real production app would
      // prevent this overlap (a tutor can't double-book a slot), but
      // in the prototype we layer rather than throw.
      if (!parseSlotKey(slot)) {
        warnBadSlotKey("batch", b.batchId, slot);
        continue;
      }
      if (!map.has(slot)) {
        map.set(slot, { source: "batch", refId: b.batchId });
      }
    }
  }

  return map;
}

/**
 * `true` when the slot is currently held by an active enrollment or
 * batch. Used by the request-accept flow to short-circuit a write
 * that would double-book a slot.
 */
export function isSlotBooked(
  bookedMap: BookedMap,
  day: DayKey,
  slot: TimeSlotKey,
): boolean {
  return bookedMap.has(buildSlotKey(day, slot));
}

/**
 * Compute the simple count breakdown for the legend row + capacity
 * card. Loops all 42 cells (7 days × 6 slots) once. Used by the
 * capacity screen.
 */
export function countAvailabilityCells(
  availability: import("./types").WeeklyAvailability,
  bookedMap: BookedMap,
): { available: number; booked: number; off: number } {
  let available = 0;
  let booked = 0;
  let off = 0;
  for (const day of DAY_KEYS) {
    for (const slot of TIME_SLOT_KEYS) {
      const key = buildSlotKey(day, slot);
      if (bookedMap.has(key)) {
        booked++;
      } else if (availability[day][slot] === "available") {
        available++;
      } else {
        off++;
      }
    }
  }
  return { available, booked, off };
}

/**
 * Deep-clone a `WeeklyAvailability` so a screen can hold a local
 * draft (the capacity screen's "pending availability") without
 * mutating the live subscription object. Copies every day row into
 * a fresh object; cell values are plain strings, so a shallow copy
 * per row is sufficient.
 */
export function cloneAvailability(
  availability: import("./types").WeeklyAvailability,
): import("./types").WeeklyAvailability {
  const copy = {} as import("./types").WeeklyAvailability;
  for (const day of DAY_KEYS) {
    copy[day] = { ...availability[day] };
  }
  return copy;
}

/**
 * Count how many cells differ between a base availability and a
 * draft. Used by the capacity screen's "Save changes (N)" badge.
 */
export function countAvailabilityChanges(
  base: import("./types").WeeklyAvailability,
  draft: import("./types").WeeklyAvailability,
): number {
  let changes = 0;
  for (const day of DAY_KEYS) {
    for (const slot of TIME_SLOT_KEYS) {
      if (base[day][slot] !== draft[day][slot]) changes++;
    }
  }
  return changes;
}

// ─── Today's sessions (derived from the live roster) ───────────────────────

/**
 * Minutes for a slot, e.g. "5-7" → 120. Handles the noon
 * wraparound: "12-3" is 12 PM–3 PM (3 hours), so when the end
 * hour is numerically smaller than the start, treat it as
 * afternoon (add 12h) rather than returning a negative duration.
 */
export function slotDurationMinutes(slot: TimeSlotKey): number {
  const [start, end] = slot.split("-").map((n) => parseInt(n, 10));
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  const adjustedEnd = end <= start ? end + 12 : end;
  return (adjustedEnd - start) * 60;
}

/**
 * Derive today's sessions from the live roster (`enrollments/{uid}/roster`).
 * There is no `sessions` collection — an active enrollment counts as a
 * session today when its `slotKey` day matches today's weekday in
 * Asia/Kathmandu AND today's ISO date falls inside the enrollment's
 * `[startDate, endDate]` window. Same date-window semantics as
 * `computeBookedMap`, which is why a slot the capacity screen shows as
 * "booked" appears here as a session.
 *
 * Returns display rows ordered by the canonical weekly slot order
 * (morning first).
 */
export function deriveTodaySessions(
  enrollments: readonly Enrollment[],
  now: Date = new Date(),
): {
  key: string;
  time: string;
  student: string;
  subject: string;
  duration: string;
}[] {
  const today = todayIsoInKtm(now);
  const day = todayDayKeyInKtm(now);
  const rows: {
    key: string;
    slotIndex: number;
    time: string;
    student: string;
    subject: string;
    duration: string;
  }[] = [];

  for (const e of enrollments) {
    if (e.status !== "active") continue;
    if (today < e.startDate || today > e.endDate) continue;
    const parsed = parseSlotKey(e.slotKey);
    if (!parsed) {
      if (e.slotKey) {
        warnBadSlotKey("enrollment", e.enrollmentId, e.slotKey);
      }
      continue;
    }
    if (parsed.day !== day) continue;
    const slotIndex = TIME_SLOT_KEYS.indexOf(parsed.slot);
    const minutes = slotDurationMinutes(parsed.slot);
    rows.push({
      key: e.enrollmentId,
      slotIndex,
      time: TIME_SLOT_LABELS[parsed.slot],
      student: e.studentName || "Student",
      subject: e.subjects.length > 0 ? e.subjects.join(" · ") : "Session",
      duration: minutes > 0 ? `${minutes} min` : "",
    });
  }

  // Order by the canonical slot order so morning sessions appear
  // before evening ones.
  rows.sort((a, b) => a.slotIndex - b.slotIndex);
  return rows.map(({ slotIndex: _slotIndex, ...rest }) => rest);
}

/**
 * Sort the marketplace batch list for students: batches with seats
 * left float to the top (full classes sink), newest first within
 * each group. `memberCount` is denormalized on the batch doc; legacy
 * docs without it count as 0 members → seats available (matches the
 * browse UI's `memberCount ?? 0` everywhere). Pure — never mutates
 * the input.
 */
export function sortBatchesForBrowse(
  batches: readonly Batch[],
  maxMembers = MAX_BATCH_MEMBERS,
): Batch[] {
  return [...batches].sort((a, b) => {
    const aHas = (a.memberCount ?? 0) < maxMembers ? 1 : 0;
    const bHas = (b.memberCount ?? 0) < maxMembers ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return b.createdAt - a.createdAt;
  });
}
