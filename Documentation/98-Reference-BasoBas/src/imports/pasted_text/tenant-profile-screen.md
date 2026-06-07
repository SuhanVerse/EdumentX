You are designing the Profile Section screens and the Bottom 
Navigation Dock for the BasoBas mobile rental app.

BasoBas is a minimal, premium rental marketplace app for Nepal.
The existing design language is already established — your job 
is to follow it precisely and extend it into these new screens.

═══════════════════════════════════════════════════════════
ESTABLISHED DESIGN LANGUAGE  (follow strictly)
═══════════════════════════════════════════════════════════

Background:         #FFFFFF  (all screens)
Page canvas:        #F4F4F0

Text Primary:       #0A0A0A
Text Secondary:     #6B6B6B
Text Tertiary:      #AAAAAA
Text Placeholder:   #C0C0C0

Brand:              #1A6B4A  (forest green, used sparingly)
Brand Light:        #E8F5EE  (green tint)

Border:             #E8E8E8  (1px or 1.5px)
Input Background:   #F5F5F5
Input Height:       56px
Input Radius:       14px

Primary Button:     #0A0A0A fill · #FFFFFF text · 56px · radius 999px
Font Display:       DM Serif Display  (headlines only)
Font UI:            DM Sans  (all interface text)
Screen H-Padding:   24px  (left and right on all screens)
Status Bar:         44px dark icons

Frame size for all screens: 390 × 844px


═══════════════════════════════════════════════════════════
PART A — FLOATING BOTTOM DOCK NAVIGATION
(Design this component first — it appears on all screens)
═══════════════════════════════════════════════════════════

Create two dock variants as Figma components.
Name them:
  "Dock / Tenant"
  "Dock / Landlord"

────────────────────────────────────────
DOCK VISUAL DESIGN  (apply to both variants)
────────────────────────────────────────

The dock is FLOATING — it does not span the full screen width.
It sits centered at the bottom, floating above the screen content
like a pill hovering over the page.

OUTER CONTAINER:
  Width:          312px
  Height:         64px
  Border-radius:  32px  (fully rounded pill shape)
  Position:       centered horizontally
                  28px above the bottom safe area

GLASS EFFECT:
  Background:     rgba(18, 18, 18, 0.72)
  Backdrop blur:  blur(24px) saturate(180%)
  
  Inner highlight border (top edge only):
    1px solid rgba(255, 255, 255, 0.10)
    applied only to top edge of the container
    gives a lit-from-above glass rim effect

  Outer glow shadow:
    0px 8px 32px rgba(0, 0, 0, 0.28)
    0px 2px 8px rgba(0, 0, 0, 0.20)
    0px 0px 0px 1px rgba(255,255,255,0.06)

  The result: a dark frosted glass pill floating
  at the bottom of the screen. Think liquid glass
  on a dark surface — deep black, slightly see-through,
  with a soft lit rim at the top edge.

────────────────────────────────────────
TAB ITEMS INSIDE DOCK
────────────────────────────────────────

Each tab item:
  Width:     78px  (312px ÷ 4 tabs)
  Height:    64px
  Centered content vertically and horizontally
  
  ICON:
    Size: 22 × 22px
    Color — Inactive: rgba(255, 255, 255, 0.35)
    Color — Active:   #FFFFFF
    
    Use these icons:
    Home:     house outline / filled
    Search:   magnifier outline / filled
    Visits:   clipboard outline / filled
    Profile:  person circle outline / filled
    Request:  inbox outline / filled
    Listing:  grid-2x2 outline / filled
  
  LABEL:
    Text below icon, 4px gap
    DM Sans  10px  SemiBold
    
    Inactive: rgba(255, 255, 255, 0.35)
    Active:   #FFFFFF
  
  ACTIVE STATE INDICATOR:
    A small pill under the icon ONLY (not the label)
    Width: 20px  Height: 3px
    Background: #FFFFFF
    Border-radius: 999px
    Positioned between icon and label
    Only shown on active tab
    
    Do NOT use a circle dot, underline the full width,
    or colored background block. Only this small white
    pill between icon and label on the active tab.


────────────────────────────────────────
VARIANT A — DOCK / TENANT
────────────────────────────────────────

4 tabs in this exact order:
  [🏠 Home]  [🔍 Search]  [📋 Visits]  [👤 Profile]

