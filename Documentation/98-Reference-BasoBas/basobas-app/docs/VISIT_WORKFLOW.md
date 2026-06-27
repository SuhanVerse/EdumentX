# BasoBas — Visit Request Workflow
## The Core Feature · Read This Before Touching Anything Visit-Related

---

## Why This Is the Core Feature

The visit request workflow is the primary value driver of BasoBas.
It replaces unstructured phone calls with a structured,
trackable, privacy-preserving system where both parties
are accountable at every step.

Every state transition has consequences:
- Notifications are sent
- Property statuses may change
- Location access may be granted or revoked
- Other requests may be affected

---

## The Complete Status Lifecycle

```
PENDING
  ↓ landlord accepts        → ACCEPTED
  ↓ landlord reschedules    → RESCHEDULED
  ↓ landlord rejects        → REJECTED
  ↓ tenant cancels          → CLOSED
  ↓ property occupied       → CLOSED

ACCEPTED
  ↓ landlord reschedules    → RESCHEDULED  (rare re-schedule)
  ↓ tenant cancels          → CLOSED
  ↓ 2h after visit time     → VISIT_COMPLETED  (auto, system)

RESCHEDULED
  ↓ tenant accepts          → ACCEPTED
  ↓ tenant declines         → CLOSED

REJECTED                    → [terminal — no further transitions]

VISIT_COMPLETED
  ↓ tenant: "Interested"    → DISCUSSION_ONGOING
  ↓ landlord: "Discussion"  → DISCUSSION_ONGOING
  ↓ tenant: "Not Interested"→ CLOSED
  ↓ tenant: "Need Another"  → CLOSED + new PENDING created
  ↓ either: no response     → CLOSED (after 5 days)

DISCUSSION_ONGOING
  ↓ landlord: "Finalized"   → RENTAL_FINALIZED
  ↓ discussion failed       → CLOSED

RENTAL_FINALIZED            → [terminal — no further transitions]

CLOSED                      → [terminal — no further transitions]
```

---

## Status Definitions

| Status | What It Means | Who Set It |
|--------|--------------|------------|
| PENDING | Request submitted, awaiting landlord | Tenant action |
| ACCEPTED | Landlord approved, location unlocked | Landlord action |
| RESCHEDULED | Landlord proposed new time, awaiting tenant | Landlord action |
| REJECTED | Landlord declined | Landlord action |
| VISIT_COMPLETED | Visit time passed, awaiting follow-up | System (auto) |
| DISCUSSION_ONGOING | Interest confirmed, negotiating | Either party |
| RENTAL_FINALIZED | Rental confirmed with this tenant | Landlord action |
| CLOSED | Request ended without finalization | System or either party |

---

## Status Badge Colors

```
PENDING:            Amber outline pill        ⏳ Pending
ACCEPTED:           Solid green pill          ✓ Accepted
RESCHEDULED:        Blue outline pill         ↻ Rescheduled
REJECTED:           Red fill pill             ✕ Rejected
VISIT_COMPLETED:    Gray fill pill            ✓ Visited
DISCUSSION_ONGOING: Blue fill pill            💬 Discussion
RENTAL_FINALIZED:   Solid green fill pill     🏠 Finalized
CLOSED:             Gray fill pill            — Closed
```

---

## Side Effects Per Status Transition

Every transition must trigger ALL of these side effects.
None can be skipped.

### PENDING → ACCEPTED

```
Actions:
  ✓ Set visit.location_unlocked = true
  ✓ Send push to tenant: "Your visit has been accepted!"
  ✓ Show landlord's phone number IF landlord opted to share
  ✓ Update tenant's visit detail: show address + map pin
  ✓ Recalculate property.active_visit_count
```

### PENDING → RESCHEDULED

```
Actions:
  ✓ Save rescheduled_date and rescheduled_slot to request
  ✓ Increment reschedule_count
  ✓ Send push to tenant with new proposed date/time
  ✓ Tenant sees Accept / Decline buttons on visit detail
```

