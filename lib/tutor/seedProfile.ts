/**
 * EdumentX — Seed tutor profile builder
 *
 * Maps the existing MOCK_TUTORS into the TutorProfile domain type using
 * only the fields that actually exist in Firestore.
 *
 * Extended fields (sessions, reviews, credentials, demo video) are left
 * at their default empty/null/zero values — they will be populated by
 * real backend features (enrollment, review system, tutor form updates).
 *
 * This is a temporary seed. Replace `getMockTutorProfile` with a
 * Firestore query once the backend ships the extended fields.
 */

import { MOCK_TUTORS, type Tutor } from "@/lib/mock/tutors";
import { createDefaultTutorProfile } from "@/lib/tutor/types";

/**
 * Build a TutorProfile from a Tutor mock entry.
 * Only maps fields that exist in Firestore today.
 */
export function buildTutorProfile(tutor: Tutor): ReturnType<typeof createDefaultTutorProfile> {
  return createDefaultTutorProfile({
    id: tutor.id,
    fullName: tutor.fullName,
    username: tutor.username,
    headline: tutor.headline,
    bio: tutor.bio,
    subjects: tutor.subjects,
    gradesTeaching: tutor.gradesTeaching,
    yearsExperience: tutor.yearsExperience,
    monthlyRateNpr: tutor.monthlyRateNpr,
    location: tutor.location,
    photoUrl: tutor.avatarUrl,
    verificationStatus: tutor.verified ? "approved" : "pending",
    isVerifiedProfessional: tutor.verified,
    rating: tutor.rating,
    reviewCount: tutor.reviewCount,
    // Sessions, reviews, credentials, demo video, etc. remain at defaults (empty/null/0)
  });
}

/**
 * Get a tutor profile by ID from the mock seed.
 */
export function getMockTutorProfile(id: string) {
  const tutor = MOCK_TUTORS.find((t) => t.id === id);
  if (!tutor) return undefined;
  return buildTutorProfile(tutor);
}