Show "Profile" as the ACTIVE tab
(since all screens in this prompt are Profile screens)


────────────────────────────────────────
VARIANT B — DOCK / LANDLORD
────────────────────────────────────────

4 tabs in this exact order:
  [🏠 Home]  [📬 Request]  [🏘 Listing]  [👤 Profile]

Show "Profile" as the ACTIVE tab


────────────────────────────────────────
DOCK PLACEMENT ON SCREENS
────────────────────────────────────────

Place the appropriate dock variant at the bottom of
every profile screen designed in this prompt.

The dock FLOATS above the screen content.
Below the dock: 16px gap to the bottom edge of frame.
The dock casts a soft shadow onto the screen below it.

Screen content scrolls BEHIND the dock —
the dock is always visible, always floating on top.


═══════════════════════════════════════════════════════════
PART B — SCREEN 32: TENANT PROFILE SCREEN
Frame name: "32 — Tenant Profile"
═══════════════════════════════════════════════════════════

Place the TENANT DOCK at the bottom.
Profile tab is active.

────────────────────────────────────────
HEADER  (not scrollable, fixed at top)
────────────────────────────────────────

Height: 56px
Background: #FFFFFF
Padding: 0 24px
Bottom border: 1px solid #E8E8E8

Left: "Profile"  DM Serif Display  22px  #0A0A0A

Right: Settings gear icon button
  Size: 40 × 40px
  Background: #F5F5F5
  Border-radius: 999px
  Icon: ⚙ gear  18px  #0A0A0A
  Tapping this opens Settings Screen (35)

────────────────────────────────────────
SCROLLABLE CONTENT
────────────────────────────────────────

PROFILE HERO CARD  (24px from header, 24px H-padding):
  Full width (342px)
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Border-radius: 20px
  Padding: 20px

  Top row:
    LEFT: Avatar circle
      Size: 72px
      Background: #F5F5F5  (placeholder)
      Border-radius: 999px
      Border: 2.5px solid #FFFFFF
      Shadow: 0 2px 8px rgba(0,0,0,0.10)
      
      Inside placeholder:
        Person silhouette icon  28px  #C0C0C0
      
      Bottom-right of avatar:
        Edit badge: 22×22px circle  #0A0A0A
        Pencil icon  10px  #FFFFFF
        Positioned overlapping bottom-right of avatar

    Gap: 16px

    RIGHT: Text block
      Full name: DM Sans  18px  SemiBold  #0A0A0A
      Example: "Sarina Shrestha"
      
      City row (6px below name):
        📍 icon  12px  #AAAAAA + gap 4px
        "Kathmandu, Nepal"
        DM Sans  13px  #6B6B6B
      
      Member since (4px below city):
        "Member since May 2025"
        DM Sans  12px  #AAAAAA

    Far right of top row:
      "Edit" ghost pill button
        Height: 30px
        Padding: 0 14px
        Border: 1px solid #E8E8E8
        Border-radius: 999px
        Text: "Edit"  DM Sans  12px  Medium  #0A0A0A

  Divider (16px below top row): 1px solid #F0F0F0

  Stats row (12px below divider):
    3 equal columns, centered content:
    
    Col 1:
      "8"  DM Sans  20px  SemiBold  #0A0A0A
      "Visits"  DM Sans  11px  #AAAAAA  (4px below)
    
    Vertical divider: 1px solid #F0F0F0  (between cols)
    
    Col 2:
      "12"  DM Sans  20px  SemiBold  #0A0A0A
      "Saved"  DM Sans  11px  #AAAAAA
    
    Vertical divider
    
    Col 3:
      "3"  DM Sans  20px  SemiBold  #0A0A0A
      "Reviews"  DM Sans  11px  #AAAAAA


BECOME A LANDLORD CARD (16px below hero card):
  Full width, height: 72px
  Background: #E8F5EE
  Border-radius: 16px
  Padding: 0 20px
  
  Left icon: 🏠 house  20px  #1A6B4A
  Gap: 12px
  
  Text block:
    "List your property"  DM Sans  14px  SemiBold  #0A0A0A
    "Become a landlord on BasoBas"  DM Sans  12px  #6B6B6B
  
  Right: → arrow  16px  #1A6B4A


