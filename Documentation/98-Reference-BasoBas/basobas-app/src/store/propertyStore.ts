import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/src/types/database.types';
import type { PropertyPublic } from '@/src/types/property.types';
import {
  getAvailableProperties,
  getSavedPropertyIdsForTenant,
  savePropertyForTenant,
  unsavePropertyForTenant,
} from '@/src/services/properties.service';
import { useUserStore } from '@/src/store/userStore';

// ─── Filters ─────────────────────────────────────────────────────────────────

export type BhkFilter = 'All' | '1BHK' | '2BHK' | '3BHK' | 'Studio';
export type CityFilter = 'All' | 'Kathmandu' | 'Lalitpur' | 'Bhaktapur';

export interface PropertyFilters {
  type: BhkFilter;
  minPrice: number;
  maxPrice: number;
  amenities: string[];
  sortBy: 'Newest' | 'Price: Low to High';
  searchQuery: string;
  city: CityFilter;
}

interface PropertyStore {
  /** Real, rentable listings hydrated from Supabase — never mock data. */
  properties: PropertyPublic[];
  savedPropertyIds: string[];
  filters: PropertyFilters;
  hydrated: boolean;
  hydrateError: string | null;

  // Actions
  hydrate: (supabase: SupabaseClient<Database>, clerkId: string) => Promise<void>;
  toggleSaved: (
    propertyId: string,
    supabase: SupabaseClient<Database>,
    clerkId: string,
  ) => Promise<void>;
  setFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;
  getFilteredProperties: () => PropertyPublic[];
  reset: () => void;
}

const INITIAL_FILTERS: PropertyFilters = {
  type: 'All',
  minPrice: 10000,
  maxPrice: 60000,
  amenities: [],
  sortBy: 'Newest',
  searchQuery: '',
  city: 'All',
};

// ─── Filter helpers (real PropertyPublic rows) ───────────────────────────────

/** Map the UI's BHK vocabulary onto the DB's property_type + bedrooms. */
const matchesType = (p: PropertyPublic, type: BhkFilter): boolean => {
  if (type === 'All') return true;
  const beds = p.bedrooms ?? 0;
  switch (type) {
    case '1BHK':
      return beds === 1;
    case '2BHK':
      return beds === 2;
    case '3BHK':
      return beds === 3;
    case 'Studio':
      // Studio is modelled as a FLAT with no (or zero) bedrooms.
      return p.propertyType === 'FLAT' && beds === 0;
    default:
      return true;
  }
};

const matchesCity = (p: PropertyPublic, city: CityFilter): boolean => {
  if (city === 'All') return true;
  return p.locationArea.toLowerCase().includes(city.toLowerCase());
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePropertyStore = create<PropertyStore>((set, get) => ({
  properties: [],
  savedPropertyIds: [],
  filters: INITIAL_FILTERS,
  hydrated: false,
  hydrateError: null,

  /**
   * Load the real marketplace: rentable listings + the current tenant's
   * saved ids, then mirror the saved count into the user store so the
   * Profile tab's stat and the Saved screen stay consistent.
   */
  hydrate: async (supabase, clerkId) => {
    if (!clerkId) return;
    const [listingsRes, savedRes] = await Promise.all([
      getAvailableProperties(supabase),
      getSavedPropertyIdsForTenant(clerkId, supabase),
    ]);

    if (listingsRes.success) {
      set({ properties: listingsRes.data, hydrated: true, hydrateError: null });
    } else {
      set({ hydrateError: listingsRes.error });
    }

    if (savedRes.success) {
      set({ savedPropertyIds: savedRes.data });
      // Keep the Profile tab's saved stat on the real count.
      useUserStore.setState({
        favoriteIds: savedRes.data,
        profile: {
          ...useUserStore.getState().profile,
          stats: { ...useUserStore.getState().profile.stats, saved: savedRes.data.length },
        },
      });
    }
  },

  /**
   * Optimistic bookmark toggle persisted to `saved_properties`. Reverts on
   * failure so the UI never drifts from the DB.
   */
  toggleSaved: async (propertyId, supabase, clerkId) => {
    const prev = get().savedPropertyIds;
    const isSaved = prev.includes(propertyId);
    const next = isSaved
      ? prev.filter((id) => id !== propertyId)
      : [...prev, propertyId];
    set({ savedPropertyIds: next });

    const result = isSaved
      ? await unsavePropertyForTenant(clerkId, propertyId, supabase)
      : await savePropertyForTenant(clerkId, propertyId, supabase);

    if (!result.success) set({ savedPropertyIds: prev });

    useUserStore.setState((s) => ({
      favoriteIds: get().savedPropertyIds,
      profile: {
        ...s.profile,
        stats: { ...s.profile.stats, saved: get().savedPropertyIds.length },
      },
    }));
  },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: INITIAL_FILTERS }),

  getFilteredProperties: () => {
    const { properties, filters } = get();
    return properties
      .filter((property) => {
        // 1. BHK / type filter
        if (!matchesType(property, filters.type)) return false;

        // 2. City filter
        if (!matchesCity(property, filters.city)) return false;

        // 3. Price filter
        if (property.price < filters.minPrice || property.price > filters.maxPrice) {
          return false;
        }

        // 4. Amenities filter
        if (filters.amenities.length > 0) {
          const hasAll = filters.amenities.every((amenity) =>
            property.amenities.includes(amenity),
          );
          if (!hasAll) return false;
        }

        // 5. Search query filter (title, area, city)
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          const matchesTitle = property.title.toLowerCase().includes(query);
          const matchesArea = property.locationArea.toLowerCase().includes(query);
          if (!matchesTitle && !matchesArea) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'Price: Low to High') {
          return a.price - b.price;
        }
        // "Newest": DB rows arrive newest-first; keep that stable ordering.
        return b.createdAt.localeCompare(a.createdAt);
      });
  },

  reset: () =>
    set({
      properties: [],
      savedPropertyIds: [],
      hydrated: false,
      hydrateError: null,
      filters: INITIAL_FILTERS,
    }),
}));
