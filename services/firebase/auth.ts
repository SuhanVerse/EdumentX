import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import type { UserRole } from '@/types/user';

import { auth, assertFirebaseConfigured } from './config';
import { createUserProfileDocument } from './users';

export type DevelopmentSignupInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Exclude<UserRole, 'admin'>;
};

export async function signUpDevelopmentUser(input: DevelopmentSignupInput) {
  assertFirebaseConfigured();

  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = credential.user.uid;

  await createUserProfileDocument({
    uid,
    name: input.name,
    phone: input.phone,
    email: credential.user.email,
    role: input.role,
  });

  return credential.user;
}

export async function signInDevelopmentUser(email: string, password: string) {
  assertFirebaseConfigured();

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

  return credential.user;
}

export function subscribeToAuthUser(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function signOutDevelopmentUser() {
  return signOut(auth);
}
