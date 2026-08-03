import { create } from 'zustand';

/**
 * Centralized, typed "current user" source for the tenant app.
 *
 * Per the Profile screen spec §0.2 — if a real backend/auth is wired up later,
 * replace the seeded `profile` and `favoriteIds` defaults with the same shape
 * from the auth/favorites endpoints so every reading screen pulls from one place.
 */

export interface UserStats {
  visits: number;
  saved: number;
  reviews: number;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  location: string;
  memberSince: Date;
  isVerified: boolean;
  stats: UserStats;
}

interface UserState {
  profile: UserProfile;
  favoriteIds: string[];
  setProfile: (patch: Partial<UserProfile>) => void;
  setAvatarUri: (uri: string | undefined) => void;
  toggleFavorite: (propertyId: string) => void;
  isFavorite: (propertyId: string) => boolean;
}

const INITIAL_PROFILE: UserProfile = {
  id: 'u_self',
  firstName: 'Sarina',
  lastName: 'Shrestha',
  // TODO: replace with the user's real avatar URL once a backend is wired up.
  avatarUrl: undefined,
  location: 'Kathmandu, Nepal',
  memberSince: new Date(2024, 2, 12), // 12 Mar 2024
  isVerified: true,
  stats: {
    visits: 5,
    saved: 12,
    reviews: 3,
  },
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: INITIAL_PROFILE,
  favoriteIds: ['1', 'thamel', 'patan', 'bhaktapur', 'pokhara'],

  setProfile: (patch) =>
    set((s) => ({ profile: { ...s.profile, ...patch } })),

  setAvatarUri: (uri) =>
    set((s) => ({ profile: { ...s.profile, avatarUrl: uri } })),

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
}));