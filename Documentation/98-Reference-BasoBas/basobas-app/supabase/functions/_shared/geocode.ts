// ════════════════════════════════════════════════════════════════════
// Google Maps API helpers (Shared)
//
// Both the `geocode` and `reverse-geocode` edge functions talk to the
// Google Maps APIs. The API key lives in the GOOGLE_MAPS_API_KEY env
// var (set via `supabase secrets set GOOGLE_MAPS_API_KEY=...`) and must
// never be exposed to the client.
// ════════════════════════════════════════════════════════════════════

export const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
export const GOOGLE_TEXTSEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

/** Rough Nepal bounding box, used to bias place search results. */
export const NEPAL_BIAS = 'rectangle:26.34,80.06|30.45,88.20';

export interface AddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

export function googleApiKey(): string | null {
  return Deno.env.get('GOOGLE_MAPS_API_KEY') ?? null;
}

/**
 * Pick the shortest useful locality label from Google's address
 * components — "Baluwatar" over "Kathmandu", neighbourhood over
 * district over province.
 */
export function pickArea(components: AddressComponent[]): string {
  const byType: Record<string, string> = {};
  for (const c of components) {
    for (const t of c.types ?? []) {
      if (!(t in byType) && c.long_name) byType[t] = c.long_name;
    }
  }
  return (
    byType['sublocality_level_1'] ??
    byType['sublocality'] ??
    byType['neighborhood'] ??
    byType['locality'] ??
    byType['administrative_area_level_2'] ??
    byType['administrative_area_level_1'] ??
    ''
  );
}
