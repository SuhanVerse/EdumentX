You are designing the Landlord Dashboard & Listings section 
of the BasoBas mobile rental marketplace app for Nepal.

The Profile screen (Screen 33) is already designed.
You are designing these screens now:

  21 — Landlord Dashboard
  22 — My Properties Screen
  23 — Add Listing — Step 1: Basic Info
  24 — Add Listing — Step 2: Property Details
  25 — Add Listing — Step 3: Photos Upload
  26 — Add Listing — Step 4: Location + Preview

═══════════════════════════════════════════════════════════
ESTABLISHED DESIGN LANGUAGE  (follow strictly)
═══════════════════════════════════════════════════════════

Frame size:         390 × 844px  (all screens)
Background:         #FFFFFF
Page canvas:        #F4F4F0

Text Primary:       #0A0A0A
Text Secondary:     #6B6B6B
Text Tertiary:      #AAAAAA
Text Placeholder:   #C0C0C0

Brand:              #1A6B4A
Brand Light:        #E8F5EE
Border:             #E8E8E8
Input Background:   #F5F5F5
Input Height:       56px
Input Radius:       14px

Primary Button:     #0A0A0A · #FFFFFF · 56px · radius 999px
Font Display:       DM Serif Display  (headlines only)
Font UI:            DM Sans
Screen H-Padding:   24px
Status Bar:         44px  dark icons

Property Status Colors:
  Available:        #DCFCE7 bg · #15803D text
  High Demand:      #FEF9C3 bg · #B45309 text
  Under Discussion: #DBEAFE bg · #1E40AF text
  Occupied:         #F3F4F6 bg · #6B7280 text


═══════════════════════════════════════════════════════════
LANDLORD BOTTOM DOCK
(Reuse the already designed dock component —
 just confirming the tabs and active states here)
═══════════════════════════════════════════════════════════

The landlord dock is a floating dark frosted glass pill.
Width: 312px  Height: 64px  Radius: 32px
Centered, 28px above bottom edge.

4 tabs in this exact order:

  [🏘 Listing]  [📬 Request]  [🔔 Alerts]  [👤 Profile]

Active tab logic per screen:
  Screen 21 (Dashboard):   Listing tab active
  Screen 22 (Properties):  Listing tab active
  Screens 23–26 (Add):     Listing tab active
  (Request, Alerts, Profile screens handled separately)

Alerts tab shows a red badge dot when unread exist.


═══════════════════════════════════════════════════════════
SCREEN 21 — LANDLORD DASHBOARD
Frame name: "21 — Landlord Dashboard"
═══════════════════════════════════════════════════════════

This is the HOME screen for landlords.
It gives a quick overview of everything at a glance —
properties, requests, and performance. Not a deep screen.
Entry point, not management screen.

Dock: Listing tab active.

────────────────────────────────────────
HEADER  (fixed, not scrollable)
────────────────────────────────────────

Height: 72px
Background: #FFFFFF
Bottom border: 1px solid #E8E8E8
Padding: 0 24px

Left:
  Avatar circle: 40px  #F0EDE8  placeholder
  Gap: 12px
  Text block:
    "Good morning"  DM Sans  13px  #AAAAAA
    "Bikash Sharma"  DM Sans  17px  SemiBold  #0A0A0A

Right:
  Notification bell button:
    40×40px  circle  #F5F5F5
    Bell icon  18px  #0A0A0A
    Red badge dot: 8px circle  #E53E3E
    Positioned top-right of bell icon

────────────────────────────────────────
SCROLLABLE CONTENT
────────────────────────────────────────

