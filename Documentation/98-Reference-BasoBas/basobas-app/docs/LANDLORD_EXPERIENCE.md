# BasoBas — Landlord Experience
## Everything the Landlord Sees and Does

---

## Landlord Bottom Navigation Dock

Same floating frosted glass dark pill design as tenant dock.
Different tabs because landlord has different core actions.

```
4 tabs in this exact order:
  🏘 Listing   →  My properties (landlord home)
  📬 Request   →  All incoming visit requests
  🔔 Alerts    →  All notifications
  👤 Profile   →  Landlord profile and settings
```

Active indicator: small white pill between icon and label.
Red badge dot on Alerts tab when unread notifications exist.
Red badge dot on Request tab when new unactioned requests exist.

---

## Landlord Home = My Listings (Listing Tab)

The landlord's home screen is their property management
dashboard — not a discovery feed like tenants see.

### Header

```
Left:   Avatar (40px) + "Good morning, [Name]"
Right:  Notification bell with red badge
```

### Quick Stats Row (3 cards)

```
Card 1 — Active Listings:
  Dark black background
  Large number + "Active Listings" label
  🏘 icon faint in corner

Card 2 — New Requests:
  Amber background
  Large number + "New Requests" label
  📬 icon faint in corner

Card 3 — Avg Rating:
  Green tint background
  "★ X.X" + "Your Rating" label
  ★ icon faint in corner
```

### Requests Alert Card

Only shown when pending requests exist.

```
Amber tinted card
"X visit requests waiting"
"Y new since yesterday"
"Review →" link on right
```

### My Properties List

```
Each property shows:
  Photo thumbnail
  Property name
  Location (area only)
  Status chip
  Request count chip ("8 requests")
  → chevron to enter full management

Tap property → Property Detail Screen (landlord edit view)
```

### Quick Actions Row

```
[Add New Listing]     → black button → Step 1 of Add Listing
[All Requests]        → gray button → Visit Requests Screen
```

### Recent Activity Feed

```
3 activity rows showing:
  Colored dot (green/blue/amber by type)
  Activity description
  Property name + time ago
  Status badge (Pending / Accepted etc.)
```

---

## My Properties Screen (Full Management)

Reached from: Dashboard "Manage all →" or Listing dock tab directly.

### Filter Tab Bar

```
Horizontal scroll chips (sticky below header):
  [All (3)]  [Available]  [High Demand]  [Discussion]  [Occupied]

Active chip: black background, white text
Inactive:    light gray background, gray text

Selecting filters the property list below.
```

### Sort Options

```
Sort bar shows: "3 properties" count + "Sort: Newest ▾"
Sort options: Newest · Oldest · Most Requests · Status
```

### Property Management Cards

Each card is a full-width rich card with:

```
TOP — Image area (160px):
  Full-bleed photo placeholder
  Bottom gradient overlay (dark, for text legibility)
  Overlaid bottom-left: property name + location
  Overlaid top-left: status chip
  Overlaid top-right: ⋯ options button (opens context menu)

BOTTOM — Info + Actions area:
  Stats chips row:
    👁 [X] views
    📋 [X] requests
    💰 NPR [X]k/mo
    📅 Available [date]

  Action buttons row (3 buttons):
    "Requests"  →  black, goes to request list for this property
    "Edit"      →  gray, goes to Edit Listing flow
    ⋯           →  gray square, opens: Mark Occupied / Delete
```

### Add New Listing Prompt (Bottom of List)

```
Dashed border card
"➕ Add a new property"
"Reach thousands of tenants"
Tapping → Add Listing Step 1
```

---

## Add New Listing Flow (4 Steps)

A guided 4-step flow with a segmented progress bar at top.
No dock on any of these screens — full focus.
Back arrow + "Save Draft" button in header on all steps.

### Shared Header

```
Back arrow   |   "New Listing"   |   "Save Draft"

Progress bar (below header, full width, 4 segments):
  Screen 23 — Step 1: █░░░  (25% — segment 1 filled)
  Screen 24 — Step 2: ██░░  (50%)
  Screen 25 — Step 3: ███░  (75%)
  Screen 26 — Step 4: ████  (100%)

Shared bottom bar (fixed):
  Back button (gray, screens 24–26 only)
  Primary CTA button (black pill, full/remaining width)
```

