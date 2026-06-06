# Feature Implementation Guide

This guide describes how EdumentX should grow from the current initial Expo setup into a maintainable tutor finding platform. It is a roadmap and implementation reference, not a command to build every feature immediately.

Keep each feature small, testable, and reviewed through pull requests.

## Product Summary

EdumentX has three main roles:

- Student/Parent: finds tutors, sends enrollment requests, joins batches, reviews tutors.
- Tutor: manages profile, availability, requests, batches, verification, and ratings.
- Admin: reviews verification requests, manages users, monitors platform activity.

The app starts with Expo Go testing, Firebase development services, and a simple project shell. Production features should be added gradually.

## Roadmap Phases

### Phase 0: Setup

Purpose: Make sure every teammate can run the same project locally.

Work:

- Keep README short.
- Use `Documentation/INITIAL_PROJECT_SETUP.md` for setup.
- Confirm `npm install`, `npm run lint`, and `npm run typecheck`.
- Confirm Expo Go opens the app.
- Confirm Firebase `.env` values are local only.

Done when:

- Every teammate can clone, install, and open the app on a phone.

### Phase 1: App Shell And Navigation

Purpose: Create the basic navigation foundation before adding real features.

Required screens:

- Landing/test screen.
- Auth placeholder.
- Student dashboard placeholder.
- Tutor dashboard placeholder.
- Admin dashboard placeholder.

Required services:

- Navigation types.
- Role route helper.

Data flow:

1. App opens.
2. Auth state is checked.
3. If no user, show auth.
4. If user exists, read `users/{uid}`.
5. Route by `role`.

Security notes:

- Never trust role from local state only.
- Read role from Firestore after authentication.

Testing checklist:

- App opens from Expo Go.
- Navigation does not crash.
- Placeholder screens fit small phones.

Future improvements:

- Deep links.
- Protected route groups.
- Onboarding screens.

### Phase 2: Firebase Connection

Purpose: Connect the Expo app to Firebase safely.

Required files:

- `services/firebase/config.ts`
- `services/firebase/auth.ts`
- `services/firebase/users.ts`

Small config example:

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
```

Security notes:

- Firebase Web config is not a private secret, but keep it in `.env` for team consistency.
- Do not put admin SDK keys in Expo app code.
- Use Firestore rules as the real security boundary.

Testing checklist:

- Missing env values show a helpful error.
- App does not crash when Firebase is configured.
- Firebase Console shows expected test writes only.

Future improvements:

- Firebase emulator support.
- Separate `edumentx-dev` and `edumentx-prod` environments.

### Phase 3: Authentication

Purpose: Create a safe login foundation.

Current development auth:

- Temporary Email/Password login is acceptable for early development.
- It helps test Firebase Auth and Firestore writes in Expo Go.

Future production auth:

- Phone OTP during signup.
- Role selection happens once after signup.
- Daily login uses phone number or username plus password.
- Admin uses the same login screen.
- Admin routing depends on `role = 'admin'`.

Required collections:

- `users`
- `auditLogs`, later for admin role changes

Required screens:

- Signup screen.
- Login screen.
- Role selection screen.
- Forgot password screen, later.

Required services:

- `services/firebase/auth.ts`
- `services/firebase/users.ts`
- `store/authStore.ts`, later

Why Firebase Auth UID is the main ID:

- Firebase Auth creates a stable `uid`.
- Firestore user profile should use the same ID.
- This avoids random document IDs and makes rules simpler.

Automatic user document pattern:

```ts
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './config';

