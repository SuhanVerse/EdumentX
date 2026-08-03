import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result'
import { OPEN_VISIT_STATUSES } from '@/src/types/property.types'
import type { Database } from '@/src/types/database.types'

/**
 * Aggregates behind the landlord dashboard cards. Everything here is derived
 * from `properties`, `visit_requests`, `saved_properties` and
 * `landlord_profiles` — there's no dedicated stats table, so the screen gets a
 * single shaped payload rather than issuing five queries of its own.
 */
export interface LandlordDashboard {
  /** Published, non-deleted listings. */
  activeListings:  number
  /** Requests awaiting a decision. */
  pendingRequests: number
  /** From `landlord_profiles.avg_rating` — 0 when never rated. */
  avgRating:       number
  totalReviews:    number
  /** Sum of `properties.views` across the landlord's listings. */
  totalViews:      number
  /** How many times tenants have bookmarked the landlord's listings. */
  totalSaves:      number
  /** Requests ÷ views, as a whole percentage. 0 when there are no views. */
  requestRate:     number
  activity:        DashboardActivity[]
}

/** One row in the Recent Activity feed. */
export interface DashboardActivity {
  id:           string
  /** Tenant's display name, or null when the profile row is missing. */
  name:         string | null
  /** Verb phrase, e.g. "requested visit". */
  action:       string
  /** Property title the action refers to. */
  detail:       string
  /** ISO timestamp — the screen formats it relative. */
  at:           string
}

/** How many activity rows the feed shows before "See all". */
const ACTIVITY_LIMIT = 5

/**
 * Load every dashboard aggregate for a landlord.
 *
 * The listing query doubles as the source for views and the property-title
 * lookup used by the activity feed, so this is four round-trips rather than
 * one per card. A failure in any one of them fails the whole call — the
 * dashboard has no meaningful partial state.
 */
export async function getLandlordDashboard(
  clerkId:  string,
  supabase: SupabaseClient<Database>
): Promise<Result<LandlordDashboard>> {
  try {
    const [propertiesRes, visitsRes, profileRes] = await Promise.all([
      supabase
        .from('properties')
        .select('id, title, views, is_draft, is_deleted')
        .eq('landlord_id', clerkId),
      supabase
        .from('visit_requests')
        .select(
          'id, status, created_at, property_id, tenant:profiles!visit_requests_tenant_id_fkey(full_name)'
        )
        .eq('landlord_id', clerkId)
        .order('created_at', { ascending: false }),
      supabase
        .from('landlord_profiles')
        .select('avg_rating, total_reviews')
        .eq('clerk_id', clerkId)
        .maybeSingle(),
    ])

    if (propertiesRes.error) return err(getErrorMessage(propertiesRes.error))
    if (visitsRes.error)     return err(getErrorMessage(visitsRes.error))
    if (profileRes.error)    return err(getErrorMessage(profileRes.error))

    const properties = propertiesRes.data ?? []
    const visits     = visitsRes.data ?? []

    const activeListings = properties.filter(
      (p) => !p.is_draft && !p.is_deleted
    ).length
    const totalViews = properties.reduce((sum, p) => sum + p.views, 0)

    const pendingRequests = visits.filter((v) => v.status === 'PENDING').length

    // Saves across all of this landlord's listings. Skipped (0) when the
    // landlord has no listings yet — an empty `.in()` matches nothing anyway.
    let totalSaves = 0
    if (properties.length > 0) {
      const { count, error } = await supabase
        .from('saved_properties')
        .select('id', { count: 'exact', head: true })
        .in('property_id', properties.map((p) => p.id))

      if (error) {
        console.warn('[getLandlordDashboard] save count unavailable:', error.message)
      } else {
        totalSaves = count ?? 0
      }
    }

    const titleById = new Map(properties.map((p) => [p.id, p.title]))

    const activity: DashboardActivity[] = visits
      .slice(0, ACTIVITY_LIMIT)
      .map((v) => ({
        id:     v.id,
        name:   v.tenant?.full_name ?? null,
        action: OPEN_VISIT_STATUSES.includes(v.status)
          ? 'requested visit'
          : 'updated their request',
        detail: titleById.get(v.property_id) ?? 'your listing',
        at:     v.created_at,
      }))

    return ok({
      activeListings,
      pendingRequests,
      avgRating:    profileRes.data?.avg_rating ?? 0,
      totalReviews: profileRes.data?.total_reviews ?? 0,
      totalViews,
      totalSaves,
      requestRate:  totalViews > 0
        ? Math.round((visits.length / totalViews) * 100)
        : 0,
      activity,
    })
  } catch (e) {
    return err(getErrorMessage(e))
  }
}