---

### Step 1 — Basic Info (Screen 23)

```
Eyebrow: "STEP 1 · BASIC INFORMATION"
Headline: "Tell us about your property"

Fields:
  Property type (required):
    Grid of 5 chips: Room · Apartment · House · Office · Flat
    Selected chip: black background, white text

  Listing title (required, max 60 chars):
    Text input with character counter "26 / 60"

  Description (required, max 500 chars):
    Textarea with character counter "128 / 500"

  Available from (required):
    Calendar date picker — minimum today

  Negotiable toggle:
    "Rent is negotiable"
    "Tenants can discuss the final amount"
    Toggle on right (ON = black, OFF = gray)

CTA: "Continue to Details →"
```

---

### Step 2 — Property Details (Screen 24)

```
Eyebrow: "STEP 2 · PROPERTY DETAILS"
Headline: "Rooms, rent & facilities"

Fields:
  Monthly rent (required):
    Large numeric input with "NPR" prefix
    Divider between prefix and number
    Value shown large (20px font)

  Room configuration (card with 3 rows):
    Bedrooms:  stepper (− count +)
    Bathrooms: stepper (− count +)
    Floor:     stepper (− count +)
    − button: gray circle
    + button: black circle

  Area (optional):
    Numeric input with "sqft" suffix

  Facilities (required, multi-select):
    Wrap chip grid, gap 8px
    12 facility chips:
      Water · Electricity · WiFi · Parking · Furnished
      Gas · CCTV · Lift · Balcony · Rooftop · Solar · Bike
    Selected: green tint background, green border
    Unselected: white background, gray border

CTA: "Continue to Photos →"
```

---

### Step 3 — Photos Upload (Screen 25)

```
Eyebrow: "STEP 3 · PROPERTY PHOTOS"
Headline: "Show your property's best"

Cover photo zone (full width, 200px tall):
  EMPTY state: dashed border, upload icon, "Add cover photo"
  FILLED state: solid black border, photo preview
                "Cover" badge top-left
                "Remove" × button top-right
                "Main photo · Tenants see this first" bottom overlay

Photo count: "4 / 10 photos added"  ·  "Min 1 required"

Additional photos grid (3 columns):
  Filled cells: photo thumbnail + × remove button
  Add more cell: dashed border + ➕ icon
  Empty slots:  very faint dashed border

Tips card:
  💡 "Photo tips"
  "Shoot in daylight for best results"
  "Include all rooms: bedroom, kitchen, bathroom"
  "Show the view from windows if possible"

File requirements: "JPEG or PNG  ·  Min 800×600px  ·  Max 10MB each"

CTA: "Continue to Location →"
```

---

### Step 4 — Location + Preview (Screen 26)

```
Eyebrow: "STEP 4 · LOCATION & REVIEW"
Headline: "Pin your location"

Map area (200px, full width):
  Interactive map with draggable pin
  "Drag to adjust" hint on pin
  🎯 Locate Me button (top right of map)
  Map shows approximate street grid (no satellite)

Privacy note: "🔒 Exact address only shared with approved tenants."

Locality name field (required):
  Label: "Locality name *"
  Sub: "This is shown publicly to all tenants"
  Auto-detected from pin position (editable)
  Example: "Pulchowk, Lalitpur"

Full address field (required):
  Label: "Full address *"
  Sub: "🔒 Kept private — only shared after visit approval"
  Auto-filled from pin (editable)
  Example: "123 Naya Bato, Near Engineering College"

Listing preview card:
  Label: "PREVIEW — How tenants will see your listing"
  Full mini property card showing:
    Photo, status chip, name, location, specs, price, verified badge

CTA: "Publish Listing →"
Below CTA: "Your listing goes live immediately after publishing."

PUBLISH GATE:
  If landlord is not yet VERIFIED:
    Cannot tap Publish
    Banner: "Complete identity verification to publish"
    "Verify Identity →" link shown
    Can still "Save Draft"
```

