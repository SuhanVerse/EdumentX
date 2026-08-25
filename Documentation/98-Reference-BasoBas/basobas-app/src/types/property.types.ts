/**
 * Canonical property / visit-request types for the BasoBas landlord side.
 *
 * This is the ONLY place DB enum strings are allowed to appear. Screens use
 * their own display vocabularies (they diverge — listings wants
 * `active/draft/paused/archived`, the requests tab wants `pending/accepted`,
 * the visit history wants `Pending Approval/Scheduled/…`), so every screen
 * reads through a `toXxx()` mapper here instead of comparing raw enums.
 *
 * Mirrors the `toKYCStatusUi` pattern in [kyc.types.ts](./kyc.types.ts).
 */
import type { Database } from './database.types';

// ─── DB row aliases ──────────────────────────────────────────────────────────

export type PropertyRow = Database['public']['Tables']['properties']['Row'];
export type VisitRequestRow = Database['public']['Tables']['visit_requests']['Row'];
export type SavedPropertyRow = Database['public']['Tables']['saved_properties']['Row'];

// ─── DB enum mirrors ─────────────────────────────────────────────────────────

export type PropertyType = Database['public']['Enums']['property_type_enum'];
export type PropertyStatus = Database['public']['Enums']['property_status_enum'];
export type VisitStatus = Database['public']['Enums']['visit_status_enum'];
export type TimeSlot = Database['public']['Enums']['time_slot_enum'];

// ─── UI vocabularies (one per screen that needs one) ─────────────────────────

/** My Properties list — [listings.tsx](<../../app/(landlord)/(tabs)/listings.tsx>) */
export type PropertyStatusUi = 'active' | 'draft' | 'paused' | 'archived';

/** Visit Requests tabs — [requests.tsx](<../../app/(landlord)/(tabs)/requests.tsx>) */
export type RequestStatusUi = 'pending' | 'accepted';

/** Visit History pills — [visits.tsx](<../../app/(landlord)/visits.tsx>) */
export type VisitStatusLabel = 'Pending Approval' | 'Scheduled' | 'Completed' | 'Cancelled';

/**
 * Tenant-facing visit lifecycle. The DB enum has more members than the
 * tenant UI shows (DISCUSSION_ONGOING / RENTAL_FINALIZED / CLOSED are
 * landlord-side or derived), so this vocabulary is the tenant screens'
 * single source of truth — never compare raw enum values in a screen.
 */
export type TenantVisitStatusUi =
  'pending' | 'accepted' | 'rescheduled' | 'rejected' | 'cancelled' | 'completed';

/** Post-visit follow-up options — one of 4 fixed answers. */
export type FollowUpResponse =
  'interested' | 'need_more_time' | 'not_a_fit' | 'missed_visit_reschedule';

// ─── Domain models (camelCase, screen-facing) ────────────────────────────────

/** A landlord's own property, as returned by `getMyProperties`. */
export interface LandlordPropertySummary {
  id: string;
  title: string;
  /** Public location tier only. */
  locationArea: string;
  price: number;
  propertyType: PropertyType;
  /** Raw DB status — kept so callers can distinguish OCCUPIED / HIGH_DEMAND. */
  status: PropertyStatus;
  /** Collapsed status for the list UI. */
  statusUi: PropertyStatusUi;
  isDraft: boolean;
  isDeleted: boolean;
  photoUrls: string[];
  views: number;
  /** Count of non-terminal visit requests on this property. */
  requests: number;
  createdAt: string;
}

/** Full property detail — public tier. Never carries private location. */
export interface PropertyPublic {
  id: string;
  landlordId: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  price: number;
  deposit: number | null;
  status: PropertyStatus;
  furnishing: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  floor: number | null;
  totalFloors: number | null;
  amenities: string[];
  photoUrls: string[];
  availableFrom: string;
  locationArea: string;
  extraDetails: Record<string, unknown>;
  isPaused: boolean;
  views: number;
  createdAt: string;
}

