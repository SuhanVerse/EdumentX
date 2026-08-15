# Figma AI Master Prompt — EdumentX

> **One pasteable prompt that self-directs the entire redesign, phase by phase.**
> Paste the block in `## THE MASTER PROMPT` once. The AI detects the current
> state of the app from the context you give it, executes only the phases that
> still have gaps, verifies each phase against its done-criteria, and advances
> to the next phase automatically — no manual step-by-step instructions.
>
> Supporting files (paste their *content*, never their paths):
> - `FIGMA_AI_CONTEXT.md` — global tokens + component anatomy + hex→class QA checklist
> - `FIGMA_AI_AUTH_CONTEXT.md`, `FIGMA_AI_STUDENT_CONTEXT.md`,
>   `FIGMA_AI_TUTOR_CONTEXT.md`, `FIGMA_AI_ADMIN_CONTEXT.md` — field-level specs
> - `README.md` — reading order + how the exports fit together

---

## THE MASTER PROMPT

```text
ROLE:
You are a senior product designer executing a full, brand-compliant redesign of
EdumentX (a React Native tutoring marketplace, Expo SDK 54 + NativeWind). You
have the complete design system and the current state of the app. Your job is
to regenerate every screen that does not yet match the spec, in the phase order
below, WITHOUT stopping to ask for permission between phases.

CONTEXT (paste the exports whose content you were given; if only this block was
provided, use the DESIGN SYSTEM below as the complete source of truth):
- Design tokens, component anatomy, screen inventory: FIGMA_AI_CONTEXT.md
- Field-level specs, per role: AUTH / STUDENT / TUTOR / ADMIN exports
- Current app state (paste screenshots, descriptions, or "no context given —
  assume nothing is done yet and start at Phase 1").

DESIGN SYSTEM (lock-in anchor — apply to EVERY screen you generate):
Canvas: warm paper #FBF8F2 on light screens; deep slate #0F172A for dark heroes and the AI chat.
Cards: white #FFFFFF, 1px #E7E1D3 hairline border, radius 14px. NO drop shadows — hairlines do the separation.
Brand: amber #E5A03B = the ONE primary CTA per screen; chalkboard green #2F5D50 = secondary CTAs, active tabs, links; verification green #3F8A5A = verified/success states; danger #C1503D = destructive; AI blue #4A7FA5 = AI assistant + group-batch family.
Status pills: amber = pending, green = active/approved, red = rejected, blue = info/edit.
Text: primary #0F172A, secondary/muted #6B7280, inverse #FFFFFF. Placeholder gray #9CA3AF.
Buttons: 52px tall (lg 56px), radius 14px, press scale 0.96. Inputs 48px tall, radius 14px.
Spacing: 4px grid — 8/16/24px gaps, 24px page gutters, 16px card padding.
Type: display 28/700, hero 28/500, screen-title 22/500, section-title 15/500, card-title 14/500, body 15/400, caption 13/500, micro 10/500.
Avatars: circle, 1px #E7E1D3 border, initials fallback on tinted fills, verified = green checkmark-circle badge.

PHASE ENGINE — how to run:
1. START: read the current state context. Classify every screen as
   [DONE = matches spec] / [PARTIAL = on-palette but layout differs] /
   [UNDONE = missing or old palette]. You may generate a screen marked DONE
   only if you spot a real violation of the DESIGN SYSTEM.
2. Run the phases below IN ORDER. A phase's screens marked DONE in step 1 are
   skipped automatically.
3. After each phase, check its DONE-CRITERIA. If any fail, fix them before
   moving on. When they all pass, print one line: "PHASE N COMPLETE — next:
   PHASE N+1." Then proceed immediately. Do not wait for a reply.
4. If you lack the field-level spec for a screen, fall back to the DESIGN
   SYSTEM anchor plus the screen's one-line description below, and flag it in
   your phase report.

PHASE 1 — Auth & onboarding
Screens: splash, onboarding carousel, email sign-up/login (form + "check your
inbox" + Google), role selection, student profile setup, tutor profile setup.
Spec: FIGMA_AI_AUTH_CONTEXT.md.
Key rules: warm paper, no dark hero except the splash; amber appears ONLY in
the heading underline and the terminal "Finish setup" CTA; all other CTAs green;
Google button = white with 2px hairline.
DONE-CRITERIA: every screen present; segmented toggle + password strength bar
on signup; role cards with selected checkmark pill; profile steppers with the
tint per step; zero old palette hexes.

PHASE 2 — Student marketplace
Screens: home, map search (+ filters + tutor preview), tutor details (+ enroll
sheet + review modal), my enrollments, AI chat, saved tutors.
Spec: FIGMA_AI_STUDENT_CONTEXT.md.
Key rules: home = light header "Good day," + amber-underlined name, white
search bar, ONE amber CTA ("Explore tutors on the map"), vertical TutorCard
list; map = dark slate hero + teardrop pins (slate ring standard, amber ring +
amber shield verified, wide white ring selected) + floating "N tutors on map"
pill + horizontal snap carousel of 200px cards over the map; details = fixed
top bar, 72px avatar with 2px amber/30 border, dashed "Request an empty slot",
amber sticky "Enroll with {name}"; enrollments = sliding green pill segmented
tabs, 60px avatars, "Rate & Review" (amber tint) + "Message tutor" (sand),
empty state = 56px amber icon well; chat = dark slate hero, 40px AI-blue avatar,
user bubbles green #2F5D50/white text, AI bubbles white with 28px avatar,
sand composer + circular amber send.
DONE-CRITERIA: all seven screens match the field-level spec; no drop shadows;
one amber CTA per screen; pins are teardrops not flat circles; carousel snaps.

PHASE 3 — Tutor surfaces
Screens: dashboard, enrollment inbox (+ accept slot-picker), capacity &
schedule, group batches (+ 3-step wizard), edit-profile & teaching
details.
Spec: FIGMA_AI_TUTOR_CONTEXT.md.
Key rules: dashboard = light header "Good to see you," + availability toggle
card + 3×2 metric grid + segmented "New enrollments / Batch requests"; inbox =
4px amber left-stripe cards, green Accept + red Decline; capacity = weekly
7×6 grid with sticky amber save bar; batches = AI-blue family (the one place
blue is a primary CTA).
DONE-CRITERIA: every screen present; the AI-blue batch family distinct from
green/amber; save bar appears only while editing; no old palette hexes.

PHASE 4 — Admin console
Screens: admin home, platform statistics, verification queue (+ reject dialog
+ document viewers), user management.
Spec: FIGMA_AI_ADMIN_CONTEXT.md.
Key rules: dark slate heroes on all four; body on warm paper; cards = white +
hairline; Approve = green, Reject = red, Info = blue — amber is NOT a CTA in
the console; charts are plain filled-View rows, not chart components.
DONE-CRITERIA: all four screens; green/red/blue decision buttons; count pills;
no chart components or new libraries.

PHASE 5 — Shared components & sheets
Screens: TutorCard, BottomNav / TutorBottomBar, SubjectChip, BlueTick (verified
badge), StatusBadge, StatusBar, RequestEnrollmentSheet, EditRequestSheet,
ReviewModal, StudentPickerSheet, CalendarDatePicker, AvailabilityTimeList,
RemoveEnrollmentDialog.
Spec: FIGMA_AI_CONTEXT.md §2 + the ADMIN export §5.
Key rules: these are reused by every flow — they must match the tokens exactly
so downstream screens inherit compliance; subject pills = amber-tinted, verified
badge = green checkmark-circle, bottom-nav active tab = green pill + amber
underline.
DONE-CRITERIA: every component token-compliant; no component hardcodes an old
palette hex; variants (light + dark glass) both present where the app uses them.

PHASE 6 — Final QA sweep
Walk every screen you generated in this run and check:
1. Amber #E5A03B appears exactly ONCE per screen (the single primary action).
2. No drop shadows — separation is the 1px #E7E1D3 hairline.
3. No old blue/teal/purple hexes anywhere.
4. Status colors keep their meaning: amber=pending, green=active, red=rejected,
   blue=info.
5. Charts/bars are plain filled-width rows — no chart components.
6. Spacing snaps to the 4px grid; type uses the scale above.
Fix every violation you find, then print the final report:
"REDESIGN COMPLETE — {N} screens regenerated, {M} verified already-compliant,
0 violations remaining."
```

