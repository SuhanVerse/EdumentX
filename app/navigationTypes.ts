export type UserRole = 'student' | 'tutor' | 'admin';

export type AuthRouteName =
  | 'Splash'
  | 'Login'
  | 'Signup'
  | 'OtpVerification'
  | 'RoleSelection'
  | 'ProfileSetup';

export type StudentRouteName = 'StudentHome' | 'StudentMap' | 'StudentChat' | 'StudentEnrollments' | 'StudentProfile';

export type TutorRouteName = 'TutorDashboard' | 'TutorInbox' | 'TutorBatches' | 'TutorProfile';

export type AdminRouteName = 'AdminQueue' | 'AdminUsers' | 'AdminStats' | 'AdminSettings';
