# Project Structure And Feature Workflow

This document explains what each current folder and file does, how to edit it, and how to add future features without making the project messy.

The project is intentionally small right now. It starts with only the splash screen and onboarding carousel. Larger folders such as `components/`, `services/`, `store/`, `types/`, and role-specific screen folders should be recreated when the matching feature phase begins.

## Current Goal

The current app should do only this:

1. Open on a splash screen.
2. Move to the onboarding carousel.
3. Keep Firebase, maps, auth, role dashboards, and AI as planned future work.

This keeps the starter app easy for teammates to understand before adding real product features.

## Current App Flow

```text
app/_layout.tsx
  controls the root Expo Router stack

app/index.tsx
  shows SplashScreen
  after a short delay, routes to /onboarding

app/onboarding.tsx
  shows OnboardingScreen
```

## Current Folder And File Roles

### `app/`

Expo Router reads this folder and turns files into app routes.

Current files:

- `_layout.tsx`
- `index.tsx`
- `onboarding.tsx`

How to edit:

- Add route files here when a screen should have a URL or navigation path.
- Keep route files small.
- Route files should usually import real UI from `screens/`.

Example:

```tsx
import { PhoneEntryScreen } from '@/screens/auth/PhoneEntryScreen';

export default function PhoneEntryRoute() {
  return <PhoneEntryScreen />;
}
```

When adding phone signup later, create:

```text
app/phone-entry.tsx
screens/auth/PhoneEntryScreen.tsx
```

### `app/_layout.tsx`

Role:

- Defines the root navigation stack.
- Hides default headers.
- Wraps the app in `GestureHandlerRootView`.
- Sets the default status bar behavior.

How to edit:

- Add new `Stack.Screen` entries for important routes.
- Keep shared navigation settings here.
- Do not put screen UI here.

Current example:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="onboarding" />
</Stack>
```

### `app/index.tsx`

Role:

- Entry route for `/`.
- Shows the splash screen.
- Redirects to `/onboarding`.

How to edit:

- Keep this screen simple.
- Later, this file can check whether onboarding is complete and route users to auth or dashboard.

Future flow:

```text
if first launch -> onboarding
if not signed in -> phone-entry/login
if signed in student -> student/home
if signed in tutor -> tutor/dashboard
if signed in admin -> admin/verification
```

### `app/onboarding.tsx`

Role:

- Route file for `/onboarding`.
- Imports the actual onboarding UI from `screens/onboarding/OnboardingScreen.tsx`.

How to edit:

- Do not place large UI here.
- Put UI logic in `screens/onboarding/OnboardingScreen.tsx`.

### `screens/`

Role:

- Holds full-screen UI components.
- Each file should represent one full screen.

Current folder:

```text
screens/onboarding/
  SplashScreen.tsx
  OnboardingScreen.tsx
