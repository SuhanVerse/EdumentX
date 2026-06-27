// ─── RootNavigator Reference ──────────────────────────────────────────────────
//
// This project uses expo-router for file-based navigation.
// The auth flow is handled in app/_layout.tsx with the useAuth Zustand store.
//
// Navigation logic (in app/_layout.tsx):
//   !session          →  (auth)/loading  →  (auth)/onboarding  →  (auth)/phone
//   session + !onboarded →  (auth)/role  →  (auth)/profile-setup
//                          →  (auth)/kyc-tenant  |  (auth)/kyc-landlord
//                          →  (auth)/confirmation
//   session + onboarded   →  (tenant)/(tabs) | (landlord)/(tabs)
//
// This file is kept as a reference. Actual routing is defined by the file tree:
//   app/
//     _layout.tsx         Root layout with auth guard
//     index.tsx           Entry redirect
//     (auth)/             Unauthenticated screens
//     (tenant)/           Tenant screens
//     (landlord)/         Landlord screens

export {}
