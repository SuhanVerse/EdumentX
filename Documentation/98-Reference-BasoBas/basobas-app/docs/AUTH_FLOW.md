# BasoBas — Authentication & Onboarding Flow
## Every Step, Every Rule, Every Decision

---

## The Correct Flow Order

This is the only valid onboarding sequence.
No step can be skipped or reordered.

```
LANDING SCREEN
    ↓
PHONE ENTRY SCREEN
    ↓  [OTP sent via SMS]
OTP VERIFICATION SCREEN
    ↓  [new users only — returning users go directly to Home]
ROLE SELECTION SCREEN          ← Step 1 of 3
    ↓
PROFILE SETUP SCREEN           ← Step 2 of 3  (mandatory for all)
    ↓
    ├── IF user selected Landlord role:
    │   KYC LANDLORD SCREEN    ← Step 3 of 3  (mandatory, no skip ever)
    │
    └── IF user selected Tenant role only:
        KYC TENANT SCREEN      ← Step 3 of 3  (optional, skippable)
    ↓
ONBOARDING COMPLETE SCREEN
    ↓  [auto-navigates after 2 seconds]
HOME SCREEN
```

---

## Returning User Flow

Returning users skip all onboarding.
They go directly from OTP to Home.

```
LANDING SCREEN
    ↓  [tap "Log In with Phone Number"]
PHONE ENTRY SCREEN
    ↓  [OTP sent]
OTP VERIFICATION SCREEN
    ↓  [verified — existing user detected]
HOME SCREEN  (directly, no onboarding)
```

---

## Screen-by-Screen Breakdown

### Screen 01 — Landing Screen

The very first screen. Seen by all users on first open.
Returning users see this briefly then auto-navigate to Home.

```
Two CTAs:
  Primary:   "Get Started — It's Free"  → goes to Phone Entry
  Secondary: "Log In with Phone Number"  → goes to Phone Entry

No back arrow.
No dock navigation.
No progress indicator.
```

---

### Screen 02 — Phone Entry Screen

```
Input:
  Country code pill: 🇳🇵 +977  (not changeable, Nepal only)
  Phone number field: 10-digit numeric input

Validation:
  Must be exactly 10 digits after country code
  Must start with 97 or 98 (Nepal mobile format)

Submit:
  "Send Verification Code" button
  Disabled until 10 valid digits entered

Privacy note shown:
  "Your number is never shared with anyone."

No back arrow leads to Landing (back arrow shown but
navigates to Landing screen).
```

---

### Screen 03 — OTP Verification Screen

```
Input:
  6 boxes, one digit each
  JetBrains Mono font for digits
  Auto-submits on 6th digit (no button tap needed)
  Auto-advances focus to next box on each digit

OTP rules:
  Valid for:     60 seconds
  Max attempts:  3 per session
  Lockout:       5 minutes after 3 failed attempts
  Resend:        Available after 30-second cooldown
  Format:        6 numeric digits

Box states:
  Empty:   gray background, light border
  Active:  white background, black border, cursor shown
  Filled:  black background, white dot (hidden digit)
  Error:   red border on all 6 boxes simultaneously

On success:
  New user:      Navigate to Role Selection
  Returning:     Navigate to Home Screen

Security card shown:
  "BasoBas will never ask for your code."
```

---

### Screen 04 — Role Selection Screen (Step 1 of 3)

```
Step progress bar: 33% filled  "Step 1 of 3"

Two selection cards:

  Card 1 — Tenant:
    Icon: search/magnifier
    Title: "I'm Looking to Rent"
    Description: "Browse listings and schedule visits instantly."

  Card 2 — Landlord:
    Icon: house
    Title: "I Have a Property to List"
    Description: "List your space and find the right tenant."

Selection rules:
  Both cards are independently selectable
  At least one must be selected to continue
  Both can be selected simultaneously (dual role)

Selected state:   Black border + slightly different background
Unselected state: Light gray border

CTA: "Continue to Profile Setup →"
     Disabled until at least one card selected

Note below cards:
  "Not sure? You can add the other role later."
```

---

### Screen 05 — Profile Setup Screen (Step 2 of 3)

**This step is mandatory for ALL users — tenant and landlord.**
There is no skip option on this screen.

