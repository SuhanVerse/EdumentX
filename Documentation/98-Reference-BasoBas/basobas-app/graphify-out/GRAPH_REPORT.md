# Graph Report - .  (2026-08-09)

## Corpus Check
- 226 files · ~139,063 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1220 nodes · 2311 edges · 103 communities (88 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Edit Profile & Share Details|Edit Profile & Share Details]]
- [[_COMMUNITY_Pro Gate & Plans|Pro Gate & Plans]]
- [[_COMMUNITY_Dependency Ecosystem|Dependency Ecosystem]]
- [[_COMMUNITY_Map Camera & Location|Map Camera & Location]]
- [[_COMMUNITY_Auth & Root Layout|Auth & Root Layout]]
- [[_COMMUNITY_Notifications Inbox|Notifications Inbox]]
- [[_COMMUNITY_KYC Document Selector|KYC Document Selector]]
- [[_COMMUNITY_App Configuration|App Configuration]]
- [[_COMMUNITY_Function Entry Points|Function Entry Points]]
- [[_COMMUNITY_AI Preferences Screen|AI Preferences Screen]]
- [[_COMMUNITY_Onboarding Flow|Onboarding Flow]]
- [[_COMMUNITY_Build Tooling|Build Tooling]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Landlord Dashboard|Landlord Dashboard]]
- [[_COMMUNITY_Listing Detail Amenities|Listing Detail Amenities]]
- [[_COMMUNITY_KYC Rejection Notice|KYC Rejection Notice]]
- [[_COMMUNITY_Glass Dock Navigation|Glass Dock Navigation]]
- [[_COMMUNITY_Property Detail Screen|Property Detail Screen]]
- [[_COMMUNITY_Listing Wizard Amenities|Listing Wizard Amenities]]
- [[_COMMUNITY_Property Type Mappers|Property Type Mappers]]
- [[_COMMUNITY_Screen Body Layout|Screen Body Layout]]
- [[_COMMUNITY_Auth Loading Screens|Auth Loading Screens]]
- [[_COMMUNITY_Visit Status & Dates|Visit Status & Dates]]
- [[_COMMUNITY_Filter Drawer|Filter Drawer]]
- [[_COMMUNITY_Visits Store State|Visits Store State]]
- [[_COMMUNITY_Profile Setup Form|Profile Setup Form]]
- [[_COMMUNITY_Suggest Time Picker|Suggest Time Picker]]
- [[_COMMUNITY_Notification Prefs Icons|Notification Prefs Icons]]
- [[_COMMUNITY_Schedule Visit Drawer|Schedule Visit Drawer]]
- [[_COMMUNITY_Tenant Root Layout|Tenant Root Layout]]
- [[_COMMUNITY_KYC Confirmation Screen|KYC Confirmation Screen]]
- [[_COMMUNITY_Landlord KYC Upload|Landlord KYC Upload]]
- [[_COMMUNITY_Tenant KYC Upload|Tenant KYC Upload]]
- [[_COMMUNITY_Design System Docs|Design System Docs]]
- [[_COMMUNITY_KYC Status Hero|KYC Status Hero]]
- [[_COMMUNITY_Core Database Schema|Core Database Schema]]
- [[_COMMUNITY_Listing Step 4 Details|Listing Step 4 Details]]
- [[_COMMUNITY_Follow-up Responses|Follow-up Responses]]
- [[_COMMUNITY_Visit Realtime Hooks|Visit Realtime Hooks]]
- [[_COMMUNITY_KYC Status Timeline|KYC Status Timeline]]
- [[_COMMUNITY_Landlord Visits & Requests|Landlord Visits & Requests]]
- [[_COMMUNITY_Property Store Filters|Property Store Filters]]
- [[_COMMUNITY_Onboarding Flow Migrations|Onboarding Flow Migrations]]
- [[_COMMUNITY_Clerk Auth Migrations|Clerk Auth Migrations]]
- [[_COMMUNITY_Onboarding Store State|Onboarding Store State]]
- [[_COMMUNITY_Role Selection|Role Selection]]
- [[_COMMUNITY_Settings Menus|Settings Menus]]
- [[_COMMUNITY_Visits Empty States|Visits Empty States]]
- [[_COMMUNITY_Filter Modal|Filter Modal]]
- [[_COMMUNITY_Follow-up Options|Follow-up Options]]
- [[_COMMUNITY_Filter Chips|Filter Chips]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_eSewa Payment Flow|eSewa Payment Flow]]
- [[_COMMUNITY_OTP Input|OTP Input]]
- [[_COMMUNITY_Landlord Properties Migration|Landlord Properties Migration]]
- [[_COMMUNITY_Notifications Schema|Notifications Schema]]
- [[_COMMUNITY_Property Card|Property Card]]
- [[_COMMUNITY_KYC Benefits List|KYC Benefits List]]
- [[_COMMUNITY_eSewa Payment Schema|eSewa Payment Schema]]
- [[_COMMUNITY_Tenant Visit Workflow|Tenant Visit Workflow]]
- [[_COMMUNITY_Listing Step 1 Types|Listing Step 1 Types]]
- [[_COMMUNITY_Listing Step 3 Media|Listing Step 3 Media]]
- [[_COMMUNITY_Visit Status Badge|Visit Status Badge]]
- [[_COMMUNITY_App Icon Assets|App Icon Assets]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_Suggest Time Confirmation|Suggest Time Confirmation]]
- [[_COMMUNITY_Metro Config|Metro Config]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_Deno Function Config|Deno Function Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Form Field|Form Field]]
- [[_COMMUNITY_Toggle|Toggle]]
- [[_COMMUNITY_Dock State Hook|Dock State Hook]]
- [[_COMMUNITY_Search This Area Button|Search This Area Button]]
- [[_COMMUNITY_KYC Electricity Bill Migration|KYC Electricity Bill Migration]]
- [[_COMMUNITY_KYC Fix Migration|KYC Fix Migration]]
- [[_COMMUNITY_Landlord Verification Sync|Landlord Verification Sync]]
- [[_COMMUNITY_Property Map Pin|Property Map Pin]]
- [[_COMMUNITY_Review Card|Review Card]]
- [[_COMMUNITY_Search Bar|Search Bar]]
- [[_COMMUNITY_Property Pause Migration|Property Pause Migration]]
- [[_COMMUNITY_Graphify Workflow|Graphify Workflow]]

