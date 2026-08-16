# EdumentX — Figma AI Auth & Onboarding Context

> Companion to `FIGMA_AI_CONTEXT.md` (global tokens + component anatomy).
> This export covers ONLY the auth + onboarding flow with **full
> field-level specs** — every input, label, placeholder, validation rule,
> error state and button, in screen order. Token values referenced
> (`bg-surface`, `rounded-card`, `text-hero`…) are defined in
> `FIGMA_AI_CONTEXT.md` §1.

---

## 0. Flow Map (route order)

```
/ (Splash, 1.8s auto-advance)
  → /onboarding (3-slide carousel → "Get started")
    → /email-signup  (signup ⇄ login toggle + Google)
        ├─ (email+password signup) → "Check your inbox" pending panel
        │     → "I've verified — continue" → /role-selection
        └─ (Google) → auto-verified → /role-selection
          → /role-selection ("Step 1 of 2")
              ├─ Student → /profile-student  → /student-home
              └─ Tutor   → /profile-tutor    → /tutor-pending (await admin)
```

---

## 1. Splash Screen (`/`)

- **Canvas:** `bg-splash` `#0F172A` (deep slate), full-bleed, centered
  Auto Layout column.
- **Logo mark:** 64×64, radius 16 (`rounded-2xl`), `bg-slate-800` fill,
  **2px `#E5A03B`/40% amber border**; centered glyph "Ex" — micro 10px
  bold, `#FBF8F2`.
- **Wordmark:** "EdumentX" — 34px/500, `#FBF8F2`, tracking-tight.
- **Tagline:** 16px/400, `#FBF8F2` at 80% opacity.
- **Progress bar (bottom):** 104px wide, 4px tall, `pill` radius; track
  `rgba(251,248,242,0.20)`; white fill animates; auto-advances to
  `/onboarding` after **1.8s**.

---

## 2. Onboarding Carousel (`/onboarding`)

- **Canvas:** `bg-surface` (white). Top row: mini logo square (24px,
  radius 8, `#0F172A` fill, "Ex" white micro bold) + "EdumentX" 15px/600
  ink.
- **Illustration panel:** ~36% of screen height, tinted background per
  slide: **Discover** `#F0EBE0` / **Verified** `#DCF0E4` /
  **AI match** `#EBF3F9`. SVG scenes fill the panel (custom
  illustrations, flat two-tone).
- **Text block (centered, below panel):**
  - Overline: micro 10px, semibold, `uppercase`, letter-spacing 0.16em,
    `#6B7280`.
  - Title: **display 28px/700** `#0F172A`.
  - Subtitle: body 15px/400 `#6B7280`.
- **Footer:** spring-snap `PaginationDots` (active dot stretches,
  inactive dots muted) + **PrimaryButton (green, `lg` 56px, full-width,
  "Get started" / "Next")**. Text link "Skip" (body, `#6B7280`) top-right
  of the footer.

---

## 3. Email Sign-Up / Login (`/email-signup`)

Canvas `bg-background` (warm paper). Scroll body `px-5 pt-5 pb-5`,
`KeyboardAvoidingView` on iOS. Two states: **form** and **pending**.

### 3.1 Form state

**Heading block**
- Title: **hero 28px/500** `#0F172A`, with a **2px `#E5A03B` amber
  underline** (self-start): "Create your account" (signup) /
  "Welcome back" (login).
- Subtitle: body 15/400 `#6B7280`, max-width 320:
  "Sign up with email or Google." / "Enter the email and password you
  signed up with."

**Mode toggle — Sign up / Log in (segmented pill)**
- Container: `bg-surface-muted`, radius 12, `p-1 gap-1`, row, `mb-6`.
- Two equal segments (`flex-1`, height 38). **Active:** `bg-surface`
  (white) + **1px** `#E7E1D3` border, label button 14/500 `#0F172A`.
  **Inactive:** transparent, label `#6B7280`. Press scale 0.97.
- Toggle flips the whole form (labels, placeholder, CTA) between modes.

**Email field**
- Label: `text-label` (12px/600, `#6B7280`) "Email".
- Input: **48px tall, `bg-surface`, radius 14**, leading **18px
  mail-outline icon** `#6B7280` (12px left pad), text 15px `#0F172A`.
- Keyboard: `email-address`, `autoCapitalize="none"`,
  `autoComplete="email"`. Placeholder: "you@example.com" (`#6B7280`).
- **Validation:** regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Non-empty + invalid
  → error caption below: **"Enter a valid email address."**
  (13px, `#C1503D`).
