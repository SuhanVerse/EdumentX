/**
 * EdumentX AI — FAQ Knowledge Base
 *
 * Structured FAQ entries used to answer EdumentX-specific questions.
 * In Phase 1 (MVP), these are embedded in the system prompt directly.
 * In Phase 2, this module provides keyword-based retrieval.
 * In Phase 3, this can be migrated to vector search over documentation.
 *
 * Each entry has:
 *   - keywords: words/phrases that trigger this FAQ
 *   - category: which area of EdumentX this covers
 *   - question: the canonical question
 *   - answer: the canonical answer (Markdown-formatted)
 *   - related_questions: variations that also match
 */

export interface FaqEntry {
  id: string;
  keywords: string[];
  category: FaqCategory;
  question: string;
  answer: string;
  related_questions: string[];
}

export type FaqCategory =
  | "verification"
  | "enrollment"
  | "recommendation"
  | "account"
  | "payment"
  | "privacy"
  | "general";

// ─── FAQ Entries ─────────────────────────────────────────────────────────────

export const FAQ: FaqEntry[] = [
  // ── Verification ──
  {
    id: "faq-001",
    keywords: ["verified", "verification", "blue tick", "blue-tick", "badge", "trusted", "authentic"],
    category: "verification",
    question: "What is a Verified Tutor?",
    answer:
      "A **Verified Tutor** has completed EdumentX's verification process, which confirms their identity and qualifications.\n\n" +
      "They display a **verification badge** on their profile — a blue tick that signals they've been through our screening.\n\n" +
      "Only verified tutors appear in search results, so every tutor you find on EdumentX has been verified.",
    related_questions: [
      "What does the blue tick mean?",
      "Are all tutors verified?",
      "How do I know a tutor is trustworthy?",
    ],
  },
  {
    id: "faq-002",
    keywords: [
      "verification process", "how to verify", "verification steps",
      "become verified", "getting verified", "verification done",
      "tutor verification", "verification work",
      "tutor verification done", "verification explained",
    ],
    category: "verification",
    question: "How does tutor verification work?",
    answer:
      "The verification process has **3 steps**:\n\n" +
      "1. **Submit documents**: Tutors upload their government-issued ID, education certificate, and a short introductory video\n" +
      "2. **Admin review**: Our admin team reviews the documents (typically 24-48 hours)\n" +
      "3. **Approval or feedback**: If everything checks out, the tutor gets verified. If not, we provide feedback on what to resubmit\n\n" +
      "You'll receive a notification when your verification status changes.",
    related_questions: [
      "How long does verification take?",
      "What happens after I submit my documents?",
      "Why is my application still pending?",
    ],
  },
  {
    id: "faq-003",
    keywords: ["documents required", "verification documents", "what to submit", "required documents", "id proof"],
    category: "verification",
    question: "What documents are required for tutor verification?",
    answer:
      "You need to submit **3 documents**:\n\n" +
      "1. **Government-issued ID** — Citizenship card, Passport, or National Identity Card\n" +
      "2. **Academic certificate/transcript** — Your highest degree certificate or mark sheet\n" +
      "3. **Introductory video** — A 2-minute video explaining your teaching approach, experience, and why you love teaching\n\n" +
      "All documents are securely stored and only used for verification purposes.",
    related_questions: [
      "Can I submit my documents later?",
      "What if my certificate is in Nepali?",
      "What kind of video do I need to record?",
    ],
  },
  {
    id: "faq-004",
    keywords: ["rejected", "application rejected", "why rejected", "resubmit", "reapply"],
    category: "verification",
    question: "Why was my tutor application rejected?",
    answer:
      "Applications are typically rejected for one of these reasons:\n\n" +
      "• **Unclear documents** — The uploaded ID or certificate is blurry or illegible\n" +
      "• **Wrong document type** — The document doesn't match what was requested\n" +
      "• **Missing information** — The introductory video doesn't explain teaching experience\n" +
      "• **Inconsistent information** — The name on your ID doesn't match your profile\n\n" +
      "Don't worry! You'll receive **specific feedback** on what to fix, and you can **resubmit** your application. " +
      "The admin team will review it again within 24 hours.",
    related_questions: [
      "Can I appeal a rejection?",
      "How do I resubmit my documents?",
      "How long does re-review take?",
    ],
  },

  // ── Enrollment ──
  {
    id: "faq-005",
    keywords: ["book", "booking", "enroll", "enrollment", "sign up with tutor", "hire", "register"],
    category: "enrollment",
    question: "How do I book or enroll with a tutor?",
    answer:
      "Enrolling with a tutor is easy:\n\n" +
      "1. Find a tutor you like (search or use the AI assistant!)\n" +
      "2. Tap on their profile to view details\n" +
      "3. Tap the **'Enroll'** button\n" +
      "4. Send a message with your subject and preferred schedule\n" +
      "5. The tutor will respond within **24 hours**\n\n" +
      "You can track your enrollment requests in the **'My Enrollments'** section.",
    related_questions: [
      "How do I contact a tutor?",
      "Can I enroll with multiple tutors?",
      "What information should I include in my enrollment request?",
    ],
  },
  {
    id: "faq-006",
    keywords: ["enrollment status", "pending", "accepted", "rejected enrollment", "request status"],
    category: "enrollment",
    question: "How do I check my enrollment status?",
    answer:
      "You can check your enrollment status in the **'My Enrollments'** section:\n\n" +
      "• **Active** — You're enrolled and learning!\n" +
      "• **Pending** — The tutor hasn't responded yet\n" +
      "• **Past** — Completed or ended enrollments\n\n" +
      "You'll also receive a notification when a tutor accepts or declines your request.",
    related_questions: [
      "What if the tutor doesn't respond?",
      "Can I cancel an enrollment request?",
      "How long do I wait for a response?",
    ],
  },

  // ── Recommendations ──
  {
    id: "faq-007",
    keywords: ["recommendation", "how are tutors chosen", "matching", "algorithm", "how it works"],
    category: "recommendation",
    question: "How does the AI tutor recommendation work?",
    answer:
      "The AI assistant finds the **best tutors** for you by considering:\n\n" +
      "• **Subject match** — Tutors who teach what you need\n" +
      "• **Budget** — Tutors within your price range\n" +
      "• **Rating & reviews** — Other students' experiences\n" +
      "• **Experience** — Years of teaching and qualifications\n" +
      "• **Teaching style** — Match based on tutor bios and your preferences\n\n" +
      "All recommended tutors are **verified** — so you can trust their credentials.\n\n" +
      "The more information you share, the better the recommendations get!",
    related_questions: [
      "Is the AI accurate?",
      "How are tutors ranked?",
      "Can I trust the recommendations?",
    ],
  },
  {
    id: "faq-008",
    keywords: ["no tutors", "can't find", "no results", "no match", "nothing available"],
    category: "recommendation",
    question: "What if I can't find a tutor?",
    answer:
      "Don't worry! Try these tips:\n\n" +
      "• **Widen your budget** — Consider a slightly higher range\n" +
      "• **Try a different subject** — Related subjects might have more tutors\n" +
      "• **Remove location filters** — Online tutoring is always an option\n" +
      "• **Check back later** — New tutors join EdumentX regularly\n\n" +
      "You can also browse **all available tutors** in the Discover section!",
    related_questions: [
      "Why are there no tutors in my area?",
      "Can I request a specific subject?",
      "Are there online tutors?",
    ],
  },

  // ── Account ──
  {
    id: "faq-009",
    keywords: ["sign up", "register", "create account", "how to join", "become a tutor"],
    category: "account",
    question: "How do I sign up as a tutor on EdumentX?",
    answer:
      "Signing up as a tutor is simple:\n\n" +
      "1. Download EdumentX from the App Store or Play Store\n" +
      "2. Sign up with your **email** or **Google account**\n" +
      "3. Select **'Tutor'** as your role\n" +
      "4. Complete your profile with your qualifications, subjects, and pricing\n" +
      "5. Submit your verification documents\n" +
      "6. Wait for admin approval (24-48 hours)\n\n" +
      "Once verified, you'll appear in search results and students can find you!",
    related_questions: [
      "Do I need teaching experience?",
      "Can I change from student to tutor?",
      "Is there any registration fee?",
    ],
  },
  {
    id: "faq-010",
    keywords: ["change role", "switch to tutor", "switch to student", "role change"],
    category: "account",
    question: "Can I change my role after signing up?",
    answer:
      "Currently, the role you select during signup is permanent for that account.\n\n" +
      "If you need to change roles, please **contact EdumentX support** and we'll help you set up a new account with the correct role.",
    related_questions: [
      "Can I be both a student and a tutor?",
      "How do I contact support?",
    ],
  },

  // ── Privacy ──
  {
    id: "faq-011",
    keywords: ["privacy", "data", "information", "safe", "secure", "personal data"],
    category: "privacy",
    question: "Is my personal information safe on EdumentX?",
    answer:
      "Yes! EdumentX takes your privacy seriously:\n\n" +
      "• Your contact information is **only shared** with tutors you choose to enroll with\n" +
      "• Verification documents are **securely stored** and only visible to our admin team\n" +
      "• We follow standard **data protection practices**\n" +
      "• You can delete your account and data at any time\n\n" +
      "We never share your data with third parties without your consent.",
    related_questions: [
      "Who can see my profile?",
      "Can I delete my data?",
      "How is my payment information handled?",
    ],
  },

  // ── General ──
  {
    id: "faq-012",
    keywords: ["what is edumentx", "about", "platform", "app info", "what does edumentx do"],
    category: "general",
    question: "What is EdumentX?",
    answer:
      "EdumentX is a **Nepali home tutoring marketplace** connecting students with verified tutors.\n\n" +
      "**For students**: Find the perfect tutor by subject, budget, location, and preferences. " +
      "Use the map to discover nearby tutors, chat with the AI assistant for personalized recommendations, " +
      "and enroll with just a few taps.\n\n" +
      "**For tutors**: Create your profile, get verified with your documents, " +
      "and start receiving enrollment requests from students.\n\n" +
      "We're currently serving the **Kathmandu Valley** (Kathmandu, Lalitpur, Bhaktapur).",
    related_questions: [
      "Is EdumentX free?",
      "Is EdumentX available outside Kathmandu?",
      "Who can use EdumentX?",
    ],
  },
];

// ─── Grouping ────────────────────────────────────────────────────────────────

/** Group FAQ entries by category */
export const FAQ_BY_CATEGORY: Record<FaqCategory, FaqEntry[]> = FAQ.reduce(
  (acc, entry) => {
    acc[entry.category] = acc[entry.category] ?? [];
    acc[entry.category].push(entry);
    return acc;
  },
  {} as Record<FaqCategory, FaqEntry[]>,
);

/** Get all FAQ keywords for quick matching */
export const ALL_FAQ_KEYWORDS: string[] = [
  ...new Set(FAQ.flatMap((e) => e.keywords)),
];

/** Build a condensed FAQ text for system prompt injection */
export function buildFaqPromptText(): string {
  return FAQ.map(
    (entry) =>
      `Q: ${entry.question}\nA: ${entry.answer.replace(/\*\*/g, "")}`,
  ).join("\n\n");
}