---

## How to run it (user notes — not part of the prompt)

1. **First run:** paste the master prompt block, then paste `FIGMA_AI_CONTEXT.md`
   content, then the role exports for the phases you care about, then your
   current-state description (screenshots or "assume nothing done"). The AI
   classifies and starts at the first phase with gaps.
2. **Resuming after a partial run:** paste the master prompt block again + the
   AI's last phase report (or just "continue from Phase N"). The phase engine
   re-detects DONE screens from the state you supply and skips them.
3. **State detection beats trust:** the prompt is designed around the "audit
   first" rule — it never blindly regenerates a screen that already matches;
   it reports DONE/PARTIAL/UNDONE before touching anything.
4. **Verified disk state (Aug 2026):** the full palette migration is committed
   and live — zero old blue/teal/purple hexes remain anywhere in `src/`, all
   ~28 screens and shared components are on the warm-paper/amber/green system,
   and StudentHome is already rebuilt to its exact spec (light header,
   "Good day," + amber underline, white search, single amber map CTA, vertical
   TutorCard list). The remaining gaps are layout-depth items on MapSearch
   (snap carousel), TutorDetails, MyEnrollments, and AIChat — which Phase 2
   will re-drive. Feed this as your current-state context so Phases 1/3/4/5
   classify as DONE and the run starts at Phase 2.
5. **Figma Make context limits:** if the AI reports it can't hold the full
   exports, keep the DESIGN SYSTEM anchor + one role export per run, and add
   "only execute Phase N" — the phase engine still self-verifies.

---

## Drift rules (quick reference, also embedded in Phase 6)

- Amber `#E5A03B` appears **exactly once per screen** — the single primary action.
- **No drop shadows** — separation comes from the 1px `#E7E1D3` hairline.
- Charts/bars are plain filled-`View` rows — **no chart components**, no new libraries.
- Status colors never change meaning: amber = pending, green = active/approved,
  red = rejected/danger, blue = info/edit.
