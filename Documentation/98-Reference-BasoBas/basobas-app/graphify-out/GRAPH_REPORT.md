# Graph Report - .  (2026-06-22)

## Corpus Check
- 70 files · ~37,809 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 527 nodes · 785 edges · 55 communities (35 shown, 20 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Confirmation Screen & Detail Rows|Confirmation Screen & Detail Rows]]
- [[_COMMUNITY_Phone Auth & Public Landlord Profile|Phone Auth & Public Landlord Profile]]
- [[_COMMUNITY_Landlord Visits, Requests & Tenant Filter|Landlord Visits, Requests & Tenant Filter]]
- [[_COMMUNITY_Expo & Native Dependencies|Expo & Native Dependencies]]
- [[_COMMUNITY_Expo App Config & Build Manifest|Expo App Config & Build Manifest]]
- [[_COMMUNITY_Onboarding Slides & Step Content|Onboarding Slides & Step Content]]
- [[_COMMUNITY_Product Docs Vision & Experience|Product Docs: Vision & Experience]]
- [[_COMMUNITY_StatusPill Component & Status States|StatusPill Component & Status States]]
- [[_COMMUNITY_package.json Dependencies|package.json Dependencies]]
- [[_COMMUNITY_Landing, Loading & Brand Logo|Landing, Loading & Brand Logo]]
- [[_COMMUNITY_Notifications & Profile Screens|Notifications & Profile Screens]]
- [[_COMMUNITY_Root & Tenant Layouts|Root & Tenant Layouts]]
- [[_COMMUNITY_Router Navigation & Screen Hierarchy|Router Navigation & Screen Hierarchy]]
- [[_COMMUNITY_Profile Edit & AI Preferences|Profile Edit & AI Preferences]]
- [[_COMMUNITY_Landlord Tabs, Dashboard & Listings|Landlord Tabs, Dashboard & Listings]]
- [[_COMMUNITY_Atomic Design Atoms & Molecules|Atomic Design Atoms & Molecules]]
- [[_COMMUNITY_New Listing Wizard Steps 1-3|New Listing Wizard Steps 1-3]]
- [[_COMMUNITY_Design Tokens & NativeWind Config|Design Tokens & NativeWind Config]]
- [[_COMMUNITY_FilterChip Component & Color Variants|FilterChip Component & Color Variants]]
- [[_COMMUNITY_TypeScript Config & Path Aliases|TypeScript Config & Path Aliases]]
- [[_COMMUNITY_App Icons, Splash & Graphify Concept|App Icons, Splash & Graphify Concept]]
- [[_COMMUNITY_Feature Illustration Screens|Feature Illustration Screens]]
- [[_COMMUNITY_MenuCard & MenuRow Components|MenuCard & MenuRow Components]]
- [[_COMMUNITY_Metro Bundler Config (NativeWind)|Metro Bundler Config (NativeWind)]]
- [[_COMMUNITY_SectionLabel Component|SectionLabel Component]]
- [[_COMMUNITY_Toggle Component|Toggle Component]]
- [[_COMMUNITY_ESLint Flat Config|ESLint Flat Config]]
- [[_COMMUNITY_GlassDock useDockState Hook|GlassDock useDockState Hook]]
- [[_COMMUNITY_AI Preferences Screen|AI Preferences Screen]]
- [[_COMMUNITY_Edit Profile, KYC Upload, List Property|Edit Profile, KYC Upload, List Property]]
- [[_COMMUNITY_Project & Concept Descriptions|Project & Concept Descriptions]]
- [[_COMMUNITY_Expo App Config|Expo App Config]]
- [[_COMMUNITY_Verification Screen|Verification Screen]]
- [[_COMMUNITY_Profile Tab|Profile Tab]]
- [[_COMMUNITY_Auth Stack Layout|Auth Stack Layout]]
- [[_COMMUNITY_AuthOnboarding Linear Flow Concept|Auth/Onboarding Linear Flow Concept]]
- [[_COMMUNITY_KYC Verification Concept|KYC Verification Concept]]
- [[_COMMUNITY_Listing Creation Flow Concept|Listing Creation Flow Concept]]
- [[_COMMUNITY_Visit Request Flow Concept|Visit Request Flow Concept]]
- [[_COMMUNITY_ESLint Flat Config Concept|ESLint Flat Config Concept]]
- [[_COMMUNITY_Landlord Layout|Landlord Layout]]
- [[_COMMUNITY_Landlord Profile Tab|Landlord Profile Tab]]
- [[_COMMUNITY_Local Claude Settings|Local Claude Settings]]
- [[_COMMUNITY_My Reviews Screen|My Reviews Screen]]
- [[_COMMUNITY_Visits Tab Screen|Visits Tab Screen]]