- **FieldShell visual states:** 2px border animates — idle `#E7E1D3`,
  focused/valid `#3F8A5A`, error `#C1503D` **+ horizontal shake**.

**Password field**
- Label "Password". Input 48px tall, radius 14, `secureTextEntry`
  (masked); placeholder "At least 6 characters".
- **Trailing eye toggle:** 44×44 hit area, 20px `eye-outline` /
  `eye-off-outline` `#6B7280` (iconPressed 0.9 scale).
- **Validation:** min **6 chars** → "Use at least 6 characters."
- **Password strength bar** (signup mode, hidden while empty): 5 segments,
  4px tall, `rounded-sm`, `gap-1`. Fill color by score:
  - 1–2 → `#C1503D` (label "Too weak" / "Weak")
  - 3 → `#E5A03B` ("Fair")
  - 4–5 → `#3F8A5A` ("Strong" / "Very strong")
  - Unfilled segments `#E7E1D3`. Caption 13px in the level color.
  - Scoring: +1 per — length ≥8, length ≥12, mixed case, has digit,
    has symbol.

**Primary CTA**
- **PrimaryButton `primary` (green fill `#2F5D50`, white label), 52px
  tall, full-width, radius 14.** Label "Create account" (signup) / "Log
  in". **Disabled** (sand fill `#F1ECE0` + `#6B7280` label) until email
  valid AND password ≥6. Loading state: "Sending…" + spinner.

**Divider:** hairline row — 1px `#E7E1D3` line, "or" caption 13px muted,
line. `my-5`.

**Google button (secondary CTA)**
- 52px tall, `bg-surface`, **2px `#E7E1D3` border**, radius 14,
  full-width; centered: **18px Google "G" logo** (`#2F5D50`) + label
  "Continue with Google" (button 14/500 `#0F172A`).
- Loading: spinner + "Opening Google…".

**Behavior notes:** Google users are auto-verified (skip inbox). Signup
with an already-registered email auto-flips to login mode with an
explanatory alert; an email that belongs to a Google-only account shows
"Please use the Continue with Google button" alert instead.

### 3.2 Pending state ("Check your inbox")

- **Back link** (chevron 18 `#2F5D50` + "Back" body) top-left.
- **Icon well:** 64×64 `pill`, `bg-surface-muted`, centered 28px
  `mail-open-outline` icon `#E5A03B`. Below it:
- **Title:** "Check your inbox" — hero 28/500 `#0F172A` + amber 2px
  underline.
- **Body:** "We sent a verification link to **{email}** (bold button
  weight, `#0F172A`). Tap the link, then come back and tap the button
  below." — 15/400 `#6B7280`, max-width 320, centered.
- **PrimaryButton** (green, full-width): **"I've verified — continue"**
  — the ONLY call to `auth.currentUser.reload()`; loading "Checking…".
- **Resend link:** text button "Resend verification email" — button
  14px, `#0F172A` (night), centered, `min-h-pill-sm`; spinner while
  sending ("Sending…").

---

## 4. Role Selection (`/role-selection`)

Canvas `bg-background`. Scroll body `px-5 pt-5 pb-5`; **sticky bottom
bar** `px-5 pt-3 pb-8 bg-background` holds the CTA.

- **Back link:** chevron + "Back" (routes to matching dashboard for
  returning users; first-time users get a "Leave role selection?" dialog
  with Stay / Sign out).
- **Step eyebrow:** "Step 1 of 2" — label 12px/600 `#6B7280`.
- **Title:** "How will you use EdumentX?" — hero 28/500 + amber 2px
  underline.
