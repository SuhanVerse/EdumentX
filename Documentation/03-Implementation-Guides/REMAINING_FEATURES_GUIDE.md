# EdumentX — Remaining Features Implementation Guide

> **Reference:** BasoBas App (`Documentation/98-Reference-BasoBas/basobas-app`)
> **Context:** These are all features NOT yet implemented in EdumentX, analyzed against how BasoBas implements equivalent functionality.

---

## Feature 1: AI Chatbot Backend (Phase 7.1)

### Current State in EdumentX
- `screens/student/AIChat.tsx` (472 lines) — **UI is complete**
- `lib/ai/clientConstraintParser.ts` — Client-side constraint extraction from natural language
- `lib/ai/constraintPresets.ts` — Quick-chip presets for common queries
- `lib/ai/minimumConstraints.ts` — Gate checking minimum search criteria
- **Missing:** Actual LLM API calls. Currently returns canned responses.

### How BasoBas Handles It
BasoBas has an `ai-preferences.tsx` screen but no in-app AI chat — their AI is limited to preference-based matching.

### Implementation Plan for EdumentX

#### Option A: Free Groq API (Recommended)
Groq offers free API access with generous rate limits for `llama-3.3-70b-versatile`.

```typescript
// lib/ai/groqService.ts

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export async function queryTutorAssistant(
  userMessage: string,
  tutorContext: string, // JSON stringified list of approved tutors
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
) {
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are EdumentX AI, a tutor matching assistant for Kathmandu Valley, Nepal.
You help students find the right home tutor based on their needs.
Here are the currently available verified tutors:
${tutorContext}

Rules:
- Respond in a friendly, concise manner
- When recommending tutors, return their data as JSON in a \`tutorCards\` field
- Always consider location, subject, budget, and teaching mode
- Prices are in NPR (Nepali Rupees) per month
- If the student hasn't specified enough criteria, ask clarifying questions`,
        },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### Integration with Existing AIChat.tsx
The existing `useAiChat` hook needs to be updated to call `queryTutorAssistant()` instead of returning canned responses. The tutor context is already available via `subscribeTutors()`.

### Task Checklist
- [ ] Sign up for free Groq API key at https://console.groq.com
- [ ] Add `EXPO_PUBLIC_GROQ_API_KEY` to `.env`
- [ ] Create `lib/ai/groqService.ts`
- [ ] Update `useAiChat` hook to call Groq API
- [ ] Parse structured tutor recommendations from LLM response
- [ ] Test with real tutor data from Firestore

---

> ⚠️ **STATUS UPDATE (Aug 15, 2026):** Everything in this guide
> has **shipped**. Enrollment requests (`enrollmentRequests/{tutorUid}/requests`),
> rosters (`enrollments/{tutorUid}/roster`), availability, group
> batches (`batches/{tutorUid}/classes` + members), reviews
> (`reviews/{tutorUid}/reviews`), and 1:1 messaging
> (`conversations/{id}` + `messages`) are all live with matching
> rules (26 emulator checks in `npm run test:rules`). The plans
> below remain as the design record; `ARCHITECTURE.md` §10 is the
> live status.

## Feature 2: Enrollment System (Phase 6.x) — SHIPPED

### Current State in EdumentX (Aug 15, 2026)
- `screens/student/Enrollment.tsx` — **live** — tabs via
  `subscribeEnrollmentsByStudent` / `subscribeRequestsByStudent`
- `screens/tutor/TutorInbox.tsx` — **live** via the shared
  `EnrollmentRequestCard`; accept/decline via the enrollment repo
  (accept = transaction: roster create + capacity bump + status
  flip + notification; slot picker for the weekly slot)
- **Missing:** nothing — rules, indexes, and `test:rules` checks are
  all in place

### How BasoBas Handles It (Visits System)
BasoBas has a full visit booking flow:
- `src/services/visits.service.ts` — CRUD operations on visits
- `src/store/visitsStore.ts` — Zustand store for visit state
- `src/hooks/useVisitRealtime.ts` — Real-time Firestore subscription
- `app/(tenant)/visit/[id].tsx` — Visit detail page
- `app/(landlord)/request/[id].tsx` — Landlord request handling

### Implementation Plan for EdumentX

#### Firestore Collection Design
```
enrollments/{enrollmentId}
├── studentUid: string
├── tutorUid: string
├── status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
├── subject: string
├── gradeLevel: string
├── mode: 'home' | 'online' | 'both'
├── monthlyRateNpr: number
├── startDate: Timestamp
├── schedule: string  // e.g., "Mon/Wed/Fri 4-5 PM"
├── studentMessage?: string
├── tutorResponse?: string
├── createdAt: Timestamp
├── updatedAt: Timestamp
└── declineReason?: string
```

#### Security Rules
```
match /enrollments/{enrollmentId} {
  // Students can create enrollment requests
  allow create: if isSignedIn()
    && request.resource.data.studentUid == request.auth.uid
    && request.resource.data.status == 'pending';

  // Both student and tutor involved can read
  allow read: if isSignedIn()
    && (resource.data.studentUid == request.auth.uid
        || resource.data.tutorUid == request.auth.uid);

  // Tutor can accept/decline, student can cancel
  allow update: if isSignedIn()
    && (resource.data.tutorUid == request.auth.uid
        || resource.data.studentUid == request.auth.uid);
}
```

