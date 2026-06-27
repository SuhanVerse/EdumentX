/**
 * EdumentX — Mock tutor seed.
 *
 * 12 hand-typed tutors spanning Kathmandu / Lalitpur / Bhaktapur. Used
 * by `student_home.tsx` (after the real `tutors` Firestore collection
 * lands) and by the `<TutorCard>` primitive during local development
 * of the Discover screen.
 *
 * Subject tokens follow the existing student-side draft vocabulary
 * (Mathematics, Science, English, Nepali, Accountancy, Economics,
 * Computer Science). If we later centralise a SUBJECTS list in
 * `constants/`, update these entries to match — keeping the source
 * vocabulary in one place matters.
 *
 * Locations use authentic neighbourhood names (Baluwatar, Patan
 * Dhoka, Bhaisepati, etc.) so the seed feels real to a Nepali tester
 * rather than "KTM-1, KTM-2, KTM-3".
 *
 * `monthlyRateNpr` spans 8,000–25,000 to exercise the format range.
 * `verified: true` on 9 of 12 entries — the rest are unverified tutors
 * still in onboarding.
 */
export type TutorLocation = {
  neighborhood: string;
  city: 'Kathmandu' | 'Lalitpur' | 'Bhaktapur';
};

export type Tutor = {
  id: string;
  fullName: string;
  /** Custom username for marketplace display (3–30 chars). */
  username: string;
  headline: string;
  bio: string;
  subjects: string[];
  gradesTeaching: string[];
  yearsExperience: number;
  /** Flat monthly rate in NPR. */
  monthlyRateNpr: number;
  location: TutorLocation;
  /** Synthetic — real reviews land with the `reviews/{tutorId}`
   *  collection in a later phase. */
  rating: number;
  reviewCount: number;
  verified: boolean;
  /** Avatar URL — wired in once Supabase Storage uploads ship. */
  avatarUrl: string | null;
  /** Percentage of inbound messages answered within 24h. */
  responseRate: number;
};

// ─── Seed ────────────────────────────────────────────────────────────────────

