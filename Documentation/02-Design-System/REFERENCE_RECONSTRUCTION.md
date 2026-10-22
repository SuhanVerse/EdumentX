# Reference study and UI implementation

Inspected on 21 October 2026. This pass adapts discovery and booking patterns to EdumentX's existing React Native, NativeWind, and forest/amber palette.

## Evidence

| Reference | Observed | Limits |
| --- | --- | --- |
| [Barber & Salon Booking, Sheikh Naeem](https://me.muz.li/sheikh-naeem/barber-salon-booking-mobile-app-modern-ui-ux-design) · [presentation image](https://files.muzli.cloud/5775897a-2af7-4771-8cee-723140e23550-1787321296292.jpg) | Prominent search, one strong featured card, compact categories, distinct selected dates/slots, clear booking action | A static presentation; interactions and timing are unverified |
| [VibeMove, Phenomenon Studio](https://dribbble.com/shots/27013671-Fitness-Mobile-App-Design-VibeMove) · [home image](https://cdn.dribbble.com/userupload/46487877/file/0774c3edefbe5a25933a3377ab2efb25.png) · [schedule image](https://cdn.dribbble.com/userupload/46487879/file/9903c5ea2618f93e5f3637766edd11b0.png) | Layered cards, clear heading/metadata contrast, outlined tags, category rails, compact schedule and metric groups | Static PNGs do not establish animation, navigation, or frame performance |

Original photos, artwork, logos, and UI code were not imported. Reference downloads remain outside the repository. Proposed motion below is an original adaptation, not recovered animation.

## What changed

| Pattern and purpose | EdumentX implementation |
| --- | --- |
| Search first; reduce browsing effort | [StudentHome](../../src/screens/student/StudentHome.tsx) now filters its existing feed by name, username, subject, headline, city, and neighborhood. Every query term must match somewhere in those fields. |
| Compact, meaningful categories | Subject choices come from the actual feed. A category combines with the query; clearing filters restores the feed. Selection has a checkmark and accessibility state. |
| One clear discovery action | A forest feature card opens the map. Smaller shortcuts open existing group batches and saved tutors. The feature card gives way to results while filtering. |
| Readable booking-card anatomy | [TutorCard](../../src/components/domain/TutorCard.tsx) separates identity, specialties, reputation/location, and monthly rate. Larger avatars use actual photos or initials; zero-review profiles say “New.” |
| Surface current work first | [TutorHome](../../src/screens/tutor/TutorHome.tsx) leads with today's derived sessions and a real inbox action. Four supporting metrics replace the orphan five-tile layout. The unsupported batch-request tab was removed. |
| Clear feedback | Amber buttons use dark labels. Save controls have a larger target and stop propagation to the profile card. Tabs wait for real layout before positioning the indicator; repeated tutor-tab taps do not add history. |

[Discovery helpers](../../src/lib/tutor/discovery.ts) are pure functions. Unicode compatibility normalization preserves Nepali text; categories compare exactly, while query terms use substring matching. Filtering does not issue network requests. The result list is virtualized and distinguishes loading, feed errors with retry, an empty directory, and no matches.

The tutor/review feed must receive an actual tutor snapshot before emitting combined data. A reviews callback must not turn a failed tutor subscription into apparent success. Retrying creates a fresh subscription; teardown suppresses late emissions.

## Motion choices

- Existing shared press springs provide tactile feedback for cards, shortcuts, and filter chips. Filter chips skip haptics to keep repeated selection quiet.
- The discovery content uses a short opacity entrance from the existing `motion.duration.medium` token (220 ms), with system reduced-motion handling. Virtualized rows do not replay entrance animations as they scroll into view.
- Shared preference handling keeps reduced-motion users from receiving decorative scaling, shaking, floating, or skeleton loops. Decorative loops stop on cleanup.
- Navigation indicators start in their measured position rather than sweeping in from the first tab. Tutor tab changes replace the current tab route.

No new packages, native effects, fonts, paid APIs, or backend deployments are required. Blur/refraction and adaptive AI layouts were not established by these references and were not introduced.

## Check the result

Automated checks:

```bash
npm run typecheck
npm run lint
npm run test:discovery
npm run test:tutor-feed
npm run test:motion
npm run test:derived
npm run test:lint-rules
```

Native acceptance checks still require a compatible Android/iOS development build:

1. Try a small phone, a large phone, long tutor names, and enlarged text. Verify prices, save actions, subject labels, and navigation remain reachable.
2. Search across subjects and locations, combine a category with text, clear either filter, and exercise no matches. Scroll a long result list and dismiss the keyboard by dragging.
3. Test slow loading, a failed feed, retry, and genuinely empty data. A review update must not dismiss a feed error.
4. Enable reduced motion before launch and change it while the app is open. Confirm decorative loops stop and controls remain understandable.
5. Interrupt presses, tap a save control, switch tabs repeatedly, and check back behavior. Confirm saving does not open a profile.
6. Check today's sessions, the inbox, availability, verification banners, and enrollment removal with authorized development accounts.

TypeScript and unit checks do not establish native visual fidelity, screen-reader behavior, haptic timing, or frame rates. No device was attached during the implementation session; these checks remain for device review.

Android and iOS JavaScript/Hermes bundle exports were also checked through Metro with local `.env` loading disabled. This checks bundling and transforms, not native signing, Maps configuration, backend connectivity, or device behavior.

## Reverse-engineering method

[REA](https://github.com/morluto/rea) and [Awesome Reverse Engineering](https://github.com/morluto/awesome-reverse-engineering) informed the evidence-first investigation and task-based tool selection. Their software-analysis capabilities are not a way to recover motion from a still image or dimensions from an unscaled object. No REA server or installer was added to this application.

For future studies, record **observation → proposed adaptation → component → acceptance check**. Keep inferred behavior separate from observed evidence, and test the destination application's behavior independently.
