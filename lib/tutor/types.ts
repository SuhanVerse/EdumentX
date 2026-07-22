/**
 * EdumentX — Tutor domain types
 *
 * Canonical domain model for tutor profiles used across the student-facing
 * discovery surfaces (StudentHome, MapSearch, TutorDetailsScreen, etc.).
 *
 * This type is NOT tied to the Firestore document shape. The
 * `tutorMapper` handles the raw Firestore → TutorProfile translation.
 * Future ranking / AI layers consume this same type.
 *
 * Phase 1: fields sourced from Firestore `users/{uid}/tutorProfile/default`
 *          + mock seed data for reviews / sessions / demo lesson.
 * Phase 2+: location-based fields, rating fields, availability, etc.
 */

// ─── Location ────────────────────────────────────────────────────────────────

export type TutorLocation = {
  neighborhood: string;
  city: string;
};

// ─── Session / Slot ──────────────────────────────────────────────────────────

export type SessionType = "public_batch" | "private_batch";
export type SessionStatus = "open" | "accepting" | "full";

export type TutorSession = {
  id: string;
  type: SessionType;
  subject: string;
  name: string;
  schedule: string;
  days: string[];
  seatsFilled: number;
  seatsTotal: number;
  status: SessionStatus;
};

// ─── Review ──────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  reviewerName: string;
  reviewerAvatar: string | null;
  verified: boolean;
  rating: number;
  timestamp: string;
  comment: string;
};

// ─── Category ratings ────────────────────────────────────────────────────────

export type CategoryRatings = {
  teaching: number;
  punctuality: number;
  communication: number;
  knowledge: number;
  overall: number;
};

// ─── TutorProfile — the full domain model ────────────────────────────────────

export interface TutorProfile {
  // ── Basic identity ──
  id: string;
  fullName: string;
  username: string;
  headline: string;
  bio: string;

  // ── Teaching ──
  subjects: string[];
  gradesTeaching: string[];
  yearsExperience: number;

  // ── Pricing ──
  monthlyRateNpr: number;
  groupBatchRateNpr: number;
  minBatchSize: number;

  // ── Location ──
  location: TutorLocation;
  /** Approximate distance from the student's location (km). */
  distanceKm: number;

  // ── Media ──
  photoUrl: string | null;
  coverUrl: string | null;

  // ── Verification ──
  verificationStatus: "pending" | "approved" | "rejected" | "more_info";
  isVerifiedProfessional: boolean;

  // ── Stats ──
  rating: number;
  reviewCount: number;
  responseRate: number;

  // ── Contact ──
  phone: string;
  email: string;

  // ── Credentials ──
  degree: string;
  institution: string;

  // ── Demo lesson ──
  demoVideoUrl: string | null;
  demoVideoDuration: string;

  // ── Sessions ──
  sessions: TutorSession[];
  currentStudents: number;
  studentCapacity: number;

  // ── Reviews ──
  reviewBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  categoryRatings: CategoryRatings;
  reviews: Review[];
}

// ─── Builder helper for creating mock / seed profiles ────────────────────────

export function createDefaultTutorProfile(overrides?: Partial<TutorProfile>): TutorProfile {
  return {
    id: "",
    fullName: "",
    username: "",
    headline: "",
    bio: "",
    subjects: [],
    gradesTeaching: [],
    yearsExperience: 0,
    monthlyRateNpr: 0,
    groupBatchRateNpr: 0,
    minBatchSize: 3,
    location: { neighborhood: "", city: "" },
    distanceKm: 0,
    photoUrl: null,
    coverUrl: null,
    verificationStatus: "pending",
    isVerifiedProfessional: false,
    rating: 0,
    reviewCount: 0,
    responseRate: 0,
    phone: "",
    email: "",
    degree: "",
    institution: "",
    demoVideoUrl: null,
    demoVideoDuration: "",
    sessions: [],
    currentStudents: 0,
    studentCapacity: 0,
    reviewBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    categoryRatings: {
      teaching: 0,
      punctuality: 0,
      communication: 0,
      knowledge: 0,
      overall: 0,
    },
    reviews: [],
    ...overrides,
  };
}