```

How to edit:

- Put route-level screen UI here.
- Keep business logic light.
- Use services for backend/data logic later.
- Use components when a piece of UI becomes reused.

### `screens/onboarding/SplashScreen.tsx`

Role:

- Shows the EdumentX splash screen.
- Uses the blue brand background.
- Does not call Firebase or any backend.

How to edit:

- Change logo, text, color, or splash layout here.
- Keep it fast and static.
- Avoid network calls on the splash screen.

### `screens/onboarding/OnboardingScreen.tsx`

Role:

- Shows the three onboarding slides.
- Manages the active slide with local state.
- Uses native React Native components, not web `div` or CSS.

How to edit:

- Edit the `slides` array to change title, subtitle, icon, or background.
- Edit styles at the bottom for layout changes.
- Later, replace the final `Alert` with navigation to the phone entry screen.

Future edit when auth begins:

```tsx
router.replace('/phone-entry');
```

To do that, import `useRouter` from `expo-router` and create `app/phone-entry.tsx`.

### `constants/`

Role:

- Stores design tokens.
- Keeps colors, spacing, and typography consistent.

Current files:

- `colors.ts`
- `spacing.ts`
- `typography.ts`

How to edit:

- Add new app-wide colors only when they are reused.
- Do not hardcode repeated colors inside screens.
- Keep names meaningful, such as `brand.primary`, `semantic.danger`, or `onboarding.aiBackground`.

### `constants/colors.ts`

Role:

- Defines the app color palette.
- Includes brand, semantic, background, text, border, and onboarding colors.

How to edit:

- Change brand color here if the whole app should change.
- Add feature-specific colors only when needed.

### `constants/spacing.ts`

Role:

- Defines spacing values used by screens and components.

How to edit:

- Use this instead of random spacing numbers when possible.
- Add new spacing only when repeated.

### `constants/typography.ts`

Role:

- Defines reusable text styles.

How to edit:

- Keep font sizes consistent.
- Add a style when many screens need the same text treatment.

### `firebase/`

Role:

- Stores Firebase rules and indexes.
- This is project configuration, not app UI code.

Current files:

- `firestore.rules`
- `storage.rules`
- `indexes.json`

How to edit:

- Update Firestore and Storage rules when Firebase features are implemented.
- Keep rules strict.
- Do not open all reads/writes in production.

### `firebase.json`

Role:

- Tells Firebase CLI where rules and indexes are.
- Defines emulator ports.

How to edit:

- Change only when Firebase CLI setup changes.
- Do not add secrets here.

### `.env.example`

Role:

- Shows teammates which environment variables they need.
- Safe to commit because values are blank.

How to edit:

- Add a variable here whenever a feature needs a new environment value.
- Never put real keys in this file.

### `.env`

Role:

- Local machine values.
- Not committed to Git.

How to edit:

- Fill Firebase and Google Maps values from official consoles.
- Restart Expo after changing it.

### `.nvmrc`

Role:

- Tells `nvm` which Node version to use.

How to edit:

- Change only when the team upgrades Node.
- Run `nvm use` after entering the project.

### `.npmrc`

Role:

- Enforces the Node engine rule.
- Prevents teammates from installing with unsupported Node.

How to edit:

- Usually do not edit.

### `package.json`

Role:

- Lists dependencies and scripts.
- Defines Node engine requirement.

How to edit:

- Add packages only when a feature needs them.
- Use `npx expo install` for Expo native packages.
- Use `npm install` for pure JavaScript packages.

Current useful scripts:

```bash
npm run start
npm run lint
npm run typecheck
```

### `package-lock.json`

Role:

- Locks exact package versions for the team.

How to edit:

- Do not manually edit.
- It updates when running `npm install` or `npm ci` with package changes.

### `tsconfig.json`

Role:

- TypeScript configuration.
- Enables strict typing and `@/` imports.

How to edit:

- Usually do not edit.
- Update paths only if project architecture changes.

### `eslint.config.js`

Role:

- Linting rules.

How to edit:

- Update when the team agrees on linting changes.
- Do not disable rules just to hide errors.

### `Documentation/`

Role:

- Long project documentation.
- README should stay short.

Important files:

- `INITIAL_PROJECT_SETUP.md`
- `FEATURE_IMPLEMENTATION_GUIDE.md`
- `PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md`
- `DEPENDENCY_AND_GIT_TROUBLESHOOTING.md`
- `PROJECT_SETUP.md`

How to edit:

- Update docs in the same pull request when setup, architecture, or workflow changes.

## Removed Starter/Future Folders

These folders were removed because they were empty or contained future code that is not needed for the current splash/onboarding starter:

```text
components/
hooks/
services/
store/
types/
utils/
functions/
screens/auth/
screens/student/
screens/tutor/
screens/admin/
assets/
```

Recreate them when needed by a feature phase.

## How To Add A New Feature

Use `Documentation/FEATURE_IMPLEMENTATION_GUIDE.md` as the roadmap.

### Step 1: Find The Phase

Example:

- Auth work: Phase 3.
- Student dashboard: Phase 5.
- Tutor dashboard: Phase 6.
- Map search: Phase 8.
- RAG chatbot: Phase 14.

### Step 2: Create A Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/auth-phone-entry
```

### Step 3: Create Only The Folders Needed

For auth:

```text
app/phone-entry.tsx
app/otp.tsx
screens/auth/PhoneEntryScreen.tsx
screens/auth/OtpVerifyScreen.tsx
components/forms/
services/firebase/
types/
```

For student dashboard:

```text
app/student/home.tsx
screens/student/StudentHomeScreen.tsx
components/student/
services/firebase/
types/
```

