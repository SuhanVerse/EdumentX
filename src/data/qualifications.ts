/**
 * EdumentX — Nepali Qualifications Lookup
 *
 * A curated list of degrees, diplomas, and certifications commonly
 * held by tutors in Nepal. Ordered by level (SEE → PhD) so the
 * autocomplete priority feels natural.
 */

export interface QualificationItem {
  label: string;
  category: "school" | "intermediate" | "diploma" | "bachelors" | "masters" | "doctorate" | "professional";
}

const SCHOOL: QualificationItem[] = [
  { label: "SEE (Secondary Education Examination)", category: "school" },
  { label: "SLC (School Leaving Certificate)", category: "school" },
  { label: "Grade 10", category: "school" },
  { label: "Grade 11", category: "school" },
  { label: "Grade 12 (10+2)", category: "school" },
];

const INTERMEDIATE: QualificationItem[] = [
  { label: "+2 in Science (Biology)", category: "intermediate" },
  { label: "+2 in Science (Math)", category: "intermediate" },
  { label: "+2 in Management", category: "intermediate" },
  { label: "+2 in Humanities", category: "intermediate" },
  { label: "+2 in Education", category: "intermediate" },
  { label: "+2 in Law", category: "intermediate" },
  { label: "+2 in Commerce", category: "intermediate" },
  { label: "A-Levels", category: "intermediate" },
  { label: "IB Diploma", category: "intermediate" },
];

const DIPLOMA: QualificationItem[] = [
  { label: "Diploma in Engineering (CTEVT)", category: "diploma" },
  { label: "Diploma in Health Sciences (CTEVT)", category: "diploma" },
  { label: "Diploma in IT (CTEVT)", category: "diploma" },
  { label: "Diploma in Agriculture (CTEVT)", category: "diploma" },
];

const BACHELORS: QualificationItem[] = [
  { label: "B.Sc. (General)", category: "bachelors" },
  { label: "B.Sc. (Computer Science)", category: "bachelors" },
  { label: "B.Sc. (Mathematics)", category: "bachelors" },
  { label: "B.Sc. (Physics)", category: "bachelors" },
  { label: "B.Sc. (Chemistry)", category: "bachelors" },
  { label: "B.Sc. (Biology)", category: "bachelors" },
  { label: "B.Sc. (Biotechnology)", category: "bachelors" },
  { label: "B.Sc. (Microbiology)", category: "bachelors" },
  { label: "B.Sc. (Environmental Science)", category: "bachelors" },
  { label: "B.Sc. (Nursing)", category: "bachelors" },
  { label: "B.Sc. (Agriculture)", category: "bachelors" },
  { label: "B.Sc. CSIT", category: "bachelors" },
  { label: "BCA (Bachelor of Computer Application)", category: "bachelors" },
  { label: "BIT (Bachelor of Information Technology)", category: "bachelors" },
  { label: "B.A. (General)", category: "bachelors" },
  { label: "B.A. (English)", category: "bachelors" },
  { label: "B.A. (Nepali)", category: "bachelors" },
  { label: "B.A. (Sociology)", category: "bachelors" },
  { label: "B.A. (Economics)", category: "bachelors" },
  { label: "B.A. (Psychology)", category: "bachelors" },
  { label: "B.A. (Social Work)", category: "bachelors" },
  { label: "B.E. Bachelor in Computer Engineering", category: "bachelors" },
  { label: "B.E. Bachelor in Civil Engineering", category: "bachelors" },
  { label: "B.E. Bachelor in Electrical Engineering", category: "bachelors" },
  { label: "B.E. Bachelor in Electronics Engineering", category: "bachelors" },
  { label: "B.E. Bachelor in Mechanical Engineering", category: "bachelors" },
  { label: "Bachelor in Pharmacy", category: "bachelors" },
  { label: "Bachelor in Nursing", category: "bachelors" },
  { label: "Bachelor in Hotel Management", category: "bachelors" },
  { label: "Bachelor in Lab Technology", category: "bachelors" },
  { label: "Bachelor in Radiography", category: "bachelors" },
  { label: "Bachelor in Ophthalmic Science", category: "bachelors" },
  { label: "B.A. LL.B (Bachelor of Laws)", category: "bachelors" },
  { label: "LL.B. (Bachelor of Laws)", category: "bachelors" },
  { label: "B.Com. (Bachelor of Commerce)", category: "bachelors" },
  { label: "B.B.A. (Bachelor of Business Administration)", category: "bachelors" },
  { label: "BBA-FI (Finance)", category: "bachelors" },
  { label: "B.B.S. (Bachelor of Business Studies)", category: "bachelors" },
  { label: "B.Ed. (Bachelor of Education)", category: "bachelors" },
  { label: "B. Tech(Bachelor of Technology)", category: "bachelors" },
  { label: "B.Arch. (Bachelor of Architecture)", category: "bachelors" },
  { label: "B.Pharm. (Bachelor of Pharmacy)", category: "bachelors" },
  { label: "BDS (Bachelor of Dental Surgery)", category: "bachelors" },
  { label: "MBBS (Bachelor of Medicine, Bachelor of Surgery)", category: "bachelors" },
  { label: "B.V.Sc. & A.H. (Veterinary Science)", category: "bachelors" },
  { label: "BHM (Bachelor of Hotel Management)", category: "bachelors" },
  { label: "BTTM (Bachelor of Travel & Tourism Management)", category: "bachelors" },
  { label: "BSW (Bachelor of Social Work)", category: "bachelors" },
  { label: "BFA (Bachelor of Fine Arts)", category: "bachelors" },
  { label: "B.Music", category: "bachelors" },
  { label: "B.Optom (Bachelor of Optometry)", category: "bachelors" },
  { label: "B.P.E. (Bachelor of Physical Education)", category: "bachelors" },
];

