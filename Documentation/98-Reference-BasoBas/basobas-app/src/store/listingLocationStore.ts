import { create } from 'zustand';

/**
 * Map-picker location for the listing wizard.
 *
 * The landlord location-picker screen writes lat/lng, the reverse-geocoded
 * short `area`, and the exact `address` (Google formatted_address) here, and
 * step-2 reads it back when the user returns from the map. Kept separate
 * from propertyStore because it's wizard-scoped state.
 */
interface ListingLocationState {
  lat: number | null;
  lng: number | null;
  area: string;
  address: string;
  placeId?: string;
  setLocation: (loc: {
    lat: number;
    lng: number;
    area: string;
    address: string;
    placeId?: string;
  }) => void;
  clear: () => void;
}

export const useListingLocationStore = create<ListingLocationState>((set) => ({
  lat: null,
  lng: null,
  area: '',
  address: '',
  placeId: undefined,

  setLocation: ({ lat, lng, area, address, placeId }) => set({ lat, lng, area, address, placeId }),

  clear: () => set({ lat: null, lng: null, area: '', address: '', placeId: undefined }),
}));