---

## Visit Requests Screen

All incoming visit requests from tenants.

```
Header: "Visit Requests"

Four tabs (with unread counts in brackets):
  [New (3)]     PENDING requests, newest first
  [Upcoming]    ACCEPTED requests sorted by visit date
  [Follow-Up]   VISIT_COMPLETED needing landlord response
  [Finalized]   RENTAL_FINALIZED completed rentals
```

### Request Card (New Tab)

```
Tenant avatar (56px)
Tenant full name
Property thumbnail + property name
Requested date + time slot
Message preview (if any)

Action buttons:
  "Accept"     → green, confirms acceptance
  "Reschedule" → blue outline, opens Reschedule Screen
  "Reject"     → red outline, optional message input

Accept: taps show inline confirmation before executing
```

---

## Request Detail Screen

Full detail view of a single visit request.

```
Property thumbnail + name + locality
Tenant profile card: avatar + name + rating if reviewed before
Requested date + time + optional message
Current status badge

Action area varies by status:

  PENDING:
    [Accept]  [Reschedule]  [Reject]

  ACCEPTED (upcoming visit):
    "View Tenant Details" only
    Visit date countdown shown

  VISIT_COMPLETED (follow-up needed):
    [Tenant Visited]
    [Tenant Did Not Visit]
    [Rental Discussion Ongoing]
    [Rental Finalized]
```

---

## Reschedule Screen

Reached from: Request Detail → Reschedule.

```
Shows original requested date/time from tenant
Landlord picks:
  New date (calendar picker)
  New time slot (Morning / Afternoon / Evening chips)

CTA: "Send New Schedule →"
Note: "Tenant will be notified and must accept the new time."
```

---

## All Applicants Screen

Reached from: Property card → "View All Applicants".
Shows every tenant with an active visit request
for one specific property.

```
Property summary at top

Applicant list (sorted by request date):
  Each row:
    Tenant avatar + name
    Request status badge
    Visit date
    "Requests" seen count
    "Mark as Finalized" CTA (shown for DISCUSSION_ONGOING only)

Note at top:
  "Finalizing with one tenant closes all other requests."
```

---

## Landlord Follow-Up Screen

Reached when landlord taps a notification after visit time passes.

```
Property card summary
Tenant name + visit date that passed

4 response options (full-width buttons):

  "Tenant Visited"
    → Confirms visit happened
    → Awaits tenant's follow-up response

  "Tenant Did Not Visit"
    → Status: CLOSED
    → Visit archived as no-show

  "Rental Discussion Ongoing"
    → Status: DISCUSSION_ONGOING
    → Push to tenant

  "Rental Finalized"
    → Status: RENTAL_FINALIZED
    → Property → OCCUPIED immediately
    → All other requests for this property → CLOSED
    → Confirmation dialog shown before executing
```

---

## Landlord Profile Screen

```
Header: "Profile" + Settings gear button

Profile hero card:
  Avatar (72px) with edit pencil badge
  Full name
  Verification badge: "Identity Verified ✓" (if VERIFIED)
  Stats: [X Listings] [★ X.X Rating] [X Reviews]

Tabs: [My Listings]  [Reviews]

My Listings tab:
  2-column grid of property cards (mini management cards)
  "+ Add New Listing" dashed card at end

Reviews tab:
  Rating summary + star breakdown
  All review cards

Identity Verification card (if not VERIFIED):
  Shows current status
  CTA to complete verification

Menu sections:
  Account:   Edit Profile · Verification Status · Visit History · Bank Details
  Preferences: AI Preferences · Notifications
  Support:   Help & FAQ · Report an Issue
  Legal:     Terms · Privacy
  Log Out
```

---

## Landlord Notification Screen

Same layout as tenant notification screen.
Color coding is the same.

```
Key notification types for landlords:
  🟢 New visit request received
  🟢 Tenant marked interested
  🟢 KYC verification approved
  🟡 Tenant requested reschedule
  🔵 Discussion status updates
  🔴 KYC verification rejected
  ⚪ Listing views milestone
```
