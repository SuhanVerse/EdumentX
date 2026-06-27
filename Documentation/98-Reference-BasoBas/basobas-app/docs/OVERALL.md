# BasoBas — Project Documentation Index
## Rental Marketplace App for Nepal · Version 1.0

> **Start here.** This file is the entry point for every person
> or AI agent working on this project. Read this first, then
> navigate to the specific doc you need.

---

## What is BasoBas?

**BasoBas** (बासोबास) means *dwelling* or *residence* in Nepali.

It is a mobile-first rental property marketplace for Nepal that
directly connects tenants searching for rooms with landlords who
have properties available — with zero broker involvement and
zero commission on any transaction.

**The one-line pitch:**
> "Find your home. Before it's gone."

---

## The Problem in One Paragraph

In Nepal, renting a room requires paying a broker one large amount — for a phone
introduction. Good rooms disappear within hours. Landlords
share their exact address with unscreened strangers. Tenants
waste weeks visiting the wrong properties. BasoBas replaces
all of this with a structured, verified, privacy-preserving
digital platform where tenants and landlords work directly.

---

## Documentation Files

| File | What It Covers |
|------|---------------|
| `PRODUCT_VISION.md` | Vision, problem, users, core principles |
| `FEATURES.md` | Complete feature list (free + pro) |
| `AUTH_FLOW.md` | Onboarding, OTP, role selection, KYC |
| `TENANT_EXPERIENCE.md` | Everything the tenant sees and does |
| `LANDLORD_EXPERIENCE.md` | Everything the landlord sees and does |
| `VISIT_WORKFLOW.md` | The core visit request lifecycle ← read this |
| `PROPERTY_SYSTEM.md` | Property types, status, facilities, rules |
| `NOTIFICATIONS.md` | All notification types and display rules |
| `REVIEWS.md` | Ratings and reviews system |
| `VERIFICATION.md` | Landlord and tenant KYC system |
| `AI_SUGGESTIONS.md` | AI recommendation engine |
| `PRO_PLAN.md` | Pro plan — tenant only, 5 features |
| `NAVIGATION.md` | Full navigation structure and screen map |
| `SCREENS.md` | All 48 screens with phase groupings |
| `DESIGN_LANGUAGE.md` | Colors, fonts, spacing, components |
| `BUSINESS_RULES.md` | All constraints and rules |
| `DECISIONS_LOG.md` | Every product decision and its reason |

---

## Critical Rules — Read Before Anything Else

```
1. The exact property address is NEVER shown to any tenant
   unless their specific visit request status is ACCEPTED.
   This rule cannot be broken for any reason.

2. Authentication is phone number OTP only.
   No Google. No Apple. No email. No password.

3. The Pro plan is for TENANTS ONLY.
   There is no landlord Pro plan.

4. Profile setup (name + city) is mandatory for ALL users.
   Only the KYC step can be skipped, and only by tenants.

5. Landlords cannot publish any listing without
   completing KYC identity verification first.
```

---

## Platform

```
App type:      Mobile (iOS + Android)
Framework:     React Native with Expo
Market:        Nepal — Kathmandu Valley launch
Currency:      Nepalese Rupee (NPR / रु)
Phone format:  +977 (Nepal only)
Language:      English primary · Nepali secondary
Total screens: 48
```

---

## Reading Order by Role

**For a developer building a feature:**
1. This README
2. `BUSINESS_RULES.md`
3. `VISIT_WORKFLOW.md` (if touching visits)
4. The specific feature doc

**For a designer:**
1. This README
2. `DESIGN_LANGUAGE.md`
3. `SCREENS.md`
4. `NAVIGATION.md`

**For an AI coding agent:**
1. This README
2. `BUSINESS_RULES.md`
3. `DESIGN_LANGUAGE.md`
4. Whichever doc covers your assigned task

**For product understanding:**
1. This README
2. `PRODUCT_VISION.md`
3. `FEATURES.md`
4. `VISIT_WORKFLOW.md`
5. `PRO_PLAN.md`

---

*BasoBas Documentation · v1.0 · Non-technical product reference*
*Update the relevant doc file whenever a product decision changes*
*Then update DECISIONS_LOG.md with what changed and why*