/** Private location tier — only ever populated post-accept. */
export interface PropertyPrivateLocation {
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

/** Public tier + private location, from `getPropertyWithUnlockedLocation`. */
export type PropertyUnlocked = PropertyPublic & PropertyPrivateLocation;

/** A visit request joined with the bits the landlord screens display. */
export interface LandlordVisitRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  status: VisitStatus;
  statusUi: RequestStatusUi;
  statusLabel: VisitStatusLabel;
  /** ISO date (`YYYY-MM-DD`). */
  requestedDate: string;
  timeSlot: TimeSlot;
  note: string | null;
  rescheduleCount: number;
  landlordResponseNote: string | null;
  /** Tenant's note sent with a tenant-initiated reschedule proposal. */
  tenantRescheduleNote: string | null;
  /** Snapshot of the pre-reschedule date/slot — set only while RESCHEDULED. */
  previousRequestedDate: string | null;
  previousTimeSlot: TimeSlot | null;
  tenantFollowUpResponse: FollowUpResponse | null;
  tenantFollowUpNote: string | null;
  respondedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  /** Joined display fields — null when the join row is missing. */
  tenantName: string | null;
  tenantAvatarUrl: string | null;
  landlordName: string | null;
  landlordAvatarUrl: string | null;
  propertyTitle: string | null;
  propertyArea: string | null;
  propertyPrice: number | null;
  propertyPhotoUrl: string | null;
}

/**
 * A visit request as the tenant's screens see it: `LandlordVisitRequest`
 * plus the tenant UI vocabulary. Read-only displays should type against
 * this, not the raw row type. `statusUi` is redeclared with the tenant
 * vocabulary, so the base's landlord vocabulary is omitted.
 */
export type TenantVisitRequest = Omit<LandlordVisitRequest, 'statusUi'> & {
  statusUi: TenantVisitStatusUi;
  /** True when the visit is over but the tenant hasn't answered the follow-up. */
  followUpPending: boolean;
};

// ─── Mappers: DB → UI vocabulary ─────────────────────────────────────────────

/**
 * Collapse a property row into the My Properties list vocabulary.
 *
 * Soft-delete wins over draft (an archived draft reads as archived), then
 * pause, then draft, then the live status. `is_paused` is its own state and
 * wins over OCCUPIED — a paused AVAILABLE listing reads as `paused`, not
 * `paused` because of occupancy. Every other live status (AVAILABLE /
 * HIGH_DEMAND / UNDER_DISCUSSION) is `active`.
 */
export const toPropertyStatusUi = (
  status: PropertyStatus,
  isDraft: boolean,
  isPaused: boolean,
  isDeleted: boolean
): PropertyStatusUi => {
  if (isDeleted) return 'archived';
  if (isDraft) return 'draft';
  if (isPaused) return 'paused';
  return status === 'OCCUPIED' ? 'paused' : 'active';
};

/**
 * Two-state vocabulary for the Visit Requests tabs. Only PENDING reads as
 * `pending`; everything the landlord has already acted on reads as `accepted`
 * (the tab screen has no third bucket today).
 */
export const toRequestStatusUi = (status: VisitStatus): RequestStatusUi =>
  status === 'PENDING' ? 'pending' : 'accepted';

/** Human label for the Visit History pills. */
export const toVisitStatusLabel = (status: VisitStatus): VisitStatusLabel => {
  switch (status) {
    case 'PENDING':
      return 'Pending Approval';
    case 'ACCEPTED':
    case 'RESCHEDULED':
    case 'DISCUSSION_ONGOING':
      return 'Scheduled';
    case 'VISIT_COMPLETED':
    case 'RENTAL_FINALIZED':
      return 'Completed';
    case 'REJECTED':
    case 'CLOSED':
      return 'Cancelled';
    default:
      return 'Pending Approval';
  }
};

/** Statuses that still count as an open request against a property. */
export const OPEN_VISIT_STATUSES: VisitStatus[] = [
  'PENDING',
  'ACCEPTED',
  'RESCHEDULED',
  'DISCUSSION_ONGOING',
];

/** Display window for each slot enum. Matches the tenant-facing copy. */
export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  MORNING: '9:00 AM - 12:00 PM',
  AFTERNOON: '12:00 PM - 4:00 PM',
  EVENING: '4:00 PM - 7:00 PM',
};

/**
 * Bucket a clock time (as shown in the suggest-time picker) into a slot enum.
 * The DB stores coarse slots, the picker offers exact times — this is the
 * lossy step, and it lives here rather than in the screen.
 */
export const toTimeSlot = (label: string): TimeSlot => {
  const isPm = /pm/i.test(label);
  const hour = parseInt(label, 10) % 12;
  const hour24 = isPm ? hour + 12 : hour;
  if (hour24 < 12) return 'MORNING';
  return hour24 < 16 ? 'AFTERNOON' : 'EVENING';
};

/** Wizard `propertyType` label → DB enum. Studio has no enum member → FLAT. */
export const toPropertyType = (wizardValue: string): PropertyType => {
  switch (wizardValue.trim().toLowerCase()) {
    case 'apartment':
      return 'APARTMENT';
    case 'house':
      return 'HOUSE';
    case 'room':
      return 'ROOM';
    case 'office':
      return 'OFFICE';
    case 'studio': // Studio is modelled as a FLAT — no STUDIO enum member.
    case 'flat':
      return 'FLAT';
    default:
      return 'APARTMENT';
  }
};

