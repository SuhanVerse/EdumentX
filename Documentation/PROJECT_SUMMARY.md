# EdumentX - Comprehensive Project Summary

**Project Owner:** SuhanVerse  
**Repository Type:** Location-based tutor finding mobile application  
**Tech Stack:** React Native (Expo) + TypeScript + Firebase  
**Development Date:** Current (2026)  
**Current Version:** 1.0.0  
**Target Platforms:** iOS, Android, Web

---

## 1. PROJECT OVERVIEW

### Vision & Purpose
EdumentX is a **location-based mobile application** designed to connect students, parents, tutors, and administrators in a unified educational ecosystem. The platform enables:
- **Students & Parents**: Find nearby tutors with location-based search
- **Tutors**: Register and offer services in their geographical areas
- **Admins**: Manage user verification, quality control, and platform integrity

### Current Development Phase
**Phase 1-2:** App Shell & Firebase Configuration  
The project is in early-stage development with a **splash screen and onboarding carousel** implemented. Authentication, dashboards, maps, and AI features are planned for future phases.

### Key Differentiators
- Location-based discovery (maps integration planned)
- Multi-role system (students, tutors, parents, admins)
- AI-powered tutor recommendations (Phase 14)
- RAG chatbot assistance
- Verified tutor credentials

---

## 2. TECHNICAL ARCHITECTURE

### Core Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React Native with Expo | 54.0.33 | Cross-platform mobile development |
| **Language** | TypeScript | 5.9.2 | Type-safe development |
| **Routing** | Expo Router | 6.0.23 | File-based routing system |
| **State Management** | React Context API | TBD | Planned for authentication phase |
| **Backend** | Firebase | (config pending) | Authentication, Firestore, Storage |
| **UI Components** | React Native native | - | No external UI library (intentional) |
| **Icons** | Expo Vector Icons | 15.0.3 | Ionicons integration |
| **Dev Tools** | ESLint + Prettier | 9.25.0 / 3.8.3 | Code quality & formatting |

### Platform Support
- ✅ **Android**: Edge-to-edge enabled, predictive back gesture disabled
- ✅ **iOS**: Tablet support enabled
- ✅ **Web**: Static output mode
- **React Compiler**: Experimental enabled
- **Typed Routes**: Experimental enabled
- **New Architecture**: Enabled in app.json

### Node & Package Management
```
Node.js: >= 20.19.4 (enforced via .npmrc)
Package Manager: npm (with lock file for deterministic installs)
```

---

## 3. PROJECT STRUCTURE & FILE ORGANIZATION

### Directory Tree (Relevant Paths)

```
EdumentX/
├── app/                          # Expo Router route files (becomes URL routes)
│   ├── _layout.tsx              # Root navigation stack setup
│   ├── index.tsx                # "/" - Splash screen entry point
│   ├── onboarding.tsx           # "/onboarding" - Onboarding carousel route
│   └── phone-entry.tsx          # "/phone-entry" - Auth phone entry (WIP)
│
├── screens/                      # Full-screen UI components
│   ├── onboarding/
│   │   ├── SplashScreen.tsx     # Animated splash with progress bar
│   │   └── OnboardingScreen.tsx # 3-slide onboarding carousel
│   └── auth/
│       └── PhoneEntryScreen.tsx # Phone number + password entry (Phase 3)
│
├── components/                   # Reusable UI components (empty, will grow)
│   └── forms/                   # Form-related components (planned)
│
├── services/                     # Business logic & external API integration
│   └── firebase/               # Firebase service layer (empty, TBD)
│
├── constants/                    # Design tokens & configuration
│   ├── colors.ts               # Complete color palette (brand, semantic, UI)
│   ├── spacing.ts              # Spacing scale (xs, sm, md, lg, xl)
│   └── typography.ts           # Text styles (overline, caption, body, button, etc.)
│
├── firebase/                     # Firebase configuration files
│   ├── firestore.rules         # Firestore security rules
│   ├── storage.rules           # Cloud Storage security rules
│   └── indexes.json            # Firestore composite indexes
│
├── Documentation/               # Project guides & onboarding
│   ├── INITIAL_PROJECT_SETUP.md
│   ├── FEATURE_IMPLEMENTATION_GUIDE.md
│   ├── PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md
│   ├── DEPENDENCY_AND_GIT_TROUBLESHOOTING.md
│   └── PROJECT_SETUP.md
│
├── app.json                     # Expo configuration
├── package.json                 # Dependencies & npm scripts
├── tsconfig.json                # TypeScript configuration
├── eslint.config.js             # ESLint rules
├── firebase.json                # Firebase CLI configuration
├── .env.example                 # Environment variables template
├── .nvmrc                        # Node version requirement
├── .npmrc                        # npm configuration
├── .gitignore                   # Git ignore rules
└── README.md                    # Quick start guide
```

