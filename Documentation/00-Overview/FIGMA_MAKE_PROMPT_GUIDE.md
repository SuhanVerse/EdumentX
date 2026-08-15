# Figma Make Prompt Guide — EdumentX

> Ready-to-paste prompts for regenerating EdumentX screens in **Figma Make**.
> Every prompt = **Design-System anchor** (paste verbatim, locks the theme) +
> **task block** (paste the one matching your target). Full field-level specs
> for every screen live in the five exports listed in [the README](./README.md)
> — paste the relevant export *instead of* the anchor whenever you need exact
> element lists, copy, or loading/empty/error states.

---

## 0. How to use this guide

1. **Figma Make cannot read your repo.** Always paste markdown *content* into
   the prompt — never file paths.
2. **Keep the anchor identical every time.** The theme only locks in if the
   token block doesn't change between generations.
3. **One screen per generation** (a tightly-coupled pair like dashboard +
   inbox is the maximum). Do NOT bundle whole flows — Figma Make drifts and
   loses the palette.
4. **Paste order:** anchor → task block → one drift rule (from §3).
5. **If a screen has unusual states** (loading skeleton, empty state, error
   banner), append "include the loading, empty, and error states" to the task.

---

## 1. Design-System anchor (paste first, always)

```text
DESIGN SYSTEM (EdumentX):
Canvas: warm paper #FBF8F2 on light screens; deep slate #0F172A for dark heroes and the AI chat.
Cards: white #FFFFFF, 1px #E7E1D3 hairline border, radius 14px (rounded-card). NO drop shadows — hairlines do the separation.
Brand: amber #E5A03B = the ONE primary CTA per screen; chalkboard green #2F5D50 = secondary CTAs, active tabs, links; verification green #3F8A5A = verified/success states; danger #C1503D = destructive; AI blue #4A7FA5 = AI assistant + group-batch family.
Status pills: amber = pending, green = active/approved, red = rejected, blue = info/edit.
Text: primary #0F172A, secondary/muted #6B7280, inverse #FFFFFF. Placeholder gray #9CA3AF.
Buttons: 52px tall (lg 56px), radius 14px, press scale 0.96. Inputs 48px tall, radius 14px.
Spacing: 4px grid — 8/16/24px gaps, 24px page gutters, 16px card padding.
Type: display 28/700, hero 28/500, screen-title 22/500, section-title 15/500, card-title 14/500, body 15/400, caption 13/500, micro 10/500.
Avatars: circle, 1px #E7E1D3 border, initials fallback on tinted fills, verified = green checkmark-circle badge.

TASK: ...
```

> **Heavier context:** for screens with many elements (tutor dashboard,
> verification queue), paste the matching role export (`FIGMA_AI_TUTOR_CONTEXT.md`
> etc.) *instead of* the anchor — it contains the anchor plus the full
> field-level spec. For quick one-off screens, the anchor alone suffices.

---

## 2. Task blocks (append to the anchor)

### 2.1 Auth flow

```text
TASK: Design the signup screen. Warm paper background (no dark hero), heading "Create your account" with a 2px amber underline, a Sign up / Log in segmented toggle (sand track, active = white pill with hairline), email + password fields with a 5-segment password strength bar, a green full-width "Create account" button, an "or" divider, then a white Google button with 2px hairline border. Amber appears only in the heading underline — the CTA is green.
```

```text
TASK: Design the role selection screen. Warm paper canvas with a Back link, a "Step 1 of 2" caption, the title "How will you use EdumentX?" with a 2px amber underline, then two 92px-tall role cards (Student / Tutor) — white fill, hairline border, 52px icon well; the selected card gets a brand-colored border and a pop-in 24px checkmark pill, the unselected one shows a chevron. Finish with a green full-width "Continue" button.
```

### 2.2 Student flow

```text
TASK: Design the student home screen: light header with "Good day," + name (amber underline), a white rounded search bar, ONE amber CTA "Explore tutors on the map" (all other CTAs green), a vertical list of tutor cards (36px avatar, name + green verified badge, amber-tinted subject pills, amber star + rating, "Rs X,XXX /mo"). Then the map search screen: dark slate hero header with search + an amber filter button, an OpenStreetMap canvas with teardrop pins (slate ring for standard tutors, amber ring + amber shield for verified, wide white ring when selected), a floating "N tutors on map" pill, and a horizontal snap carousel of 200px tutor cards floating over the map bottom.
```

```text
TASK: Design the tutor details screen: a fixed top bar (back chevron, heart save, native share), a profile header (72px avatar with a 2px amber/30 border, name + green shield badge, headline, subject pills, 3-stat row: rating / years / reviews), a pricing row of two cards (1-to-1 rate + group-batch "Message to ask about rates"), a session board with slot cards and a dashed "Request an empty slot" CTA, a student availability grid (green available cells, amber ring when selected, blue booked cells), an expandable About section, a demo-lesson tile, a live reviews section (score + star breakdown bars + review cards), and a sticky amber "Enroll with {name}" footer button.
```

```text
TASK: Design the my-enrollments screen: a light header with segmented Active / Pending / Past tabs (sliding green pill), then a list of enrollment cards — 60px avatar, tutor name, status pill (green Active / neutral Past), amber subject chips, a start → end date row, and for active enrollments two 40px buttons: "Rate & Review" (amber tint) and "Message tutor" (sand). Include the empty state: a 56px amber icon well + "No enrollments yet".
```

```text
TASK: Design the AI chat screen: a dark slate hero with a 40px AI-blue avatar pill + online dot + title "AI Assistant" (amber underline), a row of removable constraint pills (AI-blue tint with 1px blue border), an inverted message thread (user bubbles right in green #2F5D50 with white text, AI bubbles left on white cards with a 28px avatar), a typing indicator, and a sand-colored composer bar with a circular amber send button.
```

