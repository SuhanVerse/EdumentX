Here's a high-quality, Figma Make–ready prompt engineered for precision, completeness, and production-level output:

---

# BasoBas — Premium Rental Marketplace App
## Figma Make Master Prompt

---

### PRODUCT OVERVIEW

**App Name:** BasoBas
**Tagline:** *Find your home. Before it's gone.*
**Category:** Rental Property Marketplace (Nepal/South Asia focused MVP)
**Platform:** iOS-first mobile app (390×844px, iPhone 14 base frame)
**Design Maturity:** Funded startup MVP — App Store ready, investor presentation quality

---

### VISUAL IDENTITY & DESIGN PHILOSOPHY

**Aesthetic Direction:**
Refined minimal luxury. Think Airbnb's trust meets Linear's precision meets a premium South Asian sensibility — warm neutrals grounded by a single confident accent. Not sterile. Not decorative. *Purposeful.*

**Core Design Principles:**
- Generous whitespace that breathes
- Every element earns its place
- Information hierarchy is felt before it's read
- Cards feel tactile — soft shadows, rounded forms, real depth
- Trust is visual — verification badges, status clarity, landlord identity

**Do NOT:**
- Use generic template patterns
- Stack icons without intent
- Over-saturate with color
- Use stock UI component kits verbatim
- Create anything that looks like a Dribble clone of Airbnb

---

### DESIGN TOKENS

**Color System:**

```
Primary Background:   #FAFAF8  (warm off-white, not pure white)
Surface / Card:       #FFFFFF  with shadow: 0px 2px 16px rgba(0,0,0,0.06)
Primary Accent:       #1A6B4A  (deep forest green — trust, stability)
Accent Light:         #E8F5EE  (green tint for chips, tags)
Secondary Accent:     #F5A623  (warm amber — highlights, ratings)
Destructive:          #E84545
Text Primary:         #0F1114
Text Secondary:       #6B7280
Text Tertiary:        #9CA3AF
Divider:              #F0F0EE
Status — Available:   #22C55E bg on #DCFCE7
Status — High Demand: #F5A623 bg on #FEF9C3
Status — Discussion:  #3B82F6 bg on #DBEAFE
Status — Occupied:    #6B7280 bg on #F3F4F6
```

**Typography:**

```
Display / Hero:    DM Serif Display — headlines, property names
UI / Body:         DM Sans — all interface text, labels, descriptions
Mono / Detail:     JetBrains Mono — price display, OTP fields
```