```
Step progress bar: 66% filled  "Step 2 of 3"

Fields:
  Profile photo:   Optional — camera or gallery picker
                   If skipped: avatar placeholder used
  Full name:       REQUIRED — marked with red asterisk *
  City:            REQUIRED — dropdown of Nepal cities/districts
  Property type preference chips: Optional
    [Room] [Apartment] [House] [Office]

IMPORTANT — No skip button anywhere on this screen.
The back arrow is shown but takes user back to Role Selection.
CTA: "Continue →"
Below CTA: "Step 2 of 3  ·  One more step"

After completing:
  IF user has Landlord role → go to KYC Landlord Screen
  IF user is Tenant only    → go to KYC Tenant Screen
```

---

### Screen 06 — KYC Landlord Screen (Step 3 of 3)

**Mandatory. No skip. No exceptions.**

```
Step progress bar: 100% filled  "Step 3 of 3"

Header right side:
  "Required" badge — amber background (#FFF3E0 · #B45309 text)
  NO skip button visible

Document upload:
  Two zones side by side: Front side · Back side
  Accepted documents:
    Nepal Citizenship Certificate (नागरिकता)
    National Identity Card (राष्ट्रिय परिचय पत्र)

Trust explanation card shown:
  Why verification is required
  Three benefits listed

CTA: "Submit & Complete Setup →"
Below CTA: "Review takes 1–2 business days.
            You can explore the app meanwhile."

After submit:
  Status becomes: UNDER_REVIEW
  User navigates to Onboarding Complete
  Can explore app but cannot publish listings
  until VERIFIED status is granted
```

---

### Screen 07 — KYC Tenant Screen (Step 3 of 3)

**Optional for tenants. Skippable.**

```
Step progress bar: 100% filled  "Step 3 of 3"

Header right side:
  "Optional" badge — green tint (#E8F5EE · #1A6B4A text)
  "Skip" text link visible — top right

Body text:
  "Optional for tenants. Verified profiles
  get faster visit approvals from landlords."

Benefit nudge card shown (tenant-specific):
  "⚡ Verified tenants get 3× faster approvals from landlords."

Same document upload as landlord screen.

TWO CTAs:
  Primary:   "Submit for Verification"  (black pill)
  Secondary: "Skip — I'll verify later" (ghost text, no border)

After skip:
  Navigate to Onboarding Complete
  KYC status remains UNVERIFIED
  Can still browse and submit visit requests
  Profile does not show verified badge
```

---

### Screen 44 — Onboarding Complete Screen

```
Auto-navigates to Home Screen after 2 seconds.
No manual action required.
Shows welcome message and confirmation.
```

---

## Step Progress Bar Rules

| Screen | Shows Bar | Filled | Label |
|--------|-----------|--------|-------|
| Landing | No | — | — |
| Phone Entry | No | — | — |
| OTP Verification | No | — | — |
| Role Selection | Yes | 33% | Step 1 of 3 |
| Profile Setup | Yes | 66% | Step 2 of 3 |
| KYC Landlord | Yes | 100% | Step 3 of 3 |
| KYC Tenant | Yes | 100% | Step 3 of 3 |

---

## OTP Technical Rules

```
Delivery:      SMS via Twilio Verify API
Length:        6 numeric digits
Validity:      60 seconds from delivery
Max attempts:  3 per session before lockout
Lockout:       5 minutes (then user can try again)
Resend:        Available after 30-second cooldown
Auto-submit:   Yes — submits on 6th digit without button tap
```

---

## Profile Setup Rules

```
Full name:     Required for all users, no exceptions
City:          Required for all users
Photo:         Optional — placeholder used if skipped
KYC:           Mandatory for landlords, optional for tenants

No user can complete onboarding without:
  A verified phone number
  A full name
  A selected city
  A selected role
```

---

## KYC Verification States

```
UNVERIFIED      Default state for all new users
UNDER_REVIEW    Document submitted, awaiting admin
VERIFIED        Approved — badge shown everywhere
REJECTED        Not accepted — can resubmit after 24 hours

Max lifetime attempts:  5 per account
Resubmit cooldown:      24 hours after rejection
Admin review SLA:       1–2 business days
```

---

## What Happens If User Closes App Mid-Onboarding

```
Before OTP verification:   Returns to Landing screen
After OTP, before profile: Returns to Profile Setup (auto-resumes)
After profile, before KYC: Returns to KYC screen (auto-resumes)
After KYC submitted:       Goes to Home (KYC review continues)
```
