import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result';
import type { Database } from '@/src/types/database.types';
import type { MapBounds, PropertyPin } from '@/src/types/map.types';

type PropertyRow = Record<string, unknown>;

function toPropertyPin(row: PropertyRow): PropertyPin {
  return {
    id: row.id as string,
    latitude: row.location_lat as number,
    longitude: row.location_lng as number,
    price: row.price as number,
    status: (row.status as PropertyPin['status']) ?? 'AVAILABLE',
    title: row.title as string,
    photoUrl: (row.photo_urls as string[])?.[0] ?? undefined,
    locationArea: row.location_area as string,
    propertyType: row.property_type as string,
    isPaused: (row.is_paused as boolean | undefined) ?? false,
  };
}

export async function getPropertiesInBounds(
  bounds: MapBounds,
  supabase: SupabaseClient<Database>
): Promise<Result<PropertyPin[]>> {
  try {
    const { data, error } = await supabase.rpc('get_properties_in_bounds' as any, {
      p_sw_lat: bounds.swLat,
      p_sw_lng: bounds.swLng,
      p_ne_lat: bounds.neLat,
      p_ne_lng: bounds.neLng,
    });

    if (error) return err(getErrorMessage(error));

    const rows = (data ?? []) as PropertyRow[];
    return ok(rows.map(toPropertyPin));
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

/**
 * Every visible property within `radiusM` meters of the center point,
 * nearest first. Powers the tenant map's search → radius → list flow.
 */
export async function getPropertiesNear(
  lat: number,
  lng: number,
  radiusM: number,
  supabase: SupabaseClient<Database>
): Promise<Result<PropertyPin[]>> {
  try {
    const { data, error } = await supabase.rpc('get_properties_near' as any, {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radiusM,
    });

    if (error) return err(getErrorMessage(error));

    const rows = (data ?? []) as PropertyRow[];
    return ok(rows.map(toPropertyPin));
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function searchProperties(
  query: string,
  supabase: SupabaseClient<Database>
): Promise<Result<PropertyPin[]>> {
  try {
    const { data, error } = await supabase.rpc('search_properties' as any, {
      p_query: query,
    });

    if (error) return err(getErrorMessage(error));

    const rows = (data ?? []) as Record<string, unknown>[];
    return ok(
      rows.map((row) => ({
        id: row.id as string,
        latitude: row.location_lat as number,
        longitude: row.location_lng as number,
        price: row.price as number,
        status: (row.status as PropertyPin['status']) ?? 'AVAILABLE',
        title: row.title as string,
        photoUrl: (row.photo_urls as string[])?.[0] ?? undefined,
        locationArea: row.location_area as string,
        propertyType: row.property_type as string,
        isPaused: (row.is_paused as boolean | undefined) ?? false,
      }))
    );
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export interface GeocodeResult {
  /** Full formatted address, e.g. "Baluwatar, Kathmandu 44600, Nepal". */
  name: string;
  /** Short locality, e.g. "Baluwatar". */
  area: string;
  lat: number;
  lng: number;
  /** Google place id for the result, when available. */
  placeId?: string;
}

/**
 * Forward-geocode a free-text place query ("Baluwatar", "Thamel,
 * Kathmandu") via the `geocode` edge function (Google Places Text
 * Search). Returns up to 5 candidate locations to center the map on.
 */
export async function geocodePlace(
  query: string,
  supabase: SupabaseClient<Database>
): Promise<Result<GeocodeResult[]>> {
  try {
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { query },
      timeout: 12000,
    });

    if (error) {
      // FunctionsHttpError.context is the raw Response — surface the
      // edge function's actual reason if possible.
      let message = getErrorMessage(error);
      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          message = (body as { error?: string })?.error ?? message;
        }
      } catch {
        // fall through with the generic message
      }
      return err(message);
    }

    const results = ((data as { results?: unknown[] } | null)?.results ?? []) as GeocodeResult[];
    return ok(results);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export interface ReverseGeocodeResult {
  /** Full formatted address, e.g. "Jhamsikhel Marg, Jhamsikhel, Lalitpur 44600, Nepal". */
  address: string;
  /** Short locality, e.g. "Jhamsikhel". */
  area: string;
  /** Google place id for the resolved point. */
  placeId?: string;
  /** Coordinates Google resolved for the point (may be null). */
  lat?: number | null;
  lng?: number | null;
}

/**
 * Reverse-geocode coordinates into a precise, human-readable address
 * via the `reverse-geocode` edge function (Google Geocoding API).
 * Powers the landlord location picker's real-time address preview.
 */
export async function reverseGeocodePlace(
  lat: number,
  lng: number,
  supabase: SupabaseClient<Database>
): Promise<Result<ReverseGeocodeResult>> {
  try {
    const { data, error } = await supabase.functions.invoke('reverse-geocode', {
      body: { latitude: lat, longitude: lng },
      timeout: 12000,
    });

    if (error) {
      let message = getErrorMessage(error);
      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          message = (body as { error?: string })?.error ?? message;
        }
      } catch {
        // fall through with the generic message
      }
      return err(message);
    }

    return ok((data ?? {}) as ReverseGeocodeResult);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}
