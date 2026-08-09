/**
 * Geocoder — zero-budget reverse geocoding for EdumentX.
 *
 * Uses OpenStreetMap's Nominatim service (free, keyless — no Google
 * Maps Geocoding API). We are REQUIRED to comply with Nominatim's
 * usage policy:
 *
 *   - a valid `User-Agent` identifying the app ("EdumentX-App/1.0")
 *   - max 1 request/second — meta-service callers (the map picker)
 *     debounce their taps (see `LocationPickerModal.tsx`).
 *
 * The reverse endpoint returns the nearest address object; we map
 * `neighbourhood`/`suburb` → neighborhood and `city`/`town`/`village` →
 * city to match the `LocationValue` shape of the profile forms. All
 * names are requested in English (`accept-language=en`) — see the
 * constants below — and Devanagari results are stripped as a last
 * line of defense.
 *
 * `reverseGeocode` THROWS on transport/HTTP failures so the caller can
 * surface an error state instead of silently drifting back to
 * "Unknown Area".
 */
import type { LocationValue } from "@/lib/registration";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "EdumentX-App/1.0";
// Nominatim picks the local language for place names by default — for
// Nepali towns that yields Devanagari ("काठमाडौं"). We explicitly
// request English so the profile forms always receive "Kathmandu" /
// "Lalitpur" style names (the Google Maps `language` parameter has no
// equivalent here — this is the zero-budget equivalent).
const ACCEPT_LANGUAGE = "en";

/** Structured result: coordinates echoed back + display strings. */
export type ReverseGeocodeResult = LocationValue & {
  latitude: number;
  longitude: number;
  /** Full `display_name` from Nominatim (preview text in the picker). */
  label: string;
};

type NominatimAddress = {
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimReverseResponse = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
};

/**
 * Reverse-geocode a coordinate pair to neighbourhood + city names.
 *
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @returns `{ latitude, longitude, neighborhood, city, label }` —
 *   names are `""` when the API doesn't know them (open water, middle
 *   of a highway, etc.); the caller decides how to fall back.
 * @throws on network/HTTP errors — handle with try/catch.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lon),
    "accept-language": ACCEPT_LANGUAGE,
  });
  const url = `${NOMINATIM_BASE}/reverse?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": ACCEPT_LANGUAGE,
    },
  });
  if (!res.ok) {
    throw new Error(`Reverse geocoding failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as NominatimReverseResponse;
  const addr = data.address ?? {};
  let neighborhood = addr.neighbourhood ?? addr.suburb ?? "";
  let city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? "";

  // Last-line defense: if a name still arrives in Devanagari (a data
  // gap in OSM), fall back to the English display_name so the form
  // never stores "पाटन" when the user asked for "Patan".
  const devanagari = /[\u0900-\u097F]/;
  if (devanagari.test(neighborhood) || devanagari.test(city)) {
    const fallback = (data.display_name ?? "")
      .split(", ")
      .filter((part) => !devanagari.test(part) && part.trim().length > 0);
    city = city && !devanagari.test(city) ? city : (fallback[1] ?? fallback[0] ?? city);
    neighborhood = neighborhood && !devanagari.test(neighborhood)
      ? neighborhood
      : (fallback[0] ?? "");
  }

  return {
    latitude: data.lat ? parseFloat(data.lat) : lat,
    longitude: data.lon ? parseFloat(data.lon) : lon,
    neighborhood,
    city,
    label: data.display_name ?? "",
  };
}