import { TutorPendingReview } from "@/screens/tutor/PendingReview";

/**
 * Route file for the tutor-under-review screen. The layout guard in
 * `app/_layout.tsx` routes a tutor with
 * `verificationStatus === "pending"` here automatically. The tutor
 * cannot reach the real dashboard until an admin approves them.
 *
 * The route is intentionally not in the BottomBar (TutorBottomBar) —
 * it's a temporary holding screen, not a destination.
 */
export default function TutorPendingRoute() {
  return <TutorPendingReview />;
}
