/**
 * EdumentX — Tutor Capacity & Schedule route
 *
 * Thin routed shell over `TutorCapacityScreen`. The screen owns
 * all of the live-subscription wiring; the route file only exists
 * so expo-router can resolve `/tutor-capacity` as a deep link.
 *
 * Routing: the layout guard in `app/_layout.tsx` allows this
 * screen for signed-in tutors (added to `allowedForSignedIn` in
 * the same change set that added this file). `/tutor_edit_profile`
 * also links here via the "Capacity & schedule" `MenuRow`,
 * satisfying the requirement that both the dashboard's capacity
 * card AND the profile's "More" section route to the same screen.
 */

import { TutorCapacityScreen } from "@/screens/tutor/TutorCapacityScreen";

export default function TutorCapacityRoute() {
  return <TutorCapacityScreen />;
}