/** Human label for a DB property type (inverse of `toPropertyType`). */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  ROOM: 'Room',
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  OFFICE: 'Office',
  FLAT: 'Flat',
};

// ─── Mappers: DB row → domain model ──────────────────────────────────────────

/** `amenities` / `extra_details` are `jsonb`, so they arrive as `Json`. */
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const toLandlordPropertySummary = (
  row: PropertyRow,
  requestCount = 0
): LandlordPropertySummary => ({
  id: row.id,
  title: row.title,
  locationArea: row.location_area,
  price: row.price,
  propertyType: row.property_type,
  status: row.status,
  statusUi: toPropertyStatusUi(row.status, row.is_draft, row.is_paused, row.is_deleted),
  isDraft: row.is_draft,
  isDeleted: row.is_deleted,
  photoUrls: row.photo_urls,
  views: row.views,
  requests: requestCount,
  createdAt: row.created_at,
});

/**
 * Map a property row to the public tier. Deliberately does NOT read
 * `location_address` / `location_lat` / `location_lng` — see Part F of the
 * plan: the private tier is only ever exposed via `toPropertyUnlocked`.
 */
export const toPropertyPublic = (row: PropertyRow): PropertyPublic => ({
  id: row.id,
  landlordId: row.landlord_id,
  title: row.title,
  description: row.description,
  propertyType: row.property_type,
  price: row.price,
  deposit: row.deposit,
  status: row.status,
  furnishing: row.furnishing,
  bedrooms: row.bedrooms,
  bathrooms: row.bathrooms,
  areaSqft: row.area_sqft,
  floor: row.floor,
  totalFloors: row.total_floors,
  amenities: asStringArray(row.amenities),
  photoUrls: row.photo_urls,
  availableFrom: row.available_from,
  locationArea: row.location_area,
  extraDetails: asRecord(row.extra_details),
  isPaused: row.is_paused,
  views: row.views,
  createdAt: row.created_at,
});

/** Public tier + the private location columns. Post-accept / share only. */
export const toPropertyUnlocked = (row: PropertyRow): PropertyUnlocked => ({
  ...toPropertyPublic(row),
  locationAddress: row.location_address,
  locationLat: row.location_lat,
  locationLng: row.location_lng,
});

/** Shape of the joined columns `visits.service` selects alongside a request. */
export interface VisitRequestJoins {
  tenant?: { full_name: string | null; avatar_url: string | null } | null;
  landlord?: { full_name: string | null; avatar_url: string | null } | null;
  property?: { title: string; location_area: string; price: number; photo_urls: string[] } | null;
}

export const toLandlordVisitRequest = (
  row: VisitRequestRow & VisitRequestJoins
): LandlordVisitRequest => ({
  id: row.id,
  propertyId: row.property_id,
  tenantId: row.tenant_id,
  landlordId: row.landlord_id,
  status: row.status,
  statusUi: toRequestStatusUi(row.status),
  statusLabel: toVisitStatusLabel(row.status),
  requestedDate: row.requested_date,
  timeSlot: row.time_slot,
  note: row.note,
  rescheduleCount: row.reschedule_count,
  landlordResponseNote: row.landlord_response_note,
  tenantRescheduleNote: row.tenant_reschedule_note,
  previousRequestedDate: row.previous_requested_date,
  previousTimeSlot: row.previous_time_slot,
  tenantFollowUpResponse: row.tenant_follow_up_response as FollowUpResponse | null,
  tenantFollowUpNote: row.tenant_follow_up_note,
  respondedAt: row.responded_at,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  tenantName: row.tenant?.full_name ?? null,
  tenantAvatarUrl: row.tenant?.avatar_url ?? null,
  landlordName: row.landlord?.full_name ?? null,
  landlordAvatarUrl: row.landlord?.avatar_url ?? null,
  propertyTitle: row.property?.title ?? null,
  propertyArea: row.property?.location_area ?? null,
  propertyPrice: row.property?.price ?? null,
  propertyPhotoUrl: row.property?.photo_urls?.[0] ?? null,
});

const isPastDate = (isoDate: string, now: Date): boolean => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
};

