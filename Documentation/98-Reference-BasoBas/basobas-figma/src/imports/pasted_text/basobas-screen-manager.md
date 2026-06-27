Design a desktop internal screen manager tool for a mobile app 
project called "BasoBas" — a rental marketplace app for Nepal.

This is a designer's internal tool — a simple, clean layout where 
all app screens are listed in a sidebar organized by phase, and the 
main area shows an iPhone mockup displaying a placeholder for the 
currently selected screen.

════════════════════════════════════════
FRAME
════════════════════════════════════════

Frame size:    1440 × 900px
Frame name:    "BasoBas — Screen Manager"
Background:    #F4F4F0


════════════════════════════════════════
LAYOUT — 2 COLUMNS
════════════════════════════════════════

Left sidebar:     320px wide,  full height 900px
Right main area:  1120px wide, full height 900px


════════════════════════════════════════
LEFT SIDEBAR
════════════════════════════════════════

Background:    #FFFFFF
Right border:  1px solid #E8E8E8


────────────────────────────────────────
SIDEBAR HEADER  (height: 64px)
────────────────────────────────────────

Padding: 0 20px
Vertically centered content

Left side:
  "BasoBas"
  DM Serif Display  18px  #0A0A0A

  Below (4px gap):
  "Screen Manager · 45 screens"
  DM Sans  11px  #AAAAAA

Right side:
  Small pill badge
  Background: #F0F0F0
  Border-radius: 999px
  Padding: 4px 10px
  Text: "v1.0"
  DM Sans  11px  #AAAAAA

Bottom border: 1px solid #E8E8E8


────────────────────────────────────────
SCREEN LIST  (scrollable area)
────────────────────────────────────────

Padding: 12px
Overflow: scroll (tall content)


List all screens grouped into phases.
Each phase has a section label followed
by its screen items listed vertically.


──────────────────
PHASE LABEL STYLE
──────────────────

Height: 28px
Padding: 0 8px
Margin-top: 16px
Margin-bottom: 4px

Text style:
  DM Sans  10px  #AAAAAA
  Uppercase  letter-spacing: 1.2px

Left colored dot (4px circle) before label text.
Dot color is unique per phase (listed below).


──────────────────
SCREEN ITEM STYLE
──────────────────

Height: 44px
Border-radius: 8px
Padding: 0 10px
Margin-bottom: 2px
Full width (296px)

Inside each item (horizontal row):

  LEFT: Number badge
    Size: 28 × 22px
    Background: #F5F5F5
    Border-radius: 6px
    Text: "01" "02" etc.
    DM Sans  11px SemiBold  #AAAAAA
    Centered inside badge

  Gap: 10px

  MIDDLE: Screen name
    DM Sans  13px  #333333
    Single line, truncate if too long

  RIGHT: Status dot
    6px circle
    Color based on status (see below)

STATUS DOT COLORS:
  Done:         #1A6B4A  (solid green)
  In Progress:  #F5A623  (amber)
  Not Started:  #E8E8E8  (light gray)

SELECTED ITEM STATE:
  Background: #0A0A0A
  Number badge: #1A1A1A bg, #FFFFFF text
  Screen name: #FFFFFF
  Status dot: white
  Border-radius: 8px

DEFAULT ITEM STATE:
  Background: transparent
  On hover: #F5F5F5