### PENDING → REJECTED

```
Actions:
  ✓ Save rejection_message (if landlord provided one)
  ✓ Send push to tenant: "Your visit request was not accepted"
  ✓ Move visit to tenant's Archived tab
  ✓ Recalculate property.active_visit_count
  ✓ Recalculate property.status (may return to AVAILABLE)
```

### RESCHEDULED → ACCEPTED (tenant accepts new time)

```
Actions:
  ✓ Update preferred_date and preferred_slot to rescheduled values
  ✓ Set visit.location_unlocked = true
  ✓ Send push to tenant: location now accessible
  ✓ Same as PENDING → ACCEPTED from here
```

### RESCHEDULED → CLOSED (tenant declines)

```
Actions:
  ✓ Set close_reason = "tenant_declined_reschedule"
  ✓ Recalculate property.active_visit_count
  ✓ Recalculate property.status
```

### ACCEPTED → VISIT_COMPLETED (system auto-trigger)

```
Trigger: 2 hours after preferred_datetime passes

Actions:
  ✓ Set status = VISIT_COMPLETED
  ✓ Send push to tenant: "How did your visit go?"
  ✓ Send push to landlord: "Did [Tenant] visit your property?"
  ✓ Schedule 48-hour reminder job (if no response)
  ✓ Schedule 5-day auto-archive job
```

### VISIT_COMPLETED → DISCUSSION_ONGOING

```
Trigger: Either "Interested" (tenant) OR "Discussion Ongoing" (landlord)

Actions:
  ✓ Set status = DISCUSSION_ONGOING
  ✓ Set property.status = UNDER_DISCUSSION
  ✓ Send push to both parties
```

### DISCUSSION_ONGOING → RENTAL_FINALIZED

```
Trigger: Landlord selects "Rental Finalized"
This is the most consequential transition in the entire app.

Actions:
  ✓ Set status = RENTAL_FINALIZED
  ✓ Set property.status = OCCUPIED (IMMEDIATE)
  ✓ Set property.linked_occupant_id = tenant_id
  ✓ Send push to selected tenant: "Congratulations! Rental finalized."
  ✓ Find ALL other PENDING/ACCEPTED/RESCHEDULED visits
    for this property
  ✓ Set ALL of them to CLOSED
  ✓ Set close_reason = "property_occupied" on all
  ✓ Send push to all affected tenants:
    "This property is no longer available."
  ✓ Show confirmation dialog to landlord before executing
```

### ANY → CLOSED (property occupied)

```
Trigger: Property becomes OCCUPIED while this visit is active

Actions:
  ✓ Set status = CLOSED
  ✓ Set close_reason = "property_occupied"
  ✓ Send push to tenant: "This property is no longer available."
```

---

## Complete Tenant Flow Step-by-Step

### 1. Property Discovery

```
Tenant browses listings via Home / Map / Search.
All property statuses visible publicly.
All statuses requestable EXCEPT OCCUPIED.
OCCUPIED properties: browsable, CTA disabled.
```

### 2. Request Creation

```
Tenant taps "Request Visit" on Property Detail Screen.

DUPLICATE CHECK:
  IF tenant already has active (non-CLOSED, non-REJECTED)
  request for this property:
    Show: "You already have an active request for this property."
    CTA: "View your request →"
    Do NOT open schedule sheet.

  IF no active request (or previous is CLOSED/REJECTED):
    Open Schedule Visit Bottom Sheet

Bottom sheet inputs:
  Preferred date     → calendar, min: tomorrow, max: 30 days
  Preferred slot     → Morning / Afternoon / Evening
  Message            → optional, max 200 characters

On "Confirm Request":
  Status → PENDING (immediate)
  Landlord receives push notification
  Tenant navigates to Visit Detail Screen
  "Request Visit" button → "Visit Requested ✓" (disabled)
```

