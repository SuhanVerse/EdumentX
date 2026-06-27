# BasoBas — Tenant Experience
## Everything the Tenant Sees and Does

---

## Tenant Bottom Navigation Dock

The dock is a floating frosted glass dark pill.
It does not span the full screen width.
It floats 28px above the bottom edge of the screen.

```
4 tabs in this exact order:
  🏠 Home     →  Property feed, recommendations, search
  🔍 Search   →  Full search with filters and results
  📋 Visits   →  All visit requests tenant has made
  👤 Profile  →  Tenant profile, settings, Pro upgrade
```

Active tab: small white pill between icon and label.
Notification badge: red dot on bell when unread exist.
Dock glass effect: rgba(18,18,18,0.72) with 24px backdrop blur.

---

## Home Screen

The central discovery hub for tenants.
Everything a tenant needs to find a property starts here.

### Header (Fixed, Always Visible)

```
Left:   Avatar (40px) + "Good morning, [Name]"
        Below name: 📍 [City] ▾  (tappable city dropdown)
Right:  Notification bell with red unread badge
```

### Search Bar

```
Full-width pill input
Placeholder: "Search by area, locality, price..."
Trailing icon: filter (opens Filter Bottom Sheet)
Tapping input: navigates to Search Result Screen with focus
```

### Category Chips (Horizontal Scroll)

```
[All]  [Room]  [Apartment]  [House]  [Office]  [Flat]

Active:   black background, white text
Inactive: light gray background, gray text

Selecting a chip filters all content sections below.
```

### Content Sections (Top to Bottom)

```
Section 1: "✨ Recommended for You"
  Label: "AI Pick · Based on your preferences"
  Horizontal scroll of 5–8 personalized property cards
  [PRO] Full personalization locked behind Pro plan
  Free users: first card visible, others blurred with 🔒 PRO

Section 2: "Nearby Rentals"
  "Nearby Rentals" heading + "View all →" link
  Vertical list of 3 full property cards

Section 3: "Trending This Week"
  Horizontal scroll of 4–6 compact cards
  "🔥 Trending" badge on section

Section 4: "Explore on Map"
  Full-width tappable map preview card (160px height)
  Text overlay: "Explore 48 properties near you →"
  Tap → opens Map Screen
```

---

## Search Result Screen

Reached from: Search bar tap on Home, or "View all →" links.

```
Header:
  Back arrow
  Search bar (pre-filled with query, editable)
  "Map" toggle (switches to Map Screen with same filters)

Filter bar (sticky):
  Active filter chips with × dismiss button
  "Filters" button → opens Filter Bottom Sheet

Sort bar:
  "Sort: Relevance ▾"
  Result count: "48 properties"

Results: vertical scroll, infinite load, skeleton loading

Empty state:
  Illustration + "No properties found."
  "Try adjusting your filters."
  "Clear Filters" button
```

### Filter Options

```
Property type:     Room / Apartment / House / Office / Flat
Price range:       Dual-handle slider (NPR 0 – 100,000)
Bedrooms minimum:  1 / 2 / 3 / 4+
Bathrooms minimum: 1 / 2 / 3+
Facilities:        Multi-select grid
Verified only:     Toggle (shows only verified landlords)
```

### Sort Options

```
Relevance (default)
Price: Low to High
Price: High to Low
Newest First
Highest Rated
```

---

## Map Screen

Full-screen geographical property discovery.

```
Map style:     Minimal light theme (road names, no clutter)
Map pins:      Colored by property status
               AVAILABLE:        green (#1A6B4A)
               HIGH DEMAND:      amber (#F5A623)
               UNDER DISCUSSION: blue (#3B82F6)
               OCCUPIED:         gray (#9CA3AF, dimmed)
Pin label:     Price displayed ("NPR 12k")
Clustering:    3+ pins within 80px → cluster bubble with count
```

### Map Interactions

```
Tap single pin:
  Pin enlarges with white outline
  Compact property card floats up from bottom
  Tap card → Property Detail Screen

Tap cluster:
  Map zooms in to disperse the cluster

Pull up bottom sheet:
  Peek (200px): filter chips + horizontal card list
  Full height: vertical list view (same as Search Result)

Floating elements:
  Search bar (top, floating over map)
  My Location button (bottom right, 44×44px)
  Back button (top left, 44×44px)
```

---

## Property Detail Screen

The primary conversion point. This screen gets a tenant
from browsing to requesting a visit.

### Gallery Header

```
Hero image:     Full-bleed, 280px height, swipeable
Thumbnail strip: 5 previews + "+N more" overflow pill
Photo counter:  "1 / 7" overlay pill (top right)
Floating back:  White circle button (top left)
Floating share: White circle button (top right)
```

### Content Area (Scrollable)

```
Status + metadata row:
  Status chip + "Added 3 days ago" + ♡ save button

Property name:    DM Serif Display, large, bold
Location:         📍 [Locality name]  (never exact address)
Rating row:       ★ 4.8 · 62 reviews · Verified ✓

Sticky tabs:      [Overview]  [Gallery]  [Reviews]
```

### Overview Tab Contents

```
Specs grid (2×2):
  🛏 2 Bedrooms      🚿 1 Bathroom
  ⬆ 2nd Floor        📐 450 sqft

Price block:
  "NPR 18,000 / month"  (DM Serif Display, large)
  "Negotiable" chip (if applicable)

Description:
  Text up to 3 lines, "See more" toggle expands

Facilities:
  Chip grid: WiFi · Parking · Water · Electricity · Furnished · Gas
  "Show more" if more than 6

Landlord card:
  Avatar + name + Verified ✓ badge
  Star rating + review count
  "View Profile →" link
  (Phone and message buttons only shown after visit accepted)

Location section:
  FREE STATE:
    Blurred map with approximate pin
    Tooltip: "📍 Exact location shared after visit approval"

  ACCEPTED STATE:
    Sharp map with exact pin
    Full street address shown
    "Get Directions →" button (opens native maps)
    Landlord phone (if landlord opted to share)

Similar Properties:
  Horizontal scroll of 3–5 compact cards
```