LOCKED ITEM STATE (future screens):
  Number badge text: #CCCCCC
  Screen name: #CCCCCC
  No status dot — show 🔒 lock icon (10px #DDDDDD) on right


──────────────────────────────────────────────
ALL SCREENS TO LIST (in exact order below)
──────────────────────────────────────────────


PHASE 1 — AUTH & ONBOARDING
Dot color: #1A6B4A (green)
7 screens

  01  Landing Screen              Done
  02  Phone Entry                 Done
  03  OTP Verification            Done
  04  Role Selection              Done
  05  Profile Setup               Done
  06  KYC — Landlord              Done
  07  KYC — Tenant                Done


PHASE 2 — TENANT CORE
Dot color: #3B82F6 (blue)
8 screens

  08  Home Screen                 Not Started
  09  Search Results              Not Started
  10  Map Screen                  Not Started
  11  Property Detail             Not Started
  12  Schedule Visit Sheet        Not Started
  13  Visit Confirmed             Not Started
  14  Notifications               Not Started
  15  Saved Properties            Not Started


PHASE 3 — TENANT VISITS
Dot color: #8B5CF6 (purple)
5 screens

  16  My Visits                   Not Started
  17  Visit Detail — Pending      Not Started
  18  Visit Detail — Accepted     Not Started
  19  Visit Detail — Rescheduled  Not Started
  20  Post Visit Follow Up        Not Started


PHASE 4 — LANDLORD LISTINGS
Dot color: #F5A623 (amber)
6 screens

  21  Landlord Dashboard          Not Started
  22  My Properties               Not Started
  23  Add Listing — Step 1        Not Started
  24  Add Listing — Step 2        Not Started
  25  Add Listing — Step 3        Not Started
  26  Add Listing — Step 4        Not Started


PHASE 5 — LANDLORD REQUESTS
Dot color: #EF4444 (red)
5 screens

  27  Visit Requests              Not Started
  28  Request Detail              Not Started
  29  Reschedule Screen           Not Started
  30  All Applicants              Not Started
  31  Landlord Follow Up          Not Started


PHASE 6 — PROFILE & ACCOUNT
Dot color: #14B8A6 (teal)
5 screens

  32  Tenant Profile              Not Started
  33  Landlord Profile            Not Started
  34  Edit Profile                Not Started
  35  Settings                    Not Started
  36  Public Landlord Profile     Not Started


PHASE 7 — RATINGS & REVIEWS
Dot color: #F59E0B (yellow)
2 screens

  37  Write a Review              Not Started
  38  All Reviews                 Not Started


PHASE 8 — NOTIFICATIONS
Dot color: #6366F1 (indigo)
1 screen

  39  Notifications Screen        Not Started


PHASE 9 — VERIFICATION
Dot color: #10B981 (emerald)
2 screens

  40  KYC Status Screen           Not Started
  41  Verification Rejected       Not Started


PHASE 10 — UTILITY SCREENS
Dot color: #9CA3AF (gray)
4 screens

  42  Empty State — No Results    Not Started
  43  Property No Longer Available Not Started
  44  Onboarding Complete         Not Started
  45  Error / Offline Screen      Not Started


────────────────────────────────────────
SIDEBAR FOOTER  (height: 56px)
────────────────────────────────────────

Position: bottom of sidebar
Top border: 1px solid #E8E8E8
Background: #FFFFFF
Padding: 0 20px
Vertically centered

Left side:
  Progress summary text:
  "7 done  ·  38 remaining"
  DM Sans  12px  #AAAAAA

Right side:
  Small mini progress bar:
    Width: 80px  Height: 4px
    Background: #F0F0F0
    Border-radius: 999px
    Filled: 15% (7 of 45 done)
    Fill color: #1A6B4A
    Border-radius: 999px


════════════════════════════════════════
RIGHT MAIN AREA
════════════════════════════════════════

Background: #F4F4F0


────────────────────────────────────────
TOP BAR  (height: 52px)
────────────────────────────────────────

Background: #FFFFFF
Bottom border: 1px solid #E8E8E8
Padding: 0 32px

Left side (vertically centered):
  Phase label + screen name as breadcrumb:

  "Auth & Onboarding"
  DM Sans  13px  #AAAAAA

  "  /  "
  DM Sans  13px  #DDDDDD

  "Landing Screen"
  DM Sans  13px SemiBold  #0A0A0A

Right side (vertically centered):
  Three small items in a row, gap: 16px

  Item 1:
    "390 × 844"
    DM Sans  12px  #AAAAAA

  Item 2:
    "iPhone 14"
    DM Sans  12px  #AAAAAA

  Item 3:
    Screen number badge:
    Background: #F0F0F0
    Border-radius: 6px
    Padding: 3px 8px
    "01 / 45"
    DM Sans  11px SemiBold  #888888


────────────────────────────────────────
MAIN STAGE AREA  (fills remaining height)
────────────────────────────────────────

Everything in this area is centered both
horizontally and vertically.


IPHONE FRAME:
  Outer size:      290 × 592px
  Background:      #1C1C1E
  Border-radius:   50px
  Border:          2px solid #2C2C2E

  Side button left (decorative):
    3 × 56px  #2A2A2C  radius 2px
    x: -3px   y: 168px

  Side button right (decorative):
    3 × 68px  #2A2A2C  radius 2px
    x: 289px  y: 188px

  SCREEN INSIDE THE FRAME:
    Margin inside frame: 10px all sides
    Width:  270px
    Height: 572px
    Background: #FFFFFF
    Border-radius: 42px
    Overflow: hidden

    DYNAMIC ISLAND (top of screen):
      Width: 88px  Height: 24px
      Background: #0A0A0A
      Border-radius: 999px
      Centered horizontally
      Y position: 10px from screen top

    SCREEN PLACEHOLDER CONTENT:
    (This represents the currently selected
    screen — Landing Screen — at small scale)

    HERO AREA (top 60%  ≈  343px):
      Background: #2C3830
      Full width

      Centered inside hero:
        Main rectangle (building body):
          170 × 130px  #253229  radius 6px
          Centered horizontally  y: 80px

        Window grid on building (3×3):
          Each window: 22 × 18px  #1E2B23  radius 2px
          Arranged in 3 columns × 3 rows
          Gap: 10px between windows
          Centered on building face

        Ground base rectangle:
          Full width  12px tall  #1E2923
          At very bottom of hero area

      FLOATING CHIP (top-left of hero):
        x: 16px  y: 48px
        Background: rgba(255,255,255,0.12)
        Border: 1px solid rgba(255,255,255,0.15)
        Border-radius: 999px
        Padding: 4px 8px
        Text: "Nepal's #1 Rental App"
        DM Sans  7px  #FFFFFF

    WHITE CONTENT PANEL (bottom 40%  ≈  229px):
      Background: #FFFFFF
      Border-radius: 20px 20px 0 0
      Y: starts at 343px
      Padding: 16px 14px 20px 14px

      "BasoBas"
      DM Serif Display  13px  #0A0A0A

      Gap: 8px

      "Find your home."
      DM Serif Display  14px  #0A0A0A  line-height: 17px

      "Before it's gone."
      DM Serif Display  14px  #0A0A0A  line-height: 17px

      Gap: 8px

      "Discover verified rentals near you."
      DM Sans  9px  #888888

      Gap: 14px

      PRIMARY BUTTON:
        Width: 242px  Height: 32px
        Background: #0A0A0A
        Border-radius: 999px
        Text: "Get Started — It's Free"
        DM Sans  10px SemiBold  #FFFFFF  centered

      Gap: 8px

      GHOST BUTTON:
        Width: 242px  Height: 26px
        Background: transparent
        Text: "Log In with Phone Number"
        DM Sans  9px  #555555  centered


────────────────────────────────────────
BELOW IPHONE  (centered, 20px below frame)
────────────────────────────────────────

Screen label:
  "01 — Landing Screen"
  DM Sans  13px  #888888
  Centered

Gap: 6px

Phase label:
  "Auth & Onboarding  ·  Phase 1"
  DM Sans  11px  #BBBBBB
  Centered


────────────────────────────────────────
NAVIGATION ARROWS
────────────────────────────────────────

Left arrow button:
  Size: 36 × 36px
  Shape: circle
  Background: #FFFFFF
  Border: 1px solid #E8E8E8
  Icon: ← left arrow  16px  #444444  centered
  Position: vertically centered with iPhone
             x: 80px from left edge of main area

Right arrow button:
  Same style as left
  Icon: → right arrow
  Position: mirror of left on right side
             x: 80px from right edge of main area


────────────────────────────────────────
BOTTOM PHASE TABS
(below the iPhone label, 28px gap)
────────────────────────────────────────

A horizontal row of phase indicator pills
centered in the main area.

10 pills total, one per phase.
Each pill: height 6px, width 28px
Border-radius: 999px
Gap between pills: 5px

Pill colors (match phase dot colors):
  Phase 1:  #0A0A0A  (active — solid black, wider: 52px)
  Phase 2:  #E8E8E8
  Phase 3:  #E8E8E8
  Phase 4:  #E8E8E8
  Phase 5:  #E8E8E8
  Phase 6:  #E8E8E8
  Phase 7:  #E8E8E8
  Phase 8:  #E8E8E8
  Phase 9:  #E8E8E8
  Phase 10: #E8E8E8

Active pill (Phase 1) is wider: 52px
All others: 28px


════════════════════════════════════════
FONTS TO USE
════════════════════════════════════════

All sidebar and tool UI text:
  DM Sans (Regular 400 / Medium 500 / SemiBold 600)

All screen content inside iPhone:
  DM Serif Display for headlines
  DM Sans for body and UI

No other fonts.


════════════════════════════════════════
WHAT THIS TOOL DOES
════════════════════════════════════════

This is a static design reference layout.
It is NOT interactive in code — it is a
Figma frame that designers use to:

1. See all 45 screens organized by phase
   in the left sidebar

2. View the currently selected screen
   inside a realistic iPhone frame in
   the center

3. Track progress with status dots
   (Done / In Progress / Not Started)

4. Navigate between screens using the
   left and right arrow buttons

5. Know exactly which phase and screen
   number they are working on

Keep the design clean, minimal, and 
professional. This is an internal tool —
not a public-facing product. It should 
feel like a Figma plugin or Notion page.

White sidebar. Light gray canvas.
Dark iPhone frame. Simple typography.
No gradients. No decorative effects.
No complex shadows. Just clean layout.
════════════════════════════════════════