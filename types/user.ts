import type { FieldValue, GeoPoint, Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'tutor' | 'admin';

export type TutorType = 'student_tutor' | 'professional';

export type UserProfile = {
  uid: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  tutorType: TutorType | null;
  profilePhotoURL: string | null;
  location: GeoPoint | null;
  createdAt: Timestamp | FieldValue;
  isActive: boolean;
  phoneVerified: boolean;
};

export type CreateUserProfileInput = {
  uid: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  tutorType?: TutorType | null;
};
