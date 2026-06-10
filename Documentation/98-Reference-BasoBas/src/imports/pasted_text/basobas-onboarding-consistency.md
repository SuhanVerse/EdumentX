```
You are doing a FINAL CONSISTENCY PASS on all 7 screens of the 
BasoBas onboarding flow. Do not redesign anything from scratch.
Only fix inconsistencies, align the visual language, and ensure 
the flow feels like one continuous designed experience.

Open all 7 frames together and apply every change listed below.


════════════════════════════════════════════════════════
THE CORRECT SCREEN ORDER  (rename frames if needed)
════════════════════════════════════════════════════════

01 — Landing
02 — Phone Entry
03 — OTP Verification
04 — Role Selection        ← Step 1 of 3
05 — Profile Setup         ← Step 2 of 3
06 — KYC (Landlord)        ← Step 3 of 3  mandatory
07 — KYC (Tenant)          ← Step 3 of 3  skippable

This is the only valid order. No screen comes before or after
in any other sequence. Rename any frame that does not match.


════════════════════════════════════════════════════════
PART 1 — DESIGN TOKENS TO UNIFY ACROSS ALL 7 SCREENS
════════════════════════════════════════════════════════

Apply these values consistently on every single screen.
If any screen uses a different value, correct it now.

Background:       #FFFFFF  (all screens, no exceptions)
Canvas/Page bg:   #F4F4F0  (Figma canvas only, not screens)

Text Primary:     #0A0A0A
Text Secondary:   #6B6B6B
Text Tertiary:    #AAAAAA
Text Placeholder: #C0C0C0

Brand Green:      #1A6B4A
Brand Green Tint: #E8F5EE

Border Default:   #E8E8E8  (1.5px)
Border Active:    #0A0A0A  (1.5px, focused inputs)
Border Error:     #E53E3E  (1.5px)

Input Background: #F5F5F5
Input Height:     56px
Input Radius:     14px

Button Primary:   #0A0A0A fill, #FFFFFF text
Button Height:    56px
Button Radius:    999px (full pill)

Screen H-Padding: 24px (left and right on all screens)
Status Bar:       44px dark icons on all screens

Font Display:     DM Serif Display (headlines only)
Font UI:          DM Sans (everything else)


════════════════════════════════════════════════════════
PART 2 — SHARED COMPONENTS TO STANDARDIZE
════════════════════════════════════════════════════════

These 4 elements appear on multiple screens.
Make them pixel-identical across every screen they appear on.

──────────────────────────────────────────
A. BACK ARROW BUTTON  (screens 02 03 04 05 06 07)
──────────────────────────────────────────

Size:             44 × 44px
Shape:            circle
Background:       #F5F5F5
Border:           none
Icon:             ← left arrow, 18px, #0A0A0A, centered
Position:         x: 24px from left, y: 60px from top of frame
                  (24px below status bar)

Same on every screen. No exceptions.

──────────────────────────────────────────
B. STEP PROGRESS BAR  (screens 04 05 06 07)
──────────────────────────────────────────

This is the 3-step onboarding indicator.
It appears on screens 04 through 07 only.
It does NOT appear on screens 01 02 03.

Bar container:
  Width: full (342px, fills between H-padding)
  Height: 5px
  Background: #EFEFEF
  Border-radius: 999px
  Position: x: 24px, y: 16px below the back arrow
             (so y: 120px from top of frame approximately)

Filled portion:
  Background: #0A0A0A
  Border-radius: 999px
  Height: 5px

  Screen 04 — Role Selection:    width 33%  (114px filled)
  Screen 05 — Profile Setup:     width 66%  (226px filled)
  Screen 06 — KYC Landlord:      width 100% (342px filled)
  Screen 07 — KYC Tenant:        width 100% (342px filled)

Step label (below bar, 6px gap, right-aligned):
  Screen 04: "Step 1 of 3"
  Screen 05: "Step 2 of 3"
  Screen 06: "Step 3 of 3"
  Screen 07: "Step 3 of 3"
  Style: DM Sans 11px #AAAAAA, right edge at x: 366px

──────────────────────────────────────────
C. EYEBROW LABEL  (screens 02 03 04 05 06 07)
──────────────────────────────────────────

This small label sits at the top of every title section.

Style on all screens:
  DM Sans 11px SemiBold
  Color: #1A6B4A
  Letter-spacing: 0.8px
  Text: UPPERCASE

Content per screen:
  02: "PHONE VERIFICATION"
  03: "ENTER YOUR CODE"
  04: "STEP 1 · CHOOSE YOUR ROLE"
  05: "STEP 2 · YOUR PROFILE"
  06: "STEP 3 · IDENTITY VERIFICATION"
  07: "STEP 3 · IDENTITY VERIFICATION"

Position: always the first text element in the title section,
16px below the progress bar (or below back arrow on screens
02 and 03 that have no progress bar)

──────────────────────────────────────────
D. BOTTOM CTA AREA  (all screens 01 through 07)
──────────────────────────────────────────

The primary button always sits in the same position:
  Bottom of content, NOT fixed — flows naturally
  Minimum 40px from bottom safe area
  Full width (342px)
  Height: 56px
  Background: #0A0A0A
  Border-radius: 999px
  Label: DM Sans 16px SemiBold #FFFFFF centered

  Disabled state (where applicable):
  Background: #EFEFEF
  Label color: #AAAAAA

Secondary actions (skip, ghost text) always:
  Below the primary button
  Gap: 12px
  DM Sans 14px Medium #AAAAAA
  Centered
  No border, no background


════════════════════════════════════════════════════════
PART 3 — SCREEN BY SCREEN FINAL FIXES
════════════════════════════════════════════════════════

──────────────────────────────────────────
SCREEN 01 — Landing
──────────────────────────────────────────

No progress bar. No back arrow. No eyebrow.
This is the entry point — clean and standalone.

Check and fix:

Hero image area:
  Top 62% of screen (522px)
  Dark architectural gradient or photo placeholder
  Must have bottom fade: gradient rgba(0,0,0,0) → rgba(0,0,0,0.5)
  over last 100px of hero area

Floating chip (top-left of hero, y:68px x:24px):
  "🇳🇵 Nepal's #1 Rental App"
  Background: rgba(255,255,255,0.14)
  Border: 1px solid rgba(255,255,255,0.2)
  Border-radius: 999px
  Padding: 5px 12px
  DM Sans 10px SemiBold #FFFFFF

White panel (bottom 38%, starts at y:522px):
  Background: #FFFFFF
  Border-radius: 28px 28px 0 0
  Padding: 28px 24px 48px 24px

  Brand row:
    "BasoBas"  DM Serif Display 20px #0A0A0A
    + green dot 6px #1A6B4A, 4px to the right of wordmark

  Headline (12px below brand):
    "Find your home."
    "Before it's gone."
    DM Serif Display 30px #0A0A0A line-height 36px

  Subtext (14px below headline):
    "Browse verified rentals. Schedule visits.
    Find your home — before it's gone."
    DM Sans 15px #6B6B6B line-height 22px

  CTA group (24px below subtext):
    Primary button: "Get Started — It's Free"
    Gap: 12px
    Ghost text: "Log In with Phone Number"
    DM Sans 15px Medium #0A0A0A centered, no border

──────────────────────────────────────────
SCREEN 02 — Phone Entry
──────────────────────────────────────────

No progress bar. Has back arrow and eyebrow.

Check and fix:

Back arrow: at standard position (x:24 y:60)

Eyebrow: "PHONE VERIFICATION"  (standard style above)

Title section (16px below eyebrow):
  "What's your"
  "phone number?"
  DM Serif Display 30px #0A0A0A line-height 36px

  12px gap

  "We'll send a 6-digit verification code.
  No password needed — ever."
  DM Sans 15px #6B6B6B line-height 22px

Phone input group (32px below title):

  Country code pill:
    Width: 90px Height: 56px
    Background: #F5F5F5
    Border-radius: 14px
    Border: 1.5px solid #E8E8E8
    Inside: 🇳🇵 + "+977" DM Sans 15px SemiBold #0A0A0A
    ▾ chevron 10px #AAAAAA

  Gap: 10px

  Phone field (fill remaining width):
    Height: 56px
    Background: #F5F5F5
    Border-radius: 14px
    Border: 1.5px solid #0A0A0A  ← active/focused state
    Left padding: 16px
    Placeholder: "98XXXXXXXX"  DM Sans 16px #C0C0C0
    Filled: "9812345678"  DM Sans 16px SemiBold #0A0A0A

  Below input row (8px gap):
    "Nepal (+977)  ·  10 digits"
    DM Sans 12px #AAAAAA

Privacy note (18px below input):
  Row: 🔒 icon 13px #AAAAAA + gap 6px + text
  "Your number is never shared with anyone."
  DM Sans 12px #AAAAAA

Primary button (32px below privacy note):
  "Send Verification Code"
  Standard primary button style

  Disabled state shown (button gray)
  because example shows empty/partial input

──────────────────────────────────────────
SCREEN 03 — OTP Verification
──────────────────────────────────────────

No progress bar. Has back arrow and eyebrow.

Check and fix:

Back arrow: standard position

Eyebrow: "ENTER YOUR CODE"

Title section (16px below eyebrow):
  "Enter the"
  "6-digit code"
  DM Serif Display 30px #0A0A0A line-height 36px

  12px gap

  "Sent to +977 98XXXXX78"
  DM Sans 15px #6B6B6B

  8px gap

  "Wrong number?"
  DM Sans 14px SemiBold #1A6B4A
  Underline, tappable

OTP boxes (32px below title, centered horizontally):

  6 boxes in a row
  Each box: 48px wide × 58px tall
  Gap between each: 8px
  Total group centered in 390px screen

  Box style:
    Background: #F5F5F5
    Border: 1.5px solid #E8E8E8
    Border-radius: 12px

  Box states to show in the design:
    First 3 boxes = FILLED:
      Background: #0A0A0A
      Border: none
      Show white dot ● centered (14px, represents hidden digit)
    Box 4 = ACTIVE (cursor here):
      Background: #FFFFFF
      Border: 2px solid #0A0A0A
      Show blinking cursor: 2px × 22px line #0A0A0A centered
    Boxes 5 and 6 = EMPTY:
      Background: #F5F5F5
      Border: 1.5px solid #E8E8E8

Resend row (16px below boxes, centered):
  "Didn't receive it?"  DM Sans 13px #AAAAAA
  gap 6px
  "Resend in 00:45"  DM Sans 13px SemiBold #0A0A0A

Security note card (24px below resend):
  Background: #F5F5F5
  Border-radius: 12px
  Padding: 14px 16px
  Row: 🔐 icon 16px #AAAAAA + gap 10px + text block
  Title: "Keep this code private"
  DM Sans 14px SemiBold #0A0A0A
  Body: "BasoBas will never ask for your code."
  DM Sans 13px #6B6B6B

Primary button (24px below card):
  "Verify & Continue"
  Standard primary style (active — shown as green loading 
  state to represent auto-submit in progress):
    Background: #1A6B4A
    Show spinner icon (ti-loader) 18px white on left of label
    Label: "Verifying..."

──────────────────────────────────────────
SCREEN 04 — Role Selection  (Step 1 of 3)
──────────────────────────────────────────

Has back arrow + progress bar + eyebrow.

Check and fix:

Back arrow: standard position
Progress bar: 33% filled  (114px of 342px)
Step label: "Step 1 of 3"

Eyebrow (16px below bar): "STEP 1 · CHOOSE YOUR ROLE"

Title (14px below eyebrow):
  "How will you use"
  "BasoBas?"
  DM Serif Display 30px #0A0A0A line-height 36px

  10px gap

  "Your role shapes your experience.
  You can always change this later."
  DM Sans 15px #6B6B6B line-height 22px

Role cards (28px below title):

  TENANT CARD  ← show as SELECTED:
    Width: 342px  Height: 128px
    Background: #FFFFFF
    Border: 2px solid #0A0A0A
    Border-radius: 18px
    Padding: 18px 16px
    Shadow: 0px 4px 16px rgba(0,0,0,0.08)

    Left: icon box 44×44px #0A0A0A radius 12px
          🔍 icon 22px white inside
    Gap: 14px
    Text block:
      "I'm Looking to Rent"
      DM Sans 16px SemiBold #0A0A0A
      6px gap
      "Browse listings and schedule
      visits instantly."
      DM Sans 13px #6B6B6B line-height 17px
    Right: filled circle 22px #0A0A0A with ✓ 12px white

  Gap: 12px

  LANDLORD CARD  ← show as UNSELECTED:
    Same dimensions and structure
    Border: 1.5px solid #E8E8E8
    Shadow: 0px 2px 6px rgba(0,0,0,0.04)
    Icon box: #F5F5F5, 🏠 icon #6B6B6B
    Title: DM Sans 16px SemiBold #0A0A0A
    Body: "List your space and find
    the right tenant."
    Right: circle outline only, 22px, border 1.5px #E8E8E8

Note below cards (12px gap, centered):
  "Not sure? You can add the other role later."
  DM Sans 12px #AAAAAA

Primary button (24px below note):
  "Continue to Profile Setup →"

──────────────────────────────────────────
SCREEN 05 — Profile Setup  (Step 2 of 3)
──────────────────────────────────────────

Has back arrow + progress bar + eyebrow.
NO skip button anywhere on this screen.
Profile setup is mandatory for everyone.

Check and fix:

Back arrow: standard position
Progress bar: 66% filled  (226px of 342px)
Step label: "Step 2 of 3"

Eyebrow: "STEP 2 · YOUR PROFILE"

Title (14px below eyebrow):
  "Tell us about"
  "yourself"
  DM Serif Display 28px #0A0A0A line-height 34px

  10px gap

  "Helps landlords know who you are
  before approving your visits."
  DM Sans 14px #6B6B6B line-height 20px

Profile photo (24px below title, centered):
  Outer dashed ring: 100px circle
  Border: 2px dashed #E8E8E8
  Inner circle: 88px #F5F5F5
  Camera icon: 24px #AAAAAA centered
  "Add photo"  DM Sans 11px #AAAAAA  8px below icon
  No optional or required label — photo circle only

Form fields (24px below photo):

  FULL NAME FIELD:
  Label: "Full name *"
  Asterisk (*): #E53E3E
  Label style: DM Sans 12px Medium #6B6B6B
  Input: standard input style
  Placeholder: "Your full name"
  Right side when filled: ✓ 14px #1A6B4A

  Gap: 14px

  CITY FIELD:
  Label: "Your city *"
  Asterisk: #E53E3E
  Input: standard style with ▾ trailing chevron
  Placeholder: "Select your city"
  Filled: "Kathmandu"  DM Sans 15px #0A0A0A

Property preference chips (20px below fields):
  Label: "LOOKING FOR"
  DM Sans 10px #AAAAAA uppercase letter-spacing 1px
  Gap: 8px
  Chip row: [Room] [Apartment] [House] [Office]
  Inactive: #F5F5F5 bg, #6B6B6B text, radius 999px h:34px
  Active (Room selected): #0A0A0A bg, #FFFFFF text

Primary button (24px below chips):
  "Continue →"

  Below button (10px, centered):
  "Step 2 of 3  ·  One more step"
  DM Sans 12px #AAAAAA

NO skip link. NO secondary button. ONE action only.

──────────────────────────────────────────
SCREEN 06 — KYC Verification — Landlord
(Step 3 of 3 · Mandatory)
──────────────────────────────────────────

Has back arrow + progress bar (100%) + eyebrow.
NO skip option anywhere.

Check and fix:

Back arrow: standard position
Progress bar: 100% filled  #0A0A0A full width
Step label: "Step 3 of 3"

Header right side:
  Required badge pill:
  Background: #FFF3E0
  Text: "Required"
  Color: #B45309
  DM Sans 11px SemiBold
  Padding: 4px 12px radius 999px
  Position: right side of header, vertically aligned 
  with back arrow

Eyebrow: "STEP 3 · IDENTITY VERIFICATION"

Title (14px below eyebrow):
  "Verify your"
  "identity"
  DM Serif Display 28px #0A0A0A line-height 34px

  10px gap

  "Required before you can publish
  any property listing."
  DM Sans 14px #6B6B6B line-height 20px

Trust card (20px below title):
  Background: #F5F5F5
  Border-radius: 14px
  Padding: 16px
  Top row: shield icon 18px #1A6B4A + gap 10px +
  "Why we verify identity"
  DM Sans 14px SemiBold #0A0A0A
  12px gap
  Three check rows:
    ✓ 11px #1A6B4A + gap 8px + DM Sans 13px #6B6B6B
    "Builds trust with tenants"
    "Keeps BasoBas scam-free"
    "Your listings show Verified ✓ badge"

Document upload (18px below card):
  Label: "Upload document"  DM Sans 14px SemiBold #0A0A0A
  8px gap
  Two upload zones side by side gap: 12px
  Each: 163px wide × 100px tall
  Background: #F5F5F5
  Border: 1.5px dashed #CCCCCC
  Border-radius: 14px
  Inside: upload icon 18px #AAAAAA + label DM Sans 12px #6B6B6B
  Zone 1: "Front side"
  Zone 2: "Back side"

  Chips below (8px gap, centered):
  [🇳🇵 Citizenship] [NID Card]
  #F0F0F0 bg, #6B6B6B text, radius 999px

Primary button (20px below upload):
  "Submit & Complete Setup →"
  Standard primary style

  Below button (10px, centered):
  "Review takes 1–2 business days."
  DM Sans 12px #AAAAAA

NO skip. NO secondary action. ONE button only.

──────────────────────────────────────────
SCREEN 07 — KYC Verification — Tenant
(Step 3 of 3 · Optional)
──────────────────────────────────────────

IDENTICAL to Screen 06 in layout and design.
The only differences are:

1. HEADER RIGHT:
   Replace "Required" pill with "Optional" pill:
   Background: #E8F5EE
   Text: "Optional"
   Color: #1A6B4A
   
   Also show SKIP TEXT LINK:
   "Skip"  DM Sans 14px Medium #AAAAAA
   Right-aligned in header alongside optional pill
   "Skip" is to the right of the progress bar/step label

2. BODY TEXT below title:
   "Optional for tenants. Verified profiles
   get faster visit approvals."
   DM Sans 14px #6B6B6B

3. BENEFIT NUDGE CARD (replace trust card — same size):
   Keep the trust card exactly as Screen 06
   BUT add a small benefit card BELOW the trust card:
   Background: #E8F5EE
   Border-radius: 10px
   Padding: 10px 14px
   Row: ⚡ 13px #1A6B4A + gap 8px + text
   "Verified tenants get 3× faster
   approvals from landlords."
   DM Sans 13px #2E7D5A line-height 17px

4. BOTTOM CTA — TWO buttons (only tenant screen):
   Primary: "Submit for Verification"
   Standard black pill

   Gap: 10px

   Secondary: "Skip — I'll verify later"
   Background: transparent
   DM Sans 14px Medium #AAAAAA centered
   No border, no outline


════════════════════════════════════════════════════════
PART 4 — FLOW CONNECTOR ANNOTATIONS
════════════════════════════════════════════════════════

Add a small flow annotation label between each screen
(in the Figma canvas space between frames, not inside frames):

Between 01 and 02:
  "Tap 'Get Started' or 'Log In'"
  Arrow → 

Between 02 and 03:
  "Phone submitted → OTP sent via SMS"
  Arrow →

Between 03 and 04:
  "OTP verified → New user enters onboarding"
  Arrow →

Between 04 and 05:
  "Role selected → Both roles go to Profile Setup"
  Arrow →

Between 05 and 06:
  "Profile saved → Landlord goes to KYC (mandatory)"
  Separate arrow →

Between 05 and 07:
  "Profile saved → Tenant goes to KYC (optional)"
  Separate arrow →

Both 06 and 07 point to:
  "→ Home Screen"

Annotation style:
  DM Sans 11px #AAAAAA
  Arrow: simple → in same color
  Place in canvas between frames, not overlapping any frame


════════════════════════════════════════════════════════
PART 5 — FINAL CHECKLIST TO VERIFY
════════════════════════════════════════════════════════

After all edits confirm:

□ All 7 screens use #FFFFFF background
□ All screens use DM Sans for UI, DM Serif Display for headlines
□ Back arrow is identical on all screens 02–07
□ Progress bar appears ONLY on screens 04 05 06 07
□ Progress bar is 33% / 66% / 100% / 100% respectively
□ Step labels read "Step 1 of 3" through "Step 3 of 3"
□ Eyebrow label is green, uppercase, same size on all screens
□ Primary button is 56px black pill on all screens
□ No skip option on screens 01 02 03 04 05 06
□ Skip option exists ONLY on screen 07 (tenant KYC)
□ No Google login. No Apple login. Anywhere.
□ Screen 06 has "Required" amber badge
□ Screen 07 has "Optional" green badge
□ All input fields are 56px height, #F5F5F5 background
□ H-padding is 24px on every screen
□ Flow annotation arrows are present between frames

════════════════════════════════════════════════════════
DO NOT redesign any screen from scratch.
This is a consistency and flow correction pass only.
Fix what is inconsistent. Leave what is already correct.
════════════════════════════════════════════════════════
```