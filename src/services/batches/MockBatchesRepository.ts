/**
 * EdumentX — Mock Batches Repository
 *
 * In-memory `BatchesRepository` used when
 * `EXPO_PUBLIC_USE_MOCK_DATA=true`. Delegates reads + create to
 * `MockEnrollmentRepository` (which owns the seeded batch data and
 * the emitter), and implements member add/remove via the exported
 * mock store mutations in that module so the mock UI stays
 * consistent with `subscribeBatchMembers`.
 */

import {
  MockEnrollmentRepository,
  addMockBatchMember,
  removeMockBatchMember,
} from "@/services/enrollments/MockEnrollmentRepository";
import type { BatchMember } from "@/services/batches/types";

import type {
  AddMemberInput,
  BatchesRepository,
} from "@/services/batches/BatchesRepository";

export const MockBatchesRepository: BatchesRepository = {
  subscribeBatches(tutorUid, onData, onError) {
    return MockEnrollmentRepository.subscribeBatches(tutorUid, onData, onError);
  },

  subscribeBatchMembers(tutorUid, batchId, onData, onError) {
    return MockEnrollmentRepository.subscribeBatchMembers(tutorUid, batchId, onData, onError);
  },

  subscribeRoster(tutorUid, onData, onError) {
    return MockEnrollmentRepository.subscribeEnrollments(
      tutorUid,
      (enrollments) => {
        onData(
          enrollments
            .filter((e) => e.status === "active")
            .map((e) => ({
              enrollmentId: e.enrollmentId,
              studentUid: e.studentUid,
              studentName: e.studentName,
              studentGrade: e.studentGrade,
              studentAvatar: e.studentAvatar,
              subjects: e.subjects,
              slotKey: e.slotKey,
            })),
        );
      },
      onError,
    );
  },

  createBatch(input) {
    return MockEnrollmentRepository.createBatch(input);
  },

  async addBatchMember(input: AddMemberInput) {
    const member: BatchMember = {
      memberId: input.enrollmentId,
      enrollmentId: input.enrollmentId,
      studentUid: input.studentUid,
      studentName: input.studentName,
      studentAvatar: input.studentAvatar,
      joinedAt: Date.now(),
    };
    addMockBatchMember(input.tutorUid, input.batchId, member);
  },

  async removeBatchMember(tutorUid: string, batchId: string, memberId: string) {
    removeMockBatchMember(tutorUid, batchId, memberId);
  },

  async endBatch(tutorUid: string, batchId: string) {
    return MockEnrollmentRepository.endBatch(batchId);
  },
};