## God Nodes (most connected - your core abstractions)
1. `useClerkSupabase()` - 79 edges
2. `ok()` - 70 edges
3. `err()` - 70 edges
4. `getErrorMessage()` - 68 edges
5. `Database` - 22 edges
6. `ScreenHeader()` - 21 edges
7. `useUserStore` - 21 edges
8. `useAuthStore` - 17 edges
9. `useOnboardingStore` - 16 edges
10. `expo` - 15 edges

## Surprising Connections (you probably didn't know these)
- `LoadingScreen()` --calls--> `useAuth()`  [INFERRED]
  app/(auth)/loading.tsx → src/hooks/useAuth.ts
- `LandlordDashboard()` --calls--> `useClerkSupabase()`  [INFERRED]
  app/(landlord)/(tabs)/index.tsx → src/hooks/useClerkSupabase.ts
- `LandlordDashboard()` --calls--> `useAuthStore`  [INFERRED]
  app/(landlord)/(tabs)/index.tsx → src/store/authStore.ts
- `MyPropertiesScreen()` --calls--> `useClerkSupabase()`  [EXTRACTED]
  app/(landlord)/(tabs)/listings.tsx → src/hooks/useClerkSupabase.ts
- `LandlordProfileTab()` --calls--> `useClerkSupabase()`  [INFERRED]
  app/(landlord)/(tabs)/profile.tsx → src/hooks/useClerkSupabase.ts

## Import Cycles
- 1-file cycle: `metro.config.js -> metro.config.js`

## Hyperedges (group relationships)
- **eSewa Payment Function Pipeline** — docs_esewa_payment_testing_create_order, docs_esewa_payment_testing_verify_payment, docs_esewa_payment_testing_failure_callback, docs_esewa_payment_testing_status_polling [INFERRED 0.85]
- **Visit workflow visual concepts** — onboarding_visitillustration_visitillustration, onboarding_verifiedillustration_verifiedillustration, concept_visit_status_lifecycle, concept_post_visit_followup, concept_location_unlock_rule, app_vision_visit_request_workflow [INFERRED 0.85]
- **Landlord Listing Detail Data Flow** — previous_context_listing_detail_rewire, previous_context_owner_profile, previous_context_property_stats, previous_context_property_pause [INFERRED 0.85]