**Sizing Scale:** 4pt base grid
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 56 / 64`

**Border Radius:** `8 / 12 / 16 / 20 / 28 / 999(pill)`

**Shadow Levels:**
```
Elevation 1 (cards):      0 2px 8px rgba(0,0,0,0.06)
Elevation 2 (modals):     0 8px 32px rgba(0,0,0,0.12)
Elevation 3 (floating):   0 16px 48px rgba(0,0,0,0.16)
```

---

### COMPONENT LIBRARY

Build all components as reusable Figma components with variants:

**Navigation:**
- Bottom tab bar: Home · Map · Visits · Notifications · Profile
- Active state: filled icon + label + green indicator dot
- Height: 80px with safe area padding
- Style: frosted glass background, subtle top border

**Cards — Property Card (Standard):**
- Image: 16:9 ratio, rounded-12 top corners
- Status chip: top-left overlay (Available / High Demand / etc.)
- Save button: top-right, circular ghost button
- Content area: property name (DM Serif Display 16 semibold), location (caption), price (DM Serif Display 20 bold right-aligned), specs row (bed · bath · sqft icons)
- Card shadow: Elevation 1

**Cards — Property Card (Compact / Map):**
- Horizontal layout: 80×80 image thumbnail, content right
- Used in bottom sheets and list view

**Status Chips:**
```
Available     → green pill, "● Available"
High Demand   → amber pill, "🔥 High Demand"
Discussion    → blue pill, "💬 Under Discussion"
Occupied      → gray pill, "🔒 Occupied"
```

**Visit Request Status Badges:**
```
Pending        → amber outline
Accepted       → green fill
Rescheduled   → blue outline
Rejected       → red fill, muted
Discussion     → blue fill
Finalized      → deep green fill, checkmark icon
```

**Buttons:**
```
Primary CTA:     Full-width, 56px height, radius-28, #1A6B4A fill, white DM Sans 16 semibold
Secondary:       Full-width, 56px, radius-28, #E8F5EE fill, #1A6B4A text
Ghost:           Outline 1.5px #1A6B4A, transparent bg
Destructive:     #FEE2E2 fill, #E84545 text
Icon Button:     44×44 circle, white bg, Elevation 1 shadow
```

**Input Fields:**
```
Height: 52px
Background: #F5F5F3
Border: 1.5px #E5E5E3 (focus: #1A6B4A)
Radius: 12px
Label: DM Sans 12 medium, #6B7280, above field
OTP Field: 52×60px each, JetBrains Mono 24 bold, 6 fields, 8px gap
```

**Bottom Sheet / Modal:**
- Handle bar: 36×4 pill, #E0E0E0, centered top
- Radius top: 24px
- Peek height: 220px; expanded: variable
- Background: #FFFFFF, Elevation 3 shadow

**Verification Badge:**
- Small: 16×16 green checkmark circle, inline with name
- Large: pill with "✓ Identity Verified" + "Citizenship Verified" in profile

**Landlord Avatar Card:**
- 56px circular avatar
- Name + verification badge
- Rating stars (amber) + review count
- "Call" and "Message" icon buttons

**Rating Component:**
- Star row (5 stars, amber filled/outline)
- Numeric display: "4.8" DM Serif Display 20
- Review count: "(142 reviews)" secondary text
- Review card: avatar + name + date + star row + text body

---

### SCREEN SPECIFICATIONS

#### 1. SPLASH SCREEN
- Full bleed property photography (warm toned, premium interior/exterior)
- "BasoBas" wordmark centered — DM Serif Display 36, white
- Tagline: *"Find your home. Before it's gone."* — DM Sans 14, white/80%
- Subtle gradient overlay: bottom 60% dark-to-transparent
- Loading indicator: thin green line at bottom

#### 2. ONBOARDING (3 slides)
Slide 1: Map illustration + "Discover Rentals Near You"
Slide 2: Calendar/visit icon + "Schedule Visits Instantly"
Slide 3: Shield/badge icon + "Verified Landlords Only"
- Dot pagination indicator
- "Get Started" primary button + "I already have an account" ghost text
- Soft illustrated backgrounds — not photography

#### 3. AUTHENTICATION FLOW

**Phone Entry Screen:**
- Nepal flag + "+977" prefix, phone number input
- "We'll send you a 6-digit verification code" helper text
- "Continue" primary CTA

**OTP Verification Screen:**
- "Enter the code sent to +977 98XX XXX XXX"
- 6×OTP input fields (JetBrains Mono)
- 60s countdown resend timer
- Auto-advance on fill

**Role Selection Screen:**
- "How will you use BasoBas?"
- Two large cards: "🔍 I'm Looking to Rent" / "🏠 I Have a Property to List"
- Each card: icon, title, 2-line description
- Selected state: green border + light green bg
- "Continue" CTA

**Profile Setup (minimal):**
- Name, profile photo upload
- "Skip for now" option

---

#### 4. HOME SCREEN (Tenant)

**Header Section:**
- Avatar (40px) + "Good morning, [Name]" DM Serif Display 22
- Location: pin icon + "Kathmandu, Bagmati" dropdown arrow
- Notification bell (with unread badge)

**Search Bar:**
- Full-width, 52px, radius-28
- Placeholder: "Search by area, locality, price..."
- Filter icon (right): opens filter bottom sheet

**Category Chips (horizontal scroll):**
`All` `Room` `Apartment` `House` `Office` `Flat`
- Active: #1A6B4A fill, white text
- Inactive: white bg, gray text, subtle border

**AI Recommendation Banner:**
- 🤖 "Based on your preferences" label
- Horizontally scrollable: 2–3 "Recommended for You" cards
- Subtle gradient purple-to-green badge: "AI Pick"

**Section: Nearby Rentals**
- "Nearby Rentals" heading + "View all →"
- Vertical list of standard property cards (2 visible, scroll hint)

**Section: Trending This Week**
- Horizontal scroll of compact cards
- "🔥 Trending" section badge

**Section: Explore on Map**
- Static map preview card (full width, 160px height)
- "Explore 48 properties near you →" overlay
- Tappable → opens Map screen

**Bottom Navigation:**
Home (active) · Map · Visits · Notifications · Profile

---

#### 5. PROPERTY DETAIL SCREEN

**Photo Gallery Header:**
- Full-bleed image (280px hero), swipeable
- Thumbnail strip below (5 previews + "+N more")
- Back arrow (floating, white circle) + Share icon (top right)
- Photo count: "1/7" pill overlay

**Content Area (scrollable):**
- Status chip (e.g. "🔥 High Demand") + "Added 2 days ago"
- Property Name: DM Serif Display 26 bold
- Location: pin icon + full address
- Rating row: ★ 4.8 · 142 reviews

**Tab Bar:** Overview · Gallery · Reviews
(Sticky on scroll)

**Overview Tab:**
- Specs grid: Beds · Baths · Floor · Area (sqft) — 2×2 grid, icon + label
- Price: DM Serif Display 28 bold + "/month" in secondary
- **Description:** expandable "See more"
- **Facilities:** chip grid (WiFi, Parking, Water, Electricity, Furnished, Gas)
- **Landlord Card:** avatar + name + verified badge + rating + "View Profile" link
- **Approximate Location:** blurred map preview with "Exact location shared after visit approval" tooltip
- **Similar Properties:** horizontal scroll

**Sticky Bottom CTA:**
- Price left: "रु 18,000 /mo"
- Right: "Request Visit" — primary green button (full-width on mobile)

---

#### 6. VISIT REQUEST FLOW

**Schedule Visit Bottom Sheet (modal):**
- Title: "Schedule a Visit"
- Date picker: horizontal calendar strip (7-day view)
- Time slot grid: Morning / Afternoon / Evening chips
- Message to landlord: multiline input, optional
- "Confirm Request" primary CTA

**Visit Confirmation Screen:**
- ✅ Success state animation (lottie-style circle check)
- "Visit Requested Successfully"
- Summary: property thumbnail + name + date + time
- "View My Visits" button

**Visit Status Detail Screen (Tenant view):**

Progress tracker (vertical timeline):
```
● Request Sent          → completed (green)
● Landlord Review       → active (pulsing dot)
○ Approval Received
○ Visit Day
○ Confirm Interest
○ Discussion
○ Rental Finalized
```

- Status badge: "Pending Approval"
- Property card summary
- "Cancel Request" ghost button (subtle)
- When accepted: "📍 Exact Location Unlocked" green reveal animation

---

#### 7. MAP SCREEN

**Full-screen map (light, minimal style — Mapbox light-v11 or Google Maps "silver"):**
- Custom map pins: green rounded squares with price ("रु 15k")
- Selected pin: enlarged, white card floats above
- Cluster pins: green circle with count

**Bottom Sheet (peek at 200px):**
- Filter chips row: Any Type · Room · Apartment · House
- Property list (scrollable cards in compact horizontal layout)
- "List View" toggle button

**Top overlay:**
- Search bar (floating)
- Back/close button

---

#### 8. NOTIFICATIONS SCREEN

Grouped by Today / Yesterday / This Week

**Notification Types:**
- 🟢 Visit Accepted — green left border
- 🔵 New Message — blue left border
- 🟡 Reschedule Request — amber left border
- 🔴 Visit Rejected — red left border
- ⚪ Property Status Update — gray left border

Each notification:
- Icon (colored circle) + title (bold) + body text + timestamp
- Unread: slightly warm bg (#FAFAF6)
- Read: white bg

---

#### 9. LANDLORD DASHBOARD

**Header:** "My Properties" + "Add Listing" button (green, top right)

**Properties Tab:**
- Property cards with management actions
- Quick stats: Views / Requests / Status chip

**Requests Tab (core feature):**
List of incoming visit requests:
- Tenant avatar + name + requested date/time
- Property thumbnail
- Action buttons: "Accept" (green) · "Reschedule" (blue) · "Reject" (red outline)
- Accepted state: "Accepted ✓" + "Share Location" button appears

**Tenant Selection (when multiple applicants):**
- "Select Tenant" screen
- Applicant cards: photo + name + visit date + "Mark as Finalized" CTA
- Comparison chips: response time, visit count

**Property Management Screen:**
- Edit listing
- Toggle availability
- View analytics (views, requests, saves)
- Mark as Occupied

---

#### 10. LANDLORD VERIFICATION FLOW

**Identity Verification Screen:**
- Step progress: 1 Personal Info → 2 Document Upload → 3 Review
- Upload citizenship/NID: drag zone + camera option
- Document preview + re-upload option
- Verification pending state: "Under Review (1–2 business days)"
- Verified state: badge granted + profile updated

---

#### 11. PROFILE SCREEN (Tenant)

- Large avatar + name + member since
- Stats row: Visits · Reviews · Saved
- Settings list: Preferences, Notifications, Language, Privacy, Help, Logout
- "Become a Landlord" CTA card (green tinted)

---

### MICRO-INTERACTION NOTES (for Figma prototyping)

| Trigger | Animation |
|---|---|
| Bottom sheet open | Spring slide-up, 300ms |
| Status chip change | Cross-fade + color transition |
| OTP field fill | Auto-jump + subtle scale |
| Visit accepted | Green pulse + location unlock reveal |
| Map pin tap | Card slide-up from bottom |
| Tab switch | Icon fill + underline slide |
| Heart/save tap | Scale bounce + fill |
| CTA tap | Subtle press scale (0.97) |

---

### FIGMA FILE STRUCTURE

```
BasoBas/
├── 🎨 Design Tokens
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   └── Shadows
├── 🧩 Components
│   ├── Navigation
│   ├── Cards
│   ├── Buttons
│   ├── Inputs
│   ├── Status Badges
│   ├── Sheets / Modals
│   └── Map Elements
├── 📱 Screens — Tenant
│   ├── Auth Flow
│   ├── Home
│   ├── Property Detail
│   ├── Visit Request
│   ├── Map
│   ├── Notifications
│   └── Profile
├── 🏠 Screens — Landlord
│   ├── Dashboard
│   ├── Requests
│   ├── Property Management
│   └── Verification
└── 🔄 Prototype Flows
    ├── Tenant Discovery → Visit Request
    └── Landlord Request Management
```

---

### QUALITY BAR

Every screen must pass this check:
- [ ] Would this ship in a Series A product?
- [ ] Does the hierarchy guide the eye without effort?
- [ ] Is every spacing value on the 4pt grid?
- [ ] Do all interactive elements have clear tap states?
- [ ] Is the empty state designed (no data yet)?
- [ ] Are loading/skeleton states accounted for?
- [ ] Does the design feel distinctly *BasoBas* — not a clone?

---

This prompt is complete and self-contained. Paste it directly into **Figma Make** as the generation prompt, referencing the three uploaded screenshots as visual style anchors. The result should be a cohesive, investor-ready mobile app UI system.