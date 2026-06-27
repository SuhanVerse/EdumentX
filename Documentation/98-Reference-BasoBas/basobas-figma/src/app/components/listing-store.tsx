import { createContext, useContext, useState, ReactNode } from 'react';

export type PropertyType = 'apartment' | 'house' | 'room' | 'studio';

export interface ListingDraft {
  type: PropertyType;
  title: string;
  rent: string;
  deposit: string;
  location: string;
  availableFrom: string;
  // shared spatial
  bedrooms: number;
  bathrooms: number;
  sqft: string;
  floor: string;
  totalFloors: string;
  furnished: 'Furnished' | 'Semi-furnished' | 'Unfurnished';
  // room-only
  bathroomType: 'Attached' | 'Common';
  kitchenAccess: 'Private' | 'Shared' | 'Not included';
  genderPref: 'Any' | 'Male' | 'Female' | 'Family' | 'Students';
  // house-only
  parkingSpaces: number;
  garden: boolean;
  compound: boolean;
  // studio-only
  kitchenette: 'Open' | 'Closed' | 'None';
  amenities: string[];
}

const defaults: ListingDraft = {
  type: 'apartment',
  title: '2BHK Apartment in Baluwatar',
  rent: '28,000',
  deposit: '56,000',
  location: 'Baluwatar, Kathmandu',
  availableFrom: 'Jul 1, 2026',
  bedrooms: 2,
  bathrooms: 1,
  sqft: '850',
  floor: '3',
  totalFloors: '5',
  furnished: 'Semi-furnished',
  bathroomType: 'Attached',
  kitchenAccess: 'Shared',
  genderPref: 'Any',
  parkingSpaces: 1,
  garden: true,
  compound: true,
  kitchenette: 'Open',
  amenities: ['Parking', 'Water Tank', 'Balcony'],
};

const ListingContext = createContext<{
  draft: ListingDraft;
  update: <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) => void;
} | null>(null);

export function ListingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ListingDraft>(defaults);
  const update = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  return (
    <ListingContext.Provider value={{ draft, update }}>
      {children}
    </ListingContext.Provider>
  );
}

export function useListing() {
  const ctx = useContext(ListingContext);
  if (!ctx) throw new Error('useListing must be used inside ListingProvider');
  return ctx;
}

export const typeLabels: Record<PropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  room: 'Room',
  studio: 'Studio',
};