MENU SECTIONS (20px below landlord card):

Each section has:
  Section label: DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px
  12px gap below label
  Menu items as a card group:
    Card: #FFFFFF  border: 1px solid #E8E8E8  radius: 16px
    Each item inside: 52px tall, 24px H-padding
    Divider between items: 1px solid #F5F5F5

SECTION — "ACCOUNT":

  Item 1:
    Left icon circle: 36×36px  #F5F5F5  radius 10px
    Icon inside: person  16px  #0A0A0A
    Label: "Edit Profile"  DM Sans  15px  #0A0A0A
    Right: → chevron  14px  #C0C0C0

  Item 2:
    Icon: bookmark
    Label: "Saved Properties"
    Right: chevron

  Item 3:
    Icon: calendar/clock
    Label: "Visit History"
    Right: chevron

  Item 4:
    Icon: star
    Label: "My Reviews"
    Right: chevron


SECTION — "PREFERENCES"  (20px below Account):

  Item 1:
    Icon: cpu/sparkle  (AI icon)
    Label: "AI Preferences"
    Sub-label: "Manage recommendation settings"
    DM Sans  11px  #AAAAAA  (below main label)
    Right: chevron

  Item 2:
    Icon: bell
    Label: "Notifications"
    Right: chevron
    (tapping opens the NOTIFICATION DRAWER — see Part F)


SECTION — "SUPPORT"  (20px below Preferences):

  Item 1:
    Icon: help circle
    Label: "Help & FAQ"
    Right: chevron

  Item 2:
    Icon: flag
    Label: "Report an Issue"
    Right: chevron


SECTION — "LEGAL"  (20px below Support):

  Item 1:
    Icon: file text
    Label: "Terms of Service"
    Right: external link icon  14px  #AAAAAA

  Item 2:
    Icon: shield
    Label: "Privacy Policy"
    Right: external link icon


LOG OUT  (20px below Legal, 24px H-padding):
  Full width item, no card background
  Just: 🚪 icon + "Log Out"  DM Sans  15px  #E53E3E
  Centered horizontally

App version (12px below logout, centered):
  "BasoBas v1.0.0"  DM Sans  11px  #C0C0C0


Floating dock: 28px above bottom edge, centered.


═══════════════════════════════════════════════════════════
PART C — SCREEN 33: LANDLORD PROFILE SCREEN
Frame name: "33 — Landlord Profile"
═══════════════════════════════════════════════════════════

Place the LANDLORD DOCK at the bottom.
Profile tab is active.

────────────────────────────────────────
HEADER
────────────────────────────────────────

Same as Screen 32 header.
Left: "Profile"
Right: settings gear button

────────────────────────────────────────
SCROLLABLE CONTENT
────────────────────────────────────────