const MASTERS: QualificationItem[] = [
  { label: "M.Sc. (General)", category: "masters" },
  { label: "M.Sc. (Computer Science)", category: "masters" },
  { label: "M.Sc. (Mathematics)", category: "masters" },
  { label: "M.Sc. (Physics)", category: "masters" },
  { label: "M.Sc. (Chemistry)", category: "masters" },
  { label: "M.Sc. (Biology)", category: "masters" },
  { label: "M.Sc. (Biotechnology)", category: "masters" },
  { label: "M.Sc. (Microbiology)", category: "masters" },
  { label: "M.Sc. (Environmental Science)", category: "masters" },
  { label: "M.Sc. (Nursing)", category: "masters" },
  { label: "M.Sc. (Agriculture)", category: "masters" },
  { label: "M.Sc. CSIT", category: "masters" },
  { label: "MCA (Master of Computer Application)", category: "masters" },
  { label: "MIT (Master of Information Technology)", category: "masters" },
  { label: "M.A. (English)", category: "masters" },
  { label: "M.A. (Nepali)", category: "masters" },
  { label: "M.A. (Sociology)", category: "masters" },
  { label: "M.A. (Economics)", category: "masters" },
  { label: "M.A. (Psychology)", category: "masters" },
  { label: "M.A. (Anthropology)", category: "masters" },
  { label: "M.A. (Social Work)", category: "masters" },
  { label: "M.A. (Political Science)", category: "masters" },
  { label: "M.A. (History)", category: "masters" },
  { label: "M.A. (Geography)", category: "masters" },
  { label: "LL.M. (Master of Laws)", category: "masters" },
  { label: "M.Com. (Master of Commerce)", category: "masters" },
  { label: "MBA (Master of Business Administration)", category: "masters" },
  { label: "M.B.S. (Master of Business Studies)", category: "masters" },
  { label: "M.Ed. (Master of Education)", category: "masters" },
  { label: "M.E. / M.Tech (Master of Engineering)", category: "masters" },
  { label: "M.Arch. (Master of Architecture)", category: "masters" },
  { label: "M.Pharm. (Master of Pharmacy)", category: "masters" },
  { label: "MDS (Master of Dental Surgery)", category: "masters" },
  { label: "MD (Doctor of Medicine)", category: "masters" },
  { label: "MS (Master of Surgery)", category: "masters" },
  { label: "MPH (Master of Public Health)", category: "masters" },
  { label: "M.Optom (Master of Optometry)", category: "masters" },
  { label: "MFA (Master of Fine Arts)", category: "masters" },
  { label: "M.P.E. (Master of Physical Education)", category: "masters" },
];

const DOCTORATE: QualificationItem[] = [
  { label: "Ph.D. (Doctor of Philosophy)", category: "doctorate" },
  { label: "Ph.D. in Education", category: "doctorate" },
  { label: "Ph.D. in Engineering", category: "doctorate" },
  { label: "Ph.D. in Science", category: "doctorate" },
  { label: "Ph.D. in Management", category: "doctorate" },
  { label: "Ph.D. in Social Sciences", category: "doctorate" },
  { label: "Ph.D. in Humanities", category: "doctorate" },
  { label: "Ph.D. in Medicine", category: "doctorate" },
  { label: "Post-Doctorate", category: "doctorate" },
];

const PROFESSIONAL: QualificationItem[] = [
  { label: "CA (Chartered Accountancy)", category: "professional" },
  { label: "ACCA", category: "professional" },
  { label: "CIMA", category: "professional" },
  { label: "CFA (Chartered Financial Analyst)", category: "professional" },
  { label: "CMA (Certified Management Accountant)", category: "professional" },
  { label: "Teaching License (Nepal)", category: "professional" },
  { label: "TEFL / TESOL Certificate", category: "professional" },
  { label: "IELTS / TOEFL Trainer Certification", category: "professional" },
  { label: "CCNA (Cisco Certified Network Associate)", category: "professional" },
  { label: "Azure / AWS Certification", category: "professional" },
  { label: "Google Certified Educator", category: "professional" },
  { label: "Certificate in Montessori Teaching", category: "professional" },
  { label: "Certificate in Sign Language", category: "professional" },
  { label: "Certificate in Counseling", category: "professional" },
];

export const QUALIFICATIONS: QualificationItem[] = [
  ...SCHOOL,
  ...INTERMEDIATE,
  ...DIPLOMA,
  ...BACHELORS,
  ...MASTERS,
  ...DOCTORATE,
  ...PROFESSIONAL,
];

export const QUALIFICATION_LABELS: string[] = QUALIFICATIONS.map((q) => q.label);