### 3. Awaiting Response

```
Status badge: ⏳ Pending (amber)
Available action: "Cancel Request" ghost button

Cancellation:
  Confirmation dialog: "Cancel this visit request?"
  On confirm: Status → CLOSED, reason: tenant_cancelled
```

### 4a. Accepted Path

```
Status → ✓ Accepted (green)
Push to tenant: "Your visit has been accepted!"

Visit Detail Screen unlocks:
  Exact address text revealed
  Map with sharp exact pin shown
  "Get Directions →" button appears (opens native maps)
  Landlord phone number (if landlord opted to share)

Tenant can still cancel after acceptance:
  Status → CLOSED, reason: tenant_cancelled
```

### 4b. Rescheduled Path

```
Status → ↻ Rescheduled (blue)
Push to tenant with new proposed date/time

Visit Detail shows:
  Original requested time (crossed out or labeled "Original")
  New proposed time (highlighted)
  Two action buttons:
    "Accept New Schedule" → returns to ACCEPTED path
    "Cancel Request"      → CLOSED

Reschedule limit: maximum 3 reschedules per visit.
After 3rd: auto-CLOSED with reason: max_reschedules_reached
```

### 4c. Rejected Path

```
Status → ✕ Rejected (red)
Push to tenant: "Your visit request was not accepted."
Rejection message shown (if landlord provided one)
Visit moves to Archived tab
Tenant can browse other listings and create new requests
```

### 5. Visit Day

```
Tenant uses unlocked address and map navigation.
Physical visit happens entirely offline.
No in-app tracking, no live check-in feature.
```

### 6. Post-Visit Follow-Up

```
Trigger: 2 hours after preferred_datetime

Push: "How did your visit go?"

Four response options on Post-Visit Follow-Up Screen:

"😊 Interested"
  → DISCUSSION_ONGOING
  → Property → UNDER_DISCUSSION
  → Push to landlord

"😐 Not Interested"
  → CLOSED
  → Visit archived

"👀 Need Another Visit"
  → Current visit: CLOSED
  → New PENDING request auto-created for same property
  → Tenant must select new date and time slot

"❓ Visit Did Not Happen"
  → System flags for landlord confirmation
  → If landlord confirms "Did Not Visit": CLOSED
  → If landlord disputes: support escalation
```

---

## Complete Landlord Flow Step-by-Step

### 1. Receive Request

```
Push notification arrives immediately.
Request appears in Visit Requests → New tab.

Request card shows:
  Tenant avatar + full name
  Which property (multi-property landlords need this)
  Requested date + time slot
  Message from tenant (if any)
```

### 2. Take Action on Request

```
ACCEPT:
  Tapping shows inline confirmation: "Confirm acceptance?"
  On confirm:
    Status → ACCEPTED
    Location unlocked for this tenant
    Optional toggle: "Share my phone number with this tenant"
    Push to tenant

RESCHEDULE:
  Reschedule Screen opens
  Landlord picks new date + time slot
  CTA: "Send New Schedule →"
    Status → RESCHEDULED
    Push to tenant with new time

REJECT:
  Optional text field: reason (max 100 characters)
  CTA: "Confirm Rejection"
    Status → REJECTED
    Push to tenant
```

### 3. Post-Visit Follow-Up

```
Push: "Did [Tenant Name] visit your property?"

Four responses on Landlord Follow-Up Screen:

"Tenant Visited"
  → Confirms visit happened
  → System awaits tenant's response
  → If tenant already responded: proceed to that status

"Tenant Did Not Visit"
  → CLOSED
  → reason: tenant_did_not_visit

"Rental Discussion Ongoing"
  → DISCUSSION_ONGOING immediately
  → Even if tenant has not yet responded
  → Push to tenant

"Rental Finalized"
  → Confirmation dialog shown first
  → RENTAL_FINALIZED
  → All side effects execute (see above)
```