## Communities (103 total, 15 thin omitted)

### Community 0 - "Edit Profile & Share Details"
Cohesion: 0.05
Nodes (111): NEPAL_CITIES, styles, err(), getErrorMessage(), ok(), Result, DashboardActivity, getLandlordDashboard() (+103 more)

### Community 1 - "Pro Gate & Plans"
Cohesion: 0.05
Nodes (43): ProGateState, useProGate(), useProGateStore, EsewaFormFields, PlanId, PurchasePlanState, usePurchasePlan(), ProGateModal() (+35 more)

### Community 2 - "Dependency Ecosystem"
Cohesion: 0.04
Nodes (50): dependencies, @clerk/expo, expo, expo-blur, expo-camera, expo-constants, expo-crypto, expo-document-picker (+42 more)

### Community 3 - "Map Camera & Location"
Cohesion: 0.07
Nodes (30): { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, useLocation(), UseLocationResult, GeoJsonFeature, DEFAULT_LOCATION, LandlordLocationPicker(), styles, AndroidMap (+22 more)

### Community 4 - "Auth & Root Layout"
Cohesion: 0.06
Nodes (29): AuthGate(), countryCodeToFlag(), PhoneEntryScreen(), PREFERRED, styles, useAuth(), PublicLandlordProfileScreen(), styles (+21 more)

### Community 5 - "Notifications Inbox"
Cohesion: 0.08
Nodes (26): LANDLORD_TABS, NotificationsEmptyState(), initialsOf(), NotificationRow(), NotificationRowProps, NotificationSectionProps, NotificationsListProps, NotificationTab (+18 more)

### Community 6 - "KYC Document Selector"
Cohesion: 0.09
Nodes (21): DocumentTypeSelector(), DocumentTypeSelectorProps, KYCDocumentType, Option, OPTIONS, styles, DocumentUploadCard(), DocumentUploadCardProps (+13 more)

### Community 7 - "App Configuration"
Cohesion: 0.06
Nodes (31): backgroundColor, foregroundImage, adaptiveIcon, config, newArchEnabled, package, googleMaps, tsconfigPaths (+23 more)

### Community 8 - "Function Entry Points"
Cohesion: 0.15
Nodes (15): getJwks(), getJwksUrl(), verifyClerkJwt(), arrayBufferToBase64(), checkEsewaTransactionStatus(), generateSignature(), getEsewaConfig(), grantUserPass() (+7 more)

### Community 9 - "AI Preferences Screen"
Cohesion: 0.11
Nodes (5): Props, ScreenHeader(), Props, GENERAL_REASONS, REASON_INFO

### Community 10 - "Onboarding Flow"
Cohesion: 0.11
Nodes (16): FeatureSlide, s, SLIDES, MapIllustration(), styles, NextButton, NextButtonProps, OnboardingLayoutProps (+8 more)

### Community 11 - "Build Tooling"
Cohesion: 0.08
Nodes (24): devDependencies, @babel/core, babel-preset-expo, eslint, eslint-config-expo, eslint-config-prettier, prettier, prettier-plugin-tailwindcss (+16 more)

### Community 12 - "Project Documentation"
Cohesion: 0.14
Nodes (24): Authentication & Onboarding Flow, Features List, Landlord Experience, Project Documentation Index, Product Vision, Tenant Experience, Visit Request Workflow, 5-Day Auto-Archive (+16 more)

### Community 13 - "Landlord Dashboard"
Cohesion: 0.10
Nodes (9): dockBottomReserve(), LandlordDashboard, ActivityItem, EMPTY_STATS, InsightItem, LandlordDashboard(), LandlordDashboardProps, s (+1 more)

### Community 14 - "Listing Detail Amenities"
Cohesion: 0.10
Nodes (15): AMENITY_ICONS, AMENITY_LABELS, AmenityRow, EXTRA_DETAIL_ICONS, EXTRA_DETAIL_LABELS, ExtraDetailRow, FORMATTER, { height: SCREEN_HEIGHT } (+7 more)

### Community 15 - "KYC Rejection Notice"
Cohesion: 0.15
Nodes (12): KYCRejectionNotice(), Props, styles, formatDateTime(), LandlordVerificationScreen(), styles, Props, SectionLabel() (+4 more)

### Community 16 - "Glass Dock Navigation"
Cohesion: 0.19
Nodes (11): DockTab, DockTabProps, styles, LANDLORD_DOCK_ITEMS, TENANT_DOCK_ITEMS, GlassDock(), styles, FloatingDock (+3 more)

### Community 17 - "Property Detail Screen"
Cohesion: 0.14
Nodes (14): AMENITY_ICONS, AMENITY_LABELS, AmenityRow, EXTRA_DETAIL_ICONS, EXTRA_DETAIL_LABELS, ExtraDetailRow, fmtNpr(), { height: SCREEN_HEIGHT } (+6 more)

### Community 18 - "Listing Wizard Amenities"
Cohesion: 0.12
Nodes (12): AMENITIES_APARTMENT, AMENITIES_HOUSE, AMENITIES_ROOM, AMENITIES_STUDIO, BATHROOM_OPTIONS, FieldErrors, FURNISHING, KITCHEN_OPTIONS (+4 more)

### Community 19 - "Property Type Mappers"
Cohesion: 0.14
Nodes (15): asRecord(), asStringArray(), MONTH_INDEX, parseAvailableFrom(), parseDateLabel(), PRICE_FORMATTER, PropertyPrivateLocation, PropertyRow (+7 more)

### Community 20 - "Screen Body Layout"
Cohesion: 0.16
Nodes (11): ScreenBody(), ScreenBodyProps, ScreenBodyWithActionProps, CITIES, City, fmtNpr(), HomeTab(), TAB_LABELS (+3 more)

### Community 21 - "Auth Loading Screens"
Cohesion: 0.18
Nodes (11): ConfirmationScreen(), LoadingScreen(), styles, maskPhone(), OTPVerificationScreen(), s, EditProfileScreen(), ShareDetailsScreen() (+3 more)

### Community 22 - "Visit Status & Dates"
Cohesion: 0.19
Nodes (12): TenantVisitStatusUi, formatDate(), isSameDay(), styles, VisitListCard(), FollowUpPendingBadge(), styles, VISIT_CHIP_LABELS (+4 more)

### Community 23 - "Filter Drawer"
Cohesion: 0.19
Nodes (10): AMENITIES, FilterDrawer(), FilterDrawerProps, PROPERTY_TYPES, SORT_OPTIONS, BhkFilter, usePropertyStore, BHK_FILTERS (+2 more)

### Community 24 - "Visits Store State"
Cohesion: 0.18
Nodes (9): deriveStatusUi(), Patch, Supabase, VisitsState, isPastDate(), TenantVisitRequest, toTenantVisitStatusUi(), VisitStatus (+1 more)

### Community 25 - "Profile Setup Form"
Cohesion: 0.18
Nodes (10): NEPAL_CITIES, PREFERENCES, ProfileFormValues, profileSchema, ProfileSetupScreen(), styles, useAvatarPicker(), OnboardingHeader() (+2 more)

### Community 26 - "Suggest Time Picker"
Cohesion: 0.15
Nodes (10): DayOption, styles, SuggestTimeScreen(), TIME_SLOTS, toTimeSlot(), DayOption, DAYS, RescheduleVisitScreen() (+2 more)

### Community 27 - "Notification Prefs Icons"
Cohesion: 0.15
Nodes (4): NotificationPrefsModal(), NotifRowProps, styles, ToggleProps

### Community 28 - "Schedule Visit Drawer"
Cohesion: 0.18
Nodes (10): DEFAULT_TIME_SLOTS, formatDateLong(), isPastDate(), MONTH_NAMES, MonthGridDay, ScheduleSelection, ScheduleVisitDrawer(), ScheduleVisitDrawerProps (+2 more)

### Community 29 - "Tenant Root Layout"
Cohesion: 0.44
Nodes (8): useClerkSupabase(), useNotificationsRealtime(), useProfileBootstrap(), useVisitRealtime(), NotificationsList(), useNotificationsStore, LandlordTabsLayout(), TenantLayout()

### Community 30 - "KYC Confirmation Screen"
Cohesion: 0.18
Nodes (6): DetailRowProps, styles, SummaryCardProps, PrimaryButton(), Props, styles

### Community 31 - "Landlord KYC Upload"
Cohesion: 0.18
Nodes (6): DocTypeChipProps, DocumentUploadZoneProps, styles, Props, StepProgressBar(), styles

### Community 32 - "Tenant KYC Upload"
Cohesion: 0.21
Nodes (9): KYCLandlordScreen(), DocTypeChipProps, DocumentUploadZoneProps, KYCTenantScreen(), styles, useDocumentPicker(), RoleSelectionScreen(), useOnboardingStore (+1 more)

### Community 33 - "Design System Docs"
Cohesion: 0.18
Nodes (12): UI & Figma Implementation Rules, Button Styles (Primary/Secondary/Ghost), BasoBas Design System, 8px Spacing & Layout Principles, Primary Accent Color #1A6B4A, Semantic Design Tokens, Listing Detail Screen DB Rewire, Landlord Owner Profile Card Data (+4 more)

### Community 34 - "KYC Status Hero"
Cohesion: 0.20
Nodes (10): HERO_BY_STATUS, HeroConfig, KYCStatusHero(), Props, styles, Props, Status, STATUS_STYLES (+2 more)

### Community 35 - "Core Database Schema"
Cohesion: 0.27
Nodes (9): public.get_next_kyc_attempt(), public.kyc_submissions, public.landlord_profiles, public.profiles, public.update_updated_at(), public.user_preferences, public.user_roles, trg_landlord_profiles_updated_at (+1 more)

### Community 36 - "Listing Step 4 Details"
Cohesion: 0.18
Nodes (9): countSelected(), DetailRow, MediaItem, NewListingStep4(), parseJSON(), styles, parseMoney(), parseOptionalInt() (+1 more)

### Community 37 - "Follow-up Responses"
Cohesion: 0.17
Nodes (5): FOLLOW_UP_RESPONSE_LABELS, DetailCardProps, HERO_STYLES, STATUS_COPY, styles

### Community 38 - "Visit Realtime Hooks"
Cohesion: 0.22
Nodes (6): DeclineRequestScreen(), REASONS, styles, createClerkSupabaseClient(), supabasePublic, VisitRequestRow

### Community 39 - "KYC Status Timeline"
Cohesion: 0.24
Nodes (10): COL_WIDTH, formatTime(), KYCStatusTimeline(), Props, resolveActiveStep(), Step, StepKey, STEPS (+2 more)

### Community 40 - "Landlord Visits & Requests"
Cohesion: 0.25
Nodes (9): LandlordVisitsScreen(), RequestDetailScreen(), useVisitsStore, formatVisitDate(), LandlordVisitRequest, TIME_SLOT_LABELS, PostVisitFollowUpScreen(), formatTimestamp() (+1 more)

### Community 41 - "Property Store Filters"
Cohesion: 0.22
Nodes (6): CityFilter, INITIAL_FILTERS, PropertyFilters, PropertyStore, SavedScreen(), PropertyPublic

### Community 42 - "Onboarding Flow Migrations"
Cohesion: 0.24
Nodes (7): public.handle_new_user(), public.insert_kyc_submission(), public.kyc_submissions, public.landlord_profiles, public.profiles, public.user_preferences, trg_auth_new_user

### Community 43 - "Clerk Auth Migrations"
Cohesion: 0.33
Nodes (8): public.kyc_submissions, public.landlord_profiles, public.profiles, public.update_updated_at(), public.user_preferences, public.user_roles, trg_landlord_updated_at, trg_profiles_updated_at

### Community 44 - "Onboarding Store State"
Cohesion: 0.42
Nodes (8): initialKYC, initialProfile, OnboardingState, OnboardingKYCData, OnboardingPayload, OnboardingProfileData, PropertyPreference, UserRole

### Community 45 - "Role Selection"
Cohesion: 0.25
Nodes (6): RoleCardProps, ROLES, styles, OnboardingEyebrow(), Props, styles

### Community 46 - "Settings Menus"
Cohesion: 0.22
Nodes (4): MenuRowProps, MenuRowWithSubtextProps, styles, ToggleProps

### Community 47 - "Visits Empty States"
Cohesion: 0.25
Nodes (6): EMPTY_COPY, OPEN_UI, subtitleFor(), TabKey, TABS, VisitsTab()

### Community 48 - "Filter Modal"
Cohesion: 0.25
Nodes (6): AMENITIES, Amenity, FilterDrawer(), PROPERTY_TYPES, SortOption, SORTS

### Community 49 - "Follow-up Options"
Cohesion: 0.36
Nodes (6): FollowUpResponse, OPTIONS, styles, FollowUpOptionCard(), FollowUpOptionCardProps, styles

### Community 50 - "Filter Chips"
Cohesion: 0.29
Nodes (5): BG_MAP, ChipColor, ChipVariant, Props, TEXT_MAP

### Community 51 - "TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 52 - "eSewa Payment Flow"
Cohesion: 0.33
Nodes (6): create-esewa-order Edge Function, eSewa v2 Payment Flow, esewa-payment-failed Edge Function, check-payment-status Edge Function, products / transactions / user_passes Tables, verify-esewa-payment Edge Function

### Community 53 - "OTP Input"
Cohesion: 0.33
Nodes (5): OTPCell, OTPCellProps, OTPInput, OTPInputProps, styles

### Community 54 - "Landlord Properties Migration"
Cohesion: 0.47
Nodes (5): public.properties, public.saved_properties, public.visit_requests, trg_properties_updated_at, trg_visits_updated_at

### Community 55 - "Notifications Schema"
Cohesion: 0.40
Nodes (3): public.notifications, public.notify_visit_requested(), trg_visit_insert_notify

### Community 56 - "Property Card"
Cohesion: 0.33
Nodes (4): PropertyCardVariant, Props, STATUS_BADGES, StatusOverlay

### Community 57 - "KYC Benefits List"
Cohesion: 0.40
Nodes (4): Benefit, BENEFITS, KYCBenefitsList(), styles

### Community 58 - "eSewa Payment Schema"
Cohesion: 0.70
Nodes (4): public.products, public.transactions, public.user_passes, trg_transactions_updated_at

### Community 60 - "Listing Step 1 Types"
Cohesion: 0.40
Nodes (3): PropertyType, styles, TYPES

### Community 61 - "Listing Step 3 Media"
Cohesion: 0.40
Nodes (3): MediaItem, MediaType, styles

### Community 62 - "Visit Status Badge"
Cohesion: 0.40
Nodes (3): Props, STATUS_STYLES, VisitStatus

### Community 63 - "App Icon Assets"
Cohesion: 1.00
Nodes (4): Android Adaptive Icon (basobas-app), Favicon (basobas-app), App Icon (basobas-app), Splash Screen (basobas-app)

### Community 64 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 65 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 66 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 67 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 68 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 70 - "Metro Config"
Cohesion: 0.67
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 72 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 73 - "Deno Function Config"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

## Knowledge Gaps
- **447 isolated node(s):** `name`, `slug`, `version`, `scheme`, `favicon` (+442 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useClerkSupabase()` connect `Tenant Root Layout` to `Edit Profile & Share Details`, `Pro Gate & Plans`, `Map Camera & Location`, `Auth & Root Layout`, `Notifications Inbox`, `KYC Document Selector`, `Landlord Dashboard`, `Listing Detail Amenities`, `KYC Rejection Notice`, `Property Detail Screen`, `Screen Body Layout`, `Auth Loading Screens`, `Filter Drawer`, `Suggest Time Picker`, `KYC Confirmation Screen`, `Landlord KYC Upload`, `Tenant KYC Upload`, `Listing Step 4 Details`, `Follow-up Responses`, `Visit Realtime Hooks`, `Landlord Visits & Requests`, `Property Store Filters`, `Visits Empty States`, `Follow-up Options`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `ScreenHeader()` connect `AI Preferences Screen` to `Pro Gate & Plans`, `Auth & Root Layout`, `Notifications Inbox`, `KYC Document Selector`, `Landlord Visits & Requests`, `Property Store Filters`, `KYC Rejection Notice`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Database` connect `Edit Profile & Share Details` to `Notifications Inbox`, `Visit Realtime Hooks`, `KYC Document Selector`, `Property Store Filters`, `Property Type Mappers`, `Visits Store State`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `useClerkSupabase()` (e.g. with `PropertyDetailScreen()` and `HomeTab()`) actually correct?**
  _`useClerkSupabase()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _449 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Edit Profile & Share Details` be split into smaller, more focused modules?**
  _Cohesion score 0.05002935995302407 - nodes in this community are weakly interconnected._
- **Should `Pro Gate & Plans` be split into smaller, more focused modules?**
  _Cohesion score 0.05310734463276836 - nodes in this community are weakly interconnected._