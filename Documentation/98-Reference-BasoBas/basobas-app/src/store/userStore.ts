import { create } from 'zustand';

/**
 * Centralized, typed "current user" source for the tenant app.
 *
 * `favoriteIds` is hydrated from the real `saved_properties` table (see
 * `usePropertyStore.hydrate` / the Profile tab focus sync) — it is never
 * seeded with placeholder ids.
 */

export interface UserStats {
  visits: number;
  saved: number;
  reviews: number;
  proDays?: number;
}

export interface ProSubscription {
  /** True if the user has an active Pro plan. */
  active: boolean;
  /** Subscription end date (used to compute days left). */
  expiresAt: Date | null;
  /** Total length of the current subscription in days (e.g. 30, 90). */
  totalDays: number;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  location: string;
  memberSince: Date;
  isVerified: boolean;
  pro: ProSubscription;
  stats: UserStats;
}

// ─── ProfileRow shape (mirrors the DB profiles table) ───────────────
// Used by syncProfileFromDb to map DB data into the store's shape.
interface ProfileRow {
  clerk_id:             string
  phone:                string | null
  full_name:            string | null
  avatar_url:           string | null
  avatar_path:          string | null
  city:                 string | null
  active_role:          'tenant' | 'landlord' | null
  onboarding_complete:  boolean
  created_at:           string
  updated_at:           string
}

interface UserState {
  profile: UserProfile;
  favoriteIds: string[];
  setProfile: (patch: Partial<UserProfile>) => void;
  setAvatarUri: (uri: string | undefined) => void;
  syncProfileFromDb: (dbRow: ProfileRow) => void;
  toggleFavorite: (propertyId: string) => void;
  isFavorite: (propertyId: string) => boolean;
  activatePro: (totalDays: number) => void;
  /** Clears all per-user data (profile, Pro status, favorites) on logout. */
  reset: () => void;
}

const INITIAL_PROFILE: UserProfile = {
  id: '',
  firstName: '',
  lastName: '',
  avatarUrl: undefined,
  location: '',
  memberSince: new Date(),
  isVerified: false,
  pro: {
    active: false,
    expiresAt: null,
    totalDays: 0,
  },
  stats: {
    visits: 0,
    saved: 0,
    reviews: 0,
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

const proDaysRemaining = (expiresAt: Date | null): number => {
  if (!expiresAt) return 0;
  const diff = Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS);
  return Math.max(0, diff);
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: INITIAL_PROFILE,
  favoriteIds: [],

  setProfile: (patch) =>
    set((s) => ({ profile: { ...s.profile, ...patch } })),

  setAvatarUri: (uri) =>
    set((s) => ({ profile: { ...s.profile, avatarUrl: uri } })),

  syncProfileFromDb: (dbRow) =>
    set((s) => {
      // Split full_name into first/last name
      const parts = (dbRow.full_name ?? '').split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      return {
        profile: {
          ...s.profile,
          id: dbRow.clerk_id,
          firstName,
          lastName,
          avatarUrl: dbRow.avatar_url ?? undefined,
          location: dbRow.city ?? '',
          memberSince: new Date(dbRow.created_at),
          // `profiles` has no verification column — KYC status lives in
          // kyc_submissions / landlord_profiles and is read live by the
          // Profile screens (getUserKYCStatusUi / getLandlordVerificationStatus).
          // Never derived from onboarding_complete.
          isVerified: false,
        },
      };
    }),

  toggleFavorite: (propertyId) =>
    set((s) => {
      const next = s.favoriteIds.includes(propertyId)
        ? s.favoriteIds.filter((id) => id !== propertyId)
        : [...s.favoriteIds, propertyId];
      return {
        favoriteIds: next,
        profile: {
          ...s.profile,
          stats: { ...s.profile.stats, saved: next.length },
        },
      };
    }),

  isFavorite: (propertyId) => get().favoriteIds.includes(propertyId),

  activatePro: (totalDays) => {
    const expiresAt = new Date(Date.now() + totalDays * DAY_MS);
    set((s) => ({
      profile: {
        ...s.profile,
        pro: { active: true, expiresAt, totalDays },
        stats: { ...s.profile.stats, proDays: totalDays },
      },
    }));
  },

  reset: () =>
    set({
      profile: INITIAL_PROFILE,
      favoriteIds: [],
    }),
}));

/**
 * Selector helper: returns the number of days remaining in the Pro subscription.
 * Returns 0 when Pro is not active.
 */
export const useProDaysRemaining = (): number => {
  const expiresAt = useUserStore((s) => s.profile.pro.expiresAt);
  return proDaysRemaining(expiresAt);
};
