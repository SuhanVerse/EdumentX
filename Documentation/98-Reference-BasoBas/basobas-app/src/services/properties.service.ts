import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import {
  toLandlordPropertySummary,
  toPropertyPublic,
  toPropertyUnlocked,
  OPEN_VISIT_STATUSES,
  type LandlordPropertySummary,
  type PropertyPublic,
  type PropertyUnlocked,
  type PropertyRow,
  type PropertyType,
} from '@/src/types/property.types'
import type { Database, Json } from '@/src/types/database.types'

// ─── Column lists ─────────────────────────────────────────────────────────────

/**
 * Public location tier ONLY. `location_address`, `location_lat` and
 * `location_lng` are deliberately absent — see Part F of the integration plan.
 * Any query a tenant can reach must use this list, never `select('*')`.
 */
const PUBLIC_COLUMNS = `
  id, landlord_id, title, description, property_type, price, deposit, status,
  furnishing, bedrooms, bathrooms, area_sqft, floor, total_floors, amenities,
  photo_urls, available_from, location_area, extra_details, is_draft,
  is_paused, is_deleted, linked_occupant_id, views, created_at, updated_at
` as const

/** Public tier plus the private location columns. Post-accept reads only. */
const UNLOCKED_COLUMNS = `
  ${PUBLIC_COLUMNS}, location_address, location_lat, location_lng
` as const

// PUBLIC_COLUMNS omits the private tier, so rows from it lack those keys.
// The mappers only read what they select, so we widen back to PropertyRow.
type PublicSelectRow = Omit<
  PropertyRow,
  'location_address' | 'location_lat' | 'location_lng'
>

const asPropertyRow = (row: PublicSelectRow): PropertyRow => ({
  ...row,
  location_address: null,
  location_lat:     null,
  location_lng:     null,
})

// ─── Read: landlord's own properties ─────────────────────────────────────────

/**
 * Every property the landlord owns, including drafts, newest first.
 * Soft-deleted rows are included so the list can show an "Archived" tab.
 *
 * Also resolves the open-visit-request count per property in a single extra
 * query (the list card shows it), rather than N+1 per row.
 */
