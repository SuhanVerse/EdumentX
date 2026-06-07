---

```
Design a simple desktop layout in Figma for the BasoBas app 
screen viewer. Keep it clean and minimal — no complex effects.

FRAME SIZE: 1440 × 900px
FRAME NAME: "BasoBas — Screen Viewer"
BACKGROUND: #F4F4F0


════════════════════════════════════
LAYOUT: 2 columns side by side
════════════════════════════════════

LEFT SIDEBAR    300px wide
RIGHT CONTENT   fills rest (1140px)


────────────────────────────────────
LEFT SIDEBAR  (w: 300, h: 900)
────────────────────────────────────

Background: #FFFFFF
Right border: 1px solid #E8E8E8

SIDEBAR TOP (h: 64px, padding: 0 20px):
  Vertically centered
  "BasoBas"  DM Serif Display 20px #0A0A0A
  Below: "Screen Manager"  DM Sans 12px #999999
  Bottom border: 1px solid #E8E8E8

SCREEN LIST (padding: 16px 12px, top: 8px):

  Section label:
  "AUTH FLOW"
  DM Sans 11px #AAAAAA uppercase letter-spacing 1px
  margin: 0 8px 8px 8px

  7 screen items listed vertically
  Each item: height 48px, border-radius 8px, 
  padding 0 12px, margin-bottom 4px
  
  Each item contains:
    Left: number "01" DM Sans 12px bold
    Gap: 12px
    Screen name DM Sans 14px
    Right: small arrow →

  ITEM 1 — SELECTED:
    Background: #0A0A0A
    Number "01": #FFFFFF
    Name "Landing Screen": #FFFFFF
    Arrow: #FFFFFF

  ITEM 2 — DEFAULT:
    Background: transparent
    Number "02": #AAAAAA
    Name "Role Selection": #333333
    Arrow: #CCCCCC
    Hover visual: background #F5F5F5

  ITEM 3 — DEFAULT:
    Number "03"
    Name "Sign In"

  ITEM 4 — DEFAULT:
    Number "04"
    Name "Phone Entry"

  ITEM 5 — DEFAULT:
    Number "05"
    Name "OTP Verification"

  ITEM 6 — DEFAULT:
    Number "06"
    Name "Profile Setup — Tenant"

  ITEM 7 — DEFAULT:
    Number "07"
    Name "Profile Setup — Landlord"

SIDEBAR BOTTOM (position: absolute bottom 0):
  Height: 56px
  Top border: 1px solid #E8E8E8
  Padding: 0 20px
  "7 screens  ·  Auth Flow"
  DM Sans 12px #AAAAAA
  Vertically centered


────────────────────────────────────
RIGHT CONTENT  (x: 300, w: 1140, h: 900)
────────────────────────────────────

Background: #F4F4F0

TOP BAR (h: 56px, padding: 0 40px):
  Background: #FFFFFF
  Bottom border: 1px solid #E8E8E8
  
  Left: "Landing Screen"  DM Sans 15px SemiBold #0A0A0A
  Right: "390 × 844  ·  iPhone 14"  DM Sans 12px #AAAAAA

MAIN AREA (below top bar, h: 844px):
  Center everything horizontally and vertically

  IPHONE FRAME:
    Width: 300px, Height: 610px
    Background: #1A1A1A
    Border-radius: 48px
    Border: 2px solid #2E2E2E

    SCREEN INSIDE:
      Margin: 12px inside the frame on all sides
      Width: 276px, Height: 586px
      Background: #FFFFFF
      Border-radius: 38px
      Overflow: hidden

      DYNAMIC ISLAND:
        Width: 90px, Height: 26px
        Background: #0A0A0A
        Border-radius: 999px
        Centered horizontally
        Y position: 12px from screen top

      ── LANDING SCREEN CONTENT ──
      (represents the screen at this small scale)

      HERO AREA (top 60%, height: ~350px):
        Background: #2C3E35
        Full width
        
        Simple building silhouette inside:
          Rectangle #243028 centered, 180px wide 140px tall
          A few small rectangles on it for windows 
          in slightly lighter shade #2E3D34
        
        Bottom gradient fade:
          Rectangle full width, height 80px
          at bottom of hero area
          Fill: gradient top transparent → bottom #1A2820

        TOP LEFT: small pill
          Background: rgba(255,255,255,0.15)
          Border-radius: 999px
          Padding: 4px 8px
          Text: "Nepal's #1 Rental App"
          DM Sans 7px #FFFFFF

      WHITE PANEL (bottom 40%, height: ~236px):
        Background: #FFFFFF
        Border-radius: 20px 20px 0 0
        Y: starts at 350px
        Padding: 16px 14px

        "BasoBas"  DM Serif Display 13px #0A0A0A
        
        8px gap
        
        "Find your home."  DM Serif Display 14px #0A0A0A
        "Before it's gone."  DM Serif Display 14px #0A0A0A
        
        8px gap
        
        "Discover verified rentals near you."
        DM Sans 9px #888888
        
        14px gap
        
        PRIMARY BUTTON:
          Full width (248px), height 32px
          Background: #0A0A0A
          Border-radius: 999px
          Text: "Get Started"
          DM Sans 10px SemiBold #FFFFFF centered
        
        8px gap
        
        GHOST BUTTON:
          Full width, height 28px
          Text: "I already have an account"
          DM Sans 9px #555555 centered

  SCREEN LABEL (below iPhone, margin-top 20px, centered):
    "01 — Landing Screen"
    DM Sans 13px #888888

  LEFT ARROW BUTTON (vertically centered with iPhone, 
                     60px left of the iPhone):
    Width: 36px, Height: 36px
    Background: #FFFFFF
    Border: 1px solid #E8E8E8
    Border-radius: 999px
    "←" centered, 16px #333333

  RIGHT ARROW BUTTON (60px right of iPhone):
    Same style as left arrow
    "→"


════════════════════════════════════
THAT IS ALL.
Keep it exactly this simple.
No extra panels, no decorative 
effects, no complex shadows,
no dark theme.
Clean white sidebar, 
light gray canvas, 
iPhone centered, 
screen list on left.
════════════════════════════════════
```