/**
 * EdumentX — Admin dashboard mock counts
 *
 * Phase 5 will wire these to live Firestore count queries. For now
 * each admin surface (AdminHome cards, VerificationQueue, UserManagement)
 * reads the same numbers from here so they stay consistent.
 *
 * Why not pull the counts from the existing `MOCK_USERS` /
 * `VERIFICATION_QUEUE` arrays in their respective files? Those arrays
 * are screen-local mocks. Cross-screen imports would couple the
 * surfaces in a way the live-read code (Phase 5) doesn't need. A
 * single mock-stats module is the cheap place to put the numbers
 * until live queries replace them.
 *
 * Live-read contract (Phase 5):
 *   pendingVerifications  = count(tutorVerifications where status == "pending")
 *   pendingEdits          = count(tutorProfileUpdates where status == "pending")
 *   infoRequested         = count(tutorVerifications where status == "more_info")
 *   activeUsers           = count(users where status == "active")
 *   suspendedUsers        = count(users where status == "suspended")
 *   deletedUsers          = count(users where status == "deleted")
 *   pendingTutorReviews   = pendingVerifications + pendingEdits
 */

export type AdminStats = {
  pendingVerifications: number;
  pendingEdits: number;
  infoRequested: number;
  activeUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  totalUsers: number;
  pendingTutorReviews: number;
};

export const MOCK_ADMIN_STATS: AdminStats = {
  // VerificationQueue.tsx VERIFICATION_QUEUE has 2 pending, 1 approved,
  // 1 more_info. We add a hypothetical 3rd pending edit entry to
  // exercise the new "Pending Edits" section.
  pendingVerifications: 2,
  pendingEdits: 1,
  infoRequested: 1,
  // UserManagement.tsx MOCK_USERS has 4 active, 1 suspended, 1 deleted.
  activeUsers: 4,
  suspendedUsers: 1,
  deletedUsers: 1,
  totalUsers: 6,
  // The AdminHome badge for "Verification Queue" surfaces any
  // open review (verifications + edits + info requests), so the
  // admin sees the full work backlog at a glance.
  pendingTutorReviews: 4,
};