### Task Checklist
- [ ] Add `enrollments` collection to `firebase/firestore.rules`
- [ ] Create `lib/enrollment/enrollmentService.ts` with CRUD operations
- [ ] Create `store/enrollmentStore.ts` (Zustand)
- [ ] Wire `Enrollment.tsx` to real Firestore data via `onSnapshot`
- [ ] Wire `tutor_inbox.tsx` to real Firestore data
- [ ] Add enrollment creation flow from `TutorDetailsScreen.tsx`

---

## Feature 3: eSewa/Khalti Payment (Phase 7.2)

### Current State in EdumentX
- **Nothing implemented yet**

### How BasoBas Handles It
BasoBas has a full eSewa integration:
- `app/(tenant)/esewa-webview.tsx` — WebView-based eSewa payment page
- `app/(tenant)/payment-success.tsx` — Success confirmation screen
- `app/(tenant)/payment-failed.tsx` — Failure handling screen
- `app/(tenant)/pro-plan.tsx` — Subscription plan selection

### Implementation Plan for EdumentX
For an initial MVP, use WebView-based eSewa integration:

1. **Create eSewa merchant account** at https://developer.esewa.com.np
2. **Create `screens/student/EsewaPayment.tsx`** — WebView loading eSewa payment URL
3. **Handle callback** — eSewa redirects back to app with transaction status
4. **Record payment** in Firestore `payments/{id}` collection
5. **Update enrollment** status to `paid` upon successful payment

### Task Checklist
- [ ] Register eSewa merchant account
- [ ] Create `screens/student/EsewaPayment.tsx` with WebView
- [ ] Create `screens/student/PaymentSuccess.tsx`
- [ ] Create `screens/student/PaymentFailed.tsx`
- [ ] Add `payments` collection to Firestore rules
- [ ] Wire payment flow from enrollment acceptance

---

## Feature 4: Real-Time Messaging (Phase 7.3)

### Current State in EdumentX
- **Nothing implemented yet**

### How BasoBas Handles It
BasoBas doesn't have in-app messaging — they use visit scheduling instead.

### Implementation Plan for EdumentX

#### Firestore Collection Design
```
chats/{chatId}
├── participants: string[]  // [studentUid, tutorUid]
├── lastMessage: string
├── lastMessageAt: Timestamp
├── enrollmentId: string  // Link to enrollment
└── messages/{messageId}
    ├── senderUid: string
    ├── text: string
    ├── createdAt: Timestamp
    └── read: boolean
```

#### Key Components Needed
1. **`screens/shared/ChatRoom.tsx`** — Full chat UI with `onSnapshot` on messages subcollection
2. **`screens/shared/ChatList.tsx`** — List of active conversations
3. **`lib/chat/chatService.ts`** — Send/receive message operations
4. **`store/chatStore.ts`** — Active chats Zustand store

### Task Checklist
- [ ] Design `chats` collection schema and security rules
- [ ] Create `lib/chat/chatService.ts`
- [ ] Create `store/chatStore.ts`
- [ ] Build `ChatRoom.tsx` with real-time message list
- [ ] Build `ChatList.tsx` with conversation list
- [ ] Add chat entry point from enrollment acceptance
- [ ] Add unread message badge to BottomNav

---

## Feature 5: Additional Enhancements (Nice-to-Have)

### Haptic Feedback
BasoBas uses `expo-haptics` for tab bar interactions. Add to EdumentX's `BottomNav.tsx`:
```bash
npx expo install expo-haptics
```

### Bottom Sheet Upgrade
Replace custom Modal + PanResponder sheets with `@gorhom/bottom-sheet` for smoother gesture handling:
```bash
npx expo install @gorhom/bottom-sheet
```

### Blur Effects
Add glassmorphism to navigation elements:
```bash
npx expo install expo-blur
```

### Form Validation Upgrade
Consider migrating from custom `lib/validation.ts` to `react-hook-form` + `zod` for more structured form management (as BasoBas does).

---

## Implementation Priority Matrix

| # | Feature | Effort | Impact | Priority |
|---|---------|--------|--------|----------|
| 1 | Map Integration (Phase 5.2–5.4) | High (3–5 sessions) | **Critical** — Core value prop | P0 |
| 2 | Enrollment System (Phase 6.x) | Medium (2–3 sessions) | **High** — Enables booking | P0 |
| 3 | AI Backend (Phase 7.1) | Low (1 session) | **High** — Differentiator | P1 |
| 4 | Real-Time Chat (Phase 7.3) | Medium (2–3 sessions) | **Medium** — Communication | P1 |
| 5 | eSewa Payment (Phase 7.2) | Medium (2 sessions) | **Medium** — Revenue | P2 |
| 6 | Haptics + Bottom Sheets | Low (0.5 session) | **Low** — Polish | P3 |
