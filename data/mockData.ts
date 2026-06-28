import { Ionicons } from "@expo/vector-icons";

/**
 * EdumentX — local mock data for the student UI surfaces.
 *
 * Lives at `@/data/mockData` so the AIChat / Enrollment / MapSearch
 * screens have something to render before the real Firestore queries
 * land. Everything here is hand-crafted placeholder — none of it is
 * persisted, none of it crosses module boundaries into auth or
 * profile code.
 *
 * Kept narrow on purpose: only the fields each surface actually reads.
 */

export type Tutor = {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  reviews: number;
  rate: number; // NPR / month
  distance: number; // km
  verified: boolean;
  subjects: string[];
};

export type EnrollmentStatus = "active" | "pending" | "past";

export type Enrollment = {
  id: string;
  status: EnrollmentStatus;
  tutor: { name: string; avatar?: string; verified: boolean };
  subjects: string[];
  startDate: string;
  endDate: string;
  schedule: string;
  plan: string;
  rate: number; // NPR / month
  /** True for completed entries that ended well; false for cancelled / refunded. */
  outcomeNote?: string;
};

export type BatchInvitation = {
  id: string;
  tutor: string;
  subject: string;
  expiresIn: string;
  currentRate: number;
  batchRate: number;
  batchSize: number;
  schedule: string;
};

/** Avatar letters used in the fallback initials avatar. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const TUTORS: Tutor[] = [
  {
    id: "t1",
    name: "Ankit Karki",
    rating: 4.8,
    reviews: 64,
    rate: 6000,
    distance: 1.4,
    verified: true,
    subjects: ["Math", "Physics"],
  },
  {
    id: "t2",
    name: "Sushma Adhikari",
    rating: 4.7,
    reviews: 41,
    rate: 4500,
    distance: 2.6,
    verified: true,
    subjects: ["English", "Nepali"],
  },
  {
    id: "t3",
    name: "Bibek Tamang",
    rating: 4.3,
    reviews: 22,
    rate: 3500,
    distance: 3.1,
    verified: false,
    subjects: ["Computer", "Accounts"],
  },
  {
    id: "t4",
    name: "Pranav Joshi",
    rating: 4.9,
    reviews: 87,
    rate: 8500,
    distance: 4.2,
    verified: true,
    subjects: ["Chemistry", "Biology"],
  },
  {
    id: "t5",
    name: "Riya Maharjan",
    rating: 4.6,
    reviews: 33,
    rate: 5000,
    distance: 1.9,
    verified: true,
    subjects: ["Math", "Computer"],
  },
];

export const ENROLLMENTS: Enrollment[] = [
  {
    id: "e1",
    status: "active",
    tutor: { name: "Ankit Karki", verified: true },
    subjects: ["Math", "Physics"],
    startDate: "Mar 12",
    endDate: "Aug 30",
    schedule: "Mon · Wed · Fri · 5:00–6:00 PM",
    plan: "4 sessions / week",
    rate: 6000,
  },
  {
    id: "e2",
    status: "active",
    tutor: { name: "Sushma Adhikari", verified: true },
    subjects: ["English"],
    startDate: "Apr 02",
    endDate: "Jul 15",
    schedule: "Tue · Thu · 4:30–5:30 PM",
    plan: "2 sessions / week",
    rate: 4500,
  },
  {
    id: "e3",
    status: "pending",
    tutor: { name: "Pranav Joshi", verified: true },
    subjects: ["Chemistry"],
    startDate: "Jul 10",
    endDate: "Oct 20",
    schedule: "Sat · 10:00–12:00 AM",
    plan: "1 session / week",
    rate: 8500,
  },
  {
    id: "e4",
    status: "pending",
    tutor: { name: "Riya Maharjan", verified: true },
    subjects: ["Computer"],
    startDate: "Aug 01",
    endDate: "Nov 30",
    schedule: "Mon · Fri · 6:00–7:00 PM",
    plan: "2 sessions / week",
    rate: 5000,
  },
  {
    id: "e5",
    status: "past",
    tutor: { name: "Bibek Tamang", verified: false },
    subjects: ["Accounts"],
    startDate: "Sep 5, 2025",
    endDate: "Feb 20, 2026",
    schedule: "Wed · 4:00–5:00 PM",
    plan: "1 session / week",
    rate: 3500,
    outcomeNote: "Completed · 18/18 sessions attended",
  },
  {
    id: "e6",
    status: "past",
    tutor: { name: "Sushma Adhikari", verified: true },
    subjects: ["Nepali"],
    startDate: "Jun 1, 2025",
    endDate: "Nov 15, 2025",
    schedule: "Tue · 5:00–6:00 PM",
    plan: "1 session / week",
    rate: 4500,
    outcomeNote: "Completed · 22/24 sessions attended",
  },
];

export const BATCH_INVITATIONS: BatchInvitation[] = [
  {
    id: "b1",
    tutor: "Ankit Karki",
    subject: "Math · SEE",
    expiresIn: "Expires in 2d",
    currentRate: 6000,
    batchRate: 4500,
    batchSize: 4,
    schedule: "Sat · 9:00–11:00 AM",
  },
];

/** Re-export a couple of icons for use inside this data module. */
export const MockIcons = {
  users: Ionicons,
};
