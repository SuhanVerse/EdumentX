/**
 * EdumentX — Batch domain types
 *
 * `Batch` / `BatchMember` are the canonical shapes already defined in
 * `services/enrollments/types.ts` (the enrollment repo is the single
 * writer for batches — `createBatch` seeds members in one
 * transaction). This module re-exports them and adds the
 * roster-derived picker type used by the batch creation UI.
 */

export type { Batch, BatchMember } from "@/services/enrollments/types";

/**
 * An enrolled student the tutor can add to a batch. Derived from the
 * live roster (`enrollments/{tutorUid}/roster`, status "active") so
 * the student picker always reflects the tutor's current students.
 */
export interface RosterStudent {
  enrollmentId: string;
  studentUid: string;
  studentName: string;
  studentGrade: string;
  studentAvatar: string | null;
  subjects: string[];
  slotKey: string;
}