### Intentional Design Decisions
- **Empty Future Folders Removed**: folders like `components/`, `hooks/`, `store/`, `types/` are intentionally not created until needed
- **Minimal Initial Codebase**: Keeps the project understandable for new team members
- **Service-Oriented Architecture**: Business logic separated into `services/` folder (will scale to multiple domains)

---

## 4. CURRENT IMPLEMENTATION DETAILS

### User Flow (Current)

```
1. App Launch
   ↓
2. Splash Screen (1.8s) - SplashScreen.tsx
   ├─ Animated logo "E" in branded blue box
   ├─ Title: "EdumentX"
   ├─ Subtitle: "Find your perfect tutor nearby"
   └─ Animated progress bar
   ↓
3. Onboarding Carousel - OnboardingScreen.tsx
   ├─ Slide 1: Location-based discovery
   ├─ Slide 2: Verified tutors
   ├─ Slide 3: Get help button (shows alert)
   └─ [Future] Routes to /phone-entry
   ↓
4. [Phase 3] Phone Entry - PhoneEntryScreen.tsx (WIP)
   ├─ Sign up mode: Phone + OTP
   └─ Login mode: Phone + Password
```

### Implemented Screens

#### 1. SplashScreen.tsx
- **Purpose**: App entry point with brand identity
- **Features**:
  - Animated logo with Animated API
  - Progress bar from 0-85%
  - Brand color background (#174780)
  - Light status bar
- **Duration**: 1.8 seconds before navigation

#### 2. OnboardingScreen.tsx
- **Purpose**: Feature introduction to new users
- **Features**:
  - 3-slide carousel
  - Slide indicators (dots)
  - Swipe/tap navigation between slides
  - Skip & Next/Get Help buttons
  - Per-slide background colors
- **Status**: Complete but without navigation to auth

#### 3. PhoneEntryScreen.tsx (In Development)
- **Purpose**: User authentication entry point
- **Features**:
  - Toggle between Sign Up / Log In modes
  - Phone number input with country code selector (NP +977)
  - Password field for login mode (with show/hide toggle)
  - Input validation (10-digit phone, 6+ char password)
  - Segmented control for mode switching
  - Disabled submit when form invalid
- **Status**: UI complete, backend integration pending

### Design System Implementation

#### Colors (constants/colors.ts)
```typescript
Brand Colors:
- Primary: #185FA5 (main app blue)
- Primary Light: #E6F1FB (light background)
- Verification: #1D9E75 (green)
- AI: #534AB7 (purple)
- Splash: #174780 (dark blue)

Semantic Colors:
- Success: #1D9E75
- Warning: #B7791F
- Danger: #C2413A
- Info: #185FA5

Text Colors:
- Primary: #1F2933 (dark gray)
- Secondary: #5D6673 (medium gray)
- Muted: #8A94A3 (light gray)
- Inverse: #FFFFFF (white)

UI Surface Colors:
- Page Background: #F5F5F3
- Surface: #FFFFFF
- Borders: rgba(31, 41, 51, 0.15) to #D9DEE7
```

#### Spacing Scale (constants/spacing.ts)
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px

#### Typography (constants/typography.ts)
- Overline: Small caps for labels
- Caption: Small text for helpers
- Body: Default paragraph text
- Button: Medium weight for CTAs
- Hero Title: Large display heading

### Navigation Structure

```typescript
// app/_layout.tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />           // "/" → Splash
  <Stack.Screen name="onboarding" />      // "/onboarding" → Onboarding
  <Stack.Screen name="phone-entry" />     // "/phone-entry" → Auth (WIP)
</Stack>
```

---

## 5. DEVELOPMENT WORKFLOW

### Git Workflow
```
Base Branch: main
Development Branch: develop
Feature Branches: feature/*, fix/*

Flow:
1. Create feature branch from develop
2. Implement feature
3. Open pull request to develop
4. Code review and merge with merge commits
5. Periodically merge develop to main for releases
```

### Current Branch Status
- **Active Branch**: `feature/auth-phone-entry`
- **Recent Commits**:
  - c230944: Merge PR #7 (develop merge)
  - 61cfa14: Merge PR #6 (feature/auth-phone-entry)
  - be5e39f: feat: phone entry ui added
  - ef50c3b: Merge PR #5 (develop)
  - d803bf6: feat: Opening pages added

### Build & Development Commands

```bash
# Development
npm run start              # Start Expo dev server
npm run android           # Run on Android emulator
npm run ios              # Run on iOS simulator
npm run web              # Run web version

# Quality Assurance
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript check (no emit)

# Environment Setup
nvm use                  # Switch to Node 20.19.4+
npm ci                   # Clean install from lock file
cp .env.example .env     # Setup environment variables

# Expo Commands
npx expo start --lan     # LAN mode (faster local)
npx expo start --tunnel  # Tunnel mode (external testing)
```

### Debugging & Testing
- **Firebase Emulator**: Configured on ports 8080 (Firestore), 9099 (Auth), 9199 (Storage)
- **Firebase UI**: Available on port 4000 for emulator visualization
- **Expo CLI**: Supports Android, iOS, and Web targets from single codebase

---

## 6. FIREBASE INTEGRATION (Planned)

### Current Setup
Firebase is configured but not yet integrated into app code.

### Firestore Configuration
- **Rules File**: `firebase/firestore.rules`
- **Indexes**: `firebase/indexes.json`
- **Security**: Strict rules to be enforced before production

### Cloud Storage Configuration
- **Rules File**: `firebase/storage.rules`
- **Purpose**: User avatars, profile pictures, tutor credentials

### Firebase Emulator Suite
```json
Auth Emulator: port 9099
Firestore Emulator: port 8080
Storage Emulator: port 9199
UI Dashboard: port 4000
```

### Future Firebase Integration Points
1. **Phase 2**: Firebase client initialization
2. **Phase 3**: Authentication service (phone + OTP)
3. **Phase 5-7**: Role-specific data models
4. **Phase 8**: Geolocation indexing

---

## 7. FUTURE DEVELOPMENT PHASES

### Phase 1-2 (✅ Current): App Shell
- Routes and navigation setup
- Splash + Onboarding screens
- Design system tokens
- Firebase configuration

### Phase 3: Authentication
- Phone number entry & validation
- OTP verification service
- Password creation
- Role selection (Student/Tutor/Admin/Parent)
- Profile setup initial data

### Phase 4: Profile Management
- User profile screens
- Image uploads to Firebase Storage
- Basic profile info persistence

### Phase 5: Student Dashboard
- Student home screen with tutor feed
- Saved tutors list
- Search history
- Enrollment management

### Phase 6: Tutor Dashboard
- Tutor profile setup (credentials, bio, rates)
- Availability management
- Batch creation & scheduling
- Student enquiries view

### Phase 7: Admin Dashboard
- User verification workflow
- Tutor credential approval
- Platform analytics
- Dispute resolution

### Phase 8: Location & Search
- Google Maps integration
- Location-based tutor search
- Distance filtering
- Radius-based recommendations

### Phase 13: Notifications
- Push notification setup
- In-app notification center
- Notification preferences

### Phase 14: AI Features
- RAG chatbot (Retrieval-Augmented Generation)
- AI-powered tutor recommendations
- Automated learning paths

---

## 8. ENVIRONMENT VARIABLES

### Required Configuration (.env)
The project expects:
```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

GOOGLE_MAPS_API_KEY=

[Additional variables added per phase]
```

See `.env.example` for template.

---

## 9. CODE QUALITY & STANDARDS

### ESLint Configuration
- **Config**: Expo standard configuration
- **Level**: Enforced (no errors push to main)

### TypeScript
- **Version**: 5.9.2
- **Strict Mode**: Enabled
- **Path Alias**: `@/` for absolute imports
- **No Emit**: `typecheck` script verifies without output

### Prettier Formatting
- **Version**: 3.8.3
- **Scope**: All TypeScript/JavaScript files
- **Enforcement**: Via git hooks (planned)

### Pre-commit Checks (Planned)
- TypeScript compilation check
- ESLint validation
- Prettier formatting

---

## 10. KEY ARCHITECTURAL DECISIONS

### Why React Native + Expo?
- ✅ Write once, run everywhere (iOS, Android, Web)
- ✅ Native performance while maintaining code sharing
- ✅ Expo handles complex native modules
- ✅ Faster iteration during development

### Why File-Based Routing (Expo Router)?
- ✅ File structure mirrors URL structure
- ✅ Reduces boilerplate for navigation
- ✅ Type-safe routes with experiments enabled
- ✅ Automatic code splitting

### Why Firestore + Cloud Storage?
- ✅ Real-time data synchronization
- ✅ Built-in security rules
- ✅ Scalable to millions of users
- ✅ Location-based indexing support
- ✅ Serverless (no backend infrastructure)

### Why Design Tokens in Code?
- ✅ Single source of truth for colors/spacing/typography
- ✅ Type-safe constant usage
- ✅ Prevents hardcoded color inconsistencies
- ✅ Easy theming in future phases

### Intentional Minimalism
- ✅ No UI library (avoids heavy dependencies)
- ✅ Native React Native components
- ✅ Custom styling for complete control
- ✅ Smaller bundle size

---

## 11. DEPENDENCIES OVERVIEW

### Core Dependencies
```json
{
  "expo": "~54.0.33",                           // Framework
  "expo-router": "~6.0.23",                     // File-based routing
  "react": "19.1.0",                            // UI library
  "react-native": "0.81.5",                     // Native bridge
  "expo-linking": "~8.0.11",                    // Deep linking
  "expo-splash-screen": "~31.0.13",             // Splash screen
  "expo-status-bar": "~3.0.9",                  // Status bar control
  "@expo/vector-icons": "^15.0.3",              // Icons
  "react-native-gesture-handler": "~2.28.0",   // Gesture recognition
  "react-native-safe-area-context": "~5.6.0",  // Safe area handling
  "react-native-screens": "~4.16.0",            // Screen optimization
  "react-native-web": "~0.21.0"                 // Web support
}
```

### Dev Dependencies
```json
{
  "typescript": "~5.9.2",                       // Type checking
  "eslint": "^9.25.0",                          // Linting
  "eslint-config-expo": "~10.0.0",              // Expo linting rules
  "prettier": "^3.8.3",                         // Code formatting
  "@types/react": "~19.1.0"                     // React types
}
```

### Notable Absences
- ❌ **No Redux/Zustand**: Using React Context (planned for auth phase)
- ❌ **No UI Library**: React Native native components only
- ❌ **No ORM**: Direct Firestore usage (planned service layer)
- ❌ **No Firebase SDK**: Will be added in Phase 2

---

## 12. DEVELOPER ONBOARDING CHECKLIST

### First-Time Setup
- [ ] Clone repository: `git clone <repo>`
- [ ] Install Node 20.19.4: `nvm install && nvm use`
- [ ] Install dependencies: `npm ci`
- [ ] Copy environment: `cp .env.example .env`
- [ ] Fill Firebase credentials in `.env`
- [ ] Run type check: `npm run typecheck`
- [ ] Run linter: `npm run lint`
- [ ] Start dev server: `npm run start`

### Before Creating Features
- [ ] Read `Documentation/PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md`
- [ ] Read `Documentation/FEATURE_IMPLEMENTATION_GUIDE.md`
- [ ] Understand current phase scope (splash + onboarding only)
- [ ] Create feature branch from `develop`

### Code Review Checklist
- [ ] TypeScript strict mode compliance
- [ ] ESLint passes without errors
- [ ] Prettier formatting applied
- [ ] No hardcoded colors/spacing (use constants)
- [ ] Screens placed in `screens/`, routes in `app/`
- [ ] Services added for non-UI logic
- [ ] Tests pass (if applicable)
- [ ] Design system tokens used

---

## 13. CRITICAL FILE REFERENCE

| File | Purpose | Last Modified |
|------|---------|----------------|
| `app/_layout.tsx` | Root navigation setup | During auth phase setup |
| `app/index.tsx` | Splash screen entry | Initial setup |
| `screens/onboarding/SplashScreen.tsx` | Brand splash screen | Initial setup |
| `screens/onboarding/OnboardingScreen.tsx` | Feature onboarding | Initial setup |
| `screens/auth/PhoneEntryScreen.tsx` | Phone auth entry (WIP) | Recent |
| `constants/colors.ts` | Complete color palette | Stable |
| `constants/spacing.ts` | Spacing scale | Stable |
| `constants/typography.ts` | Text styles | Stable |
| `firebase.json` | Firebase CLI config | Initial setup |
| `app.json` | Expo configuration | Stable |
| `package.json` | Dependencies & scripts | Maintained |

---

## 14. KNOWN LIMITATIONS & TODOs

### Current Limitations
- ❌ No backend authentication (Phase 3)
- ❌ No Firebase integration in app code (Phase 2)
- ❌ No location services (Phase 8)
- ❌ No real-time features (post-authentication)
- ❌ No offline support (planned)

### Temporary Placeholders
- 🔷 Phone entry screen: Shows alerts instead of real auth
- 🔷 OTP verification: Not yet connected
- 🔷 Password validation: Placeholder logic only
- 🔷 Firebase rules: Placeholder rules (must be hardened)

### Upcoming Priorities
1. Connect Firebase authentication
2. Implement OTP verification
3. Build student home screen
4. Implement tutor dashboard
5. Add location services

---

## 15. USEFUL COMMANDS REFERENCE

```bash
# Development
npm run start                    # Start dev server
npm run android                  # Run on Android
npm run ios                      # Run on iOS
npm run web                      # Run on web

# Quality Checks
npm run lint                     # ESLint check
npm run typecheck                # TypeScript check

# Environment
nvm use                          # Switch Node version
npm ci                           # Clean dependency install

# Git Workflow
git checkout develop             # Switch to develop
git checkout -b feature/<name>   # Create feature branch
git push origin <branch>         # Push to remote

# Firebase (when integrated)
npm install -g firebase-tools    # Install Firebase CLI
firebase login                   # Authenticate
firebase emulators:start         # Start local emulators
firebase deploy                  # Deploy to production
```

---

## 16. TEAM CONTACT & RESOURCES

### Key Documentation
- 📖 [FEATURE_IMPLEMENTATION_GUIDE.md](./Documentation/FEATURE_IMPLEMENTATION_GUIDE.md)
- 📖 [PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md](./Documentation/PROJECT_STRUCTURE_AND_FEATURE_WORKFLOW.md)
- 📖 [INITIAL_PROJECT_SETUP.md](./Documentation/INITIAL_PROJECT_SETUP.md)
- 📖 [DEPENDENCY_AND_GIT_TROUBLESHOOTING.md](./Documentation/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md)

### Repository Information
- **Owner**: SuhanVerse
- **Repository Type**: Private (Git)
- **Main Branch**: `main`
- **Development Branch**: `develop`
- **Current Working Branch**: `feature/auth-phone-entry`

---

## SUMMARY FOR AI AGENTS

EdumentX is a **location-based tutor-finding mobile application** built with React Native, Expo, and Firebase. It is currently in Phase 1-2 (App Shell & Firebase Configuration) with only a splash screen and onboarding carousel implemented.

**Key Facts:**
- **Cross-platform**: iOS, Android, Web
- **Typed**: Full TypeScript strict mode
- **Design System**: Complete color, spacing, typography tokens
- **Modular**: Services, screens, components separation
- **Extensible**: Clear folder structure for future phases
- **Production-Ready Foundation**: ESLint, Prettier, TypeScript checking

**Next Phase**: Authentication (Phone + OTP, role selection, profile setup)

When implementing features:
1. Stay in `develop` branch (not `main`)
2. Create `feature/*` branches for each feature
3. Use design constants (not hardcoded values)
4. Place UI in `screens/`, logic in `services/`, routes in `app/`
5. Run `lint` and `typecheck` before pushing
6. Keep route files small and focused