### 2.3 Tutor flow

```text
TASK: Design the tutor dashboard: light header with "Good to see you," + name (amber underline), a verified-professional green pill, an availability toggle card (44×24 switch, sand track → green when on), a 3×2 grid of white metric tiles (icon well + label + big number), a capacity card with a progress bar (green, amber ≥80%, red at 100%), today's sessions rows, a segmented "New enrollments / Batch requests" control with a sliding green pill, and a 4-tab bottom bar with an amber underline on the active tab and a red count badge on the inbox icon.
```

```text
TASK: Design the enrollment inbox: a light header reading "Enrollment inbox" with a live "N pending requests" count in green, then a vertical stack of request cards — white card with a 4px amber left stripe, 40px student avatar, name + amber Pending pill, subject chips, a sand "FROM THE STUDENT" message block, a 2-column detail grid (Schedule / Start / End), and a green Accept + red Decline button row. Include the accept slot-picker: a bottom sheet with a day-grouped list of time rows, green "Available" pills tappable, blue "Booked" pills disabled, and a green "Accept enrollment" confirm button.
```

```text
TASK: Design the capacity & schedule screen: a light header ("Manage your" + "Capacity & schedule" with amber underline, "X / Y filled · N slots available"), a capacity progress card, a weekly availability grid (7 day-rows × 6 time slots; green check cells = available, blue people cells = booked/disabled, sand dots = off, legend below), an AI-blue info banner, and a sticky save bar that appears only while editing — amber "Save changes (N)" button + "Discard" text button.
```

```text
TASK: Design the group batches screen: a light header ("Group Batches"), a full-width AI-blue "Create New Batch" CTA card with a white plus icon, a list of active batch cards (name + "Subject • Rs X/student/mo" + green Active pill, a seats progress bar in AI blue, day chips like "Mon · 5–7 PM", overlapping member avatars), and a 3-step creation wizard bottom sheet — step indicator with amber-filled segments, a roster picker (2–6 students, amber radio check rows), a details step (name input, subject pills with "Other…", numeric fee input, day pills), and a review step ending in one amber "Save Batch" button.
```

```text
TASK: Design the payouts screen: a light header ("Payouts" with amber underline) containing a payout-method card — 40px amber icon well + provider name + identifier + Change/Remove pills, or a dashed amber "Add payout method" CTA when empty — and a live earnings card showing a big display number "Rs X,XXX", a "N enrolled students × Rs X,XXX/mo" caption, and a green "No commission — you keep 100%" row.
```

### 2.4 Admin flow

```text
TASK: Design the admin home: a dark slate hero ("Dashboard" + live admin name + "Manage platform, verifications & users"), then three white section cards on warm paper — 48px pill icon wells (blue analytics / green shield / amber people) with title + subtitle + chevron, and a count pill on the User Management card. No other sections.
```

```text
TASK: Design the verification queue screen: a dark slate hero with "Moderation" overline + an open/decided count, then a warm-paper body with section cards for New Tutor Verifications / Pending Edits / Info Requested. Each verification card: 48px avatar, name + email + submitted time, a status pill (amber Pending Review / blue Info Requested), a 2-column detail grid, a horizontal rail of 128px document thumbnails, and three equal 40px buttons — green Approve, red Reject, blue Info. The "Pending Edits" card shows struck-through old values → amber new values in a sand diff box. Include the reject dialog: a centered white card with a red close-circle icon, "Reject {name}?", a sand textarea, a red Reject button and a sand Cancel button.
```

```text
TASK: Design the user management screen: a dark slate hero with "Management" + "User Management" title + a white search bar inside the hero, a filter card below (two horizontal pill groups — status and role — separated by a hairline divider, active pill = AI blue), then a list of user cards: 48px avatar with a green verified badge, name + role chip (blue Admin / green Tutor / amber Student), email + joined date, a status chip (green Active / amber Suspended / red Deleted), and action pills (Suspend + Delete for active users, green Restore for suspended/deleted).
```

### 2.5 Shared sheets

```text
TASK: Design a bottom sheet for sending an enrollment request: white sheet, 24px top radius, drag handle, header with tutor avatar + name, a 48px schedule input, two inline month calendars (disabled past days, amber selected day, green today ring), an 88px optional message box with an n/280 counter, and one amber "Send request" button. Respect bottom safe-area padding.
```

```text
TASK: Design a review modal: white bottom sheet, 24px top radius, "Rate & review" header, five 32px amber stars for the overall rating, a white card with four sub-score rows (Teaching / Punctuality / Communication / Knowledge) each with five 20px stars, a 100px comment box with n/500 counter, and one amber "Submit review" button.
```

---

## 3. Drift rules (append one per prompt)

- Amber `#E5A03B` appears **exactly once per screen** — the single primary action. Everything else is green.
- **No drop shadows** anywhere — separation comes from the 1px `#E7E1D3` hairline.
- Charts/bars are plain rows with filled `View` widths — **no chart components**, no new libraries.
- Status colors never change meaning: amber = pending, green = active/approved, red = rejected/danger, blue = info/edit.

---

## 4. If a generation drifts

1. **Re-anchor:** paste the full role export (not the short anchor) at the top of the *next* prompt — the drift usually comes from the token block being dropped from context.
2. **Narrow scope:** split the drifted screen into its halves (e.g. "only the header + metric grid" then "only the requests section").
3. **Name the violation:** explicitly tell it what to fix ("remove the drop shadow on the cards", "the CTA must be green, not amber").