### Sticky Bottom Bar

```
Left:  "NPR 18,000/mo"
Right: "Request Visit" button (primary black pill)

Button states:
  Default:             "Request Visit"  (enabled, black)
  Already requested:   "Visit Requested ✓"  (disabled, gray)
  Visit accepted:      "Visit Confirmed →"  (green, goes to visit)
  Occupied property:   "No Longer Available"  (disabled)
  Rejected/closed:     "Request Visit Again"  (re-enabled, black)

[PRO] Priority badge overlay on button (free users):
  Small gold badge above button: "⭐ Priority with Pro"
  Below button: "Free: standard · Pro: top of inbox"
```

---

## Schedule Visit Bottom Sheet

Slides up OVER the Property Detail Screen.
Does not replace the screen.
Dismiss: swipe down or tap backdrop.

```
Content:
  Title: "Schedule a Visit"

  Date picker:
    Horizontal calendar strip (7 days visible)
    Minimum: tomorrow
    Maximum: 30 days ahead

  Time slot chips:
    [Morning  8am–12pm]
    [Afternoon 12pm–5pm]
    [Evening  5pm–8pm]

  Message to landlord:
    Multiline text input (optional)
    Placeholder: "Hi, I'd like to visit..."
    Max: 200 characters

CTA: "Confirm Request →"
```

---

## My Visits Screen

All visit requests the tenant has ever made.

```
Header: "My Visits"

Three tabs:
  Active:    Current PENDING, ACCEPTED, RESCHEDULED visits
  Completed: VISIT_COMPLETED, DISCUSSION_ONGOING, FINALIZED
  Archived:  CLOSED, REJECTED visits

Sort order: Upcoming visit date first within each tab
```

### Visit Card Contents

```
Property thumbnail (80×80px)
Property name + locality
Visit date + time slot
Status badge (color-coded, see VISIT_WORKFLOW.md)
Action buttons (change per status — see VISIT_WORKFLOW.md)
```

---

## Post-Visit Follow-Up Screen

Shown after tenant receives follow-up prompt
(2 hours after preferred visit datetime).

```
Four response options:

  "😊 Interested"
    → Status: DISCUSSION_ONGOING
    → Push sent to landlord

  "😐 Not Interested"
    → Status: CLOSED
    → Visit archived

  "👀 Need Another Visit"
    → Current visit: CLOSED
    → New PENDING request created for same property
    → Tenant must pick new date and time

  "❓ Visit Did Not Happen"
    → System flags for landlord confirmation
    → If landlord confirms: CLOSED
    → If landlord disputes: escalated to support
```

---

## Tenant Profile Screen

```
Header:
  "Profile" (left, DM Serif Display)
  Settings gear button (right, opens Settings Screen)

Profile hero card:
  Avatar (72px) with edit pencil badge
  Full name
  📍 City, Nepal
  "Member since [Month Year]"
  "Edit" ghost button (top right of card)

Stats row (3 columns):
  [X Visits]  [X Saved]  [X Reviews]

FOR FREE USERS — Upgrade card:
  Dark gradient card with gold border
  "Unlock Pro Features"
  Features summary in one line
  "Upgrade" gold button

FOR PRO USERS — Pro Status card:
  "⭐ PRO MEMBER"  Active ●
  "Your plan renews on [date]"
  Days remaining progress bar

Menu sections:
  Account:      Edit Profile · Saved Properties · Visit History · My Reviews
  Preferences:  AI Preferences (🔒 PRO for full) · Notifications
  Support:      Help & FAQ · Report an Issue
  Legal:        Terms · Privacy Policy
  Log Out       (red text)

App version: "BasoBas v1.0.0"
```

---

## Saved Properties Screen

```
Reached from: Profile → "Saved Properties"
Shows: All properties the tenant has hearted/saved
Layout: Same card grid as Search Result
Empty state: "No saved properties yet."
Note: Notifications sent when saved property goes Occupied
```

---

## Public Landlord Profile Screen

How a tenant sees a landlord's profile after
tapping "View Profile →" on a property detail.

```
Header:
  Back arrow + "Landlord Profile" + Share button

Identity card:
  Avatar (80px)
  Full name
  Verified ✓ badge
  Member since [year]
  Stats: Rating · Reviews · Listings · Active duration

Trust indicators card:
  "Why tenants trust [Name]"
  3 trust points listed

Tabs: [Active Listings]  [Reviews]

Active Listings tab:
  2-column grid of their properties
  Cards show "Request Visit →" link

Reviews tab:
  Rating summary with star breakdown chart
  Review cards with tenant name, stars, date, text
  Verified Visit ✓ badge where applicable
```

---

## Notification Screen

```
Header: "Notifications" + "Mark all read" (if unread exist)

Grouped sections:
  Today · Yesterday · This Week · Earlier

Each notification:
  Colored left border (4px) based on type
  Icon circle (32px, colored)
  Title (bold if unread)
  Body text (2 lines max)
  Timestamp

Tap → deep links to relevant screen

Empty state: "You're all caught up! 🎉"
```

---

## Notification Color Coding (Tenant)

```
Green:   Visit accepted, rental finalized, verified approved
Amber:   Visit rescheduled, reminders, no-response alerts
Blue:    Discussion started, status updates, informational
Red:     Visit rejected, property no longer available
Gray:    General system notifications
```