export async function createUserDocument(uid: string, email: string, name: string) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    name,
    phone: '',
    role: 'student',
    tutorType: null,
    profilePhotoURL: null,
    location: null,
    createdAt: serverTimestamp(),
    isActive: true,
    phoneVerified: false,
  }, { merge: true });
}
```

Data flow:

1. User signs up with development Email/Password or future Phone OTP.
2. Firebase Auth returns `uid`.
3. App creates `users/{uid}`.
4. User selects role if needed.
5. App routes based on role.

Security considerations:

- Users can create their own `users/{uid}` only.
- Users cannot assign themselves `admin`.
- Role changes require admin action or Cloud Function.
- Phone OTP should enforce one phone number per person as much as Firebase Auth allows.

Testing checklist:

- Auth user appears in Firebase Authentication.
- Matching `users/{uid}` appears in Firestore.
- No random user document IDs are created.
- Logout clears local state.
- Disabled users cannot continue after refresh.

Future improvements:

- Username reservation.
- Phone number normalization for Nepal numbers.
- Account recovery.
- Multi-factor admin login.

### Phase 4: User Profiles And Roles

Purpose: Store role-specific data separately from base auth data.

Required collections:

- `users`
- `studentProfiles`
- `tutorProfiles`

Required screens:

- Student profile setup.
- Tutor profile setup.
- Profile edit screen.

Data flow:

1. `users/{uid}` stores common identity and role.
2. `studentProfiles/{uid}` stores student-specific details.
3. `tutorProfiles/{uid}` stores tutor subjects, rates, location, verification, and availability.

Security considerations:

- A user can update only their own profile.
- Tutor verification fields should be updated by admins or Cloud Functions only.
- Public tutor profile reads should expose only safe fields.

Testing checklist:

- Student role creates student profile only.
- Tutor role creates tutor profile only.
- Admin role is not selectable by normal users.

Future improvements:

- Profile completion score.
- Account deletion flow.
- Guardian/parent relationship support.

### Phase 5: Student Flow

Purpose: Let students and parents discover and manage tutoring.

Required collections:

- `studentProfiles`
- `tutorProfiles`
- `enrollments`
- `reviews`
- `notifications`

Required screens:

- Student dashboard.
- Tutor search list.
- Tutor profile.
- Enrollment form.
- My enrollments.
- Review screen.

Data flow:

1. Student opens dashboard.
2. App loads nearby or recommended tutors.
3. Student opens tutor profile.
4. Student sends a default 1-to-1 enrollment request.
5. Tutor accepts, rejects, or counter-offers.
6. Student tracks status in My Enrollments.

Security considerations:

- Student exact address should not be exposed before tutor acceptance.
- Students can read their own enrollments.
- Students can review only completed verified enrollments.

Testing checklist:

- Empty states work.
- Search does not expose private tutor data.
- Enrollment request creates expected document.

Future improvements:

- Saved tutors.
- Re-enroll shortcut.
- Parent multiple-child profiles.

### Phase 6: Tutor Flow

Purpose: Let tutors manage availability, requests, students, batches, and verification.

Required collections:

- `tutorProfiles`
- `verificationRequests`
- `enrollments`
- `batches`
- `batchInvitations`
- `reviews`

Required screens:

- Tutor dashboard.
- Enrollment inbox.
- Tutor profile edit.
- Availability editor.
- Batch manager.
- Verification upload.

Data flow:

1. Tutor completes profile.
2. Tutor sets subjects, rates, service radius, and availability.
3. Tutor receives enrollment requests.
4. Tutor sees approximate student location radius.
5. Tutor accepts, rejects, or counter-offers.
6. Tutor creates batches from enrolled students when useful.

Security considerations:

- Tutors cannot approve their own verification.
- Tutors cannot exceed platform capacity limits.
- Exact student location appears only after accepted enrollment.

Testing checklist:

- Tutor dashboard loads without data.
- Availability conflicts are detected.
- Capacity meter updates correctly.

Future improvements:

- Tutor analytics.
- Response rate badge.
- Vacation mode.

### Phase 7: Admin Flow

Purpose: Give admins safe tools to manage trust and platform quality.

Required collections:

- `users`
- `verificationRequests`
- `auditLogs`
- `tutorProfiles`
- `enrollments`

Required screens:

- Admin dashboard.
- Verification queue.
- User management.
- Platform stats.
- Audit log viewer, later.

Data flow:

1. Admin logs in through the same login screen.
2. App reads `users/{uid}.role`.
3. Admin routes to admin tabs.
4. Admin reviews tutor verification requests.
5. Admin actions update target documents and write audit logs.

Security considerations:

- Admin role must be assigned manually or through a secure backend.
- Admin-only writes should be enforced in rules or Cloud Functions.
- Every admin action should create an audit log.

Testing checklist:

- Normal users cannot access admin screens by URL or local state changes.
- Verification approval updates tutor profile.
- Suspended users cannot use protected flows.

Future improvements:

- Admin analytics.
- Dispute management.
- Internal notes.

### Phase 8: Map Search

Purpose: Help students find tutors near them while protecting privacy.

Required collections:

- `tutorProfiles`
- `studentProfiles`, for approximate student area

Required services:

- `services/location/`
- Google Maps config
- Search/filter service

How to get a Google Maps API key:

1. Open Google Cloud Console.
2. Create or select the EdumentX project.
3. Enable billing.
4. Enable Maps SDK for Android, Maps SDK for iOS, and Maps JavaScript API if web is planned.
5. Enable Places API later if address search/autocomplete is needed.
6. Create an API key.
7. Restrict the key by package name, bundle ID, or domain when native/web builds are ready.
8. Add the development value to `.env`:

```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

