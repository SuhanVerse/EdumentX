/**
 * EdumentX — Batches Repository interface
 *
 * The batch data layer for the "Group Batches" feature. Reads and
 * creates batches through the enrollment repository (the single
 * writer for `batches/{tutorUid}/classes`), and adds the two
 * operations the enrollments repo intentionally doesn't expose:
 * adding / removing members after a batch exists.
 *
 * Consumers should use `getBatchesRepository()` from `./dataSource`
 * rather than importing implementations directly, so the
 * `EXPO_PUBLIC_USE_MOCK_DATA` toggle stays in one place.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import type { RosterStudent } from "@/services/batches/types";
import type {
  BatchCallback,
  BatchMemberCallback,
  CreateBatchInput,
} from "@/services/enrollments/EnrollmentRepository";

export type { Batch, BatchMember, RosterStudent } from "@/services/batches/types";
export type { CreateBatchInput };

/** Callback for the tutor's active-roster feed (student picker). */
export type RosterCallback = (students: RosterStudent[]) => void;

/** Input for adding a member to an existing batch. */
export type AddMemberInput = {
  tutorUid: string;
  batchId: string;
  /** The member is keyed by `enrollmentId` so re-adding the same
   *  student is idempotent (matches the `removeEnrollment` cascade
   *  which deletes members by `enrollmentId`). */
  enrollmentId: string;
  studentUid: string;
  studentName: string;
  studentAvatar: string | null;
};

export interface BatchesRepository {
  /** Live list of the tutor's batches (active + ended), newest first. */
  subscribeBatches(
    tutorUid: string,
    onData: BatchCallback,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /** Live members of a single batch. */
  subscribeBatchMembers(
    tutorUid: string,
    batchId: string,
    onData: BatchMemberCallback,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /** Live active roster — the "Pick students" source. */
  subscribeRoster(
    tutorUid: string,
    onData: RosterCallback,
    onError?: (err: Error) => void,
  ): Unsubscribe;

  /** Create a batch + seed its initial members in one transaction. */
  createBatch(input: CreateBatchInput): Promise<{ batchId: string }>;

  /** Add one enrolled student to a batch (idempotent per enrollment). */
  addBatchMember(input: AddMemberInput): Promise<void>;

  /** Remove a member from a batch. */
  removeBatchMember(tutorUid: string, batchId: string, memberId: string): Promise<void>;

  /** Mark a batch ended (direct path — no scan needed). */
  endBatch(tutorUid: string, batchId: string): Promise<void>;
}