export async function getMyProperties(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<LandlordPropertySummary[]>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(PUBLIC_COLUMNS)
      .eq('landlord_id', clerkId)
      .order('created_at', { ascending: false })

    if (error) return err(getErrorMessage(error))
    const rows = (data ?? []) as PublicSelectRow[]
    if (rows.length === 0) return ok([])

    // Open request counts, one query for all properties.
    const counts = new Map<string, number>()
    const { data: visits, error: visitsError } = await supabase
      .from('visit_requests')
      .select('property_id')
      .eq('landlord_id', clerkId)
      .in('status', OPEN_VISIT_STATUSES)

    if (visitsError) {
      // Non-fatal: the list still renders, just without request badges.
      console.warn('[getMyProperties] request counts unavailable:', visitsError.message)
    } else {
      for (const v of visits ?? []) {
        counts.set(v.property_id, (counts.get(v.property_id) ?? 0) + 1)
      }
    }

    return ok(
      rows.map((row) =>
        toLandlordPropertySummary(asPropertyRow(row), counts.get(row.id) ?? 0)
      )
    )
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Read: tenant browsing ───────────────────────────────────────────────────

/**
 * Every listing a tenant can rent: published, not soft-deleted, not paused
 * and not occupied. Newest first, capped so browse screens stay snappy.
 *
 * This is the single source for the tenant Home / Search tabs — the store
 * hydrates from here, never from local mock data.
 */
export async function getAvailableProperties(
  supabase: SupabaseClient<Database>
): Promise<Result<PropertyPublic[]>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(PUBLIC_COLUMNS)
      .eq('is_draft', false)
      .eq('is_deleted', false)
      .eq('is_paused', false)
      .neq('status', 'OCCUPIED')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return err(getErrorMessage(error))

    return ok(((data ?? []) as PublicSelectRow[]).map((row) => toPropertyPublic(asPropertyRow(row))))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * A landlord's published, rentable listings — drives the public landlord
 * profile page (id is the landlord's clerk id). Same availability filter as
 * `getAvailableProperties`.
 */
export async function getPublishedPropertiesByLandlord(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<PropertyPublic[]>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(PUBLIC_COLUMNS)
      .eq('landlord_id', clerkId)
      .eq('is_draft', false)
      .eq('is_deleted', false)
      .eq('is_paused', false)
      .neq('status', 'OCCUPIED')
      .order('created_at', { ascending: false })

    if (error) return err(getErrorMessage(error))

    return ok(((data ?? []) as PublicSelectRow[]).map((row) => toPropertyPublic(asPropertyRow(row))))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Read: tenant saved properties ───────────────────────────────────────────

/**
 * The current tenant's saved property ids, newest first. RLS scopes the
 * `saved_properties` rows to the requesting user automatically.
 */
export async function getSavedPropertyIdsForTenant(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<string[]>> {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('property_id')
      .eq('clerk_id', clerkId)
      .order('created_at', { ascending: false })

    if (error) return err(getErrorMessage(error))

    return ok((data ?? []).map((row) => row.property_id))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/** The tenant's saved properties, joined to the public listing tier. */
export async function getSavedPropertiesForTenant(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<PropertyPublic[]>> {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select(`property:properties!saved_properties_property_id_fkey(${PUBLIC_COLUMNS})`)
      .eq('clerk_id', clerkId)
      .order('created_at', { ascending: false })

    if (error) return err(getErrorMessage(error))

    const rows = (data ?? []) as unknown as { property: PublicSelectRow | null }[]
    return ok(
      rows
        .filter((r): r is { property: PublicSelectRow } => r.property != null)
        .map((r) => toPropertyPublic(asPropertyRow(r.property)))
    )
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Write: tenant saved properties ──────────────────────────────────────────

/** Bookmark a property (`saved_properties` has a UNIQUE on clerk+property). */
export async function savePropertyForTenant(
  clerkId:    string,
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<true>> {
  try {
    const { error } = await supabase
      .from('saved_properties')
      .upsert({ clerk_id: clerkId, property_id: propertyId }, { onConflict: 'clerk_id,property_id' })

    if (error) return err(getErrorMessage(error))
    return ok(true)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/** Remove a bookmark. */
export async function unsavePropertyForTenant(
  clerkId:    string,
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<true>> {
  try {
    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('clerk_id', clerkId)
      .eq('property_id', propertyId)

    if (error) return err(getErrorMessage(error))
    return ok(true)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Read: single property ───────────────────────────────────────────────────

/**
 * Public-tier property detail. Returns `ok(null)` when the row doesn't exist
 * or RLS hides it (someone else's draft).
 *
 * NEVER selects the private location columns — pair with
 * `getPropertyWithUnlockedLocation` when the viewer has earned access.
 */
export async function getPropertyPublic(
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<PropertyPublic | null>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(PUBLIC_COLUMNS)
      .eq('id', propertyId)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))
    if (!data)  return ok(null)

    return ok(toPropertyPublic(asPropertyRow(data as PublicSelectRow)))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Property detail including the private location tier (exact address, lat/lng).
 *
 * Callers must have established the viewer's right to it — the landlord who
 * owns the row, or a tenant whose visit request has been accepted. RLS alone
 * does not gate these columns, so this function is intentionally separate from
 * `getPropertyPublic` and must not be used on general listing screens.
 */
export async function getPropertyWithUnlockedLocation(
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<PropertyUnlocked | null>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(UNLOCKED_COLUMNS)
      .eq('id', propertyId)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))
    if (!data)  return ok(null)

    return ok(toPropertyUnlocked(data as PropertyRow))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Write: create / publish ──────────────────────────────────────────────────

/** Everything the 4-step wizard collects, normalised. */
export interface CreatePropertyInput {
  landlordId:      string
  title:           string
  description?:    string | null
  propertyType:    PropertyType
  price:           number
  deposit?:        number | null
  furnishing?:     string | null
  bedrooms?:       number | null
  bathrooms?:      number | null
  areaSqft?:       number | null
  floor?:          number | null
  totalFloors?:    number | null
  amenities:       string[]
  /** ISO `YYYY-MM-DD`. */
  availableFrom:   string
  /** Public tier — free text from the wizard, e.g. "Baluwatar, Kathmandu". */
  locationArea:    string
  /** Private tier — map pin picked in the location picker (optional). */
  locationLat?:    number | null
  locationLng?:    number | null
  /** Type-specific extras that don't warrant a column. */
  extraDetails?:   Record<string, unknown>
}

/**
 * Insert the listing as a draft (`is_draft = true`) and return its id.
 *
 * Photos upload to `property-photos/{clerkId}/{propertyId}/…`, which needs the
 * id — so the row is created first, photos second, then `publishProperty`
 * writes the URLs and flips the draft flag.
 */
export async function createPropertyDraft(
  input:    CreatePropertyInput,
  supabase: SupabaseClient<Database>
): Promise<Result<string>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        landlord_id:    input.landlordId,
        title:          input.title,
        description:    input.description ?? null,
        property_type:  input.propertyType,
        price:          input.price,
        deposit:        input.deposit ?? null,
        furnishing:     input.furnishing ?? null,
        bedrooms:       input.bedrooms ?? null,
        bathrooms:      input.bathrooms ?? null,
        area_sqft:      input.areaSqft ?? null,
        floor:          input.floor ?? null,
        total_floors:   input.totalFloors ?? null,
        amenities:      input.amenities,
        available_from: input.availableFrom,
        location_area:  input.locationArea,
        location_lat:   input.locationLat ?? null,
        location_lng:   input.locationLng ?? null,
        // extra_details is jsonb; the column's generated type is `Json`, which
        // a plain object literal doesn't structurally satisfy.
        extra_details:  (input.extraDetails ?? {}) as Json,
        is_draft:       true,
      })
      .select('id')
      .single()

    if (error) return err(getErrorMessage(error))
    return ok(data.id)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Attach the uploaded photo URLs, clear the draft flag, then let the DB derive
 * the listing status from its open visit requests (a fresh listing settles on
 * AVAILABLE).
 */
export async function publishProperty(
  propertyId: string,
  photoUrls:  string[],
  supabase:   SupabaseClient<Database>
): Promise<Result<PropertyPublic>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ photo_urls: photoUrls, is_draft: false })
      .eq('id', propertyId)
      .select(PUBLIC_COLUMNS)
      .single()

    if (error) return err(getErrorMessage(error))

    const { error: recalcError } = await supabase.rpc(
      'recalculate_property_status',
      { p_property_id: propertyId }
    )
    if (recalcError) {
      // The listing is live either way; status just stays at its default.
      console.warn('[publishProperty] status recalc failed:', recalcError.message)
    }

    return ok(toPropertyPublic(asPropertyRow(data as PublicSelectRow)))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Write: lifecycle ─────────────────────────────────────────────────────────

/**
 * Put an OCCUPIED property back on the market: clears the linked occupant and
 * re-derives status. Ownership is enforced inside the RPC.
 */
export async function relistProperty(
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<PropertyPublic>> {
  try {
    const { data, error } = await supabase.rpc('relist_property', {
      p_property_id: propertyId,
    })

    if (error) return err(getErrorMessage(error))
    if (!data)  return err('Relist returned no property.')

    return ok(toPropertyPublic(data as PropertyRow))
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Soft-delete a listing (`is_deleted = true`) so it disappears from public
 * queries while its visit history stays intact. RLS restricts this to the
 * owning landlord.
 */
export async function deleteProperty(
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<true>> {
  try {
    const { error } = await supabase
      .from('properties')
      .update({ is_deleted: true })
      .eq('id', propertyId)

    if (error) return err(getErrorMessage(error))
    return ok(true)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Per-listing numbers shown on the detail screen's bottom bar: views from the
 * property row, the open-visit count, and the saved-by-tenants count. Two
 * extra queries (visit_requests + saved_properties) — the property row is
 * already in hand when this is called alongside `getPropertyPublic`.
 *
 * Returns zeroes (not errors) when a count query fails so the bottom bar
 * still renders; the parent row's `views` is the only field that is genuinely
 * load-bearing.
 */
export async function getPropertyStats(
  propertyId: string,
  supabase:   SupabaseClient<Database>
): Promise<Result<{ views: number; savedCount: number; requestCount: number }>> {
  try {
    const [visitsRes, savesRes] = await Promise.all([
      supabase
        .from('visit_requests')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .in('status', OPEN_VISIT_STATUSES),
      supabase
        .from('saved_properties')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId),
    ])

    if (visitsRes.error) {
      console.warn('[getPropertyStats] visit count unavailable:', visitsRes.error.message)
    }
    if (savesRes.error) {
      console.warn('[getPropertyStats] save count unavailable:', savesRes.error.message)
    }

    return ok({
      views:        0,        // caller patches in the property row's `views`
      savedCount:   savesRes.count ?? 0,
      requestCount: visitsRes.count ?? 0,
    })
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Pause / resume: flips `is_paused`. The landlord's update policy already
 * scopes this to their own row, so no extra RPC is needed.
 */
export async function setListingPaused(
  propertyId: string,
  isPaused:   boolean,
  supabase:   SupabaseClient<Database>
): Promise<Result<true>> {
  try {
    const { error } = await supabase
      .from('properties')
      .update({ is_paused: isPaused })
      .eq('id', propertyId)

    if (error) return err(getErrorMessage(error))
    return ok(true)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * The landlord's own display name + rating for the Owner Card. Joins on
 * `profiles` (full_name, avatar_url) and `landlord_profiles` (avg_rating).
 *
 * Either source can be missing — a user without a `landlord_profiles` row has
 * no rating yet, and the profile row itself is the canonical identity source.
 */
export interface LandlordOwnerProfile {
  name:        string | null
  avatarUrl:   string | null
  avgRating:   number
  totalReviews: number
}

export async function getLandlordOwnerProfile(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<LandlordOwnerProfile>> {
  try {
    const [profileRes, ratingRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('clerk_id', clerkId)
        .maybeSingle(),
      supabase
        .from('landlord_profiles')
        .select('avg_rating, total_reviews')
        .eq('clerk_id', clerkId)
        .maybeSingle(),
    ])

    if (profileRes.error) return err(getErrorMessage(profileRes.error))
    if (ratingRes.error)  return err(getErrorMessage(ratingRes.error))

    return ok({
      name:         profileRes.data?.full_name ?? null,
      avatarUrl:    profileRes.data?.avatar_url ?? null,
      avgRating:    ratingRes.data?.avg_rating ?? 0,
      totalReviews: ratingRes.data?.total_reviews ?? 0,
    })
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

// ─── Read: publish gate ───────────────────────────────────────────────────────

/** Mirrors `landlord_profiles.verification_status` (a TEXT column, not an enum). */
export type LandlordVerificationStatus =
  | 'UNVERIFIED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'

/**
 * Read the landlord's KYC verification state. Used as the publish gate in the
 * add-listing wizard and on the Profile tab.
 *
 * A missing `landlord_profiles` row means the user has never started
 * verification, which is `'UNVERIFIED'` rather than an error.
 */
export async function getLandlordVerificationStatus(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<LandlordVerificationStatus>> {
  try {
    const { data, error } = await supabase
      .from('landlord_profiles')
      .select('verification_status')
      .eq('clerk_id', clerkId)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))
    if (!data)  return ok('UNVERIFIED')

    return ok(data.verification_status as LandlordVerificationStatus)
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/**
 * Full verification detail for the standalone Verification Status screen.
 * `status` is always present; the timestamps/reason are populated by the
 * review pipeline and are null until the relevant transition happens.
 */
export interface LandlordVerificationDetail {
  status:       LandlordVerificationStatus
  submittedAt:  string | null
  reviewedAt:   string | null
  rejectReason: string | null
}

/**
 * Read the landlord's verification state with its review timestamps and any
 * rejection reason. A missing `landlord_profiles` row is `'UNVERIFIED'` with
 * null timestamps rather than an error.
 */
export async function getLandlordVerificationDetail(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<LandlordVerificationDetail>> {
  try {
    const { data, error } = await supabase
      .from('landlord_profiles')
      .select(
        'verification_status, verification_submitted_at, verification_reviewed_at, verification_reject_reason'
      )
      .eq('clerk_id', clerkId)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))
    if (!data) {
      return ok({
        status:       'UNVERIFIED',
        submittedAt:  null,
        reviewedAt:   null,
        rejectReason: null,
      })
    }

    return ok({
      status:       data.verification_status as LandlordVerificationStatus,
      submittedAt:  data.verification_submitted_at,
      reviewedAt:   data.verification_reviewed_at,
      rejectReason: data.verification_reject_reason,
    })
  } catch (e) {
    return err(getErrorMessage(e))
  }
}

/** Aggregate review numbers maintained on `landlord_profiles`. */
export interface LandlordRating {
  avgRating:    number
  totalReviews: number
}

/**
 * The landlord's public rating. Zeroes when they have no `landlord_profiles`
 * row yet — a landlord with no reviews is not an error state.
 */
export async function getLandlordRating(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<LandlordRating>> {
  try {
    const { data, error } = await supabase
      .from('landlord_profiles')
      .select('avg_rating, total_reviews')
      .eq('clerk_id', clerkId)
      .maybeSingle()

    if (error) return err(getErrorMessage(error))

    return ok({
      avgRating:    data?.avg_rating ?? 0,
      totalReviews: data?.total_reviews ?? 0,
    })
  } catch (e) {
    return err(getErrorMessage(e))
  }
}