### 4. Managing Multiple Applicants

```
Multiple tenants can have active requests simultaneously.
Each is managed independently via the Request tab.
"All Applicants" screen shows all in one list per property.

Until RENTAL_FINALIZED:
  All applicants see the property as still active
  Property shows HIGH_DEMAND or UNDER_DISCUSSION
  Property NOT shown as OCCUPIED yet

On RENTAL_FINALIZED:
  ALL other active requests auto-close
  All other tenants notified: "No longer available"
  Property immediately shows OCCUPIED
```

---

## Automated System Behaviors

### Follow-Up Trigger (2 hours after visit)

```
Condition: ACCEPTED visit + preferred_datetime + 2 hours has passed
Action:
  Set status = VISIT_COMPLETED
  Push to tenant: "How did your visit go?"
  Push to landlord: "Did [Tenant] visit your property?"
  Start 48-hour reminder countdown
  Start 5-day auto-archive countdown
```

### 48-Hour Reminder

```
Condition: VISIT_COMPLETED + 48 hours + at least one party has not responded
Action:
  Push reminder to non-responding party only
  Message varies by role
```

### 5-Day Auto-Archive

```
Condition: VISIT_COMPLETED + 5 days + neither party has responded
Action:
  Status → CLOSED
  Reason: auto_archived_no_response
  No notification sent (silent archive)
```

### High Demand Auto-Flag

```
Condition: property.active_visit_count reaches 3
           AND property.status is currently AVAILABLE
Action:
  property.status → HIGH_DEMAND
```

### Status Recalculation

```
Trigger: Any visit closes or is rejected for a property

Action: Recalculate property status:
  If active_visit_count >= 3:  HIGH_DEMAND
  If any visit is DISCUSSION_ONGOING: UNDER_DISCUSSION
  If rental finalized: OCCUPIED (set directly, not recalculated)
  Otherwise: AVAILABLE
```

---

## Data Visible to Each Party Per Status

| Status | Tenant Sees | Landlord Sees |
|--------|------------|---------------|
| PENDING | Request submitted, cancel option | New request + tenant details |
| ACCEPTED | Exact address + map + optional phone | Confirmed visit on calendar |
| RESCHEDULED | New proposed time + Accept/Decline | Awaiting tenant response |
| REJECTED | Rejection message if any | Archived request |
| VISIT_COMPLETED | Follow-up prompt | Follow-up prompt |
| DISCUSSION_ONGOING | Landlord considering | Tenant is interested |
| RENTAL_FINALIZED | Congratulations + property linked | Rental confirmed |
| CLOSED | Reason for closure | Archived |

---

## Location Unlock Rules

```
Location access for a specific tenant is:
  GRANTED when:  visit.location_unlocked = true
                 AND visit.status = ACCEPTED (or beyond)
                 AND requesting user = tenant on this visit

  REVOKED when:  visit moves to CLOSED or REJECTED
                 (location data no longer served)

  NEVER shared: with any other tenant
                with any user who is not the visit's tenant
                via the public property endpoint
```

---

## Request Limits & Constraints

```
Duplicate requests:
  Max 1 active request per tenant per property at any time.
  "Active" = any status that is not CLOSED or REJECTED.

Re-requesting:
  Allowed after CLOSED or REJECTED.
  New request = fresh start, previous request data kept.

Reschedule limit:
  Maximum 3 reschedules per single visit request.
  After 3rd: auto-CLOSED, reason: max_reschedules_reached.

Rejection constraint:
  Landlord CANNOT reject a DISCUSSION_ONGOING visit.
  Must use explicit "close discussion" action instead.

Single finalization:
  System enforces only ONE RENTAL_FINALIZED per property.
  Cannot finalize two visits for the same property.

Free tier request cap:
  Tenants on free plan: max 3 simultaneously active requests.
  Pro tenants: unlimited active requests.
```