## God Nodes (most connected - your core abstractions)
1. `ScreenHeader()` - 48 edges
2. `useOnboardingStore` - 17 edges
3. `expo` - 15 edges
4. `useAuth` - 11 edges
5. `Project Documentation Index` - 11 edges
6. `ScreenBody()` - 10 edges
7. `FloatingDock()` - 9 edges
8. `scripts` - 8 edges
9. `PropertyCard()` - 8 edges
10. `StepProgressBar()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `useOnboardingStore` --conceptually_related_to--> `KYC Verification States`  [INFERRED]
  src/store/onboardingStore.ts → docs/AUTH_FLOW.md
- `FloatingDock()` --conceptually_related_to--> `Real-Time Notification System`  [INFERRED]
  src/components/organisms/FloatingDock.tsx → docs/FEATURES.md
- `getInitialHref()` --conceptually_related_to--> `Dual Role System`  [INFERRED]
  src/config/devMode.ts → docs/APP_VISION.md
- `useOnboardingStore` --conceptually_related_to--> `KYC Mandatory For Landlord`  [INFERRED]
  src/store/onboardingStore.ts → docs/AUTH_FLOW.md
- `useOnboardingStore` --conceptually_related_to--> `Onboarding Steps`  [INFERRED]
  src/store/onboardingStore.ts → docs/AUTH_FLOW.md

## Import Cycles
- 1-file cycle: `metro.config.js -> metro.config.js`

## Hyperedges (group relationships)
- **Auth/onboarding funnel (loading -> onboarding -> phone -> otp -> role -> profile -> kyc -> confirmation)** — auth_loading, auth_onboarding, auth_phone, auth_otp, auth_role, auth_profile_setup, auth_kyc_tenant, auth_kyc_landlord, auth_confirmation [EXTRACTED 1.00]
- **Landlord new listing 4-step creation flow** — landlord_new_step1, landlord_new_step2, landlord_new_step3, landlord_new_step4 [EXTRACTED 1.00]
- **KYC document upload + ImagePicker compression pattern** — auth_kyc_tenant, auth_kyc_landlord, auth_profile_setup [INFERRED 0.85]
- **Tenant Bottom Navigation Flow** — app_tenant_tabs_layout_tenanttabslayout, glassdock_glassdock, glassdock_constants_tenantdockitems_tenant_dock_items, app_tenant_tabs_index_hometab [INFERRED 0.85]
- **Onboarding 3-step screen composition** — onboarding_onboardinglayout_onboardinglayout, onboarding_stepprogressbar_stepprogressbar, onboarding_paginationdots_paginationdots, onboarding_nextbutton_nextbutton, onboarding_skipbutton_skipbutton, onboarding_onboardingeyebrow_onboardingeyebrow, concept_onboarding_steps [INFERRED 0.85]
- **Visit workflow visual concepts** — onboarding_visitillustration_visitillustration, onboarding_verifiedillustration_verifiedillustration, concept_visit_status_lifecycle, concept_post_visit_followup, concept_location_unlock_rule, app_vision_visit_request_workflow [INFERRED 0.85]
- **KYC data flow (types -> store -> docs)** — types_onboardingtypes_onboardingkycdata, types_onboardingtypes_documenttype, types_onboardingtypes_kycstatus, store_onboardingstore_useonboardingstore, store_onboardingstore_onboardingstate, concept_kyc_states, concept_kyc_mandatory_landlord, concept_verification_trust [INFERRED 0.85]

## Communities (55 total, 20 thin omitted)

### Community 0 - "Confirmation Screen & Detail Rows"
Cohesion: 0.06
Nodes (47): ConfirmationScreen(), DetailRowProps, styles, SummaryCardProps, DocTypeChipProps, DocumentUploadZoneProps, KYCLandlordScreen(), styles (+39 more)

### Community 1 - "Phone Auth & Public Landlord Profile"
Cohesion: 0.07
Nodes (5): styles, Props, ScreenHeader(), Props, ReportScreen()

### Community 2 - "Landlord Visits, Requests & Tenant Filter"
Cohesion: 0.09
Nodes (28): RequestDetailScreen, TenantProfileScreen, LandlordVisitsScreen, FilterModal, HomeTab, TenantTabsLayout, SearchTab, VisitsTab (+20 more)

### Community 3 - "Expo & Native Dependencies"
Cohesion: 0.05
Nodes (38): dependencies, expo, expo-blur, expo-camera, expo-constants, expo-document-picker, expo-file-system, expo-font (+30 more)

### Community 4 - "Expo App Config & Build Manifest"
Cohesion: 0.07
Nodes (26): backgroundColor, foregroundImage, adaptiveIcon, tsconfigPaths, typedRoutes, expo, android, assetBundlePatterns (+18 more)

### Community 5 - "Onboarding Slides & Step Content"
Cohesion: 0.12
Nodes (18): FeatureSlide, SLIDES, Onboarding Steps, Verification Builds Trust, MapIllustration(), styles, NextButton, NextButtonProps (+10 more)

### Community 6 - "Product Docs: Vision & Experience"
Cohesion: 0.14
Nodes (24): Authentication & Onboarding Flow, Features List, Landlord Experience, Project Documentation Index, Product Vision, Tenant Experience, Visit Request Workflow, 5-Day Auto-Archive (+16 more)

### Community 7 - "StatusPill Component & Status States"
Cohesion: 0.09
Nodes (20): Props, Status, STATUS_STYLES, Status type union (8 states), StatusPill(), Property listing concept group (Card/Hero/MapPin/Composer), PropertyCard(), PropertyCardVariant (+12 more)

### Community 8 - "package.json Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, @babel/core, eslint, eslint-config-expo, eslint-config-prettier, prettier, prettier-plugin-tailwindcss, tailwindcss (+14 more)

### Community 9 - "Landing, Loading & Brand Logo"
Cohesion: 0.12
Nodes (17): LandingScreen(), LoadingScreen(), styles, fmtTimer(), maskPhone(), OTPScreen(), _styles, PhoneScreen() (+9 more)

### Community 10 - "Notifications & Profile Screens"
Cohesion: 0.14
Nodes (10): NotificationsScreen(), dockBottomReserve(), ScreenBody(), ScreenBodyProps, ScreenBodyWithActionProps, HomeTab(), LandlordDashboard(), ProfileTab() (+2 more)

### Community 11 - "Root & Tenant Layouts"
Cohesion: 0.20
Nodes (12): Index(), RootLayout(), TenantLayout, DevMode, getDevMode(), getInitialHref(), SettingsScreen(), Package Manifest (+4 more)

### Community 12 - "Router Navigation & Screen Hierarchy"
Cohesion: 0.12
Nodes (17): RootLayout (auth/role routing), expo-router Stack navigation, FilterModal Screen, PublicLandlordProfileScreen, MapScreen(), NotificationsScreen(), NotificationPrefsModal Screen, GalleryModal Screen (+9 more)

### Community 13 - "Profile Edit & AI Preferences"
Cohesion: 0.18
Nodes (7): AIPreferencesScreen(), EditProfileScreen(), LandlordVisitsScreen(), ListingDetailScreen, RequestDetailScreen, LandlordProfileTab(), TenantProfileScreen

### Community 14 - "Landlord Tabs, Dashboard & Listings"
Cohesion: 0.22
Nodes (9): LandlordDashboard (home/stats/visits), ListingDetailScreen (stats + pending requests), LandlordListingsTab (2-col property grid), NewListingStep1 (basics/property type/counters), NewListingStep2 (location/map pin), NewListingStep3 (photos/description/amenities/rules), NewListingStep4 (rent/deposit/publish), LandlordRequestsTab (visit request filter/approve/decline) (+1 more)

### Community 15 - "Atomic Design Atoms & Molecules"
Cohesion: 0.20
Nodes (7): Avatar(), Props, Atomic design: atoms, molecules, organisms, FormField(), Props, Props, SearchBar()

### Community 16 - "New Listing Wizard Steps 1-3"
Cohesion: 0.22
Nodes (5): NewListingStep1(), NewListingStep2(), NewListingStep3(), NewListingStep4(), ListingsTab()

### Community 17 - "Design Tokens & NativeWind Config"
Cohesion: 0.33
Nodes (9): BasoBas design token palette (brand green, neutrals), app.json - BasoBas Expo app config, babel.config.js - nativewind/reanimated preset, metro.config.js - withNativeWind wrapper, nativewind-env.d.ts type reference, package.json - Expo 54 + React Native 0.81 + NativeWind, prettier.config.js - tailwindcss plugin, tailwind.config.js - nativewind preset + design tokens (+1 more)

### Community 18 - "FilterChip Component & Color Variants"
Cohesion: 0.29
Nodes (5): BG_MAP, ChipColor, ChipVariant, Props, TEXT_MAP

### Community 19 - "TypeScript Config & Path Aliases"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 20 - "App Icons, Splash & Graphify Concept"
Cohesion: 0.73
Nodes (6): Android Adaptive Icon (basobas-app), Favicon (basobas-app), App Icon (basobas-app), Splash Screen (basobas-app), Graphify Knowledge Graph Concept, Expo Project Visual Assets

### Community 21 - "Feature Illustration Screens"
Cohesion: 0.33
Nodes (3): FeatureMapScreen(), FeatureVerifiedScreen(), FeatureVisitsScreen()

### Community 22 - "MenuCard & MenuRow Components"
Cohesion: 0.33
Nodes (4): MenuCard(), Props, MenuRow(), Props

### Community 23 - "Metro Bundler Config (NativeWind)"
Cohesion: 0.67
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 29 - "Edit Profile, KYC Upload, List Property"
Cohesion: 0.67
Nodes (3): EditProfileScreen, KYCUploadScreen, ListPropertyScreen

## Ambiguous Edges - Review These
- `ReportScreen()` → `PropertyDetailScreen`  [AMBIGUOUS]
  app/(tenant)/report.tsx · relation: conceptually_related_to
- `HomeTab` → `MapIllustration`  [AMBIGUOUS]
  app/(tenant)/(tabs)/index.tsx · relation: conceptually_related_to

## Knowledge Gaps
- **193 isolated node(s):** `name`, `slug`, `version`, `scheme`, `favicon` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ReportScreen()` and `PropertyDetailScreen`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `HomeTab` and `MapIllustration`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `ScreenHeader()` connect `Phone Auth & Public Landlord Profile` to `Confirmation Screen & Detail Rows`, `Landlord Request Detail`, `Landlord Visits, Requests & Tenant Filter`, `StatusPill Component & Status States`, `Landing, Loading & Brand Logo`, `Notifications & Profile Screens`, `Root & Tenant Layouts`, `Profile Edit & AI Preferences`, `New Listing Wizard Steps 1-3`, `AI Preferences Screen`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `ListingComposer()` connect `StatusPill Component & Status States` to `Phone Auth & Public Landlord Profile`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `FloatingDock()` connect `Landlord Visits, Requests & Tenant Filter` to `Notifications & Profile Screens`, `Root & Tenant Layouts`, `Product Docs: Vision & Experience`, `Atomic Design Atoms & Molecules`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ScreenHeader()` (e.g. with `Role-Based Routing` and `Role type: tenant | landlord | null`) actually correct?**
  _`ScreenHeader()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `useOnboardingStore` (e.g. with `KYC Mandatory For Landlord` and `KYC Verification States`) actually correct?**
  _`useOnboardingStore` has 3 INFERRED edges - model-reasoned connections that need verification._