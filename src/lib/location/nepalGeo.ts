/**
 * Nepal place → coordinate resolution (demo-grade fallback).
 *
 * Tutors registered before the GPS / map-picker flow (Phase 5.2) have
 * no `location.coordinates` on their Firestore doc, so the map would
 * silently skip them. This module fills that gap client-side: a small
 * hand-curated centroid table for the cities EdumentX actually
 * markets in (Kathmandu Valley first — users prioritized, then major
 * district centres) so every visible tutor still gets a pin.
 *
 * Truth ladder used by `withPinCoordinates`:
 *   1. explicit `location.coordinates` (real GPS / picker pin) — kept;
 *   2. centroid of the known city/neighbourhood — approximate;
 *   3. Kathmandu Valley centre — display-only last resort.
 *
 * These centroids are rough marketing approximations (±2 km); they
 * are never written back to Firestore — they exist only for the
 * session's map rendering.
 */
import { KATHMANDU_VALLEY_CENTER } from "@/lib/location/nepalBounds";

export type LatLon = { latitude: number; longitude: number };

/** Hand-curated centroids — Kathmandu Valley first (product priority). */
export const NEPAL_CITY_CENTROIDS: Record<string, LatLon> = {
  // ── Kathmandu Valley core ──
  kathmandu: { latitude: 27.7172, longitude: 85.324 },
  lalitpur: { latitude: 27.6644, longitude: 85.3188 },
  patan: { latitude: 27.6644, longitude: 85.3188 },
  bhaktapur: { latitude: 27.6724, longitude: 85.4282 },
  kirtipur: { latitude: 27.6473, longitude: 85.2965 },
  budhanilkantha: { latitude: 27.7778, longitude: 85.3623 },
  tokha: { latitude: 27.7549, longitude: 85.2931 },
  gokarneswor: { latitude: 27.7378, longitude: 85.34 },
  sankhu: { latitude: 27.7267, longitude: 85.4694 },
  chandragiri: { latitude: 27.6467, longitude: 85.2367 },
  mahalaxmi: { latitude: 27.6544, longitude: 85.3855 },
  godawari: { latitude: 27.6267, longitude: 85.3794 },
  changunarayan: { latitude: 27.7056, longitude: 85.4381 },
  "madhyapur-thimi": { latitude: 27.6822, longitude: 85.3937 },
  suryabinayak: { latitude: 27.6528, longitude: 85.4517 },

  // ── Valley neighbourhoods & landmarks (common pickup points) ──
  thamel: { latitude: 27.7151, longitude: 85.3123 },
  boudha: { latitude: 27.7215, longitude: 85.3615 },
  balwatar: { latitude: 27.7237, longitude: 85.3136 },
  lazimpat: { latitude: 27.7204, longitude: 85.3185 },
  putalisadak: { latitude: 27.7093, longitude: 85.3173 },
  jhamsikhel: { latitude: 27.6795, longitude: 85.3103 },
  patandhoka: { latitude: 27.6708, longitude: 85.322 },
  lainchour: { latitude: 27.7146, longitude: 85.3164 },
  durbarmarg: { latitude: 27.7161, longitude: 85.3139 },

  // ── Commuter / peri-valley towns ──
  banepa: { latitude: 27.6384, longitude: 85.5204 },
  dhulikhel: { latitude: 27.6221, longitude: 85.5556 },
  panauti: { latitude: 27.5847, longitude: 85.5192 },

  // ── Major municipalities outside the valley ──
  pokhara: { latitude: 28.2096, longitude: 83.9856 },
  lekhnath: { latitude: 28.1964, longitude: 84.0189 },
  butwal: { latitude: 27.7055, longitude: 83.4552 },
  bhairahawa: { latitude: 27.5058, longitude: 83.4493 },
  siddharthanagar: { latitude: 27.5058, longitude: 83.4493 },
  hetauda: { latitude: 27.4215, longitude: 85.0427 },
  birgunj: { latitude: 27.0064, longitude: 84.8622 },
  janakpurdham: { latitude: 26.7278, longitude: 85.9266 },
  biratnagar: { latitude: 26.4526, longitude: 87.2718 },
  itahari: { latitude: 26.6637, longitude: 87.272 },
  dharan: { latitude: 26.8167, longitude: 87.2833 },
  dhankuta: { latitude: 26.9833, longitude: 87.3333 },
  birtamod: { latitude: 26.6322, longitude: 88.0089 },
  kakadvitta: { latitude: 26.6464, longitude: 88.1678 },
  damak: { latitude: 26.6413, longitude: 87.6978 },
  "nepalgunj": { latitude: 28.05, longitude: 81.6167 },
  birendranagar: { latitude: 28.6106, longitude: 81.6231 },
  surkhet: { latitude: 28.6106, longitude: 81.6231 },
  khaln: { latitude: 27.7667, longitude: 84.6167 },
  bardibas: { latitude: 27.3098, longitude: 85.8708 },
  janakpur: { latitude: 26.7278, longitude: 85.9266 },
  sarlahi: { latitude: 26.98, longitude: 85.5571 },
};

/** Resolve a location object to a centroid (neighbourhood → city). */
export function centroidFor(location: {
  neighborhood?: string;
  city?: string;
} | null | undefined): LatLon | null {
  if (!location) return null;
  return (
    matchLabel(location.neighborhood) ??
    matchLabel(location.city) ??
    null
  );
}

/** Exact label hit first, then a partial containment match. */
function matchLabel(label: string | undefined): LatLon | null {
  if (!label) return null;
  const n = label.toLowerCase().trim();
  if (!n) return null;
  const exact = NEPAL_CITY_CENTROIDS[n];
  if (exact) return exact;
  const partial = Object.entries(NEPAL_CITY_CENTROIDS).find(
    ([key]) => n.includes(key) || key.includes(n),
  );
  return partial ? partial[1] : null;
}

export type PinResolvable = {
  location?: { neighborhood?: string; city?: string } | null;
  coordinates?: LatLon | null;
};

/**
 * Fill a listing's coordinates from the fallback chain (explicit →
 * centroid → Kathmandu Valley centre). Returns a NEW array — the
 * caller's snapshot is not mutated.
 */
export function withPinCoordinates<T extends PinResolvable>(
  tutors: readonly T[],
): T[] {
  return tutors.map((t) => {
    if (t.coordinates) return t;
    const centroid = centroidFor(t.location);
    return {
      ...t,
      coordinates: centroid ?? { ...KATHMANDU_VALLEY_CENTER },
    };
  });
}