Map features:

- Tutor markers.
- Verified tutor marker style.
- At-capacity marker style.
- Service radius overlay.
- Radius filter.
- Subject filter.
- List fallback when map fails.

Approximate student radius:

- Show tutors an approximate area, not exact home pin, before accepting requests.
- Add a privacy offset if displaying student area.
- Reveal exact address only after an enrollment is accepted.

Security considerations:

- Do not store unrestricted API keys in public repo.
- Do not expose exact student location to all tutors.
- Validate location writes.

Testing checklist:

- App asks for location permission.
- Denied location permission has a list fallback.
- No markers appear with private exact student addresses.

Future improvements:

- Geohash queries.
- Firestore geo library.
- Clustering.
- Offline cached list.

### Phase 9: Enrollment System

Purpose: Manage the relationship between student and tutor.

Required collections:

- `enrollments`
- `notifications`
- `auditLogs`, for admin changes

Default rule:

- Student enrollment requests are 1-to-1 by default.
- Batch tutoring is created later by tutors from enrolled students.

Status transitions:

```text
pending -> accepted -> active -> completed
pending -> rejected
pending -> counter-offered
active -> cancelled
```

Required screens:

- Enrollment form.
- Tutor request detail.
- Student enrollment detail.
- Counter-offer review.

Data flow:

1. Student sends request.
2. Tutor gets notification.
3. Tutor sees approximate location radius.
4. Tutor accepts, rejects, or counter-offers.
5. Student confirms counter-offer if needed.
6. Accepted request becomes active on start date.

Security considerations:

- Students can create requests for themselves only.
- Tutors can update only requests assigned to them.
- Rate changes should be tracked.
- Schedule conflicts should be checked server-side later.

Testing checklist:

- Pending request appears in tutor inbox.
- Student sees request status.
- Rejected request cannot become active without valid transition.

Future improvements:

- Trial week.
- Cancellation policy.
- Payment integration.

### Phase 10: Batch System

Purpose: Let tutors teach multiple students together without reducing quality.

Required collections:

- `batches`
- `batchInvitations`
- `enrollments`
- `notifications`

Batch rule:

- Tutor creates batch from already enrolled students.
- Tutor sends invitations.
- Students accept or decline individually.
- Batch activates only when minimum student count is met.

Recommended limits:

- Minimum active students: 2.
- Default max students: 6.
- Platform-level tutor capacity still applies.

Batch pricing:

- Tutor has 1-to-1 rate.
- Tutor has recommended batch rate.
- Tutor has minimum batch rate.
- Students cannot push batch rate below the minimum.

Required screens:

- Batch list.
- Batch creation.
- Enrolled student selector.
- Batch invitation response.
- Capacity manager.

Security considerations:

- Tutor can invite only their own enrolled students.
- Student can accept only invitations sent to them.
- Batch cannot exceed `maxStudents`.
- Cloud Function should enforce capacity later.

Testing checklist:

- Batch cannot activate with one student.
- Full batch rejects more acceptances.
- Student invitation status updates correctly.

Future improvements:

- Batch waitlist.
- Batch performance analytics.
- Auto-suggest compatible students.

### Phase 11: Verification System

Purpose: Build trust for parents and students.

Required collections:

- `verificationRequests`
- `tutorProfiles`
- `auditLogs`

Verification tiers:

- Phone verified: all signed-up users after phone OTP.
- Student tutor verified: college ID and student proof.
- Professional tutor verified: stronger academic/professional proof.
- Blue Tick: admin-approved verified tutor badge.

Required screens:

- Tutor verification upload.
- Admin verification queue.
- Verification decision detail.

Data flow:

1. Tutor uploads documents to Storage.
2. App creates `verificationRequests/{requestId}`.
3. Admin reviews request.
4. Admin approves, rejects, or asks for more info.
5. Tutor profile verification fields update.
6. Audit log is written.

