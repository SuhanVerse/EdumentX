import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Splash } from "./screens/Splash";
import { Onboarding } from "./screens/Onboarding";
import { EmailSignup } from "./screens/EmailSignup";
import { RoleSelect } from "./screens/RoleSelect";
import { PhoneEntry } from "./screens/PhoneEntry";
import { OTPVerify } from "./screens/OTPVerify";
import { CreatePassword } from "./screens/CreatePassword";
import { ProfileSetup } from "./screens/ProfileSetup";
import { TutorProfileSetup } from "./screens/TutorProfileSetup";
import { StudentHome } from "./screens/StudentHome";
import { StudentProfile } from "./screens/StudentProfile";
import { MapSearch } from "./screens/MapSearch";
import { FiltersSheet } from "./screens/FiltersSheet";
import { TutorProfile } from "./screens/TutorProfile";
import { EnrollmentForm } from "./screens/EnrollmentForm";
import { AIChat } from "./screens/AIChat";
import { MyEnrollments } from "./screens/MyEnrollments";
import { RateReview } from "./screens/RateReview";
import { BrowseBatches } from "./screens/BrowseBatches";
import { NotificationsCenter } from "./screens/NotificationsCenter";
import { TutorDashboard } from "./screens/TutorDashboard";
import { TutorEditProfile } from "./screens/TutorEditProfile";
import { DocumentUpload } from "./screens/DocumentUpload";
import { EnrollmentInbox } from "./screens/EnrollmentInbox";
import { GroupBatch } from "./screens/GroupBatch";
import { CapacityManager } from "./screens/CapacityManager";
import { VerificationQueue } from "./screens/VerificationQueue";
import { UserManagement } from "./screens/UserManagement";
import { PlatformStats } from "./screens/PlatformStats";
import { AdminHome } from "./screens/AdminHome";
import { EnrollmentDetail } from "./screens/EnrollmentDetail";
import { SessionCode } from "./screens/SessionCode";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Splash },
      { path: "onboarding", Component: Onboarding },
      { path: "email-signup", Component: EmailSignup },
      { path: "role-selection", Component: RoleSelect },
      { path: "phone-entry", Component: PhoneEntry },
      { path: "otp", Component: OTPVerify },
      { path: "create-password", Component: CreatePassword },
      { path: "role-select", Component: RoleSelect },
      { path: "profile-setup", Component: ProfileSetup },
      { path: "tutor-profile-setup", Component: TutorProfileSetup },
      // Student
      { path: "student/home", Component: StudentHome },
      { path: "student/map", Component: MapSearch },
      { path: "student/filters", Component: FiltersSheet },
      { path: "student/tutor/:id", Component: TutorProfile },
      { path: "student/enroll", Component: EnrollmentForm },
      { path: "student/chat", Component: AIChat },
      { path: "student/enrollments", Component: MyEnrollments },
      { path: "student/review", Component: RateReview },
      { path: "student/batches", Component: BrowseBatches },
      { path: "student/profile", Component: StudentProfile },
      { path: "student/enrollment/:id", Component: EnrollmentDetail },
      { path: "student/session-code", Component: SessionCode },
      // Tutor
      { path: "tutor/dashboard", Component: TutorDashboard },
      { path: "tutor/profile", Component: TutorEditProfile },
      { path: "tutor/documents", Component: DocumentUpload },
      { path: "tutor/inbox", Component: EnrollmentInbox },
      { path: "tutor/batch", Component: GroupBatch },
      { path: "tutor/capacity", Component: CapacityManager },
      // Admin
      { path: "admin/home", Component: AdminHome },
      { path: "admin/verification", Component: VerificationQueue },
      { path: "admin/users", Component: UserManagement },
      { path: "admin/stats", Component: PlatformStats },
      { path: "admin/settings", Component: PlatformStats },
      // Shared
      { path: "notifications", Component: NotificationsCenter },
    ],
  },
]);
