// ════════════════════════════════════════════════════════════════════
// reverse-geocode
//
// Called by the mobile app (landlord location picker) whenever a pin is
// dropped, the map settles on a new center, or the current location is
// fetched. Requires a valid Clerk JWT (verified manually via jose).
//
// Uses the Google Maps Geocoding API for accurate, precise reverse
// geocoding. The client sends ONLY coordinates; the exact formatted
// address and a short locality label are resolved server-side so the
// API key never leaves the server.
//
// Env: GOOGLE_MAPS_API_KEY — Google Cloud key with the Geocoding API
// enabled (set via `supabase secrets set GOOGLE_MAPS_API_KEY=...`).
//
// Returns:
//   address    — full formatted address ("Jhamsikhel Marg, Jhamsikhel,
//                Lalitpur 44600, Nepal")
//   area       — short locality ("Jhamsikhel")
//   placeId    — Google place id for the resolved point
//   lat, lng   — coordinates Google resolved for that point
// ════════════════════════════════════════════════════════════════════

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'npm:@supabase/server';
import { verifyClerkJwt } from '../_shared/auth.ts';
import {
  GOOGLE_GEOCODE_URL,
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
    let body: { latitude?: number; longitude?: number };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { latitude, longitude } = body;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return Response.json({ error: 'Valid latitude and longitude are required' }, { status: 400 });
    }

    // ── 3. Resolve the API key ─────────────────────────────────────
    const apiKey = googleApiKey();
    if (!apiKey) {
      console.error('Missing GOOGLE_MAPS_API_KEY env var');
      return Response.json({ error: 'Geocoding service is not configured' }, { status: 500 });
    }

    // ── 4. Reverse geocode via the Google Geocoding API ────────────
    try {
      const url = new URL(GOOGLE_GEOCODE_URL);
      url.searchParams.set('latlng', `${latitude},${longitude}`);
      url.searchParams.set('language', 'en');
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.error('Google Geocoding request failed:', response.status);
        return Response.json({ error: 'Geocoding service unavailable' }, { status: 502 });
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        return Response.json({ address: '', area: '', placeId: '' });
      }
      if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
        console.error('Google Geocoding returned:', data.status, data.error_message ?? '');
        return Response.json({ error: 'Geocoding service unavailable' }, { status: 502 });
      }

      // ── 5. Normalize into the app's address contract ─────────────
      const result = data.results[0];
      const components = (result.address_components ?? []) as AddressComponent[];
      const location = result.geometry?.location;

      return Response.json({
        address:
          typeof result.formatted_address === 'string' ? result.formatted_address.trim() : '',
        area: pickArea(components),
        placeId: typeof result.place_id === 'string' ? result.place_id : '',
        lat: typeof location?.lat === 'number' ? location.lat : null,
        lng: typeof location?.lng === 'number' ? location.lng : null,
      });
    } catch (err) {
      console.error('Reverse geocode failed:', err);
      return Response.json({ error: 'Geocoding service unavailable' }, { status: 502 });
    }
  }),
};
