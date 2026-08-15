export const TUTOR_AVATAR_1 = "https://images.unsplash.com/photo-1511629091441-ee46146481b6?w=200&h=200&fit=crop&crop=face";
export const TUTOR_AVATAR_2 = "https://images.unsplash.com/photo-1758685848602-09e52ef9c7d3?w=200&h=200&fit=crop&crop=face";
export const TUTOR_AVATAR_3 = "https://images.unsplash.com/photo-1758336011136-343678e4fc05?w=200&h=200&fit=crop&crop=face";
export const TUTOR_AVATAR_4 = "https://images.unsplash.com/photo-1622867301827-aac6384dce52?w=200&h=200&fit=crop&crop=face";
export const STUDENT_AVATAR_1 = "https://images.unsplash.com/photo-1758525861725-e0fcc0c1301c?w=200&h=200&fit=crop&crop=face";
export const MAP_IMG = "https://images.unsplash.com/photo-1589791933711-d68aae51e609?w=400&h=200&fit=crop";
export const COVER_IMG_1 = "https://images.unsplash.com/photo-1762330917056-e69b34329ddf?w=400&h=200&fit=crop";

export type TutorTier = "pro" | "student" | "phone";
export type TutorType = "professional" | "student-tutor";

export interface Tutor {
  id: string;
  name: string;
  subjects: string[];
  rating: number;
  reviews: number;
  experience: number;
  rate: number;
  verified: boolean;
  distance: number;
  area: string;
  avatar: string;
  coverImg: string;
  about: string;
  education: string;
  /** v2 spec additions */
  tier?: TutorTier;
  tutorType?: TutorType;
  minBatchRate?: number;
  recommendedBatchRate?: number;
  capacity?: number;
  currentStudents?: number;
  responseRate?: number;
  profileCompletion?: number;
  cancellationRate?: number;
  /** Sub-ratings — Teaching, Punctuality, Communication, Knowledge, Overall */
  subRatings?: { teaching: number; punctuality: number; communication: number; knowledge: number; overall: number };
  ratingDistribution?: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

/** Weekly time slots available to tutors. */
export const TIME_SLOTS = [
  { id: "morning-1", label: "Morning · 6–9 AM" },
  { id: "morning-2", label: "Morning · 9–12 PM" },
  { id: "afternoon-1", label: "Afternoon · 12–3 PM" },
  { id: "afternoon-2", label: "Afternoon · 3–5 PM" },
  { id: "evening-1", label: "Evening · 5–7 PM" },
  { id: "evening-2", label: "Evening · 7–9 PM" },
] as const;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Sample availability for tutor 1 (true = available). */
export const SAMPLE_AVAILABILITY: Record<string, Record<string, "available" | "booked" | "off">> = {
  Mon: { "morning-1": "off", "morning-2": "off", "afternoon-1": "off", "afternoon-2": "available", "evening-1": "available", "evening-2": "booked" },
  Tue: { "morning-1": "off", "morning-2": "off", "afternoon-1": "off", "afternoon-2": "available", "evening-1": "available", "evening-2": "available" },
  Wed: { "morning-1": "off", "morning-2": "off", "afternoon-1": "off", "afternoon-2": "available", "evening-1": "booked", "evening-2": "available" },
  Thu: { "morning-1": "off", "morning-2": "off", "afternoon-1": "off", "afternoon-2": "available", "evening-1": "available", "evening-2": "available" },
  Fri: { "morning-1": "off", "morning-2": "off", "afternoon-1": "off", "afternoon-2": "available", "evening-1": "available", "evening-2": "booked" },
  Sat: { "morning-1": "available", "morning-2": "available", "afternoon-1": "available", "afternoon-2": "off", "evening-1": "off", "evening-2": "off" },
  Sun: { "morning-1": "off", "morning-2": "off", "afternoon-1": "off", "afternoon-2": "off", "evening-1": "off", "evening-2": "off" },
};

export const TUTORS: Tutor[] = [
  {
    id: "1",
    name: "Ram Sharma",
    subjects: ["Mathematics", "Physics"],
    rating: 4.8,
    reviews: 42,
    experience: 5,
    rate: 3500,
    verified: true,
    distance: 0.8,
    area: "Lazimpat, Kathmandu",
    avatar: TUTOR_AVATAR_1,
    coverImg: MAP_IMG,
    about: "Experienced mathematics and physics tutor with 5 years of teaching in Kathmandu Valley. Specializes in board exam and +2 preparation. I focus on building strong conceptual foundations.",
    education: "M.Sc. Mathematics, Tribhuvan University",
    tier: "pro", tutorType: "professional",
    minBatchRate: 2200, recommendedBatchRate: 2500,
    capacity: 8, currentStudents: 5,
    responseRate: 96, profileCompletion: 100, cancellationRate: 2,
    subRatings: { teaching: 4.9, punctuality: 4.8, communication: 4.7, knowledge: 4.9, overall: 4.8 },
    ratingDistribution: { 5: 32, 4: 7, 3: 2, 2: 1, 1: 0 },
  },
  {
    id: "2",
    name: "Sita Adhikari",
    subjects: ["Science", "Biology", "Chemistry"],
    rating: 4.6,
    reviews: 28,
    experience: 3,
    rate: 2800,
    verified: true,
    distance: 1.2,
    area: "Patan, Lalitpur",
    avatar: TUTOR_AVATAR_2,
    coverImg: COVER_IMG_1,
    about: "Science tutor specializing in board exam preparation for grades 9–12. I use diagrams and visual methods to make complex topics easy.",
    education: "B.Sc. Biology, Tribhuvan University",
    tier: "pro", tutorType: "professional",
    minBatchRate: 1800, recommendedBatchRate: 2100,
    capacity: 6, currentStudents: 4,
    responseRate: 88, profileCompletion: 90, cancellationRate: 4,
    subRatings: { teaching: 4.7, punctuality: 4.8, communication: 4.5, knowledge: 4.6, overall: 4.6 },
    ratingDistribution: { 5: 18, 4: 7, 3: 2, 2: 1, 1: 0 },
  },
  {
    id: "3",
    name: "Bikash Karki",
    subjects: ["English", "Social Studies"],
    rating: 4.3,
    reviews: 15,
    experience: 2,
    rate: 2200,
    verified: false,
    distance: 1.5,
    area: "Baneshwor, Kathmandu",
    avatar: TUTOR_AVATAR_3,
    coverImg: MAP_IMG,
    about: "English and social studies tutor for grades 8–10. I help students improve reading, writing, and communication skills.",
    education: "B.A. English, Tribhuvan University",
    tier: "student", tutorType: "student-tutor",
    minBatchRate: 1500, recommendedBatchRate: 1700,
    capacity: 5, currentStudents: 5,
    responseRate: 78, profileCompletion: 70, cancellationRate: 6,
    subRatings: { teaching: 4.3, punctuality: 4.5, communication: 4.4, knowledge: 4.2, overall: 4.3 },
    ratingDistribution: { 5: 7, 4: 5, 3: 2, 2: 1, 1: 0 },
  },
  {
    id: "4",
    name: "Maya Thapa",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    rating: 4.9,
    reviews: 67,
    experience: 8,
    rate: 4000,
    verified: true,
    distance: 0.5,
    area: "Maharajgunj, Kathmandu",
    avatar: TUTOR_AVATAR_4,
    coverImg: COVER_IMG_1,
    about: "Top-rated PCM tutor with 8+ years experience teaching +2 and board exam students. 95% of my students achieve distinction.",
    education: "M.Sc. Physics, Kathmandu University",
    tier: "pro", tutorType: "professional",
    minBatchRate: 2500, recommendedBatchRate: 2800,
    capacity: 12, currentStudents: 9,
    responseRate: 99, profileCompletion: 100, cancellationRate: 1,
    subRatings: { teaching: 5.0, punctuality: 4.9, communication: 4.8, knowledge: 5.0, overall: 4.9 },
    ratingDistribution: { 5: 58, 4: 7, 3: 1, 2: 1, 1: 0 },
  },
  {
    id: "5",
    name: "Anil Shrestha",
    subjects: ["Computer Science", "Mathematics"],
    rating: 4.7,
    reviews: 33,
    experience: 4,
    rate: 3200,
    verified: true,
    distance: 2.1,
    area: "Thamel, Kathmandu",
    avatar: TUTOR_AVATAR_1,
    coverImg: COVER_IMG_1,
    about: "Computer science and mathematics tutor for grades 11–12 and BCA/BSc.IT students. Expert in programming, algorithms, and database.",
    education: "B.Sc. CSIT, Pokhara University",
    tier: "student", tutorType: "student-tutor",
    minBatchRate: 2000, recommendedBatchRate: 2200,
    capacity: 6, currentStudents: 3,
    responseRate: 85, profileCompletion: 85, cancellationRate: 3,
    subRatings: { teaching: 4.7, punctuality: 4.6, communication: 4.8, knowledge: 4.7, overall: 4.7 },
    ratingDistribution: { 5: 22, 4: 8, 3: 2, 2: 1, 1: 0 },
  },
];

/** Pending batch invitation shown in MyEnrollments */
export const BATCH_INVITATIONS = [
  {
    id: "bi1",
    tutor: "Ram Sharma",
    subject: "Mathematics",
    batchSize: 4,
    currentRate: 3500,
    batchRate: 2500,
    schedule: "Mon/Wed/Fri · 6 PM",
    expiresIn: "36 hr",
  },
];

export const REVIEWS = [
  { id: "1", name: "Aarav Tamang", rating: 5, date: "2 weeks ago", text: "Excellent teacher! Ram sir explains concepts very clearly. My Math grade improved from C to A+.", avatar: STUDENT_AVATAR_1 },
  { id: "2", name: "Priya Maharjan", rating: 5, date: "1 month ago", text: "Very patient and knowledgeable. Highly recommend for board exam preparation.", avatar: TUTOR_AVATAR_4 },
  { id: "3", name: "Sanjay Pandey", rating: 4, date: "2 months ago", text: "Good teaching methods, always on time. Helped me a lot with Physics.", avatar: TUTOR_AVATAR_3 },
];

export const ENROLLMENTS = [
  {
    id: "1",
    tutor: TUTORS[0],
    subjects: ["Mathematics", "Physics"],
    startDate: "2026-03-01",
    endDate: "2026-06-01",
    status: "active" as const,
    plan: "3 months",
    schedule: "Mon, Wed, Fri",
  },
  {
    id: "2",
    tutor: TUTORS[1],
    subjects: ["Science"],
    startDate: "2026-04-15",
    endDate: "2026-05-15",
    status: "pending" as const,
    plan: "1 month",
    schedule: "Tue, Thu",
  },
  {
    id: "3",
    tutor: TUTORS[2],
    subjects: ["English"],
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    status: "past" as const,
    plan: "3 months",
    schedule: "Mon, Wed, Fri, Sat",
  },
];

export const PENDING_REQUESTS = [
  {
    id: "1",
    student: { name: "Aarav Tamang", grade: "Grade 10", avatar: STUDENT_AVATAR_1 },
    subjects: ["Mathematics"],
    plan: "3 months",
    schedule: "Mon, Wed, Fri",
    startDate: "2026-05-10",
    status: "pending" as const,
  },
  {
    id: "2",
    student: { name: "Priya Maharjan", grade: "Grade 11 (Science)", avatar: TUTOR_AVATAR_4 },
    subjects: ["Physics", "Chemistry"],
    plan: "6 months",
    schedule: "Tue, Thu, Sat",
    startDate: "2026-05-15",
    status: "pending" as const,
  },
];

export const ADMIN_USERS = [
  { id: "1", name: "Ram Sharma", role: "Tutor", joined: "Jan 12, 2025", status: "active", avatar: TUTOR_AVATAR_1, verified: true },
  { id: "2", name: "Sita Adhikari", role: "Tutor", joined: "Feb 3, 2025", status: "active", avatar: TUTOR_AVATAR_2, verified: true },
  { id: "3", name: "Bikash Karki", role: "Tutor", joined: "Mar 20, 2025", status: "active", avatar: TUTOR_AVATAR_3, verified: false },
  { id: "4", name: "Aarav Tamang", role: "Student", joined: "Apr 5, 2025", status: "active", avatar: STUDENT_AVATAR_1, verified: false },
  { id: "5", name: "Maya Thapa", role: "Tutor", joined: "Jan 28, 2025", status: "suspended", avatar: TUTOR_AVATAR_4, verified: true },
  { id: "6", name: "Anil Shrestha", role: "Tutor", joined: "Feb 14, 2025", status: "active", avatar: TUTOR_AVATAR_1, verified: true },
  { id: "7", name: "Priya Maharjan", role: "Student", joined: "May 1, 2025", status: "active", avatar: TUTOR_AVATAR_4, verified: false },
];

/** Session slot system — every tutor has exactly 3 slots */
export type SlotType = "one-to-one" | "public-batch" | "private-batch";
export type SlotStatus = "empty" | "open" | "full";

export interface SessionSlot {
  id: string;
  type: SlotType | null; // null when empty
  status: SlotStatus;
  /** label, e.g. subject or batch name */
  label?: string;
  subject?: string;
  /** schedule snippet */
  schedule?: string;
  /** student counts — for batches, capacity is 4–5 */
  students: number;
  capacity: number;
  /** Session code for private batches (shareable) */
  code?: string;
  /** Whether the tutor is accepting new join requests for this slot */
  acceptingRequests: boolean;
}

/** Tutor 1's session board — used on TutorProfile and TutorDashboard */
export const SESSION_SLOTS: SessionSlot[] = [
  {
    id: "slot-1",
    type: "public-batch",
    status: "open",
    label: "Math · Grade 10 Board Batch",
    subject: "Mathematics",
    schedule: "Mon/Wed/Fri · 6 PM",
    students: 3,
    capacity: 5,
    acceptingRequests: true,
  },
  {
    id: "slot-2",
    type: "private-batch",
    status: "full",
    label: "Physics · Aarav's batch",
    subject: "Physics",
    schedule: "Tue/Thu · 5 PM",
    students: 5,
    capacity: 5,
    code: "RS-PH-7K2X",
    acceptingRequests: false,
  },
  {
    id: "slot-3",
    type: null,
    status: "empty",
    students: 0,
    capacity: 1,
    acceptingRequests: true,
  },
];

/** Pending batch-related requests for tutor inbox (conversion + join requests) */
export type BatchRequestKind = "conversion" | "join";

export interface BatchRequest {
  id: string;
  kind: BatchRequestKind;
  student: { name: string; grade: string; avatar: string };
  subject: string;
  /** For conversion requests: the existing 1-to-1 enrollment ID. */
  fromEnrollmentId?: string;
  /** For join requests: which slot/session they want to join. */
  slotId?: string;
  sessionCode?: string;
  message?: string;
  submittedAt: string;
  status: "pending" | "accepted" | "rejected";
}

export const BATCH_REQUESTS: BatchRequest[] = [
  {
    id: "br1",
    kind: "conversion",
    student: { name: "Aarav Tamang", grade: "Grade 10", avatar: STUDENT_AVATAR_1 },
    subject: "Physics",
    fromEnrollmentId: "1",
    message: "Hi sir, I'd like to convert my 1-to-1 to a private batch so my friends can join.",
    submittedAt: "2 hr ago",
    status: "pending",
  },
  {
    id: "br2",
    kind: "join",
    student: { name: "Bishal Rai", grade: "Grade 10", avatar: TUTOR_AVATAR_3 },
    subject: "Physics",
    slotId: "slot-2",
    sessionCode: "RS-PH-7K2X",
    submittedAt: "1 hr ago",
    status: "pending",
  },
  {
    id: "br3",
    kind: "join",
    student: { name: "Sushma Khadka", grade: "Grade 10", avatar: TUTOR_AVATAR_2 },
    subject: "Mathematics",
    slotId: "slot-1",
    submittedAt: "30 min ago",
    status: "pending",
  },
];

export const VERIFICATION_QUEUE = [
  { id: "1", name: "Bikash Karki", submitted: "Apr 28, 2025", status: "pending", avatar: TUTOR_AVATAR_3, docs: ["Citizenship ID", "Degree Certificate", "Demo Video"] },
  { id: "2", name: "Sanjay Pandey", submitted: "Apr 30, 2025", status: "pending", avatar: TUTOR_AVATAR_1, docs: ["Citizenship ID", "Master's Certificate"] },
  { id: "3", name: "Anita Gurung", submitted: "May 1, 2025", status: "pending", avatar: TUTOR_AVATAR_2, docs: ["Citizenship ID", "Academic Transcript", "Demo Video"] },
  { id: "4", name: "Ram Sharma", submitted: "Mar 15, 2025", status: "approved", avatar: TUTOR_AVATAR_1, docs: ["Citizenship ID", "M.Sc. Certificate", "Demo Video"] },
  { id: "5", name: "Maya Thapa", submitted: "Feb 20, 2025", status: "approved", avatar: TUTOR_AVATAR_4, docs: ["Citizenship ID", "M.Sc. Certificate"] },
];