- **Role card — Student / Parent:**
  - Row card, `min-h` 92, `p-4`, **radius 18**, white fill; **1px
    border**: `#E7E1D3` idle → `#2F5D50` when selected.
  - Leading **icon well 52×52**, radius 14, fill `#F0EBE0`; 26px
    `school-outline` icon `#2F5D50`.
  - Text column: title "Student / Parent" (card-title 14/500) +
    subtitle body 15/400 `#6B7280` ("Find verified home tutors and
    manage enrollments.").
  - Trailing: chevron-forward 20 `#6B7280` (idle) → **24×24 `pill`
    checkmark** in `#2F5D50` with white check (selected; pops in with a
    spring sequence ~280ms).
- **Role card — Tutor:** same anatomy; icon well fill `#DCF0E4`, 26px
  `book-outline` `#3F8A5A`; active border `#3F8A5A`; subtitle "List your
  teaching services and receive enrollment requests."
- **CTA:** PrimaryButton `primary`, `lg` 56px, full-width, "Continue"
  (disabled until a role is picked). On continue: writes auth metadata
  to Firestore (role itself is committed later by the profile screen),
  then routes Student → `/profile-student`, Tutor → `/profile-tutor`.
- Cards press-scale 0.99 (large surfaces, subtler than buttons).

---

## 5. Student Profile Setup (`/profile-student`)

Canvas `variant="night"` — **dark hero → light sheet** (see
`FIGMA_AI_CONTEXT.md` §2.11). The hero is the canonical `ScreenHeader`
(dark `bg-night`, `px-6 pb-8`); the body overlaps it through the
`ScreenSheet` seam (`rounded-t-xl -mt-4`).

### 5.1 Hero (`ScreenHeader`)
- Back: white chevron + "Back" (white 80%).
- Title: **"Set up your profile"** — display 28/700 `#FFFFFF` + amber 2px
  underline.
- Subtitle: "This helps tutors understand your learning needs." — 15/400
  white 70%.

### 5.2 Form body (white cards on `#FBF8F2`, `px-6 pt-8 pb-12 gap-6`, inside `ScreenSheet`)
Every section below is a `Card` (`bg-surface`, 1px `#E7E1D3` border,
radius 14, padding 20) unless noted. Failed submit **scrolls to the
first invalid section**; a muted helper under the CTA reads "Some
required fields are incomplete — tap Finish setup to see what's missing."

**① Profile photo (required)**
- **AvatarUploader:** 96×96 circle, **2px border**; idle `#F1ECE0` fill
  + camera icon (40px); valid → `#3F8A5A` ring + **24×24 check badge**
  (verification green, 2px white border) at bottom-right; error → red
  ring + "Upload a profile photo to continue."

**② Name & email (locked)**
- "Full name" label → input 48px, radius 14, placeholder
  "e.g., Aarav Tamang". Rule: ≥3 chars.
- "Email" label → input **disabled/locked** (comes from verified
  Firebase Auth identity; not editable here).

**③ Username & phone**
- "Username" — leading 18px `at-outline` icon; placeholder
  "your_handle"; rule **3–30 chars: letters, digits, `_` or `.`**
  (error: "Username must be 3–30 characters…").
- "Phone (digits only — for parents to reach tutors)" — leading
  `call-outline` icon; keyboard `phone-pad`; placeholder "98XXXXXXXX".

**④ Grade / class**
- Label "Grade / class". **8 grade chips**, wrap `gap-2`: `min-h` 40,
  `px-4 py-2`, radius 8, `border-emphasis` (1.5px). Active =
  `bg-primary` + white text; idle = `bg-surface-muted` + `#6B7280` text.
  Options: Grade 7/8/9/10, Grade XI (Science/Management), Grade XII
  (Science/Management). Error: "Select your grade."

**⑤ Subjects needed**
- **ChipGroup** (label + wrap of toggle chips, same chip anatomy as
  grades). 7 options: Math, Physics, Chemistry, Computer Science,
  Biology, Nepali, English. **≥1 required** → "Select at least one
  subject."

**⑥ Location**
- **LocationField:** "Location" label + two stacked inputs (48px
  min-h, **2px border**, radius 14): "Neighborhood (e.g., Patan)" and
  "City (e.g., Lalitpur)". City **≥3 chars** required → "Add your
  location."

**⑦ CTA**
- **PrimaryButton `accent` (amber `#E5A03B`, white label), 56px,
  full-width: "Finish setup"** — the amber brand CTA (only
  high-priority action on the screen). Loading "Saving…".
- Submit = atomic `writeBatch`: stamps `users/{uid}.role = "student"`
  + writes `users/{uid}/studentProfile/default` → routes
  `/student-home`.

---

## 6. Tutor Profile Setup (`/profile-tutor`)

Same scaffold as §5 (dark hero, light sheet, same card anatomy) but
hero reads **"Set up your tutor profile"** / "This is what parents will
see on the map. You can update everything later." Additional/unique
sections, in order:

**①–③** Same as student: photo (required), name+email (locked),
username & phone.

**④ Gender (radio group)**
- Label "Gender" + caption "Students can filter tutors by gender
  preference."
- 3 equal segmented buttons (`flex-1`, h-44px, radius 14): Male /
  Female / Other. Active = `bg-primary` fill + white **4px radio dot**
  (outer ring 16px, inner dot 8px); idle = white + `#6B7280` border/text.

**⑤ Headline (required, ≤80 chars)**
- Label row with **live counter** "n/80" (caption, muted).
- Input 52px tall, radius 14; placeholder
  "e.g., Experienced Math & Physics tutor". Error: "Add a one-line
  headline that parents will see."

**⑥ About you (optional, ≤280 chars)**
- Multiline 4-line textarea (120px min), counter "n/280",
  `textAlignVertical: top`; placeholder "Tell parents about your
  teaching style, experience, and approach."

**⑦ Your credentials**
- **Degree / Qualification — SearchableSelect:** school-outline icon,
  placeholder "e.g., B.Sc. in Mathematics", curated qualification list +
  free-text entry ("Start typing to search common qualifications, or
  enter your own."). Valid when ≥2 chars.
- **Institution / University — SearchableSelect:** business-outline
  icon, placeholder "e.g., Tribhuvan University", curated institution
  list + free text.

**⑧ Subjects you teach** — 7 chips (Math, Physics, Chemistry, Computer
Science, Biology, Nepali, English), ≥1 required.

**⑨ Grade levels you teach** — 9 chips: Grade 1–5, 6–8, 9–10, XI
(Science/Management), XII (Science/Management), Test Prep, Language.
≥1 required.

**⑩ Rate & experience**
- **Years of experience stepper:** label + row of two 44×44 `pill`
  buttons (`bg-surface-muted`, 1px border, `−`/`+` 20px icons) around a
  centered value (**22px/500**, "year/years" caption). Range 0–50,
  buttons disable at bounds.
- **Monthly rate (NPR):** 52px input row — prefix "Rs." (muted,
  semibold) + numeric input (semibold 15px, placeholder "10000") +
  suffix "/ month" (muted caption). Valid when ≥0. Error: "Enter your
  monthly rate in NPR."

**⑪ Location** — same as student (§5.⑥).

**⑫ Verification documents**
- Label row "Verification documents" + counter "n of 3".
- **3 DocumentUploaders**, each an upload tile: **citizenship**
  (required), **certificate / academic** (required), **demo video**
  (optional). Missing required docs block submit with alerts:
  "Citizenship ID required" / "Academic certificate required".
- Privacy note (caption, muted): "Your documents are private. Only the
  EdumentX verification team can view them."

**⑬ CTA**
- **PrimaryButton `accent`, 56px: "Finish setup"** (amber). Submit =
  atomic 3-write `writeBatch` (root role doc + `tutorProfile/default` +
  `tutorVerifications/{uid}` with `status: "pending"`) → routes
  **`/tutor-pending`** (NOT the dashboard — tutors stay gated until an
  admin approves).

---

## 7. Tutor Pending Review (`/tutor-pending`)

Canvas `bg-background`. Light header-style body.

- **Eyebrow row:** 8px amber dot (`bg-warning`) + overline caption
  uppercase tracking "Verification".
- **Title:** "Your profile is under review" — screen-title 22/500.
- **Subtitle:** body secondary — "…an admin will review your
  documents…".
- **Warning banner:** `bg-warning-bg` fill, 1px `#E5A03B`/30 border,
  radius 14, `p-4`; leading 36px `pill` icon well (`bg-warning/20`,
  hourglass `#8B5E10`); card-title "Under review" (`#8B5E10`) + body
  caption `#8B5E10`/80.
- **Checklist card:** white card, rows with 36px `accent-soft` icon
  wells + title (body medium) + caption muted — e.g., "Documents
  received", "Profile details", "What happens next?".
- **Actions:** sign-out (white card, red text) + support contact.

---

## 8. State & Error Spec (applies to all auth forms)

- **FieldShell** (shared wrapper): 2px animated border; idle
  `#E7E1D3`, valid `#3F8A5A`, error `#C1503D` + shake; radius 14;
  white fill. Icon 18px leading, muted `#6B7280`.
- **Error text:** caption 13px `#C1503D`, 4px below the field.
- **Button loading:** label swap ("Saving…", "Checking…", "Sending…") +
  spinner in the label color; button disabled.
- **Submit failure:** native alert "Could not save profile" +
  Firebase error code (rules/network visibility).
- **Every screen:** `KeyboardAvoidingView` (iOS padding), scrollable,
  `keyboardShouldPersistTaps="handled"`.
- **Amber usage rule:** the amber `#E5A03B` CTA appears exactly once per
  screen (the terminal submit); green is for secondary/back CTAs.