OVERVIEW STATS ROW  (24px from header, 24px H-padding):

  3 stat cards in a row, equal width, gap: 10px
  Each card: height 80px  border-radius 16px

  Card 1 — Active Listings:
    Background: #0A0A0A
    Top: "3"  DM Serif Display  28px  #FFFFFF
    Bottom: "Active Listings"  DM Sans  11px  rgba(255,255,255,0.6)
    Top-right corner: small 🏘 icon  16px  rgba(255,255,255,0.3)

  Card 2 — New Requests:
    Background: #FEF9C3
    Top: "8"  DM Serif Display  28px  #0A0A0A
    Bottom: "New Requests"  DM Sans  11px  #B45309
    Top-right: 📬 icon  16px  rgba(0,0,0,0.2)

  Card 3 — Avg Rating:
    Background: #E8F5EE
    Top: "★ 4.8"  DM Serif Display  22px  #0A0A0A
    (★ slightly smaller, #F5A623)
    Bottom: "Your Rating"  DM Sans  11px  #1A6B4A
    Top-right: ★ icon  16px  rgba(26,107,74,0.2)


REQUESTS ALERT CARD  (16px below stats row):

  Full width card
  Background: #FFFBEB
  Border: 1px solid #FDE68A
  Border-radius: 16px
  Padding: 14px 16px

  Left: amber circle 36×36px  radius 10px
    Background: #FEF9C3
    📬 icon  18px  #B45309

  Gap: 12px

  Text block:
    "8 visit requests waiting"
    DM Sans  15px  SemiBold  #0A0A0A
    "3 new since yesterday"
    DM Sans  12px  #B45309  (6px below)

  Right: "Review →"
    DM Sans  13px  SemiBold  #B45309


SECTION: "MY PROPERTIES"  (24px below alert card):

  Section header row:
    Left: "My Properties"  DM Sans  16px  SemiBold  #0A0A0A
    Right: "Manage all →"  DM Sans  13px  #1A6B4A

  14px gap

  PROPERTY SUMMARY CARDS (vertical list, gap: 12px):

  Each card: full width  height: 100px
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Border-radius: 16px
  Padding: 14px 16px
  Row layout (horizontal)

    LEFT: Photo thumbnail
      Width: 72px  Height: 72px
      Background: #F0EDE8  (warm placeholder)
      Border-radius: 10px
      Overflow: hidden

    Gap: 14px

    MIDDLE: Text block (fills remaining)
      Property name: DM Sans  15px  SemiBold  #0A0A0A
      Example: "2BHK Apartment"

      Location (4px below):
        📍  11px  #AAAAAA + gap 4px +
        "Pulchowk, Lalitpur"
        DM Sans  12px  #AAAAAA

      Status chip + request count (8px below location):
        Row (gap: 8px):
          Status chip: pill  22px tall  padding 3px 10px  radius 999px
            Card 1: "● Available"  #DCFCE7 bg  #15803D text  DM Sans 10px
            Card 2: "🔥 High Demand"  #FEF9C3 bg  #B45309 text
            Card 3: "🔒 Occupied"  #F3F4F6 bg  #6B7280 text

          Request count chip:
            "5 requests"  DM Sans  10px  #6B6B6B
            Background: #F5F5F5  radius 999px  padding 3px 8px

    RIGHT: chevron  14px  #CCCCCC  vertically centered

  Show 3 property cards.
  Card 1: Available + 5 requests
  Card 2: High Demand + 8 requests
  Card 3: Occupied + 0 requests


QUICK ACTIONS ROW  (24px below properties):

  Section label: "QUICK ACTIONS"
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px
  10px gap

  2 action buttons side by side (gap: 12px):

  Button 1 — Add New Listing:
    Width: 165px  Height: 64px
    Background: #0A0A0A
    Border-radius: 16px
    Inside (centered):
      ➕ icon  16px  #FFFFFF
      "Add Listing"  DM Sans  13px  SemiBold  #FFFFFF
      (icon on top, label 6px below)

  Button 2 — View All Requests:
    Width: 165px  Height: 64px
    Background: #F5F5F5
    Border-radius: 16px
    Border: 1px solid #E8E8E8
    Inside (centered):
      📬 icon  16px  #0A0A0A
      "All Requests"  DM Sans  13px  SemiBold  #0A0A0A


RECENT ACTIVITY  (24px below quick actions):

  Section label: "RECENT ACTIVITY"
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px
  10px gap

  Card: full width
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Border-radius: 16px
  Overflow: hidden

  3 activity rows, divider between each (1px #F5F5F5)
  Each row: 52px  24px H-padding

  Row 1:
    Left dot: 8px  #22C55E  (green)
    Gap: 12px
    "Sarina S. requested a visit"
    DM Sans  14px  #0A0A0A
    Below: "2BHK Apartment  ·  2 hours ago"
    DM Sans  11px  #AAAAAA
    Right: "Pending"
    DM Sans  11px  #B45309  background #FEF9C3  pill  padding 3px 8px

  Row 2:
    Left dot: 8px  #3B82F6  (blue)
    "Rahul T. accepted your reschedule"
    Below: "Studio Room  ·  Yesterday"
    Right: "Accepted"  #15803D  bg #DCFCE7  pill

  Row 3:
    Left dot: 8px  #F5A623  (amber)
    "Your listing got 12 new views"
    Below: "2BHK Apartment  ·  2 days ago"
    Right: →  14px  #CCCCCC

  Floating dock: 28px above bottom edge.


═══════════════════════════════════════════════════════════
SCREEN 22 — MY PROPERTIES SCREEN
Frame name: "22 — My Properties"
═══════════════════════════════════════════════════════════

Full listing management screen.
Reached from Dashboard → "Manage all →"
OR from the Listing dock tab directly.

Dock: Listing tab active.

────────────────────────────────────────
HEADER
────────────────────────────────────────

Height: 56px
Background: #FFFFFF
Bottom border: 1px solid #E8E8E8
Padding: 0 24px

Left: "My Properties"  DM Serif Display  22px  #0A0A0A

Right: Add button
  Height: 36px  padding: 0 16px
  Background: #0A0A0A
  Border-radius: 999px
  Text: "+ Add New"  DM Sans  13px  SemiBold  #FFFFFF

────────────────────────────────────────
FILTER TAB BAR  (below header)
────────────────────────────────────────

Height: 48px
Background: #FFFFFF
Bottom border: 1px solid #E8E8E8
Padding: 0 24px

Horizontal scroll of filter chips, gap: 8px:

  [All (3)]  [Available]  [High Demand]  [Discussion]  [Occupied]

  Active chip (All selected):
    Background: #0A0A0A
    Text: #FFFFFF  DM Sans  13px  Medium
    Radius: 999px  padding: 6px 14px  height: 32px

  Inactive chip:
    Background: #F5F5F5
    Text: #6B6B6B  DM Sans  13px
    Same dimensions

────────────────────────────────────────
SCROLLABLE CONTENT  (16px from filter bar)
────────────────────────────────────────

SORT ROW  (24px H-padding):
  Left: "3 properties"  DM Sans  13px  #AAAAAA
  Right: "Sort: Newest ▾"  DM Sans  13px  #0A0A0A

  16px below

PROPERTY MANAGEMENT CARDS  (vertical list, gap: 16px):

  Each card: full width
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Border-radius: 20px
  Overflow: hidden

  ── TOP SECTION (image + overlay info) ──
  
  Image area: full width  160px tall
  Background: #F0EDE8  (warm gray placeholder)
  
  Gradient overlay on image:
    Bottom 60%: rgba(0,0,0,0) → rgba(0,0,0,0.55)
  
  Overlaid on image (bottom-left, 12px padding):
    Property name:
    DM Serif Display  17px  #FFFFFF  "2BHK Apartment"
    
    Location row (4px below name):
    📍  11px  rgba(255,255,255,0.😎  +  "Pulchowk, Lalitpur"
    DM Sans  12px  rgba(255,255,255,0.😎
  
  Overlaid on image (top-left, 10px padding):
    Status chip pill:
    Card 1: "● Available"  #DCFCE7 bg  #15803D text  DM Sans 11px
    Card 2: "🔥 High Demand"  #FEF9C3 bg  #B45309 text
    Card 3: "🔒 Occupied"  #F3F4F6 bg  #6B7280 text

  Overlaid on image (top-right, 10px padding):
    Options button: 28×28px  rgba(255,255,255,0.15)  radius 999px
    ⋯ three dots  14px  #FFFFFF

  ── BOTTOM SECTION (info + actions) ──

  Padding: 14px 16px 16px

  Stats row:
    4 metric chips in a row, gap: 8px, wrap if needed
    Each chip:
      Background: #F5F5F5  radius 8px  padding: 5px 10px
      Icon (12px  #AAAAAA) + gap 5px + value (DM Sans 12px #0A0A0A)

    Chip 1: 👁 "248 views"
    Chip 2: 📋 "8 requests"
    Chip 3: 💰 "NPR 18k/mo"
    Chip 4: 📅 "Available now"

  Actions row (12px below stats):
    3 action buttons, equal width (gap: 8px):

    Button 1 — View Requests:
      Height: 38px  flex 1
      Background: #0A0A0A
      Border-radius: 10px
      Text: "Requests"  DM Sans  12px  SemiBold  #FFFFFF
      Left icon: 📬  12px  #FFFFFF

    Button 2 — Edit:
      Height: 38px  flex 1
      Background: #F5F5F5
      Border: 1px solid #E8E8E8
      Border-radius: 10px
      Text: "Edit"  DM Sans  12px  Medium  #0A0A0A
      Left icon: ✏ pencil  12px  #0A0A0A

    Button 3 — More:
      Height: 38px  width: 38px  (square)
      Background: #F5F5F5
      Border: 1px solid #E8E8E8
      Border-radius: 10px
      Icon: ⋯ three dots  14px  #0A0A0A  centered

  Show 3 cards total.
  Card 1: Available · 8 requests · 248 views
  Card 2: High Demand · 12 requests · 510 views
  Card 3: Occupied · 0 requests · 180 views


ADD NEW LISTING PROMPT  (16px below last card, 24px H-padding):

  Full width  72px  dashed border card:
  Border: 2px dashed #D0D0D0
  Border-radius: 20px
  Background: #FAFAFA
  
  Row inside (centered, gap: 12px):
    ➕ icon circle: 36×36px  #F5F5F5  radius 999px
    Icon: plus  16px  #AAAAAA
    Text block:
      "Add a new property"  DM Sans  14px  Medium  #0A0A0A
      "Reach thousands of tenants"  DM Sans  12px  #AAAAAA

  Floating dock: 28px above bottom edge.


═══════════════════════════════════════════════════════════
ADD LISTING FLOW — SHARED ELEMENTS
(Apply to Screens 23, 24, 25, 26)
═══════════════════════════════════════════════════════════

All 4 Add Listing screens share the same header 
and progress system. No dock on any of these screens.

────────────────────────────────────────
SHARED HEADER  (fixed)
────────────────────────────────────────

Height: 56px
Background: #FFFFFF
Bottom border: 1px solid #E8E8E8
Padding: 0 24px

Left: Back arrow
  44×44px  circle  #F5F5F5
  ← arrow  18px  #0A0A0A

Center: "New Listing"  DM Sans  17px  SemiBold  #0A0A0A

Right: "Save Draft"
  DM Sans  13px  Medium  #AAAAAA

────────────────────────────────────────
SHARED STEP PROGRESS BAR
(directly below header, full width)
────────────────────────────────────────

Height: 4px  no padding  flush to header

Divided into 4 equal segments with 2px gaps between:
Each segment: ~95px wide  4px tall  radius 2px

  Screen 23 — Step 1:  segment 1 = #0A0A0A  · 2,3,4 = #EFEFEF
  Screen 24 — Step 2:  segments 1,2 = #0A0A0A  · 3,4 = #EFEFEF
  Screen 25 — Step 3:  segments 1,2,3 = #0A0A0A  · 4 = #EFEFEF
  Screen 26 — Step 4:  all 4 = #0A0A0A

────────────────────────────────────────
SHARED STEP LABEL ROW
(16px below progress bar, 24px H-padding)
────────────────────────────────────────

Left:
  Step eyebrow:
  DM Sans  11px  SemiBold  #1A6B4A  uppercase  letter-spacing 0.8px
  Content per screen defined below.

Right:
  "Step X of 4"  DM Sans  11px  #AAAAAA

────────────────────────────────────────
SHARED BOTTOM BAR  (fixed above dock area)
────────────────────────────────────────

Height: 80px
Background: #FFFFFF
Top border: 1px solid #E8E8E8
Padding: 12px 24px

Two buttons side by side:

  Back button  (screens 24–26 only, not on screen 23):
    Width: 80px  Height: 56px
    Background: #F5F5F5  Border-radius: 14px
    ← Back  DM Sans  14px  Medium  #0A0A0A

  Primary button (fills remaining width):
    Screen 23: "Continue to Details →"
    Screen 24: "Continue to Photos →"
    Screen 25: "Continue to Location →"
    Screen 26: "Publish Listing"
    
    Style: black pill  56px  DM Sans  15px  SemiBold  #FFFFFF


═══════════════════════════════════════════════════════════
SCREEN 23 — ADD LISTING STEP 1: BASIC INFO
Frame name: "23 — Add Listing · Step 1"
═══════════════════════════════════════════════════════════

Eyebrow: "STEP 1 · BASIC INFORMATION"

Section title below eyebrow:
  "Tell us about"
  "your property"
  DM Serif Display  26px  #0A0A0A  line-height 32px

12px gap

Body: "A great listing starts with a clear title and type."
DM Sans  14px  #6B6B6B  line-height 20px

────────────────────────────────────────
FORM CONTENT  (24px below title, 24px H-padding)
────────────────────────────────────────

PROPERTY TYPE SELECTOR  (labeled "Property Type"):
  DM Sans  12px  Medium  #6B6B6B  — label above
  Asterisk *  #E53E3E

  Type options as large selectable chips:
  Display in 3-column wrap grid, gap: 8px

  Each chip:
    Height: 56px  flex basis 31%
    Border-radius: 14px
    Border: 1.5px solid #E8E8E8
    Background: #FFFFFF

    Inside (centered, column):
      Icon  20px  (top)
      Label  DM Sans  12px  Medium  (6px below icon)

    Types + icons:
      🛏 Room
      🏠 Apartment
      🏡 House
      🏢 Office
      🏗 Flat

    SELECTED chip (Apartment shown as selected):
      Background: #0A0A0A
      Border: 1.5px solid #0A0A0A
      Icon color: #FFFFFF
      Label color: #FFFFFF


LISTING TITLE FIELD  (20px below type chips):

  Label: "Listing title *"
  DM Sans  12px  Medium  #6B6B6B

  Input: standard  56px  #F5F5F5  radius 14px  border #0A0A0A (focused)
  Value: "2BHK Apartment in Pulchowk"  DM Sans  15px  #0A0A0A
  
  Below input (right-aligned, 6px gap):
  "26 / 60"  DM Sans  11px  #AAAAAA  (character counter)


DESCRIPTION FIELD  (16px below title field):

  Label: "Description *"
  DM Sans  12px  Medium  #6B6B6B

  Textarea:
    Height: 110px  #F5F5F5  radius 14px
    Border: 1.5px solid #E8E8E8
    Padding: 14px 16px
    
    Value (pre-filled example):
    "Spacious 2BHK apartment with modern furnishings,
    24hr water supply, and great natural lighting.
    5 mins walk from Pulchowk Engineering College."
    DM Sans  14px  #0A0A0A  line-height 20px

  Bottom row of textarea (inside, bottom-right):
  "128 / 500"  DM Sans  11px  #AAAAAA


AVAILABILITY DATE  (16px below description):

  Label: "Available from *"
  DM Sans  12px  Medium  #6B6B6B

  Input: 56px  #F5F5F5  radius 14px
  Left: 📅 calendar icon  18px  #AAAAAA
  Value: "15 June 2026"  DM Sans  15px  #0A0A0A  (left-padded after icon)
  Right: ▾ chevron  14px  #AAAAAA


NEGOTIABLE TOGGLE ROW  (16px below date, no label above):

  Full width row  52px  no border
  Background: transparent

  Left:
    "Rent is negotiable"  DM Sans  15px  #0A0A0A
    "Tenants can discuss the final amount"
    DM Sans  12px  #AAAAAA  (6px below)

  Right: TOGGLE ON
    Width: 44px  Height: 26px  radius 999px
    Background: #0A0A0A
    White circle: 20px  right-positioned


═══════════════════════════════════════════════════════════
SCREEN 24 — ADD LISTING STEP 2: PROPERTY DETAILS
Frame name: "24 — Add Listing · Step 2"
═══════════════════════════════════════════════════════════

Eyebrow: "STEP 2 · PROPERTY DETAILS"

Section title:
  "Rooms, rent &"
  "facilities"
  DM Serif Display  26px  #0A0A0A  line-height 32px

12px gap

Body: "Accurate details help tenants find exactly what they need."
DM Sans  14px  #6B6B6B

────────────────────────────────────────
FORM CONTENT  (24px below title, 24px H-padding)
────────────────────────────────────────

RENT AMOUNT FIELD:

  Label: "Monthly rent (NPR) *"  DM Sans  12px  Medium  #6B6B6B

  Input: 56px  #F5F5F5  radius 14px  border 1.5px #0A0A0A (focused)
  Left prefix:
    "NPR"  DM Sans  14px  SemiBold  #AAAAAA
    Right of prefix: vertical divider  1px  #E8E8E8  24px tall
  Value: "18,000"  DM Sans  20px  SemiBold  #0A0A0A  (large, prominent)


ROOM COUNTERS  (20px below rent):

  Section label: "ROOM CONFIGURATION"
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px
  10px gap

  3 counter rows, each 52px, divider between (1px #F5F5F5):
  
  Counter card:
    Background: #FFFFFF  border: 1px solid #E8E8E8  radius: 14px

    Row 1 — Bedrooms:
      Left: 🛏 icon  18px  #0A0A0A  +  "Bedrooms"  DM Sans  15px  #0A0A0A
      Right: stepper
        − button: 32×32px  circle  #F5F5F5  border 1px #E8E8E8
          "−"  DM Sans  16px  #0A0A0A
        Gap: 20px
        Count: "2"  DM Sans  18px  SemiBold  #0A0A0A
        Gap: 20px
        + button: 32×32px  circle  #0A0A0A
          "+"  DM Sans  16px  #FFFFFF

    Row 2 — Bathrooms:
      Left: 🚿 + "Bathrooms"
      Right: same stepper  count: "1"

    Row 3 — Floor:
      Left: ⬆ + "Floor"
      Right: same stepper  count: "2"


AREA FIELD  (16px below counters):

  Label: "Property area"  DM Sans  12px  Medium  #6B6B6B

  Input: 56px  #F5F5F5  radius 14px
  Placeholder: "Enter area"  DM Sans  15px  #C0C0C0
  Right suffix: "sqft"  DM Sans  14px  #AAAAAA


FACILITIES SELECTOR  (20px below area):

  Label: "Facilities *"  DM Sans  12px  Medium  #6B6B6B
  Sub: "Select all that apply"  DM Sans  11px  #AAAAAA

  12px gap

  Facility chips grid: wrap layout, gap: 8px

  Each facility chip:
    Height: 38px  auto-width  padding: 0 12px  radius 999px
    Border: 1.5px solid #E8E8E8
    Background: #FFFFFF
    DM Sans  12px  Medium  #6B6B6B

    Icon left (12px, #AAAAAA) + gap 6px + label

    SELECTED chip style:
      Background: #E8F5EE
      Border: 1.5px solid #1A6B4A
      Icon + text: #1A6B4A

  Show 12 facility chips (some selected, some not):

    Selected (green):
    [💧 Water] [⚡ Electricity] [📶 WiFi] [🛋 Furnished]

    Unselected (default):
    [🚗 Parking] [🔥 Gas] [📹 CCTV] [🛗 Lift]
    [🌿 Balcony] [☀ Rooftop] [🔋 Solar] [🏍 Bike Parking]


═══════════════════════════════════════════════════════════
SCREEN 25 — ADD LISTING STEP 3: PHOTOS UPLOAD
Frame name: "25 — Add Listing · Step 3"
═══════════════════════════════════════════════════════════

Eyebrow: "STEP 3 · PROPERTY PHOTOS"

Section title:
  "Show your"
  "property's best"
  DM Serif Display  26px  #0A0A0A  line-height 32px

12px gap

Body: "Listings with 5+ photos get 3× more visit requests."
DM Sans  14px  #6B6B6B

────────────────────────────────────────
CONTENT  (24px below title, 24px H-padding)
────────────────────────────────────────

COVER PHOTO ZONE  (primary upload):

  Full width  200px tall
  Background: #F5F5F5
  Border: 2px dashed #C0C0C0
  Border-radius: 20px
  
  Show this zone as FILLED (photo uploaded):
    Replace dashed border with: border 2px solid #0A0A0A
    Background: #E8E3DC  (warm gray simulating a photo)
    
    Top-left badge overlay:
      "Cover"  DM Sans  11px  SemiBold  #FFFFFF
      Background: #0A0A0A  radius 999px  padding 4px 10px
      8px from top-left corner
    
    Top-right: remove/change button
      28×28px  rgba(0,0,0,0.5)  radius 999px  8px from top-right
      ✕  12px  #FFFFFF
    
    Bottom overlay (gradient + text):
      Background gradient: rgba(0,0,0,0) → rgba(0,0,0,0.5)
      "Main photo · Tenants see this first"
      DM Sans  12px  #FFFFFF  bottom-left  padding 10px

PHOTO COUNT ROW  (10px below cover zone):
  Left: "4 / 10 photos added"  DM Sans  13px  #0A0A0A
  Right: "Min 1 required"  DM Sans  11px  #AAAAAA


PHOTO GRID  (12px below count row):

  3-column grid  gap: 8px
  Each cell: width 104px  height 104px  radius 14px

  Cell 1 (filled):
    Background: #DDD8D0  (warm gray placeholder)
    Top-right: ✕ remove button  24×24px  rgba(0,0,0,0.5)  radius 999px  ✕ 10px #FFFFFF

  Cell 2 (filled):
    Background: #E0DDD5
    Top-right: ✕ button

  Cell 3 (filled):
    Background: #D8D3CB
    Top-right: ✕ button

  Cell 4 — ADD MORE (empty upload zone):
    Background: #F5F5F5
    Border: 1.5px dashed #D0D0D0
    Border-radius: 14px
    Inside:
      ➕  20px  #AAAAAA  centered
      "Add more"  DM Sans  10px  #AAAAAA  6px below

  Cell 5 — EMPTY (disabled hint):
    Background: #FAFAFA
    Border: 1px dashed #E8E8E8
    (shows remaining slots are available)

  Cell 6 — EMPTY (same as cell 5)


TIPS CARD  (16px below photo grid):

  Full width
  Background: #F5F5F5
  Border-radius: 14px
  Padding: 14px 16px

  Title row:
    💡 icon  14px  #0A0A0A  +  gap 8px
    "Photo tips"  DM Sans  14px  SemiBold  #0A0A0A

  10px gap

  3 tip rows (each 4px gap):
    •  8px  #AAAAAA  +  gap 8px  +  DM Sans  13px  #6B6B6B

    "Shoot in daylight for best results"
    "Include all rooms: bedroom, kitchen, bathroom"
    "Show the view from windows if possible"


FILE REQUIREMENTS  (12px below tips, centered):
  "JPEG or PNG  ·  Min 800×600px  ·  Max 10MB each"
  DM Sans  11px  #AAAAAA  centered


═══════════════════════════════════════════════════════════
SCREEN 26 — ADD LISTING STEP 4: LOCATION + PREVIEW
Frame name: "26 — Add Listing · Step 4"
═══════════════════════════════════════════════════════════

Eyebrow: "STEP 4 · LOCATION & REVIEW"

Section title:
  "Pin your"
  "location"
  DM Serif Display  26px  #0A0A0A  line-height 32px

12px gap

Body: "Exact address is kept private until you approve a visit."
DM Sans  14px  #6B6B6B

────────────────────────────────────────
CONTENT  (24px below title, 24px H-padding)
────────────────────────────────────────

MAP PIN AREA:

  Full width  200px tall
  Border-radius: 20px
  Overflow: hidden
  Border: 1.5px solid #E8E8E8

  MAP REPRESENTATION:
    Background: #E8EDDF  (light green-gray for map feel)
    
    Simulate a minimal map with simple shapes:
      Grid of subtle lines:
        Horizontal lines: every 40px  1px  #D8E0CE  (lighter)
        Vertical lines: every 50px  1px  #D8E0CE
      
      Road shapes (simple rectangles):
        A horizontal road: full width  8px  #FFFFFF  y: 80px
        A vertical road: 8px  full height  x: 160px
        A diagonal suggestion: thin lighter rectangle rotated
      
      Building blocks (small rectangles):
        3–4 small rectangles  #CDD5C4  radius 2px  scattered around
      
    Center of map:
      Location pin:
        Outer circle: 44×44px  #0A0A0A  radius 999px
        White inner ring: 36×36px  #FFFFFF  radius 999px  centered
        Black inner dot: 12×12px  #0A0A0A  centered
        Drop shadow: 0 4px 12px rgba(0,0,0,0.25)
      
      Below pin (8px gap, centered):
        "Drag to adjust"  DM Sans  11px  #FFFFFF
        Background: rgba(0,0,0,0.5)  radius 999px  padding 4px 10px


  LOCATE ME BUTTON (top-right of map, 8px from corner):
    32×32px  #FFFFFF  radius 8px  shadow: 0 2px 8px rgba(0,0,0,0.15)
    🎯 target icon  16px  #0A0A0A


PRIVACY NOTICE  (10px below map):
  Row: 🔒 icon  13px  #1A6B4A  +  gap 8px  +  text
  "Exact location only shared with approved tenants."
  DM Sans  12px  #1A6B4A


LOCALITY NAME FIELD  (16px below notice):

  Label: "Locality name *"
  Sub: "This is shown publicly to all tenants"
  DM Sans  11px  #AAAAAA  (4px below label)

  Input: 56px  #F5F5F5  radius 14px  border #0A0A0A (focused)
  Value: "Pulchowk, Lalitpur"  DM Sans  15px  #0A0A0A
  Right: ✓  14px  #1A6B4A


FULL ADDRESS FIELD  (14px below locality):

  Label: "Full address *"
  Sub: "Kept private — only shared after visit approval"
  DM Sans  11px  #AAAAAA
  Lock icon 🔒  11px  #AAAAAA  (inline with sub-label)

  Input: 56px  #F5F5F5  radius 14px
  Value: "123 Naya Bato, Near Engineering College"
  DM Sans  15px  #0A0A0A


LISTING PREVIEW CARD  (20px below address):

  Section label: "PREVIEW"
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px
  Sub: "How tenants will see your listing"
  DM Sans  12px  #AAAAAA  (4px below label)
  10px gap

  MINI PROPERTY CARD:
    Full width
    Background: #FFFFFF
    Border: 1px solid #E8E8E8
    Border-radius: 16px
    Overflow: hidden

    Photo area: full width  100px
    Background: #E8E3DC  (warm placeholder)
    Status chip overlay top-left:
      "● Available"  #DCFCE7 bg  #15803D text  DM Sans 10px
      Padding 3px 8px  radius 999px  8px from corner

    Content area: padding 12px 14px
      "2BHK Apartment"  DM Sans  15px  SemiBold  #0A0A0A
      "📍 Pulchowk, Lalitpur"  DM Sans  12px  #AAAAAA  (4px below)
      
      Specs row (8px below location, gap: 12px):
        "🛏 2"  "🚿 1"  "📐 450 sqft"
        DM Sans  12px  #6B6B6B each
      
      Bottom row (8px below specs):
        "NPR 18,000/mo"  DM Serif Display  16px  #0A0A0A
        Right: "Verified ✓"  DM Sans  11px  #1A6B4A
          Background: #E8F5EE  radius 999px  padding 3px 8px


PUBLISH BUTTON  (in shared bottom bar):
  Full width  56px  black pill
  "Publish Listing →"  DM Sans  16px  SemiBold  #FFFFFF

  Below button (8px, centered):
  "Your listing goes live immediately after publishing."
  DM Sans  11px  #AAAAAA  centered


═══════════════════════════════════════════════════════════
FINAL CHECKLIST
═══════════════════════════════════════════════════════════

□ Screen 21: Dashboard with 3 stat cards, alert card,
             3 property summaries, quick actions, activity feed
□ Screen 22: My Properties with filter tabs, 3 full management
             cards with image + stats + 3 action buttons
□ Screens 23–26: All share header + segmented progress bar
□ Screen 23: Type selector grid + title + description + date + toggle
□ Screen 24: Rent input + 3 room counters + area + 12 facility chips
□ Screen 25: Cover zone (filled) + 4-cell grid + tips card
□ Screen 26: Map simulation + 2 address fields + listing preview
□ Screens 21–22: Landlord dock floating at bottom (Listing active)
□ Screens 23–26: NO dock (add listing is a full-focus flow)
□ All screens: 390 × 844px · #FFFFFF background · 24px H-padding
□ Progress bar on screens 23–26 fills segment by segment
□ Step 4 publish button is black pill (not gray — all filled)
□ Facility chips: selected = green (#E8F5EE border #1A6B4A)
□ Room counters: − button gray, + button black
□ Cover photo zone shows filled state (not empty)
□ Map in screen 26 has pin + draggable hint + locate button
═══════════════════════════════════════════════════════════