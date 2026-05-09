import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import type { CreateUserProfileInput, UserProfile } from '@/types/user';

import { assertFirebaseConfigured, db } from './config';

export function buildInitialUserProfile(input: CreateUserProfileInput): UserProfile {
  return {
    uid: input.uid,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    role: input.role,
    tutorType: input.role === 'tutor' ? (input.tutorType ?? 'student_tutor') : null,
    profilePhotoURL: null,
    location: null,
    createdAt: serverTimestamp(),
    isActive: true,
    phoneVerified: false,
  };
}

export async function createUserProfileDocument(input: CreateUserProfileInput) {
  assertFirebaseConfigured();

  const profile = buildInitialUserProfile(input);

  await setDoc(doc(db, 'users', input.uid), profile, { merge: true });

  return profile;
}