/**
 * DB visit status → tenant UI vocabulary.
 *
 * `completed` is derived, not stored: an ACCEPTED (or DISCUSSION_ONGOING)
 * visit whose requested date has passed reads as completed for the tenant.
 * There is no scheduled job for this transition yet (no cron/edge-function
 * pattern exists in the repo), so it's computed lazily on read with `now`
 * injected for testability.
 */
export const toTenantVisitStatusUi = (
  status: VisitStatus,
  requestedDate: string,
  now: Date = new Date()
): TenantVisitStatusUi => {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'ACCEPTED':
    case 'DISCUSSION_ONGOING':
      return isPastDate(requestedDate, now) ? 'completed' : 'accepted';
    case 'RESCHEDULED':
      return 'rescheduled';
    case 'REJECTED':
      return 'rejected';
    case 'VISIT_COMPLETED':
    case 'RENTAL_FINALIZED':
      return 'completed';
    case 'CANCELLED_BY_TENANT':
    case 'CLOSED':
      return 'cancelled';
    default:
      return 'cancelled';
  }
};

export const toTenantVisitRequest = (
  row: VisitRequestRow & VisitRequestJoins,
  now: Date = new Date()
): TenantVisitRequest => {
  const base = toLandlordVisitRequest(row);
  const statusUi = toTenantVisitStatusUi(base.status, base.requestedDate, now);
  return {
    ...base,
    statusUi,
    followUpPending: statusUi === 'completed' && base.tenantFollowUpResponse == null,
  };
};

/** Human copy for each follow-up option — matches the tenant follow-up screen. */
export const FOLLOW_UP_RESPONSE_LABELS: Record<FollowUpResponse, string> = {
  interested: "Interested — I'd like to move forward",
  need_more_time: 'I need a bit more time to decide',
  not_a_fit: 'Not the right fit for me',
  missed_visit_reschedule: "I wasn't able to make it — can we reschedule?",
};

// ─── Display formatters ──────────────────────────────────────────────────────

const PRICE_FORMATTER = new Intl.NumberFormat('en-IN');

/** `28000` → `"NPR 28,000/mo"` — matches the existing listings copy. */
export const formatMonthlyPrice = (price: number): string =>
  `NPR ${PRICE_FORMATTER.format(price)}/mo`;

/** ISO `YYYY-MM-DD` → `"June 15, 2026"`. */
export const formatVisitDate = (isoDate: string): string => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

/**
 * Parse a user-entered date label ("Aug 5, 2026", "5 Aug 2026" or ISO
 * "2026-08-05") into a Date, or null when it is empty / not a real date.
 *
 * Hermes (React Native) only parses ISO 8601 natively, so month-name
 * labels like "Aug 5, 2026" would otherwise be Invalid Date. They are
 * parsed manually and strictly validated (known month, day range,
 * rollovers like Feb 30 rejected) so every JS engine behaves the same.
 */
export const parseDateLabel = (label: string): Date | null => {
  const text = label.trim();
  if (!text) return null;

  const monthFirst = /^([A-Za-z]{3,9})[ ,]+(\d{1,2}),?[ ,]+(\d{4})$/.exec(text);
  const dayFirst = /^(\d{1,2})[ ,]+([A-Za-z]{3,9}),?[ ,]+(\d{4})$/.exec(text);
  const match = monthFirst ?? dayFirst;
  if (match) {
    const isMonthFirst = monthFirst !== null;
    const month = MONTH_INDEX[(isMonthFirst ? match[1] : match[2]).toLowerCase()];
    const day = Number(isMonthFirst ? match[2] : match[1]);
    const year = Number(match[3]);
    if (month === undefined || day < 1 || day > 31 || year < 1900 || year > 2200) {
      return null;
    }
    const date = new Date(year, month, day);
    // Reject rollovers like Feb 30 by comparing the components back.
    return date.getMonth() === month && date.getDate() === day ? date : null;
  }

  const native = new Date(text);
  return Number.isNaN(native.getTime()) ? null : native;
};

/**
 * Parse the wizard's `availableFrom` display string (`"Jul 1, 2026"`) into an
 * ISO date for the `available_from DATE NOT NULL` column. Falls back to today
 * so publish never fails on an unparseable label.
 */
export const parseAvailableFrom = (label: string | undefined): string => {
  const date = label ? parseDateLabel(label) : null;
  const d = date ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // Built from local components so the day never shifts via UTC conversion.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Wizard money strings arrive comma-formatted (`"28,000"`). */
export const parseMoney = (value: string | undefined): number => {
  const digits = (value ?? '').replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

/** Optional integer field from a wizard param. */
export const parseOptionalInt = (value: string | undefined): number | null => {
  const digits = (value ?? '').replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : null;
};
