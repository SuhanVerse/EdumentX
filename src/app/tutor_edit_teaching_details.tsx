import { EditTeachingDetails } from "@/screens/tutor/EditTeachingDetails";

/**
 * EdumentX — Tutor high-risk edit screen.
 *
 * `/tutor_edit_teaching_details` is reached from
 * `/tutor_edit_profile` (the "Subjects, rate & location" menu
 * row). All writes here go to `tutorProfileUpdates/{uid}` and
 * the tutor lands on `/tutor-pending` after submit. See the
 * screen file's header comment for the full flow.
 */
export default function TutorEditTeachingDetailsRoute() {
  return <EditTeachingDetails />;
}