Security considerations:

- Verification documents are private.
- Only owner and admin can access submitted documents.
- Blue Tick cannot be self-assigned.

Testing checklist:

- Tutor can upload required files.
- Admin can approve and reject.
- Rejected request shows clear reason.

Future improvements:

- Document expiration.
- Manual re-verification.
- Fraud flags.

### Phase 12: Reviews And Ratings

Purpose: Help students choose good tutors and protect rating quality.

Required collections:

- `reviews`
- `enrollments`
- `tutorProfiles`

Review rules:

- Review is allowed only for verified enrollment.
- Minimum session count should be required later.
- Tutor can respond once.

Rating dimensions:

- Overall.
- Teaching quality.
- Punctuality.
- Communication.
- Subject knowledge.

Data flow:

1. Enrollment reaches completed or enough sessions.
2. Student submits review.
3. Review document is created.
4. Tutor aggregate ratings update.

Security considerations:

- Student cannot review a tutor without enrollment.
- Student cannot review the same enrollment multiple times.
- Aggregated tutor rating should be maintained server-side later.

Testing checklist:

- Locked review state appears before eligibility.
- Review appears on tutor profile.
- Average rating updates correctly.

Future improvements:

- Review moderation.
- Flagged review workflow.
- Rating trend chart.

### Phase 13: Notifications

Purpose: Keep users informed about important events.

Required collections:

- `notifications`
- `users`, for push token fields or subcollection later

Notification types:

- Enrollment request received.
- Enrollment accepted.
- Enrollment rejected.
- Counter-offer received.
- Batch invitation received.
- Verification approved.
- Verification rejected.
- Schedule reminder.
- AI recommendation ready, later.

Required services:

- `services/notifications/`
- Expo Notifications.
- FCM through Firebase, later.

Data flow:

1. App requests notification permission.
2. App stores push token.
3. Cloud Function creates notification record.
4. Cloud Function sends push message.
5. App shows in-app notification center.

Security considerations:

- Users can read only their own notifications.
- Server should create sensitive notification payloads.
- Do not put exact private data in push notification text.

Testing checklist:

- Permission denied is handled.
- Notification list empty state works.
- Push token refresh is handled.

Future improvements:

- Notification preferences.
- Quiet hours.
- Email fallback.

### Phase 14: RAG AI Chatbot

Purpose: Help students find suitable tutors using structured platform data.

Required collections:

- `chatSessions`
- `tutorProfiles`
- `reviews`
- `enrollments`, only safe aggregate data

What the chatbot can use:

- Public tutor profile fields.
- Subject list.
- Approximate service area.
- Rates.
- Availability summary.
- Verification status.
- Aggregated ratings and review summaries.

What the chatbot must not expose:

- Exact student home address.
- Tutor private documents.
- Admin notes.
- Personal phone numbers unless user already has permission.
- Private chat content from other users.

Simple first version:

1. User asks for a tutor.
2. App sends query to Cloud Function.
3. Function reads filtered tutor profiles.
4. Function returns ranked tutor cards and a short explanation.

Future vector search version:

1. Generate embeddings for safe tutor profile summaries.
2. Store vectors in a managed vector database or supported search service.
3. Retrieve matching tutors.
4. Combine retrieval results with rule-based filters.
5. Generate response with citations to tutor profile cards.

Security considerations:

- Keep AI provider keys on the server.
- Do not call paid AI APIs directly from Expo app.
- Filter data before sending it to the model.
- Log prompts carefully and avoid sensitive personal data.

Testing checklist:

- Chat works with no tutors.
- Chat returns only available tutors.
- Chat does not reveal private fields.

Future improvements:

- Parent intent detection.
- Budget-aware recommendations.
- Explain why a tutor is recommended.

### Phase 15: Testing And Release

Purpose: Prepare reliable builds.

Testing levels:

- Typecheck.
- Lint.
- Manual Expo Go smoke test.
- Firebase rules tests.
- Auth flow tests.
- Critical screen tests.
- EAS preview builds.

Commands:

```bash
npm run lint
npm run typecheck
npx expo start
```