For maps:

```text
app/student/map.tsx
screens/student/MapSearchScreen.tsx
components/map/
services/location/
types/
```

### Step 4: Keep Route Files Small

Route file:

```tsx
import { StudentHomeScreen } from '@/screens/student/StudentHomeScreen';

export default function StudentHomeRoute() {
  return <StudentHomeScreen />;
}
```

Screen file:
  
```tsx
export function StudentHomeScreen() {
  return null;
}
```

### Step 5: Move Repeated UI Into Components

Do not create a component too early.

Create a component when:

- The same UI appears in two or more screens.
- The screen file becomes hard to read.
- The UI has a clear standalone role.

Example:

```text
components/student/TutorCard.tsx
components/common/StatusBadge.tsx
components/forms/PrimaryButton.tsx
```

### Step 6: Put Backend Logic In Services

Screens should not contain long Firebase or API logic.

Example:

```text
services/firebase/auth.ts
services/firebase/users.ts
services/location/locationPermission.ts
services/ai/recommendTutors.ts
```

### Step 7: Add Types When Data Becomes Shared

Use `types/` when the same data shape is used in multiple places.

Example:

```text
types/user.ts
types/tutor.ts
types/enrollment.ts
```

### Step 8: Verify Before Push

```bash
nvm use
npm run lint
npm run typecheck
npx expo start --lan
```

## Converting Figma Make React Code To Expo

Figma Make often gives web React code. Expo uses React Native.

Convert like this:

| Web React | Expo React Native |
| --- | --- |
| `div` | `View` |
| `button` | `Pressable` |
| `p`, `span`, headings | `Text` |
| inline CSS strings | `StyleSheet.create` |
| `react-router` | `expo-router` |
| `useNavigate()` | `useRouter()` |
| `lucide-react` | `@expo/vector-icons` or `lucide-react-native` |
| CSS `height: 100%` | `flex: 1` |
| `cursor: pointer` | not needed |

Do not copy web code directly into Expo. Translate the structure and design into native components.

## Opening Flow Implementation Notes

Current implementation:

```text
app/index.tsx
screens/onboarding/SplashScreen.tsx
app/onboarding.tsx
screens/onboarding/OnboardingScreen.tsx
```

The pasted Figma flow had these web routes:

```text
/
/onboarding
/phone-entry
/otp
/create-password
/role-select
/profile-setup
```

Only `/` and `/onboarding` are implemented now. Add the rest during the authentication phase.

When the phone entry screen exists, update the last onboarding button from a temporary alert to:

```tsx
router.replace('/phone-entry');
```

## Feature Phase Folder Plan

### Phase 1: App Shell And Navigation

Add only route files and placeholder screens.

```text
app/
screens/
constants/
```

### Phase 2: Firebase Connection

Create Firebase client services only when real Firebase testing starts.

```text
services/firebase/config.ts
services/firebase/users.ts
types/user.ts
```

### Phase 3: Authentication

```text
app/phone-entry.tsx
app/otp.tsx
app/create-password.tsx
app/role-select.tsx
app/profile-setup.tsx
screens/auth/
components/forms/
services/firebase/auth.ts
store/
types/user.ts
```

### Phase 5: Student Flow

```text
app/student/
screens/student/
components/student/
services/firebase/
types/tutor.ts
types/enrollment.ts
```

### Phase 6: Tutor Flow

```text
app/tutor/
screens/tutor/
components/tutor/
types/tutor.ts
types/batch.ts
```

### Phase 7: Admin Flow

```text
app/admin/
screens/admin/
components/admin/
services/firebase/admin.ts
types/admin.ts
```

### Phase 8: Map Search

```text
components/map/
services/location/
types/location.ts
```

### Phase 13: Notifications

```text
services/notifications/
types/notification.ts
```

### Phase 14: RAG AI Chatbot

```text
services/ai/
types/chat.ts
functions/
```

## Team Rules For Editing

- Keep `README.md` short.
- Put long explanations in `Documentation/`.
- Create folders only when real code is added.
- Do not commit `.env`.
- Do not commit `node_modules`.
- Use `nvm use` before running commands.
- Run lint and typecheck before pushing.
- Keep each pull request focused on one feature or setup change.
