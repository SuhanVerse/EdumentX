Design a desktop website layout in Figma for the BasoBas mobile app 
design presentation board. This is an internal design management 
tool — a single-page layout where designers can see all app screens 
listed in a sidebar and view each screen inside a realistic iPhone 
mockup in the main content area.

FRAME SIZE: 1440 × 900px  (desktop, fixed)
FRAME NAME: "BasoBas — Screen Manager"
BACKGROUND: #0F0F0F  (near black, dark canvas)


═══════════════════════════════════════════════════════════
OVERALL LAYOUT STRUCTURE  (3 columns)
═══════════════════════════════════════════════════════════

Divide the 1440px frame into three vertical columns:

LEFT SIDEBAR       280px wide  |  fixed height 900px
CENTER STAGE       fills remaining space (~880px)
RIGHT PANEL        280px wide  |  fixed height 900px


───────────────────────────────────────────
LEFT SIDEBAR  (x: 0, y: 0, w: 280, h: 900)
───────────────────────────────────────────

Background: #181818
Right border: 1px solid #2A2A2A

SIDEBAR HEADER (top, h: 72px):
  Vertically centered content, 20px left padding
  
  Row layout:
    Brand mark: small green square (8×8px, #1A6B4A, radius 2px)
    gap: 10px
    "BasoBas"  →  DM Serif Display, 18px, #FFFFFF
    gap: 4px
    "Design"   →  DM Sans, 14px, #6B6B6B

  Bottom border: 1px solid #2A2A2A

SCREEN LIST (below header, scrollable):
  Left padding: 12px, right padding: 12px
  Top padding: 16px

  PHASE LABEL (non-interactive section header):
  "AUTH FLOW"
  DM Sans, 10px, #4A4A4A, letter-spacing: 1.5px, uppercase
  Margin: 0 0 8px 8px

  SCREEN ITEMS (list of clickable rows):
  
  Each screen item is a row:
  Height: 52px
  Border-radius: 10px
  Padding: 0 12px
  Margin-bottom: 4px
  
  Left side of each row:
    Screen number badge:
      Width: 24px, height: 24px
      Border-radius: 6px
      Background: #242424
      Text: "01" / "02" etc.
      DM Sans, 11px SemiBold, #6B6B6B
      Centered inside badge
    
    Gap: 12px
    
    Text block:
      Screen name: DM Sans, 14px Medium, #CCCCCC
      Screen type (below): DM Sans, 11px, #4A4A4A
  
  Right side of each row:
    Small arrow: → (Tabler icon ti-chevron-right, 14px, #3A3A3A)
  
  ─────────────────────────────
  SCREENS TO LIST (in order):
  ─────────────────────────────
  
  Item 1 — SELECTED STATE (active):
    Background: #1E2D26  (dark green tint)
    Border: 1px solid #1A6B4A
    Number badge bg: #1A6B4A, text: #FFFFFF
    Screen name: "Landing Screen"  color: #FFFFFF
    Type label: "Splash · Entry"  color: #3D7A5A
    Right arrow: #1A6B4A
    Left accent bar: 3px × 32px, #1A6B4A, radius 2px, 
                     vertically centered, x: 0 (flush left of item)
  
  Item 2 — DEFAULT STATE:
    Background: transparent (hover: #1E1E1E)
    Number badge: "02"
    Screen name: "Role Selection"
    Type label: "Onboarding · Step 1"
  
  Item 3 — DEFAULT STATE:
    Number badge: "03"
    Screen name: "Sign In"
    Type label: "Auth · Login options"
  
  Item 4 — LOCKED STATE (coming soon):
    Background: transparent
    Number badge: "04", bg: #1C1C1C, text: #333333
    Screen name: "Phone Entry"  color: #3A3A3A
    Type label: "Auth · OTP flow"  color: #2E2E2E
    Right side: small lock icon (ti-lock, 12px, #333333)
      instead of arrow
  
  Item 5 — LOCKED STATE:
    Number: "05"
    Screen name: "OTP Verification"  color: #3A3A3A
    Type label: "Auth · Code input"
  
  Item 6 — LOCKED STATE:
    Number: "06"
    Screen name: "Profile Setup"  color: #3A3A3A
    Type label: "Tenant · Onboarding"
  
  Item 7 — LOCKED STATE:
    Number: "07"
    Screen name: "KYC Verification"  color: #3A3A3A
    Type label: "Landlord · Required"

  ─── DIVIDER (20px margin top+bottom): ───
  Line: 1px solid #222222, full width

  Second phase label:
  "CORE SCREENS  ·  COMING SOON"
  DM Sans, 10px, #2E2E2E, letter-spacing: 1.5px, uppercase

  3 placeholder items (same locked state):
  Item 8: "Home Screen"       · "Discovery · Feed"
  Item 9: "Property Detail"   · "Listing · Full view"
  Item 10: "Map Explore"      · "Discovery · Map"

SIDEBAR FOOTER (bottom, h: 64px, position: absolute bottom):
  Top border: 1px solid #2A2A2A
  Background: #181818
  Padding: 0 20px
  
  Left: Version pill
    Background: #222222, radius: 999px, padding: 4px 10px
    Text: "v0.1 · Auth Flow"  DM Sans 11px, #4A4A4A
  
  Right: Screen count
    Text: "7 screens"  DM Sans 11px, #3A3A3A


───────────────────────────────────────────
CENTER STAGE  (x: 280, y: 0, w: 880, h: 900)
───────────────────────────────────────────

Background: #0F0F0F

Subtle grid pattern overlay (very faint):
  Dot grid: 24px spacing, dots 1px diameter, 
  color: #1E1E1E  (barely visible texture)

STAGE HEADER (top bar, h: 56px):
  Background: transparent
  Left padding: 40px, vertical center
  
  Left group:
    Current screen breadcrumb:
    "Auth Flow"  →  DM Sans 13px, #3A3A3A
    "  /  "      →  DM Sans 13px, #2A2A2A
    "Landing Screen"  →  DM Sans 13px Medium, #888888
  
  Right group (right: 40px):
    Zoom indicator pill:
      Background: #1A1A1A, radius 999px, padding: 6px 14px
      Border: 1px solid #2A2A2A
      Text: "100%"  DM Sans 12px, #4A4A4A
    
    Gap: 10px
    
    Small icon buttons (3 of them, 32×32px each):
      Each: #1A1A1A bg, 1px solid #2A2A2A border, radius 8px
      Icons: ti-copy, ti-arrows-maximize, ti-dots
      Icon color: #4A4A4A

IPHONE MOCKUP (centered in remaining 844px stage height):
  Position: center of stage area (below header)
  
  IPHONE 14 PRO FRAME:
    Outer dimensions: 290px × 590px
    Background: #1A1A1A  (dark titanium body)
    Border-radius: 52px
    Border: 1.5px solid #2E2E2E  (outer frame edge)
    
    Inner shadow: inset 0px 0px 0px 2px #141414
    Outer shadow: 
      0px 40px 80px rgba(0,0,0,0.6),
      0px 0px 0px 1px #0A0A0A
    
    SIDE BUTTONS (decorative):
      Left side: 
        Volume up: 3px × 28px rect, #252525, x: -3px, y: 160px, radius 2px
        Volume down: same, y: 196px
        Silent toggle: 3px × 18px, #252525, y: 130px
      Right side:
        Power button: 3px × 38px, #252525, x: 287px, y: 170px, radius 2px
    
    SCREEN AREA (inside frame):
      x: 14px from frame left
      y: 14px from frame top
      Width: 262px
      Height: 562px
      Border-radius: 40px
      Background: #FFFFFF
      Overflow: hidden (clip contents)
      
      DYNAMIC ISLAND (top center of screen):
        Width: 100px, Height: 28px
        Background: #0F0F0F
        Border-radius: 999px
        Position: centered horizontally, y: 12px from screen top
      
      ═══════════════════════════════════
      SCREEN CONTENT: Landing Screen
      (scaled to fit 262×562px, 
       representing 390×844px proportionally)
      ═══════════════════════════════════
      
      HERO IMAGE AREA (top 62% of screen: ~348px tall):
        Rectangle: full width, height 348px
        Background: linear placeholder using a 
          dark architectural gradient:
          Top: #2A3830 (dark teal-gray)
          Bottom: #0D1511 (near black)
        
        On top of gradient, represent a building silhouette:
          Simple geometric shapes in slightly lighter tones
          to suggest a modern building façade — rectangles, 
          squares representing windows, dark palette
        
        BOTTOM OF IMAGE — fade to dark:
          Gradient overlay: rgba(13,21,17,0) → rgba(13,21,17,0.7)
          Height: 120px, at bottom of hero image
        
        TOP LEFT CHIP (floating pill):
          y: 32px from screen top, x: 16px
          Background: rgba(255,255,255,0.12)
          Border: 1px solid rgba(255,255,255,0.15)
          Border-radius: 999px
          Padding: 5px 10px
          Text: "🇳🇵 Nepal's #1 Rental App"
          DM Sans 8px SemiBold, #FFFFFF
        
        DYNAMIC ISLAND already shown above (top center)
      
      WHITE CONTENT PANEL (bottom 38% of screen: ~214px):
        y: 348px, height: 214px
        Background: #FFFFFF
        Border-radius: 28px 28px 0 0
        
        Inside (padding: 20px 18px 16px):
          
          BRAND ROW:
            "BasoBas" + green dot
            DM Serif Display, 14px, #0A0A0A
            Green dot: 5px circle, #1A6B4A, 3px to the right
          
          HEADLINE (8px below brand):
            "Find your home."
            DM Serif Display, 16px, #0A0A0A, line-height 19px
            "Before it's gone."
            same style, below
          
          SUBTEXT (8px below headline):
            "Discover verified rentals near you."
            DM Sans, 10px, #6B6B6B, line-height 14px
          
          CTA GROUP (12px below subtext):
            PRIMARY BUTTON:
              Full width (226px), height: 34px
              Background: #0A0A0A
              Border-radius: 999px
              Text: "Get Started"
              DM Sans 11px SemiBold, #FFFFFF, centered
            
            Gap: 7px
            
            GHOST BUTTON:
              Full width, height: 28px
              Background: transparent
              Text: "I already have an account"
              DM Sans 10px Medium, #0A0A0A, centered


STAGE LABEL (below iPhone, 28px gap):
  Centered text:
  "Landing Screen  ·  01 / 07"
  DM Sans 12px, #2E2E2E
  
  Below (8px):
  "390 × 844px  ·  iPhone 14"
  DM Sans 11px, #252525


NAVIGATION ARROWS (left and right of iPhone, vertically centered with phone):
  
  LEFT ARROW BUTTON:
    Position: x: 320px from stage left, vertically centered
    Size: 40×40px circle
    Background: #1A1A1A
    Border: 1px solid #2A2A2A
    Icon: ti-chevron-left, 18px, #3A3A3A
  
  RIGHT ARROW BUTTON:
    Position: symmetric right side
    Same styling
    Icon: ti-chevron-right


───────────────────────────────────────────
RIGHT PANEL  (x: 1160, y: 0, w: 280, h: 900)
───────────────────────────────────────────

Background: #181818
Left border: 1px solid #2A2A2A

PANEL HEADER (h: 72px):
  Padding: 0 20px, vertically centered
  "Screen Details"  DM Sans 14px Medium, #666666
  Bottom border: 1px solid #2A2A2A

SCREEN INFO SECTION (padding: 20px, top: 16px):

  INFO CARD:
  Background: #111111
  Border: 1px solid #222222
  Border-radius: 12px
  Padding: 16px
  
  Row 1:
  Label: "SCREEN"  DM Sans 10px, #333333, uppercase, tracking 1px
  Value: "Landing Screen"  DM Sans 14px Medium, #CCCCCC
  Gap: 6px between label and value
  
  Divider: 1px solid #1E1E1E, margin: 12px 0
  
  Row 2:
  Label: "PHASE"
  Value: "Auth Flow"
  
  Divider
  
  Row 3:
  Label: "DIMENSIONS"
  Value: "390 × 844"  DM Sans 14px Medium, #CCCCCC
  Sub-value: "iPhone 14 · 3× scale"  DM Sans 11px, #3A3A3A
  
  Divider
  
  Row 4:
  Label: "STATUS"
  Value row:
    Green dot: 6px circle, #1A6B4A
    "Active"  DM Sans 13px Medium, #1A6B4A
    gap: 8px between dot and text

COMPONENTS SECTION (margin-top: 20px):
  
  Section label: "KEY ELEMENTS"
  DM Sans 10px, #333333, uppercase, tracking 1px
  Margin-bottom: 10px
  
  Component tags (wrapped row layout, gap: 6px):
  Each tag:
    Background: #1A1A1A
    Border: 1px solid #252525
    Border-radius: 6px
    Padding: 5px 10px
    Text: DM Sans 11px, #4A4A4A
  
  Tags to show:
  [Hero Image] [Brand Wordmark] [Headline] 
  [Primary CTA] [Ghost Button] [Status Chip]

DESIGN NOTES (margin-top: 20px):
  
  Section label: "NOTES"
  DM Sans 10px, #333333, uppercase, tracking 1px
  Margin-bottom: 8px
  
  Note card:
  Background: #111111
  Border: 1px solid #222222
  Border-left: 3px solid #1A6B4A
  Border-radius: 0 8px 8px 0
  Padding: 10px 12px
  
  Text: "Full-bleed hero with frosted white panel. 
  Black pill CTAs. DM Serif Display for headings."
  DM Sans 12px, #555555, line-height 17px

COPY BUTTON (margin-top: 20px):
  Full width
  Height: 40px
  Background: #1A1A1A
  Border: 1px solid #2A2A2A
  Border-radius: 10px
  
  Row inside (centered, gap: 8px):
  Icon: ti-copy, 14px, #4A4A4A
  Text: "Copy Frame"  DM Sans 13px Medium, #4A4A4A

EXPORT BUTTON (margin-top: 8px):
  Full width
  Height: 40px
  Background: #1E2D26
  Border: 1px solid #1A6B4A
  Border-radius: 10px
  
  Row inside (centered, gap: 8px):
  Icon: ti-download, 14px, #1A6B4A
  Text: "Export PNG"  DM Sans 13px Medium, #1A6B4A

PANEL FOOTER (position: absolute bottom, h: 64px):
  Top border: 1px solid #2A2A2A
  Padding: 0 20px
  Vertically centered
  
  Text: "BasoBas Design System · v0.1"
  DM Sans 11px, #2E2E2E


═══════════════════════════════════════════════════════════
ADDITIONAL DETAIL — SCREEN THUMBNAIL STRIP
(inside sidebar, below the screen list, above footer)
═══════════════════════════════════════════════════════════

A mini preview section showing the current and next screen:

Section label (x: 20, margin-top 16px):
"PREVIEW"  DM Sans 10px, #333333, uppercase, tracking 1px

Preview row (2 items, side by side, gap: 8px, padding: 0 12px):

  THUMBNAIL 1 — current (active):
    Width: 110px, height: 88px
    Background: #111111
    Border: 1.5px solid #1A6B4A
    Border-radius: 10px
    Overflow: hidden
    
    Inside: miniature representation of Landing screen
      Top 62%: dark green-gray rectangle (#2A3830)
      Bottom 38%: white rectangle (#FFFFFF)
    
    Below thumbnail:
    "Landing"  DM Sans 10px SemiBold, #CCCCCC
    "01"  DM Sans 10px, #1A6B4A

  THUMBNAIL 2 — next (inactive):
    Width: 110px, height: 88px
    Background: #111111
    Border: 1px solid #222222
    Border-radius: 10px
    
    Inside: miniature of Role Selection screen
      Full white rectangle
      Two small rounded rectangles inside (representing the 
      role selection cards) — dark rectangle #1A1A1A for each
    
    Below thumbnail:
    "Role Select"  DM Sans 10px, #555555
    "02"  DM Sans 10px, #333333


═══════════════════════════════════════════════════════════
OVERALL AESTHETIC NOTES
═══════════════════════════════════════════════════════════

The entire frame should feel like a dark professional design 
tool — think Figma's own dark canvas, or a premium dev tool.

Black/near-black background: #0F0F0F
Sidebar and panels: #181818 (slightly lighter than canvas)
Cards and wells: #111111 (darker inset feel)
Active/brand accent: #1A6B4A (single green, used sparingly)
All text is white/gray at varying opacities
No gradients except in the iPhone screen content
No colored backgrounds except the brand green accent

The iPhone mockup is the hero element — centered, lit from 
above (subtle glow on the frame edge), resting on the dark 
canvas. Everything else frames and supports it.

Font: DM Sans throughout the tool UI
Font: DM Serif Display only inside the iPhone screen content

The result should look like a real internal design tool that 
a designer at a funded startup would actually use daily.