# Final Figma Make Prompt For EdumentX

Paste the prompt below into Figma Make.

```text
Create a polished, production-quality mobile app UI prototype for EdumentX.

Do not create ASCII wireframes.
Do not create code-only output.
Do not create a written report instead of UI.
Do not include citation markers like [cite].
Do not include escaped Markdown symbols in visible screen text.
Create actual Figma Make app screens, reusable components, design tokens, and prototype links.

Product:
EdumentX is a location-based tutor-finding platform for Kathmandu Valley, Nepal. It connects students/parents with nearby verified home tutors, helps tutors manage enrollments and batches, and lets admins verify tutor documents and manage platform quality.

Target:
- Mobile app first.
- React Native Expo implementation later.
- Base frame: 390 x 844 px.
- Must adapt cleanly to 360 px small Android phones and 430 px large iPhones.
- Use auto layout and constraints on every screen/component.
- Respect top and bottom safe areas.

Visual Style:
- Clean, trustworthy, modern education platform.
- Flat design only.
- No drop shadows.
- No glow effects.
- No decorative gradient backgrounds.
- No glassmorphism.
- No nested cards inside cards.
- Elevation is shown only with thin borders and spacing.
- Use realistic mobile app density, not a marketing landing page.
- Screens must feel like a real company-built app, not a rough wireframe.

Typography:
- Font: Inter or SF Pro.
- Use only weights 400 and 500.
- Screen title: 22-24 px, weight 500.
- Section title: 16-18 px, weight 500.
- Card title: 14-15 px, weight 500.
- Body: 13-14 px, weight 400.
- Caption: 11-12 px, weight 400.
- Overline label: 11 px, weight 500, uppercase, letter spacing 0.04-0.06em.
- Long names and labels must truncate with ellipsis and never overflow.

Design Tokens:
- brand/primary: #1A56DB
- brand/primary-dark: #0C3A7A
- brand/primary-light: #E8F0FE
- admin/header: #185FA5
- trust/teal: #0D9E75
- trust/teal-dark: #0A7A59
- trust/teal-light: #E0F5EE
- ai/purple: #4F46E5
- ai/purple-dark: #312E81
- ai/purple-light: #EEF2FF
- semantic/success-bg: #D1FAE5
- semantic/success-text: #1D9E75
- semantic/pending-bg: #FEF3C7
- semantic/pending-text: #D97706
- semantic/error-bg: #FEE2E2
- semantic/error-text: #EF4444
- semantic/offline-bg: #FFFBEB
- surface/page: #F9FAFB
- surface/admin-page: #F5F5F3
- surface/card: #FFFFFF
- surface/disabled: #F3F4F6
- text/primary: #111827
- text/secondary: #4B5563
- text/tertiary: #374151
- text/muted: #9CA3AF
- text/inverse: #FFFFFF
- border/default: #E5E7EB
- border/strong: #D1D5DB

Spacing:
- Page horizontal padding: 16 px.
- Card padding: 14-16 px.
- Section gap: 16-20 px.
- Item gap: 8-12 px.
- Minimum tap target: 44 x 44 px.
- Bottom navigation height: 64 px plus safe area.

Radius:
- Chips and small buttons: 8 px.
- Inputs: 10 px.
- Cards: 12 px.
- Larger sheets/modals: 16 px.
- Hero/special panels: 18 px.
- Avatars, pills, dots: 999 px.

Borders:
- Standard card border: 0.5 px #E5E7EB.
- Input border: 0.5 px #E5E7EB.
- Selected state border: 1.5-2 px brand/primary.
- Dashed empty slot border: 1 px dashed #D1D5DB.

Core Product Rules:
1. OTP is used only during signup.
2. Daily login uses phone number and password.
3. Admin uses the same unified login screen. Do not create a separate admin login screen.
4. Role selection happens once after signup. Login should auto-route by saved role.
5. Role change requires admin approval, so the app should not suggest casual role switching.
6. Student exact home location must never be shown to tutors before acceptance.
7. Tutors see only an approximate fuzzy neighborhood radius with a random 300-500 m privacy offset.
8. Exact address appears only after tutor accepts the enrollment.
9. Reviews unlock only after at least 2 completed sessions.
10. Tutor verification has tiers: phone verified, student tutor verified, professional/Blue Tick verified.
11. Student tutor path uses college ID verification.
12. Professional tutor path uses degree/certificate plus demo video verification.
13. The AI assistant must use purple as its active color system. Avoid brand blue CTAs inside the AI screen.
14. Enrollment requests are 1-to-1 by default.
15. Batches are created by tutors or joined through batch/session code.
16. Batch setup allows 2-6 students, with 4-5 as the recommended group size.
17. Tutor screens must show session/capacity clearly so one tutor cannot overcrowd the platform.

Output Structure:
Create these Figma pages:
1. Design System
2. Auth Flow
3. Student Flow
4. Tutor Flow
5. Admin Flow
6. Components And States
7. Prototype Map

Frame Naming:
Use clear frame names:
- S01 Splash
- S02 Onboarding
- S03 Unified Phone Entry
- S04 OTP Verification
- S05 Create Password
- S06 Role Selection
- S07 Profile Setup
- S08 Student Home
- S09 Student Map Search
- S10 Filters Sheet
- S11 Tutor Profile
- S12 Enrollment Form
- S13 AI Chat
- S14 My Enrollments
- S15 Enrollment Detail
- S16 Session Code
- S17 Browse Batches
- S18 Rate Review
- S19 Student Profile
- S20 Notifications
- S21 Tutor Dashboard
- S22 Tutor Inbox Request Detail
- S23 Group Batch Creation
- S24 Capacity Manager
- S25 Tutor Edit Profile
- S26 Document Upload
- S27 Admin Verification Queue
- S28 Admin User Management
- S29 Admin Platform Stats
- S30 Admin Settings
- C01 Component Library
- C02 Empty Loading Error States

Design System Page:
Create token samples and reusable components:
- Color swatches with token names.
- Typography examples.
- Spacing and radius examples.
- Primary button, secondary button, ghost button, danger button, disabled button.
- Input field, focused input, invalid input, password input with eye toggle.
- Segmented control.
- Subject chip default/selected.
- Status badge set: active, pending, verified, rejected, suspended, full capacity, offline.
- Blue Tick verification badge.
- Student Tutor cap badge.
- Star rating display and rating input.
- Tutor card compact and full-width.
- Bottom navigation for student, tutor, and admin.
- Admin top tab nav.
- Map marker variants: student approximate area, standard tutor, verified tutor, full-capacity tutor.
- Chat bubbles: AI incoming, user outgoing, AI recommendation card.
- Session slot card variants: 1-to-1, public batch, private batch, empty slot, full slot.
- Empty state, loading skeleton state, offline banner, validation error row.

Auth Flow Screens:

S01 Splash:
- Solid #0C3A7A background.
- Centered 64 x 64 white rounded-square logo tile, radius 16.
- Letter E in #1A56DB, clean geometric style.
- Wordmark: EdumentX.
- Tagline: Find your perfect tutor nearby.
- Slim progress indicator near lower center.
- Auto prototype to onboarding.

S02 Onboarding:
- Three carousel states in one component or three frames.
- Top-right Skip link.
- Large flat illustration panel, 300 x 260 approximate.
- Slide 1: map discovery. Title: Find tutors near you. Body: Browse verified home tutors on a live map within your chosen area.
- Slide 2: AI matching. Title: Ask AI, find the right match. Body: Describe what you need in plain Nepali or English. AI finds tutors for you.
- Slide 3: trust verification. Title: Only verified, trusted tutors. Body: Every Blue Tick tutor is document-reviewed by the EdumentX admin team.
- Dot pagination: active 24 x 8 pill, inactive 8 x 8 circles.
- Primary button: Next, final state Create account.
- Secondary text: Already have an account? Log in.

S03 Unified Phone Entry:
- Header with back chevron and small centered EdumentX logo mark.
- Segmented control: Sign up and Log in.
- Sign up state:
  - Title: Create your account.
  - Subtitle about OTP signup.
  - Phone row with NP +977 fixed prefix chip and 10-digit input.
  - Primary button: Send OTP.
- Login state:
  - Title: Welcome back.
  - Same phone row.
  - Password input with lock icon and eye toggle.
  - Forgot password link.
  - Primary button: Log in.
- Do not create separate admin login. Admin uses this same entry screen.

S04 OTP Verification:
- Back chevron.
- Title: Check your messages.
- Subtitle: We sent a 6-digit code to +977 98XXXXXXXX.
- Change number link.
- Six OTP boxes, 48 x 56 each.
- One focused box with primary border.
- Resend timer row.
- Button: Verify.

S05 Create Password:
- Progress bar near top, 75 percent filled.
- Title: Create a secure password.
- Subtitle: You will use this to log in every day. No OTP required.
- Password field with eye toggle.
- Password strength meter, strong state in trust/teal.
- Checklist: 8 characters, uppercase letter, number, no spaces.
- Confirm password field.
- Button: Set password and continue.

S06 Role Selection:
- Title: Who are you?
- Subtitle: This choice shapes your app experience.
- Amber note: Role changes require admin approval.
- Two large cards:
  - Student or Parent: map search, AI chatbot, enrollments.
  - Tutor: profile, verification, batches, earnings.
- Show Tutor selected state with 2 px primary border and check indicator.
- Under Tutor selected state, reveal tutor type selector:
  - Student Tutor
  - Professional Teacher
- Button: Continue.

S07 Profile Setup:
- Avatar upload circle.
- Full name input.
- District selector: Kathmandu, Lalitpur, Bhaktapur.
- Student fields: grade and preferred subjects.
- Tutor fields: subjects, experience, tutor type summary.
- Location permission row with manual fallback.
- Button: Complete setup.

Student Flow Screens:

S08 Student Home:
- Surface/page background.
- Header with greeting, location pill, notification bell.
- Search bar with filter icon.
- Quick action chips: Map Search, AI Chatbot, Verified Tutors, Group Batches.
- My enrollments horizontal card row.
- Tutors near you list or 2-column compact cards.
- Tutor cards show avatar, Blue Tick if verified, name, subjects, distance, rating, monthly rate.
- Student bottom nav: Home, Map, AI, Enrollments, Profile.
- AI tab/icon must use purple.

S09 Student Map Search:
- Full map workspace using schematic Kathmandu Valley street grid, not a fake exact map.
- Student location as approximate blue circle, not exact address.
- Tutor markers:
  - standard blue markers
  - verified teal markers
  - full-capacity gray locked markers
- Selected verified marker displays 15 percent teal fuzzy service radius.
- Top floating search/radius pill.
- Recenter button.
- Filter button.
- Bottom sheet mini tutor card with View profile and Quick enroll.
- Student bottom nav visible.

S10 Filters Sheet:
- Dimmed background overlay.
- Bottom sheet with handle.
- Header: Filters, Reset all, close icon.
- Subject multi-select chips.
- Distance slider.
- Monthly budget slider.
- Minimum rating selector.
- Verified-only toggle.
- Button: Show 12 tutors.

S11 Tutor Profile:
- Scrollable screen.
- Hero map-style district coverage banner, 180 px height.
- Back and share buttons.
- Avatar overlaps hero.
- Tutor name with Blue Tick.
- Subject chips.
- Stats row: rating, experience, monthly rate.
- Tabs: About, Reviews, Availability.
- About card with short bio.
- Session board with 3 visible slots:
  - 1-to-1 session
  - public batch with capacity bar
  - empty open capacity slot
- Sticky footer with price and Enroll Now button.

S12 Enrollment Form:
- Tutor summary header.
- Default mode: 1-to-1 request.
- Optional mode: Join private batch with session code.
- Duration selector: 1, 3, 6, 12 months.
- Start date calendar.
- Day selector.
- Time slot selector.
- Approximate teaching location/address confirmation.
- Trial week toggle.
- Cost breakdown ledger.
- Button: Send enrollment request.

S13 AI Chat:
- Use ai/purple color system.
- Header #312E81 with title EdumentX AI and online/RAG indicator.
- Chat bubbles:
  - AI incoming in ai/purple-light.
  - User outgoing in neutral or very light purple. Do not use brand blue CTA styling here.
- AI recommendation bubble includes tutor mini-cards.
- Quick suggestion chips.
- Input bar with mic, text field, send button in ai/purple.

S14 My Enrollments:
- Tabs: Active, Pending, Past.
- Enrollment cards with tutor avatar, subject, schedule, status badge.
- Pending counter-offer card.
- Batch invitation card.
- Empty state for no enrollments.

S15 Enrollment Detail:
- Tutor summary.
- Session type pill.
- Schedule rows: calendar, clock, map area.
- Batch conversion CTA: Share the cost with friends.
- Request batch conversion bottom sheet state with textarea.
- Confirmation state after request sent.

S16 Session Code:
- Private batch session code display.
- Large monospace code.
- Copy and Share buttons.
- Capacity bar, example: 2 of 5 seats filled.
- How sharing works list.
- WhatsApp/SMS share row.
- Back to enrollments link.
- Keep flat design, no gradient hero.

S17 Browse Batches:
- Header and search/filter row.
- Batch cards show subject, tutor, verification, capacity, schedule, price.
- CTA: Request to join.
- Empty state for no available batches.

S18 Rate Review:
- Locked state until 2 completed sessions.
- Review form state:
  - tutor header
  - 5-star overall row
  - teaching, punctuality, communication, subject knowledge ratings
  - textarea with character count
  - submit button.

S19 Student Profile:
- Avatar, name, grade.
- Settings rows: Edit profile, Notifications, Language, Help, Logout.
- Student bottom nav.

S20 Notifications:
- Header with Mark all read.
- Group rows by Today and Earlier.
- Notification types: enrollment accepted, counter-offer, verification, reminder, AI recommendation.

Tutor Flow Screens:

S21 Tutor Dashboard:
- Header: greeting, availability toggle, notification bell.
- 2 x 2 metric cards:
  - active students
  - pending requests
  - average rating
  - months taught
- Student capacity meter.
- Today's schedule list.
- Session board with 3 slots.
- Tutor bottom nav: Dashboard, Inbox, Batches, Capacity, Profile.

S22 Tutor Inbox Request Detail:
- Request detail state.
- Student profile summary.
- Request ledger: subject, plan, schedule, note.
- Privacy-safe map:
  - tutor location visible
  - student shown as fuzzy radius only
  - no exact student pin/address before acceptance.
- Banner: within service area or outside service area.
- Footer actions:
  - Accept
  - Counter-offer
  - Reject

S23 Group Batch Creation:
- Step 1: select enrolled students.
- Subject filter chips.
- Student cards in 2-column grid.
- Selected cards have primary border and check mark.
- Tally: 2/6 selected.
- Button: Next: Batch details.
- Also show future Step 2 and Step 3 preview states: schedule/rate, review/invite.

S24 Capacity Manager:
- Weekly availability grid.
- Session slots and max capacity explanation.
- Occupied vs available vs full slot states.
- Stepper for tutor capacity limit where allowed.
- Warning about quality control and overcrowding.

S25 Tutor Edit Profile:
- Avatar upload.
- Name and bio.
- Subject multi-select.
- Three rate fields:
  - 1-to-1 monthly rate
  - recommended batch rate per student
  - minimum batch rate floor
- Experience stepper.
- Service radius selector.
- Save button.

S26 Document Upload:
- Verification status banner.
- Upload cards:
  - college ID for student tutors
  - citizenship ID
  - academic certificate
  - demo video
- Uploading state, uploaded preview state, rejected state with reason.
- Button: Submit for review.

Admin Flow Screens:

S27 Admin Verification Queue:
- Header uses #185FA5.
- Admin top tabs: Stats, Verification, Users, Settings.
- Verification tab active.
- Metrics ribbon: Pending review, Approved today, Flagged backlog.
- Filters: All, Student Tutor, Professional, Resubmissions.
- Verification request card:
  - candidate avatar
  - name
  - tutor type badge
  - submitted time
  - document thumbnails
  - Approve, Request info, Reject actions.
- Admin bottom nav or top nav must be consistent. Prefer top admin tabs plus optional compact bottom icons only if needed.

S28 Admin User Management:
- Header #185FA5.
- Search bar.
- Role filters: All, Students, Tutors.
- User rows: avatar, name, role, join date, status badge.
- Row actions: Suspend, Reinstate, Remove.
- Confirmation modal state for destructive actions.

S29 Admin Platform Stats:
- KPI grid:
  - registered users
  - active enrollments
  - verified tutors percentage
  - average rating
- Weekly enrollment trend chart.
- Subject demand horizontal bar chart.
- Recent admin activity feed.

S30 Admin Settings:
- Mark as a proper settings screen, not a duplicate stats screen.
- Admin profile/security section.
- Verification policy settings.
- Notification preferences.
- Data export/audit log shortcut.
- Danger zone with disabled-looking destructive controls.

Components And States:
Create a component page with reusable variants:
- Primary button: default, pressed, disabled, loading.
- Secondary button.
- Danger button.
- Input: default, focused, invalid, disabled.
- Phone input.
- Password input.
- OTP input.
- Tutor card compact/full.
- Enrollment card.
- Batch card.
- Verification request card.
- Session slot card.
- Status badges.
- Blue Tick badge.
- Student Tutor badge.
- Bottom nav variants.
- Admin nav.
- Map marker variants.
- Chat bubbles.
- Empty state: no tutors found, no enrollments, no notifications.
- Loading state: skeleton tutor card, skeleton list.
- Offline state: amber banner.
- Error state: validation row.
- Full capacity warning.
- Location permission off state.
- Verification pending state.

Prototype Links:
- Splash -> Onboarding.
- Onboarding final CTA -> Phone Entry.
- Phone signup -> OTP -> Create Password -> Role Selection -> Profile Setup.
- Phone login -> role-based destination examples: Student Home, Tutor Dashboard, Admin Verification Queue.
- Student Home -> Map, AI Chat, Tutor Profile, Enrollments.
- Tutor Profile -> Enrollment Form.
- Enrollment Detail -> Session Code.
- Tutor Dashboard -> Inbox -> Request Detail.
- Tutor Dashboard -> Batches -> Group Batch Creation.
- Admin tabs connect Verification, Users, Stats, Settings.

Quality Rules:
- Every frame must be visually complete.
- Do not leave large blank spaces unless they are intentional empty states.
- Do not render diagrams made from text characters.
- Do not place documentation text inside app screens.
- Do not use desktop web tables on mobile. Use mobile rows/cards.
- Do not create tiny unreadable labels.
- Do not let text overlap, overflow, or cover buttons.
- Do not use stock-looking dark blurred photos.
- Use realistic sample names and Nepal context:
  - Suhan Khadka
  - Arjun Shrestha
  - Sita Thapa
  - Aarav Poudel
  - Rohan Thapa
  - Kathmandu
  - Lalitpur
  - Bhaktapur
  - Mathematics, Physics, Chemistry, Biology, English, Computer Science
- Use Nepal currency: Rs.
- Dates/times can be sample app data.

Final Deliverable:
Generate the complete EdumentX mobile UI design with all frames, components, states, and prototype links. Prioritize clean, error-free, React Native Expo-friendly mobile layouts that can be implemented screen by screen.
```
