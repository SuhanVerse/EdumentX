# EdumentX — Compact Project Context

> **Purpose**: Seed this file into a new AI session so it has full
> project awareness without inheriting a 6 MB conversation dump.
> Update this file after each major milestone.
>
> **Last updated**: 2026-08-20

---

## 1. What is EdumentX?

A **React Native + Expo SDK 54** tutoring marketplace for the Kathmandu
Valley.  Students find tutors by proximity, subject, and budget;
tutors manage batches, enrollment requests, and messaging.  Built as a
college minor project (no production revenue).

**Stack**: React Native · NativeWind 4.2 · Expo Router · Firebase
(Auth + Firestore) · Supabase (Storage + Edge Functions) · Groq
(RAG chatbot) · Google Maps (expo-maps on Android)

---

## 2. Architecture Snapshot

```
src/app/            Expo Router file-based routes
src/screens/        Per-role screens (student, tutor, admin, auth)
src/components/     Shared + domain components
src/services/       Repository pattern (interface → Firebase impl)
firebase/           Firestore rules + indexes
supabase/           Edge Functions (chat, eSewa, verify-identity)
functions/          Firebase Cloud Functions scaffold (Blaze)
```

### Key paths
| Route | Screen |
|---|---|
| `/email-signup` | Email + Password + Google Sign-In |
| `/role-selection` | Pick student or tutor |
| `/student-home` | Student dashboard |
| `/tutor-home` | Tutor dashboard |
| `/admin-home` | Admin dashboard |
| `/map` | Map search (Google Maps on Android) |
| `/chat` | In-app messaging |
| `/browse-batches` | Open batches (filtered to enrolled tutors) |
| `/pro-upgrade` | eSewa payment → Pro subscription |

---

## 3. Auth Flow (Source of Truth)

`src/app/_layout.tsx` runs a 5-step redirect tree:

1. `!user` → `/email-signup`
2. `user && !emailVerified && password-provider` → `/email-signup`
3. `user && verified && !role` → `/role-selection`
4. `user && verified && role=student` → `/student-home`
5. `user && verified && role=tutor` → `/tutor-home` (or `/tutor-pending` if not yet approved)

Auth is native Firebase Auth (`@react-native-firebase/auth`).
No Clerk, no OTP.

---

## 4. Data Model (Firestore)

```
users/{uid}                      root doc (role, fullName, emailVerified)
users/{uid}/studentProfile/default
users/{uid}/tutorProfile/default  (includes aiReview, subscriptionTier)
tutors/{uid}                     discovery doc (admin-write + owner availability flag)
tutorVerifications/{uid}         admin approval gate
enrollments/{tutorUid}/roster
enrollmentRequests/{tutorUid}/requests
batches/{tutorUid}/batches
conversations/{conversationId}   (messages subcollection)
reviews/{tutorUid}/reviews
savedTutors (map on studentProfile)
```

---

## 5. Subscription Model (Pro Tutor)

| Gate | Free | Pro |
|---|---|---|
| Max active students | 20 | 30 |
| Active batches | 2 | 5 |
| Badge | — | "Pro" ribbon (NOT a Blue Tick) |
| Featured section | No | Yes (separate from KNN ranking) |
| Analytics | Basic | Full breakdown |

Payment: eSewa WebView (sandbox `EPAYTEST`).
Client: `src/screens/tutor/ProUpgradeScreen.tsx`
Function: `supabase/functions/create-esewa-order/`
Verify: `supabase/functions/create-esewa-order/verify.ts`

---

## 6. AI Verification Pipeline

```
Tutor submits profile
  → runAiVerification() (src/services/verification/aiReview.ts)
    → POST supabase/functions/v1/verify-identity
      → Groq Vision OCR (name from citizenship card)
      → Groq Vision face check (real human face?)
      → IF confidence ≥ 0.9:
          Firestore REST API writes:
            tutorVerifications/{uid} → status: "approved"
            users/{uid}/tutorProfile → verificationStatus: "approved"
            tutors/{uid} → discovery doc created
          Returns { autoApproved: true }
        ELSE:
          Returns { autoApproved: false } → admin reviews manually
  → Client: autoApproved → /tutor-home, else → /tutor-pending
```

Test eSewa ID: `9711111111` · Password: `Nepal@123` · MPIN: `1122`

---

## 7. Design Rules (Enforced by ESLint)

- **No raw hex** in className, placeholderTextColor, or color props
- **No Tailwind default palette** shades (bg-blue-500, text-slate-300…)
- **No non-token radius** (rounded-2xl, rounded-full… → use rounded-card, rounded-pill…)
- All hex → `src/constants/colors.ts` tokens
- Dark surfaces → `text-glass-secondary` / `text-glass-muted`
- Commands: `npm run test:lint-rules`, `npm run test:derived`, `npm run test:rules`

---

## 8. Test Commands

```bash
npm run test:derived        # 47 unit tests (enrollment helpers)
npm run test:lint-rules     # 21 tests (ESLint design-token rules)
npm run test:rules          # 6 emulator suites (Firestore security rules)
npx tsc --noEmit            # TypeScript check
npx eslint .                # Lint
```

---

## 9. Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready, protected |
| `develop` | Integration branch |
| `test` | Active development (Firebase Blaze migration) |

**Always work on `test` or a feature branch. Never push to `main` directly.**

---

## 10. Key Files Reference

| File | Role |
|---|---|
| `AGENTS.md` | AI agent system directives (read first) |
| `CLAUDE.md` | Same directives, shorter |
| `src/app/_layout.tsx` | Auth routing (source of truth) |
| `src/services/enrollments/derived.ts` | Pure helpers (slotKey, today-sessions, capacity) |
| `firebase/firestore.rules` | Security rules |
| `supabase/functions/verify-identity/index.ts` | AI verification pipeline |
| `src/screens/tutor/ProUpgradeScreen.tsx` | eSewa payment WebView |
| `src/constants/colors.ts` | Design tokens |
| `tailwind.config.js` | NativeWind theme |
| `eslint-rules/design-tokens.js` | Custom ESLint rules |

---

## 11. Blaze Plan Quotas (Free at Demo Scale)

| Service | Free quota |
|---|---|
| Firestore reads | 50K/day |
| Firestore writes | 20K/day |
| Cloud Functions | 2M invocations/mo |
| Cloud Storage | 5 GB |
| Google Maps | 10K calls/mo per SKU |
| Auth MAUs | 50K |

**Budget alert at ~$5. Spend caps on Cloud Functions.**

---

## 12. Known Issues

- eSewa sandbox reCAPTCHA sometimes exceeds quota (use "Demo — Skip eSewa" fallback)
- HuggingFace DNS unreachable from Supabase Edge Runtime (Groq used instead)
- `signOut` uses modular API but some legacy namespaced calls remain in third-party libs
- Deprecated Gradle features (Gradle 9.0 compat warning)

---

## 13. Context for New Sessions

When starting a new OpenCode / Freebuff session with this project:

1. Read `AGENTS.md` first — it contains all architectural rules
2. Read `CLAUDE.md` for the condensed version
3. This file (`context.md`) for the current state snapshot
4. Run `npx tsc --noEmit` to verify the build is clean
5. Check `git log --oneline -5` for recent changes

**Do NOT paste the full conversation history** — it's 6 MB and will
exceed any model's context window. Use this compact context instead.








---


