/**
 * EdumentX — Enrollment pending-request helpers
 *
 * Pure functions that compute "slot has an open request" state from
 * the raw enrollment requests array. Sibling to `computeBookedMap`
 * in `derived.ts` — same shape, different semantics.
 *
 * Why a separate file?
 *   - `computeBookedMap` reads enrollments + batches and answers
 *     "tutor has accepted → blue". `computePendingMap` reads only
 *     requests and answers "another student asked, tutor hasn't
 *     decided → amber hourglass overlay". Mixing the two would
 *     conflate two distinct lifecycle events.
 *   - Keeping `derived.ts` focused on Booked (the canonical
 *     state) lets `Enrollment.tsx` and `EnrollmentRequestCard`
 *     import without dragging a new map shape in.
 *
 * No Firestore imports — easy to unit-test in isolation.
 *
 * Phase 1 simplification (Aug 5, 2026): the request payload no
 * longer carries `slotKey` — the student types their preferred
 * days/times into `schedule` text instead. With no slot-level
 * binding on the request, every pending request is "flexible" and
 * doesn't contribute to any specific cell. The map therefore
 * always returns empty. The function and type are kept as a
 * stable import path so the grid's overlay logic remains a
 * no-op rather than breaking the build — if slot-level data is
 * reintroduced later (e.g. the student picks a slot in the
 * sheet again), the function just needs to read `slotKey` here.
 */

import type { EnrollmentRequest } from "./types";

/**
 * `slotKey → count of open requests`. Keys with no pending requests
 * are absent from the map; consumers should use `pendingMap?.has(key)`
 * or `pendingMap?.get(key) ?? 0`.
 *
 * Stored as a `Map` so the cell-level check stays O(1) per render —
 * the grid iterates 42 cells, each looking up one slot key.
 */
export type PendingMap = Map<string, number>;

/**
 * Build a `PendingMap` from the live requests list. Phase 1
 * simplification: requests no longer carry `slotKey`, so this
 * always returns an empty map. Kept as a stable import path —
 * see the file header.
 */
export function computePendingMap(
  _requests: readonly EnrollmentRequest[],
): PendingMap {
  return new Map();
}