LANDLORD HERO CARD (24px from header, 24px H-padding):
  Same structure as Tenant hero card with these changes:

  Below avatar + name row, before divider:
  
  VERIFICATION BADGE ROW (8px below name block):
    Verified state:
      Pill: background #E8F5EE  border-radius 999px  padding 5px 12px
      ✓ icon  11px  #1A6B4A + gap 6px +
      "Identity Verified"  DM Sans  12px  SemiBold  #1A6B4A
    
    Below pill (6px gap):
      "Citizenship Verified · May 2025"
      DM Sans  11px  #AAAAAA

  Stats row (3 columns):
    Col 1: "3"  "Listings"
    Col 2: "★ 4.8"  "Rating"  (star in #F5A623)
    Col 3: "24"  "Reviews"


TABS  (16px below hero card):
  Full width tab bar
  Two tabs: [My Listings]  [Reviews]
  
  Tab bar:
    Background: #F5F5F5
    Border-radius: 12px
    Padding: 4px
    Height: 44px
  
  Active tab:
    Background: #FFFFFF
    Border-radius: 9px
    Shadow: 0 1px 4px rgba(0,0,0,0.08)
    Text: DM Sans  14px  SemiBold  #0A0A0A
  
  Inactive tab:
    Background: transparent
    Text: DM Sans  14px  Medium  #AAAAAA

SHOW: "My Listings" tab as active


MY LISTINGS TAB CONTENT (16px below tabs):

  2-column grid of property cards
  Column gap: 12px  Row gap: 12px
  Each card: width 165px

  PROPERTY CARD (mini landlord version):
    Height: 200px
    Border-radius: 14px
    Border: 1px solid #E8E8E8
    Overflow: hidden
    
    TOP: photo area (110px tall)
      Background: #F0EDE8  (placeholder warm gray)
      Status chip: top-left overlay
        Pill: 22px tall  padding 3px 8px  radius 999px
        Show: "● Available"
        Background: #DCFCE7  text: #15803D  DM Sans  10px
      
    BOTTOM: info area (90px, padding 10px)
      Property name: DM Sans  12px  SemiBold  #0A0A0A
      Example: "2BHK Apartment"
      
      Location: DM Sans  11px  #AAAAAA  "Pulchowk"
      
      Price: DM Sans  13px  SemiBold  #0A0A0A
      "NPR 18k/mo"
      
      Stats row (4px below price):
        "5 requests"  DM Sans  10px  #6B6B6B
    
    Show 2 cards (one in each column)
    Below the 2 cards:
    "+ Add New Listing" button
      Full width  44px
      Background: #F5F5F5
      Border-radius: 12px
      Border: 1px dashed #CCCCCC
      Text: "+ Add New Listing"  DM Sans  13px  Medium  #AAAAAA
      Centered


MENU SECTION — ACCOUNT  (20px below listings content):
  (Same structure as Tenant profile menu items)
  
  Items:
    "Edit Profile"        → chevron
    "Verification Status" → shows current badge status
    "Visit History"       → chevron
    "Bank Details"        → chevron  (for future payment)

SECTION — "PREFERENCES"  (same structure, same notification item)

SECTION — "SUPPORT"  (same as tenant)

SECTION — "LEGAL"  (same as tenant)

LOG OUT  (same as tenant, same red color)

App version: "BasoBas v1.0.0"  centered bottom

Floating dock: landlord variant, 28px above bottom edge.


═══════════════════════════════════════════════════════════
PART D — SCREEN 34: EDIT PROFILE SCREEN
Frame name: "34 — Edit Profile"
═══════════════════════════════════════════════════════════

NO bottom dock on this screen.
This is a sub-screen, not a tab root.

────────────────────────────────────────
HEADER
────────────────────────────────────────

Height: 56px  Background: #FFFFFF
Bottom border: 1px solid #E8E8E8
Padding: 0 24px

Left: Back arrow button
  44×44px  circle  #F5F5F5
  ← arrow  18px  #0A0A0A

Center: "Edit Profile"  DM Sans  17px  SemiBold  #0A0A0A

Right: "Save" text button
  DM Sans  15px  SemiBold  #1A6B4A

────────────────────────────────────────
SCROLLABLE CONTENT  (24px H-padding)
────────────────────────────────────────

PHOTO SECTION (32px from header, centered):

  Avatar circle: 96px
  Background: #F0EDE8  (warm placeholder)
  Border-radius: 999px
  Border: 3px solid #FFFFFF
  Shadow: 0 4px 16px rgba(0,0,0,0.12)
  
  Inside: person silhouette  36px  #C0C0C0
  
  Below avatar (10px gap):
    "Change Photo"
    DM Sans  13px  SemiBold  #1A6B4A
    Centered, tappable

  Below "Change Photo" (6px gap):
    "JPEG or PNG · Max 5MB"
    DM Sans  11px  #AAAAAA
    Centered


FORM SECTION (28px below photo section):

  FORM GROUP LABEL: "PERSONAL INFO"
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px

  14px gap

  Field 1 — Full Name:
    Label: "Full name"  DM Sans  12px  Medium  #6B6B6B
    Input: 56px  #F5F5F5  radius 14px  border 1.5px #E8E8E8
    Value: "Sarina Shrestha"  DM Sans  15px  #0A0A0A
    Right: ✓ check  14px  #1A6B4A  (field is filled)

  16px gap

  Field 2 — Phone Number (read-only):
    Label: "Phone number"
    Input: 56px  background #F0F0F0  (lighter = read-only)
    Value: "+977 98123XXXXX"  DM Sans  15px  #0A0A0A
    Right: 🔒 lock  14px  #AAAAAA
    Below input (6px):
    "Verified ✓"  DM Sans  11px  SemiBold  #1A6B4A

  16px gap

  Field 3 — City:
    Label: "Your city"
    Input: 56px  #F5F5F5  radius 14px
    Value: "Kathmandu"  DM Sans  15px  #0A0A0A
    Right: ▾ chevron  14px  #AAAAAA  (dropdown)

  16px gap

  Field 4 — Bio (optional):
    Label: "Short bio  (optional)"
    Textarea: 96px tall  #F5F5F5  radius 14px
    Placeholder: "Tell landlords a bit about yourself..."
    DM Sans  15px  #C0C0C0
    Bottom-right: character count "0 / 120"
    DM Sans  11px  #AAAAAA


  FORM GROUP LABEL: "PREFERENCES"  (28px below bio)
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px

  14px gap

  "Looking for"  DM Sans  14px  SemiBold  #0A0A0A
  8px gap
  
  Property type chips (wrap, gap: 8px):
    [🛏 Room] [🏠 Apartment] [🏡 House] [🏢 Office]
    
    Inactive chip: #F5F5F5 bg  #6B6B6B text  radius 999px  h:36px  padding 0 14px
    Active chip (Room selected): #0A0A0A bg  #FFFFFF text
    DM Sans  13px  Medium

  16px gap

  "Budget range  (monthly)"  DM Sans  14px  SemiBold  #0A0A0A
  
  8px gap
  
  Range slider visual:
    Track: 4px  background #F0F0F0  radius 999px
    Filled portion: #0A0A0A  from left to ~40%
    Two handles: 20×20px circles  #0A0A0A  shadow: 0 2px 8px rgba(0,0,0,0.2)
  
  Below slider (8px gap):
    Left: "NPR 5,000"  DM Sans  12px  #6B6B6B
    Right: "NPR 30,000"  DM Sans  12px  #6B6B6B


DANGER ZONE (28px below preferences):
  
  Label: "DANGER ZONE"  DM Sans  11px  #E53E3E  uppercase  letter-spacing 1px
  12px gap
  
  Card:
    Border: 1px solid #FEE2E2
    Border-radius: 14px
    Padding: 16px
    
    "Delete Account"
    DM Sans  15px  SemiBold  #E53E3E
    
    "Permanently delete your account and all data.
    This cannot be undone."
    DM Sans  13px  #AAAAAA  line-height 18px
    
    12px gap
    
    "Delete Account" button:
      Height: 44px  full width
      Background: #FEE2E2
      Border-radius: 10px
      Text: "Delete My Account"  DM Sans  14px  SemiBold  #E53E3E


SAVE BUTTON (24px below danger zone):
  Full width  56px  black pill
  "Save Changes"  DM Sans  16px  SemiBold  #FFFFFF


═══════════════════════════════════════════════════════════
PART E — SCREEN 35: SETTINGS SCREEN
Frame name: "35 — Settings"
═══════════════════════════════════════════════════════════

NO bottom dock on this screen.

────────────────────────────────────────
HEADER
────────────────────────────────────────

Left: Back arrow (same as Edit Profile)
Center: "Settings"  DM Sans  17px  SemiBold  #0A0A0A
Right: empty

────────────────────────────────────────
SCROLLABLE CONTENT  (24px H-padding)
────────────────────────────────────────

Each settings section is a card group:
  Card: #FFFFFF  border: 1px solid #E8E8E8  radius: 16px
  Each row: 52px height  24px H-padding
  Divider between rows: 1px solid #F5F5F5
  
  Row structure:
    Left: icon circle 34×34px  #F5F5F5  radius 10px
          icon inside: 16px  #0A0A0A
    Gap: 12px
    Text: DM Sans  15px  #0A0A0A
    Right side: chevron OR toggle (defined below)


SECTION LABEL STYLE (applies to all):
  DM Sans  11px  #AAAAAA  uppercase  letter-spacing 1px
  Margin: 20px 0 10px  (top spacing from previous card)


SECTION — "ACCOUNT"  (24px from header):

  Row 1 — Language:
    Icon: globe
    Label: "Language"
    Right: value pill
      "English"  DM Sans  13px  #6B6B6B
      + ▾ chevron  14px  #AAAAAA

  Row 2 — Default City:
    Icon: map pin
    Label: "Default City"
    Right: "Kathmandu" + chevron


SECTION — "NOTIFICATIONS":

  Row 1 — Visit Updates:
    Icon: bell
    Label: "Visit Updates"
    Sub-label: "Approvals, rejections, reminders"
    DM Sans  11px  #AAAAAA  (below main label)
    Right: TOGGLE ON
    
  Row 2 — Property Alerts:
    Icon: home
    Label: "Property Alerts"
    Sub-label: "Saved property status changes"
    Right: TOGGLE ON
    
  Row 3 — AI Suggestions:
    Icon: sparkle / cpu (AI icon)
    Label: "AI Suggestions"
    Sub-label: "Personalized rental recommendations"
    Right: TOGGLE ON
    
  Row 4 — Reminders:
    Icon: clock
    Label: "Reminders"
    Sub-label: "Follow-up and visit day reminders"
    Right: TOGGLE OFF

  TOGGLE DESIGN:
    Width: 44px  Height: 26px  Border-radius: 999px
    
    ON state:
      Background: #0A0A0A
      White circle: 20px  positioned right  shadow: 0 1px 4px rgba(0,0,0,0.3)
    
    OFF state:
      Background: #E0E0E0
      White circle: 20px  positioned left


SECTION — "PRIVACY":

  Row 1 — Location Services:
    Icon: map pin
    Label: "Location Services"
    Right: "While Using" + chevron

  Row 2 — Data Sharing:
    Icon: shield
    Label: "Analytics & Data"
    Sub-label: "Help improve BasoBas"
    Right: TOGGLE ON

  Row 3 — Clear Search History:
    Icon: trash
    Label: "Clear Search History"
    Right: chevron (action)
    Text color: #0A0A0A (default, not red)


SECTION — "APPEARANCE":

  Row 1 — Theme:
    Icon: circle-half (contrast icon)
    Label: "App Theme"
    Right: value pill showing "Light" + chevron

  Row 2 — Text Size:
    Icon: type/text
    Label: "Text Size"
    Right: "Default" + chevron


SECTION — "SUPPORT":

  Row 1 — Help & FAQ:
    Icon: help circle
    Label: "Help & FAQ"
    Right: external link icon  14px  #AAAAAA

  Row 2 — Contact Support:
    Icon: message circle
    Label: "Contact Support"
    Right: external link icon

  Row 3 — Rate the App:
    Icon: star
    Label: "Rate BasoBas"
    Right: external link icon


SECTION — "LEGAL":

  Row 1 — Terms of Service
  Row 2 — Privacy Policy
  Row 3 — Open Source Licenses
  All with external link icon on right.


APP VERSION (24px below Legal, centered):
  "BasoBas  v1.0.0  ·  Build 100"
  DM Sans  12px  #C0C0C0

  Below (8px):
  "Made with ♥ in Nepal"
  DM Sans  11px  #AAAAAA


═══════════════════════════════════════════════════════════
PART F — NOTIFICATION DRAWER
(A bottom sheet that opens from both profile screens
 when user taps "Notifications" in the menu)
═══════════════════════════════════════════════════════════

Frame name: "Notification Drawer"  (390 × 844px, shown open)

Show the parent screen (Tenant Profile) behind the drawer
with a dark scrim overlay: rgba(0, 0, 0, 0.40)

DRAWER SHEET:
  Background: #FFFFFF
  Border-radius: 24px 24px 0 0
  Position: bottom of screen
  Height: 480px

  Handle bar (top center):
    36 × 4px  #E0E0E0  radius 999px
    12px from top of drawer

  DRAWER HEADER (20px below handle):
    Left: "Notifications"  DM Sans  18px  SemiBold  #0A0A0A
    Right: "Done"  DM Sans  15px  SemiBold  #1A6B4A

  SECTION LABEL: "STAY UPDATED"  (20px below header)
  DM Sans  10px  #AAAAAA  uppercase  letter-spacing 1px

  NOTIFICATION TOGGLE ROWS (12px below label):
  Each row: full width  60px tall  24px H-padding
  Divider: 1px solid #F5F5F5  between rows

    Row 1 — AI Rental Suggestions:
      Left:
        Icon circle: 40×40px  background #E8F5EE  radius 12px
        ✨ sparkle/AI icon  18px  #1A6B4A  inside circle
      Gap: 14px
      Text block:
        "AI Rental Suggestions"  DM Sans  15px  SemiBold  #0A0A0A
        "Smart picks based on your behavior"
        DM Sans  12px  #AAAAAA  (6px below)
      Right: TOGGLE ON  (#0A0A0A)

    Row 2 — Visit Updates:
      Icon circle: #FEF9C3  bell icon  #B45309
      "Visit Updates"
      "Approvals, rejections, reminders"
      Right: TOGGLE ON

    Row 3 — Property Status Alerts:
      Icon circle: #DBEAFE  home icon  #1E40AF
      "Property Status Alerts"
      "When saved properties change status"
      Right: TOGGLE ON

    Row 4 — Rental Reminders:
      Icon circle: #F3F4F6  clock icon  #6B6B6B
      "Rental Reminders"
      "Follow-up prompts after visits"
      Right: TOGGLE OFF  (#E0E0E0)

    Row 5 — BasoBas Updates:
      Icon circle: #F3F4F6  megaphone icon  #6B6B6B
      "BasoBas Updates"
      "New features and announcements"
      Right: TOGGLE OFF

  SECTION LABEL: "DELIVERY"  (20px below last row)
  DM Sans  10px  #AAAAAA  uppercase  letter-spacing 1px

    Row 6 — Push Notifications:
      Icon circle: #F3F4F6  phone icon  #6B6B6B
      "Push Notifications"
      "Receive alerts on your device"
      Right: TOGGLE ON

    Row 7 — In-App Alerts:
      Icon circle: #F3F4F6  bell icon  #6B6B6B
      "In-App Alerts"
      "Banners while using the app"
      Right: TOGGLE ON


═══════════════════════════════════════════════════════════
PART G — SCREEN 36: PUBLIC LANDLORD PROFILE
(As seen by a tenant browsing)
Frame name: "36 — Public Landlord Profile"
═══════════════════════════════════════════════════════════

Place the TENANT DOCK at the bottom.
No tab is active (this is accessed from a listing, not dock).

────────────────────────────────────────
HEADER
────────────────────────────────────────

Left: Back arrow  44×44px  #F5F5F5
Center: "Landlord Profile"  DM Sans  17px  SemiBold  #0A0A0A
Right: Share icon button  40×40px  #F5F5F5
  Share icon  18px  #0A0A0A

────────────────────────────────────────
SCROLLABLE CONTENT
────────────────────────────────────────

LANDLORD IDENTITY CARD (24px from header, 24px H-padding):
  Full width
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Border-radius: 20px
  Padding: 20px
  
  Row layout (top):
    LEFT: Avatar  80px  circle  #F0EDE8 placeholder
    
    Right of avatar (gap 16px):
      Name: DM Sans  20px  SemiBold  #0A0A0A
      "Bikash Sharma"
      
      Verification badge (8px below name):
        Pill: #E8F5EE  radius 999px  padding 5px 12px
        ✓  11px  #1A6B4A + "Identity Verified"
        DM Sans  12px  SemiBold  #1A6B4A
      
      "Member since 2023"  DM Sans  12px  #AAAAAA  (6px below badge)
  
  Divider: 1px solid #F0F0F0  (16px below top row)
  
  STATS ROW (12px below divider):
    4 equal columns:
    
    Col 1:
      "★ 4.8"  DM Sans  16px  SemiBold  #0A0A0A  (★ in #F5A623)
      "Rating"  DM Sans  11px  #AAAAAA
    
    Vertical divider
    
    Col 2:
      "62"  DM Sans  16px  SemiBold  #0A0A0A
      "Reviews"  DM Sans  11px  #AAAAAA
    
    Vertical divider
    
    Col 3:
      "3"  DM Sans  16px  SemiBold  #0A0A0A
      "Listings"  DM Sans  11px  #AAAAAA
    
    Vertical divider
    
    Col 4:
      "2yr"  DM Sans  16px  SemiBold  #0A0A0A
      "Active"  DM Sans  11px  #AAAAAA


TRUST INDICATORS (16px below identity card):
  Full width
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Border-radius: 16px
  Padding: 16px
  
  Title: "Why tenants trust Bikash"
  DM Sans  14px  SemiBold  #0A0A0A
  
  12px gap
  
  3 check rows:
    ✓  12px  #1A6B4A + gap 8px + DM Sans  13px  #6B6B6B
    "Identity verified with citizenship"
    "Average response time under 2 hours"
    "98% visit acceptance rate"


TABS  (16px below trust card):
  [Active Listings]  [Reviews]
  Same tab bar style as Screen 33
  Show "Active Listings" as active


ACTIVE LISTINGS TAB CONTENT (16px below tabs):
  
  2-column grid, same card style as Screen 33
  but with REQUEST VISIT button instead of edit:
  
  Each card bottom area:
    Below price:
    "Request Visit →"
    DM Sans  11px  SemiBold  #1A6B4A  (instead of request count)


REVIEWS TAB CONTENT (shown as inactive state):
  Shows when tapped (design the content anyway):
  
  Rating summary (16px from tab bar):
    Background: #FFFFFF  border: 1px solid #E8E8E8  radius: 16px
    Padding: 16px
    
    Left:
      "4.8"  DM Serif Display  40px  #0A0A0A
      "out of 5"  DM Sans  13px  #AAAAAA
      Row of 5 stars: ★★★★★  16px  #F5A623  (4.8 = last star ~80%)
      "62 reviews"  DM Sans  12px  #AAAAAA
    
    Right: star breakdown bars
      For each star (5 down to 1):
        "5 ★"  DM Sans  11px  #AAAAAA
        Bar: 100px  6px  radius 999px
          Fill: #0A0A0A (% represents share of reviews)
        "80%"  DM Sans  11px  #AAAAAA
      
      Approximate fills:
        5★: 80%  4★: 14%  3★: 4%  2★: 1%  1★: 1%
  
  REVIEW CARDS (12px below summary):
  
    Review Card 1:
      Background: #FFFFFF  border: 1px solid #E8E8E8  radius: 14px
      Padding: 16px
      
      Top row:
        Avatar: 40px circle  #F0EDE8 placeholder
        Gap: 12px
        Name: "Sarina S."  DM Sans  14px  SemiBold  #0A0A0A
        Below name:
          ★★★★★  12px  #F5A623  +  "May 2026"  DM Sans  11px  #AAAAAA
        Far right: "Verified Visit ✓"
          DM Sans  10px  SemiBold  #1A6B4A
          Background: #E8F5EE  radius 999px  padding 3px 8px
      
      Review text (12px below top row):
        "Great landlord! Very responsive and the property was 
        exactly as listed. Easy communication throughout."
        DM Sans  13px  #6B6B6B  line-height 18px
    
    16px gap
    
    Review Card 2:
      Same structure, different content:
      Name: "Rahul T."
      Stars: ★★★★☆  (4 of 5)
      Date: "April 2026"
      Text: "Good experience overall. Property was clean and 
      landlord was helpful during the visit process."
  
  "See all 62 reviews →"  (16px below last card, centered)
    DM Sans  14px  SemiBold  #1A6B4A


FLOATING DOCK: Tenant variant, 28px above bottom edge.


═══════════════════════════════════════════════════════════
FINAL CHECKLIST BEFORE FINISHING
═══════════════════════════════════════════════════════════

□ Tenant Dock component created with correct 4 tabs
□ Landlord Dock component created with correct 4 tabs
□ Dock is a floating pill, dark frosted glass, NOT full-width
□ Dock has correct shadow and top-edge rim highlight
□ Active tab shows small white pill indicator between icon + label
□ Screen 32: Tenant Profile — tenant dock, profile tab active
□ Screen 33: Landlord Profile — landlord dock, profile tab active
□ Screen 34: Edit Profile — NO dock (sub-screen)
□ Screen 35: Settings — NO dock (sub-screen)
□ Notification Drawer — shown as bottom sheet over Screen 32
□ Screen 36: Public Landlord Profile — tenant dock, no active tab
□ All screens use 390 × 844px frames
□ All screens use #FFFFFF background
□ All H-padding is exactly 24px
□ Toggle ON = #0A0A0A background
□ Toggle OFF = #E0E0E0 background
□ Brand green (#1A6B4A) used sparingly — only accents
□ No gradients, no colored backgrounds on main screens
□ DM Serif Display used ONLY for headlines
□ DM Sans used for all other text
═══════════════════════════════════════════════════════════