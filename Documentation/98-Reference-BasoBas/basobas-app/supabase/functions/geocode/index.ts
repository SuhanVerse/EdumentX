// ════════════════════════════════════════════════════════════════════
// geocode
//
// Called by the mobile app (tenant map search bar + landlord location
// picker) to turn a free-text place query ("Baluwatar", "Thamel,
// Kathmandu") into candidate coordinates. Requires a valid Clerk JWT
// (verified manually via jose).
//
// Uses the Google Places Text Search API — returns up to 5 matches with
// a locality label, a full formatted address, and coordinates, which
// the app shows as tappable suggestions. Results are biased towards
// Nepal via a bounding-box locationbias.
//
// Env: GOOGLE_MAPS_API_KEY — Google Cloud key with the Places API
// enabled (set via `supabase secrets set GOOGLE_MAPS_API_KEY=...`).
//
// Returns `{ results: [{ name, area, lat, lng, placeId }] }` where:
//   name  — full formatted address ("Baluwatar, Kathmandu 44600, Nepal")
//   area  — short locality ("Baluwatar")
// ════════════════════════════════════════════════════════════════════

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'npm:@supabase/server';
import { verifyClerkJwt } from '../_shared/auth.ts';
import {
  GOOGLE_TEXTSEARCH_URL,
  NEPAL_BIAS,
  googleApiKey,
  pickArea,
  type AddressComponent,
} from '../_shared/geocode.ts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req) => {
    // ── 1. Verify the Clerk JWT ────────────────────────────────────
    try {
      await verifyClerkJwt(req);
    } catch (err) {
      console.error('Clerk JWT verification failed:', err);
      return Response.json(
        { error: 'Unauthorized — invalid or missing session token' },
        { status: 401 }
      );
    }

    // ── 2. Parse and validate the request body ─────────────────────
    let body: { query?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const query = (body.query ?? '').trim();
    if (query.length < 2 || query.length > 200) {
      return Response.json(
        { error: 'Query must be between 2 and 200 characters' },
        { status: 400 }
      );
    }

    // ── 3. Resolve the API key ─────────────────────────────────────
    const apiKey = googleApiKey();
    if (!apiKey) {
      console.error('Missing GOOGLE_MAPS_API_KEY env var');
      return Response.json({ error: 'Geocoding service is not configured' }, { status: 500 });
    }

    // ── 4. Forward geocode via Google Places Text Search ───────────
    try {
      const url = new URL(GOOGLE_TEXTSEARCH_URL);
      url.searchParams.set('query', query);
      url.searchParams.set('language', 'en');
      url.searchParams.set('region', 'np');
      // Bias towards Nepal so "Baluwatar" finds Kathmandu, not elsewhere.
      url.searchParams.set('locationbias', NEPAL_BIAS);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.error('Google Places request failed:', response.status);
        return Response.json({ error: 'Geocoding service unavailable' }, { status: 502 });
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        return Response.json({ results: [] });
      }
      if (data.status !== 'OK' || !Array.isArray(data.results)) {
        console.error('Google Places returned:', data.status, data.error_message ?? '');
        return Response.json({ error: 'Geocoding service unavailable' }, { status: 502 });
      }

      // ── 5. Normalize into lightweight suggestions ────────────────
      const results = data.results
        .slice(0, 5)
        .filter((r: { geometry?: { location?: { lat?: unknown; lng?: unknown } } }) => {
          const loc = r.geometry?.location;
          return (
            typeof loc?.lat === 'number' &&
            typeof loc?.lng === 'number' &&
            Number.isFinite(loc.lat) &&
            Number.isFinite(loc.lng)
          );
        })
        .map(
          (r: {
            formatted_address?: string;
            place_id?: string;
            address_components?: AddressComponent[];
            geometry?: { location?: { lat?: number; lng?: number } };
          }) => ({
            name: typeof r.formatted_address === 'string' ? r.formatted_address.trim() : '',
            area: pickArea(r.address_components ?? []),
            lat: r.geometry?.location?.lat ?? 0,
            lng: r.geometry?.location?.lng ?? 0,
            placeId: typeof r.place_id === 'string' ? r.place_id : '',
          })
        );

      return Response.json({ results });
    } catch (err) {
      console.error('Geocode failed:', err);
      return Response.json({ error: 'Geocoding service unavailable' }, { status: 502 });
    }
  }),
};
