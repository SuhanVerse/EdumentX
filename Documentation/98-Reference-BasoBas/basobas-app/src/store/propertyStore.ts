import { create } from 'zustand';

export interface Amenity {
  icon: string;
  label: string;
}

export interface Owner {
  name: string;
  avatarUrl?: string;
  verified: boolean;
  listingsCount: number;
}

export interface Property {
  id: string;
  title: string;
  location: 'Kathmandu' | 'Lalitpur' | 'Bhaktapur';
  area: string;
  rating: number;
  priceMonthly: number;
  currency: string;
  images: string[];
  amenities: Amenity[];
  amenityStrings: string[];
  about: string;
  type: '1BHK' | '2BHK' | '3BHK' | 'Studio';
  owner: Owner;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export interface PropertyFilters {
  type: 'All' | '1BHK' | '2BHK' | '3BHK' | 'Studio';
  minPrice: number;
  maxPrice: number;
  amenities: string[];
  sortBy: 'Newest' | 'Price: Low to High';
  searchQuery: string;
  city: 'All' | 'Kathmandu' | 'Lalitpur' | 'Bhaktapur';
}

interface PropertyStore {
  properties: Property[];
  savedPropertyIds: string[];
  filters: PropertyFilters;
  
  // Actions
  toggleSaved: (id: string) => void;
  setFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;
  getFilteredProperties: () => Property[];
}

// ─── Realistic Property Dataset (15 Listings) ─────────────────────────────────
const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'p1',
    title: 'Beautiful 2BHK in Kupondole',
    location: 'Lalitpur',
    area: 'Kupondole, Lalitpur',
    rating: 4.8,
    priceMonthly: 32000,
    currency: 'Rs.',
    images: Array.from({ length: 12 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '2 Bed' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'balcony', label: 'Balcony' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Balcony'],
    about: 'Sunlit 2BHK with balcony, walking distance to UN Park. Newly renovated with modern fittings. Quiet neighborhood with excellent water supply and active security.',
    type: '2BHK',
    owner: {
      name: 'Sita Sharma',
      verified: true,
      listingsCount: 12,
    },
    coordinate: { latitude: 27.6849, longitude: 85.3163 },
  },
  {
    id: 'p2',
    title: 'Cozy Studio near Thamel',
    location: 'Kathmandu',
    area: 'Thamel, Kathmandu',
    rating: 4.5,
    priceMonthly: 18000,
    currency: 'Rs.',
    images: Array.from({ length: 6 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: 'Studio' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'furnished', label: 'Furnished' },
    ],
    amenityStrings: ['Wi-Fi', 'Furnished'],
    about: 'Perfect studio apartment for solo travelers or students. Located in a quiet alley just off the main Thamel street. Close to local cafes, restaurants, and convenience stores.',
    type: 'Studio',
    owner: {
      name: 'Hari Prasad',
      verified: true,
      listingsCount: 3,
    },
    coordinate: { latitude: 27.7154, longitude: 85.3123 },
  },
  {
    id: 'p3',
    title: 'Charming 1BHK in Patan',
    location: 'Lalitpur',
    area: 'Patan, Lalitpur',
    rating: 4.7,
    priceMonthly: 22000,
    currency: 'Rs.',
    images: Array.from({ length: 5 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '1 Bed' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'furnished', label: 'Furnished' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Furnished'],
    about: 'Traditional aesthetics meet modern living. Located near Patan Durbar Square, this 1BHK offers a gorgeous view of local traditional architecture and heritage.',
    type: '1BHK',
    owner: {
      name: 'Ramesh Raj',
      verified: false,
      listingsCount: 1,
    },
    coordinate: { latitude: 27.6727, longitude: 85.3259 },
  },
  {
    id: 'p4',
    title: 'Premium 3BHK in Jhamsikhel',
    location: 'Lalitpur',
    area: 'Jhamsikhel, Lalitpur',
    rating: 4.9,
    priceMonthly: 45000,
    currency: 'Rs.',
    images: Array.from({ length: 10 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '3 Bed' },
      { icon: 'bath', label: '2 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'furnished', label: 'Furnished' },
      { icon: 'gym', label: 'Gym' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Furnished', 'Gym'],
    about: 'Luxurious 3BHK apartment in the expat hub of Jhamsikhel. Fully furnished with high-end appliances, 24/7 security, power backup, and building gym access.',
    type: '3BHK',
    owner: {
      name: 'Sujata Karki',
      verified: true,
      listingsCount: 5,
    },
    coordinate: { latitude: 27.6771, longitude: 85.3188 },
  },
  {
    id: 'p5',
    title: 'Spacious 2BHK in Lazimpat',
    location: 'Kathmandu',
    area: 'Lazimpat, Kathmandu',
    rating: 4.6,
    priceMonthly: 36000,
    currency: 'Rs.',
    images: Array.from({ length: 7 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '2 Bed' },
      { icon: 'bath', label: '2 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'balcony', label: 'Balcony' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Balcony'],
    about: 'Quiet and green neighborhood of Lazimpat. Spacious rooms with separate kitchen and dining area. Walkable distance to major supermarkets and embassy areas.',
    type: '2BHK',
    owner: {
      name: 'Anil Shrestha',
      verified: true,
      listingsCount: 8,
    },
    coordinate: { latitude: 27.7218, longitude: 85.3222 },
  },
  {
    id: 'p6',
    title: 'Cozy Studio near Boudha Stupa',
    location: 'Kathmandu',
    area: 'Boudha, Kathmandu',
    rating: 4.4,
    priceMonthly: 15000,
    currency: 'Rs.',
    images: Array.from({ length: 4 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: 'Studio' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'balcony', label: 'Balcony' },
    ],
    amenityStrings: ['Wi-Fi', 'Balcony'],
    about: 'A simple, comfortable studio offering peace and quiet. Just a 5-minute walk from Boudhanath Stupa. Ideal for meditation, remote work, and studying.',
    type: 'Studio',
    owner: {
      name: 'Tenzing Sherpa',
      verified: true,
      listingsCount: 2,
    },
    coordinate: { latitude: 27.7215, longitude: 85.3620 },
  },
  {
    id: 'p7',
    title: 'Luxurious Family Home in Budhanilkantha',
    location: 'Kathmandu',
    area: 'Budhanilkantha, Kathmandu',
    rating: 4.9,
    priceMonthly: 55000,
    currency: 'Rs.',
    images: Array.from({ length: 12 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '4 Bed' },
      { icon: 'bath', label: '3 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'balcony', label: 'Balcony' },
      { icon: 'gym', label: 'Gym' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Balcony', 'Gym'],
    about: 'A sprawling family home with a beautiful private garden. Situated in the clean, peaceful suburbs of Budhanilkantha. Highly secure with compound wall and 24/7 security.',
    type: '3BHK',
    owner: {
      name: 'Ram Bahadur',
      verified: true,
      listingsCount: 1,
    },
    coordinate: { latitude: 27.7728, longitude: 85.3642 },
  },
  {
    id: 'p8',
    title: 'Modern 1BHK in Sanepa',
    location: 'Lalitpur',
    area: 'Sanepa, Lalitpur',
    rating: 4.7,
    priceMonthly: 24000,
    currency: 'Rs.',
    images: Array.from({ length: 6 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '1 Bed' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'furnished', label: 'Furnished' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Furnished'],
    about: 'Sleek, modern 1BHK with an open-plan kitchen and stylish living area. Centrally located in Sanepa. Perfect for working professionals, freelancers, or young couples.',
    type: '1BHK',
    owner: {
      name: 'Gopal Thapa',
      verified: false,
      listingsCount: 2,
    },
    coordinate: { latitude: 27.6867, longitude: 85.3091 },
  },
  {
    id: 'p9',
    title: 'Elegant 2BHK in Baluwatar',
    location: 'Kathmandu',
    area: 'Baluwatar, Kathmandu',
    rating: 4.8,
    priceMonthly: 38000,
    currency: 'Rs.',
    images: Array.from({ length: 8 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '2 Bed' },
      { icon: 'bath', label: '2 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'balcony', label: 'Balcony' },
      { icon: 'furnished', label: 'Furnished' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Balcony', 'Furnished'],
    about: 'Sophisticated apartment in the VIP area of Baluwatar. Features a modern layout, big windows with plenty of sunlight, private balconies, and dedicated parking spaces.',
    type: '2BHK',
    owner: {
      name: 'Sita Sharma',
      verified: true,
      listingsCount: 12,
    },
    coordinate: { latitude: 27.7288, longitude: 85.3305 },
  },
  {
    id: 'p10',
    title: 'Affordable 1BHK in Baneshwor',
    location: 'Kathmandu',
    area: 'Baneshwor, Kathmandu',
    rating: 4.3,
    priceMonthly: 19500,
    currency: 'Rs.',
    images: Array.from({ length: 5 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '1 Bed' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
    ],
    amenityStrings: ['Wi-Fi'],
    about: 'Super convenient location near Baneshwor Chowk. Close to public transport, shopping malls, and colleges. Separate entrance for privacy.',
    type: '1BHK',
    owner: {
      name: 'Krishna Subedi',
      verified: true,
      listingsCount: 4,
    },
    coordinate: { latitude: 27.6915, longitude: 85.3445 },
  },
  {
    id: 'p11',
    title: 'Spacious 3BHK in Maharajgunj',
    location: 'Kathmandu',
    area: 'Maharajgunj, Kathmandu',
    rating: 4.7,
    priceMonthly: 48000,
    currency: 'Rs.',
    images: Array.from({ length: 9 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '3 Bed' },
      { icon: 'bath', label: '2 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'balcony', label: 'Balcony' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Balcony'],
    about: 'Large 3BHK suitable for families. High-speed internet included. Quiet neighborhood near President\'s Office. Private parking for cars and bikes.',
    type: '3BHK',
    owner: {
      name: 'Sunita Adhikari',
      verified: true,
      listingsCount: 3,
    },
    coordinate: { latitude: 27.7361, longitude: 85.3349 },
  },
  {
    id: 'p12',
    title: 'Studio Apartment in Pulchowk',
    location: 'Lalitpur',
    area: 'Pulchowk, Lalitpur',
    rating: 4.6,
    priceMonthly: 21000,
    currency: 'Rs.',
    images: Array.from({ length: 6 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: 'Studio' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'furnished', label: 'Furnished' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Furnished'],
    about: 'Chic studio apartment in Pulchowk, close to IOE campus. High security, plenty of cafes nearby, and excellent internet connectivity.',
    type: 'Studio',
    owner: {
      name: 'Gopal Thapa',
      verified: false,
      listingsCount: 2,
    },
    coordinate: { latitude: 27.6811, longitude: 85.3183 },
  },
  {
    id: 'p13',
    title: 'Cozy 1BHK in Bhaktapur',
    location: 'Bhaktapur',
    area: 'Bhaktapur, Nepal',
    rating: 4.5,
    priceMonthly: 14000,
    currency: 'Rs.',
    images: Array.from({ length: 5 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '1 Bed' },
      { icon: 'bath', label: '1 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
    ],
    amenityStrings: ['Wi-Fi'],
    about: 'Quiet room set in a traditional Bhaktapur building. Restored clay-tile floors. Experience authentic Newari culture and hospitality.',
    type: '1BHK',
    owner: {
      name: 'Ratna Bajracharya',
      verified: true,
      listingsCount: 2,
    },
    coordinate: { latitude: 27.6712, longitude: 85.4298 },
  },
  {
    id: 'p14',
    title: 'Beautiful 2BHK in Naxal',
    location: 'Kathmandu',
    area: 'Naxal, Kathmandu',
    rating: 4.8,
    priceMonthly: 35000,
    currency: 'Rs.',
    images: Array.from({ length: 8 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: '2 Bed' },
      { icon: 'bath', label: '2 Bath' },
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'car', label: 'Parking' },
      { icon: 'balcony', label: 'Balcony' },
    ],
    amenityStrings: ['Wi-Fi', 'Parking', 'Balcony'],
    about: 'Contemporary design 2BHK located in the highly desired area of Naxal. Walking distance to Bhatbhateni supermarket and fine dining spots.',
    type: '2BHK',
    owner: {
      name: 'Anil Shrestha',
      verified: true,
      listingsCount: 8,
    },
    coordinate: { latitude: 27.7178, longitude: 85.3266 },
  },
  {
    id: 'p15',
    title: 'Budget Studio in Kalanki',
    location: 'Kathmandu',
    area: 'Kalanki, Kathmandu',
    rating: 4.2,
    priceMonthly: 12000,
    currency: 'Rs.',
    images: Array.from({ length: 4 }, (_, i) => `photo-${i + 1}`),
    amenities: [
      { icon: 'bed', label: 'Studio' },
      { icon: 'bath', label: '1 Bath' },
    ],
    amenityStrings: [],
    about: 'Pocket-friendly studio perfect for budget conscious commuters. Easy access to Ring Road. Secured room in a quiet residential building.',
    type: 'Studio',
    owner: {
      name: 'Prakash KC',
      verified: false,
      listingsCount: 1,
    },
    coordinate: { latitude: 27.6935, longitude: 85.2817 },
  },
];

const INITIAL_FILTERS: PropertyFilters = {
  type: 'All',
  minPrice: 10000,
  maxPrice: 60000,
  amenities: [],
  sortBy: 'Newest',
  searchQuery: '',
  city: 'All',
};

// ─── Haversine Distance Helper ───────────────────────────────────────────────
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const usePropertyStore = create<PropertyStore>((set, get) => ({
  properties: INITIAL_PROPERTIES,
  savedPropertyIds: ['p1', 'p5'], // default saved items to demonstrate Saved screen
  filters: INITIAL_FILTERS,

  toggleSaved: (id) =>
    set((state) => {
      const isSaved = state.savedPropertyIds.includes(id);
      const nextSaved = isSaved
        ? state.savedPropertyIds.filter((item) => item !== id)
        : [...state.savedPropertyIds, id];
      return { savedPropertyIds: nextSaved };
    }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: INITIAL_FILTERS }),

  getFilteredProperties: () => {
    const { properties, filters } = get();
    return properties.filter((property) => {
      // 1. BHK / Type filter
      if (filters.type !== 'All' && property.type !== filters.type) {
        return false;
      }

      // 2. City filter
      if (filters.city !== 'All' && property.location !== filters.city) {
        return false;
      }

      // 3. Price filter
      if (property.priceMonthly < filters.minPrice || property.priceMonthly > filters.maxPrice) {
        return false;
      }

      // 4. Amenities filter
      if (filters.amenities.length > 0) {
        const hasAll = filters.amenities.every((amenity) =>
          property.amenityStrings.includes(amenity),
        );
        if (!hasAll) return false;
      }

      // 5. Search query filter (title, area, city)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = property.title.toLowerCase().includes(query);
        const matchesArea = property.area.toLowerCase().includes(query);
        const matchesCity = property.location.toLowerCase().includes(query);
        if (!matchesTitle && !matchesArea && !matchesCity) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'Price: Low to High') {
        return a.priceMonthly - b.priceMonthly;
      }
      // "Newest" sort: default ordering or can use ID comparison as proxy
      return b.id.localeCompare(a.id);
    });
  },
}));
