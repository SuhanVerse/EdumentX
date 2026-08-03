export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface CameraPosition {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface PropertyPin {
  id: string;
  latitude: number;
  longitude: number;
  price: number;
  status: 'AVAILABLE' | 'HIGH_DEMAND' | 'UNDER_DISCUSSION' | 'OCCUPIED';
  title: string;
  photoUrl?: string;
  locationArea: string;
  propertyType: string;
  /** Landlord paused the listing — not rentable, filter before rendering. */
  isPaused?: boolean;
}

export interface ClusterFeature {
  id: string;
  type: 'cluster' | 'property';
  latitude: number;
  longitude: number;
  count?: number;
  properties?: PropertyPin[];
}

export const PROPERTY_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22C55E',
  HIGH_DEMAND: '#F97316',
  UNDER_DISCUSSION: '#3B82F6',
  OCCUPIED: '#9CA3AF',
};