EAS build examples for later:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
eas build --profile production --platform ios
```

Release considerations:

- Separate `edumentx-dev` and `edumentx-prod`.
- Use different Firebase configs per environment.
- Use EAS secrets for build-time values.
- Test production rules before launch.

Future improvements:

- CI checks on pull requests.
- Automated Expo doctor.
- TestFlight/internal testing.
- Store release checklist.

### Phase 16: Future Web/PWA

Purpose: Reuse product logic for web when needed.

Options:

- Expo Web for quick internal admin or prototype.
- Next.js for SEO-heavy public tutor profile pages and marketing site.

Shared pieces:

- Firebase project.
- Firestore collections.
- Auth model.
- TypeScript types.
- Design tokens.

Security considerations:

- Restrict web API keys by domain.
- Do not expose admin-only operations to client code.
- Use server-side functions for privileged work.

Testing checklist:

- Web build works.
- Auth redirects work.
- Map API restrictions include web domain.

Future improvements:

- Public tutor profile SEO.
- Blog/learning content.
- PWA offline support.

## Firestore Collection Guide

Do not manually create all collections in Firebase Console. Collections should appear when app code creates real documents.

### `users`

- Purpose: Base auth profile and role.
- Created when: Immediately after signup.
- Document ID: Firebase Auth `uid`.
- Important fields: `uid`, `name`, `phone`, `email`, `role`, `tutorType`, `profilePhotoURL`, `location`, `createdAt`, `isActive`, `phoneVerified`.
- Reads: Owner, admin, limited public reads later if needed.
- Writes: Owner for safe profile fields, admin/backend for role and status.
- Future indexes: `role`, `isActive`, `createdAt`.

### `studentProfiles`

- Purpose: Student or parent learning profile.
- Created when: Student completes profile setup.
- Document ID: Same Firebase Auth `uid`.
- Important fields: `grade`, `subjects`, `guardianName`, `approxLocation`, `preferredSchedule`, `createdAt`, `updatedAt`.
- Reads: Owner, assigned tutor after accepted enrollment, admin.
- Writes: Owner and admin.
- Future indexes: `grade`, `subjects`, `approxLocation`.

### `tutorProfiles`

- Purpose: Public and private tutor profile details.
- Created when: Tutor completes profile setup.
- Document ID: Same Firebase Auth `uid`.
- Important fields: `subjects`, `qualifications`, `experience`, `rate1to1`, `rateBatch`, `rateMinBatch`, `serviceRadius`, `location`, `availability`, `verificationStatus`, `isBlueTickVerified`, `avgRating`, `currentStudents`, `maxStudents`.
- Reads: Public safe fields for search, owner for full profile, admin.
- Writes: Owner for editable fields, admin/backend for verification and aggregates.
- Future indexes: `subjects`, `isAvailable`, `isBlueTickVerified`, `avgRating`, `location`, `rate1to1`.

### `verificationRequests`

- Purpose: Tutor document review workflow.
- Created when: Tutor submits verification.
- Document ID: Auto ID.
- Important fields: `tutorId`, `tierRequested`, `documentURLs`, `status`, `submittedAt`, `reviewedBy`, `reviewedAt`, `decisionNote`.
- Reads: Owner tutor and admin.
- Writes: Tutor creates, admin reviews, backend updates status.
- Future indexes: `status`, `submittedAt`, `tutorId`.

### `enrollments`

- Purpose: 1-to-1 and batch enrollment records.
- Created when: Student sends enrollment request or joins a batch.
- Document ID: Auto ID.
- Important fields: `studentId`, `tutorId`, `type`, `batchId`, `subject`, `planDuration`, `startDate`, `endDate`, `schedule`, `teachingLocation`, `monthlyRate`, `status`, `trialWeek`, `counterOffer`, `sessionsCompleted`.
- Reads: Student, tutor, admin.
- Writes: Student creates, tutor responds, backend/admin manages transitions.
- Future indexes: `studentId + status`, `tutorId + status`, `startDate`, `batchId`.

### `batches`

- Purpose: Tutor-created group tutoring sessions.
- Created when: Tutor creates a batch.
- Document ID: Auto ID.
- Important fields: `tutorId`, `name`, `subject`, `studentIds`, `pendingStudentIds`, `maxStudents`, `ratePerStudent`, `schedule`, `status`, `createdAt`, `invitationExpiresAt`.
- Reads: Tutor, invited students, admin.
- Writes: Tutor creates, backend manages capacity and activation.
- Future indexes: `tutorId + status`, `subject`, `status`.

### `batchInvitations`

- Purpose: Student accept/decline state for batch invitations.
- Created when: Tutor invites enrolled students to a batch.
- Document ID: Auto ID or `{batchId}_{studentId}`.
- Important fields: `batchId`, `tutorId`, `studentId`, `status`, `sentAt`, `respondedAt`, `expiresAt`.
- Reads: Tutor, invited student, admin.
- Writes: Tutor creates, student responds, backend expires.
- Future indexes: `studentId + status`, `batchId + status`.

### `reviews`

- Purpose: Verified enrollment ratings and written feedback.
- Created when: Student reviews eligible enrollment.
- Document ID: Auto ID.
- Important fields: `enrollmentId`, `studentId`, `tutorId`, `overallRating`, `teachingRating`, `punctualityRating`, `communicationRating`, `knowledgeRating`, `reviewText`, `tags`, `tutorResponse`, `isFlagged`, `createdAt`, `isVerifiedEnrollment`.
- Reads: Public safe fields, tutor, student, admin.
- Writes: Student creates if eligible, tutor responds, admin moderates.
- Future indexes: `tutorId + createdAt`, `studentId`, `isFlagged`.

### `notifications`

- Purpose: In-app notification center and push message records.
- Created when: Important event happens.
- Document ID: Auto ID.
- Important fields: `userId`, `type`, `title`, `body`, `data`, `readAt`, `createdAt`.
- Reads: Target user and admin.
- Writes: Backend or trusted service, not random clients.
- Future indexes: `userId + createdAt`, `userId + readAt`.

### `chatSessions`

- Purpose: AI chatbot conversation history and recommendation references.
- Created when: User starts AI chat.
- Document ID: Auto ID.
- Important fields: `userId`, `messages`, `recommendedTutorIds`, `createdAt`, `updatedAt`.
- Reads: Owner and admin with strict policy.
- Writes: Owner creates messages, backend adds AI responses.
- Future indexes: `userId + updatedAt`.

### `auditLogs`

- Purpose: Track admin and backend actions.
- Created when: Admin changes verification, status, role, or user access.
- Document ID: Auto ID.
- Important fields: `actorId`, `actorRole`, `action`, `targetType`, `targetId`, `before`, `after`, `createdAt`, `ipAddress`.
- Reads: Admin only.
- Writes: Backend/admin only.
- Future indexes: `actorId + createdAt`, `targetType + targetId`, `action`.

## Storage Plan

Storage should hold user-uploaded files, not Firestore.

Suggested paths:

```text
users/{uid}/profile/photo.jpg
tutors/{uid}/verification/{requestId}/citizenship.pdf
tutors/{uid}/verification/{requestId}/certificate.pdf
tutors/{uid}/demo-video/video.mp4
reviews/{reviewId}/session-photo.jpg
```

Security notes:

- Verification documents should be private.
- Profile images may be public later, but only after review of privacy rules.
- Set upload size limits in rules or backend checks.
- Validate file types.

## Things We Might Forget

- Firebase billing limits.
- Google Maps billing alerts.
- API key restrictions.
- Firestore indexes for compound queries.
- Firestore rules tests.
- Storage upload limits.
- Student exact location privacy.
- Backup and export strategy.
- Admin audit logs.
- Error and crash logging.
- Offline behavior.
- Accessibility.
- Empty states.
- Loading states.
- Network error states.
- Data deletion and privacy policy.
- App versioning.
- EAS build profiles.
- Team code review rules.
- Naming conventions.
- Branch protection.
- Commit message format.
- Documentation update rules.
- App store screenshots and privacy labels.
- Test users and seed data policy.
- Rate limiting for AI and notifications.

## Suggested Commit Message Format

Use short, clear commit messages:

```bash
git commit -m "docs: update project setup guide"
git commit -m "feat: add student dashboard shell"
git commit -m "fix: handle missing firebase env values"
```

Common prefixes:

- `docs`: documentation only.
- `feat`: new feature.
- `fix`: bug fix.
- `refactor`: code restructuring without behavior change.
- `chore`: tooling or setup.
- `test`: tests.

## Documentation Update Rule

When a feature changes setup, Firebase rules, environment variables, scripts, or team workflow, update documentation in the same pull request.

README should stay short. Put detailed explanations in `Documentation/`.