export const MOCK_TUTORS: readonly Tutor[] = [
  {
    id: 't-001',
    fullName: 'Saraswoti Adhikari',
    username: 'saraswoti_a',
    headline: 'Mathematics + SEE prep · 8 yrs',
    bio: 'Patient, exam-focused tutor. Specialises in SEE and +2 Mathematics. Lessons in English or Nepali.',
    subjects: ['Mathematics'],
    gradesTeaching: ['9', '10', '11', '12'],
    yearsExperience: 8,
    monthlyRateNpr: 18000,
    location: { neighborhood: 'Baluwatar', city: 'Kathmandu' },
    rating: 4.8,
    reviewCount: 47,
    verified: true,
    avatarUrl: null,
    responseRate: 96,
  },
  {
    id: 't-002',
    fullName: 'Ramesh Karki',
    username: 'ramesh.karki',
    headline: 'Physics · class 11–12 engineering prep',
    bio: 'BSc Physics (TU). 5 years tutoring experience. Exam-oriented + conceptual clarity.',
    subjects: ['Physics', 'Mathematics'],
    gradesTeaching: ['11', '12'],
    yearsExperience: 5,
    monthlyRateNpr: 20000,
    location: { neighborhood: 'New Baneshwor', city: 'Kathmandu' },
    rating: 4.6,
    reviewCount: 23,
    verified: true,
    avatarUrl: null,
    responseRate: 90,
  },
  {
    id: 't-003',
    fullName: 'Pramila Tamang',
    username: 'pramila.t',
    headline: 'English + Communication · all grades',
    bio: 'MA English (TU). IELTS 7.5. Friendly with shy students — builds confidence before grammar.',
    subjects: ['English'],
    gradesTeaching: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    yearsExperience: 12,
    monthlyRateNpr: 14000,
    location: { neighborhood: 'Patan Dhoka', city: 'Lalitpur' },
    rating: 4.9,
    reviewCount: 81,
    verified: true,
    avatarUrl: null,
    responseRate: 99,
  },
  {
    id: 't-004',
    fullName: 'Bibek Shrestha',
    username: 'bibek.shrestha',
    headline: 'Accountancy + Economics · +2 management',
    bio: 'CA student. Specialises in NEB +2 Management stream. Weekly mock-test practice.',
    subjects: ['Accountancy', 'Economics'],
    gradesTeaching: ['11', '12'],
    yearsExperience: 3,
    monthlyRateNpr: 16000,
    location: { neighborhood: 'Mahalaxmisthan', city: 'Lalitpur' },
    rating: 4.4,
    reviewCount: 14,
    verified: true,
    avatarUrl: null,
    responseRate: 88,
  },
  {
    id: 't-005',
    fullName: 'Anita Pradhan',
    username: 'anita.p',
    headline: 'Nepali literature · grades 6–10',
    bio: 'M.Ed Nepali. Patient with weak readers; uses short-story recitations.',
    subjects: ['Nepali'],
    gradesTeaching: ['6', '7', '8', '9', '10'],
    yearsExperience: 7,
    monthlyRateNpr: 10000,
    location: { neighborhood: 'Bhaisepati', city: 'Lalitpur' },
    rating: 4.7,
    reviewCount: 36,
    verified: true,
    avatarUrl: null,
    responseRate: 92,
  },
  {
    id: 't-006',
    fullName: 'Dinesh Maharjan',
    username: 'dinesh.m',
    headline: 'Science (SEE) · practical + theory',
    bio: 'BSc Biotech. School teacher + home tutor. Hands-on experiments via low-cost kits.',
    subjects: ['Science'],
    gradesTeaching: ['9', '10'],
    yearsExperience: 4,
    monthlyRateNpr: 12000,
    location: { neighborhood: 'Swayambhunath', city: 'Kathmandu' },
    rating: 4.3,
    reviewCount: 18,
    verified: false,
    avatarUrl: null,
    responseRate: 80,
  },
  {
    id: 't-007',
    fullName: 'Kabita Joshi',
    username: 'kabita.j',
    headline: 'Mathematics + Science · primary school',
    bio: 'B.Ed Primary. Warm with younger kids. Activity-based learning.',
    subjects: ['Mathematics', 'Science'],
    gradesTeaching: ['1', '2', '3', '4', '5'],
    yearsExperience: 6,
    monthlyRateNpr: 9000,
    location: { neighborhood: 'Taumadhi', city: 'Bhaktapur' },
    rating: 4.8,
    reviewCount: 52,
    verified: true,
    avatarUrl: null,
    responseRate: 95,
  },
  {
    id: 't-008',
    fullName: 'Manish Thapa',
    username: 'manish.thapa',
    headline: 'Computer Science + Mathematics',
    bio: 'BSc CSIT. Coding fundamentals + SEE/+2 Maths. Available evenings.',
    subjects: ['Computer Science', 'Mathematics'],
    gradesTeaching: ['9', '10', '11', '12'],
    yearsExperience: 2,
    monthlyRateNpr: 15000,
    location: { neighborhood: 'Kalanki', city: 'Kathmandu' },
    rating: 4.2,
    reviewCount: 9,
    verified: false,
    avatarUrl: null,
    responseRate: 78,
  },
  {
    id: 't-009',
    fullName: 'Laxmi Bhattarai',
    username: 'laxmi.b',
    headline: 'Economics · +2 humanities & management',
    bio: 'MA Economics. 10+ years. Strong grasp of micro + macro concepts.',
    subjects: ['Economics'],
    gradesTeaching: ['11', '12'],
    yearsExperience: 10,
    monthlyRateNpr: 17000,
    location: { neighborhood: 'Lalitpur Sub-Metropolis', city: 'Lalitpur' },
    rating: 4.7,
    reviewCount: 41,
    verified: true,
    avatarUrl: null,
    responseRate: 91,
  },
  {
    id: 't-010',
    fullName: 'Hari Prasad',
    username: 'hari.prasad',
    headline: 'Mathematics · grade 8–10',
    bio: 'Retired school teacher. Calm, methodical, great for students who need structure.',
    subjects: ['Mathematics'],
    gradesTeaching: ['8', '9', '10'],
    yearsExperience: 11,
    monthlyRateNpr: 8000,
    location: { neighborhood: 'Suryabinayak', city: 'Bhaktapur' },
    rating: 4.6,
    reviewCount: 28,
    verified: true,
    avatarUrl: null,
    responseRate: 85,
  },
  {
    id: 't-011',
    fullName: 'Sushila Rana',
    username: 'sushila.r',
    headline: 'English literature · grades 5–10',
    bio: 'MA English Lit. Story-based pedagogy — kids remember more.',
    subjects: ['English'],
    gradesTeaching: ['5', '6', '7', '8', '9', '10'],
    yearsExperience: 9,
    monthlyRateNpr: 13000,
    location: { neighborhood: 'Gongabu', city: 'Kathmandu' },
    rating: 4.5,
    reviewCount: 33,
    verified: false,
    avatarUrl: null,
    responseRate: 87,
  },
  {
    id: 't-012',
    fullName: 'Rajan Khadka',
    username: 'rajan.k',
    headline: 'Science + Mathematics · grade 9–10',
    bio: 'BSc General. Hybrid lessons — text + low-cost demo videos.',
    subjects: ['Science', 'Mathematics'],
    gradesTeaching: ['9', '10'],
    yearsExperience: 5,
    monthlyRateNpr: 11000,
    location: { neighborhood: 'Balkhu', city: 'Kathmandu' },
    rating: 4.4,
    reviewCount: 17,
    verified: true,
    avatarUrl: null,
    responseRate: 89,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const nprFormat = new Intl.NumberFormat('en-NP');

/** Format an NPR amount as "NPR X,XXX" (no decimal). */
export function formatNpr(amount: number): string {
  return `NPR ${nprFormat.format(amount)}`;
}