import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import type { UserRole } from '@/types/user';

import { auth, getFirebaseAuth, isFirebaseConfigured } from './config';
import { createUserProfileDocument } from './users';

export type DevelopmentSignupInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Exclude<UserRole, 'admin'>;
};

export async function signUpDevelopmentUser(input: DevelopmentSignupInput) {
  const auth = getFirebaseAuth();

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
  const auth = getFirebaseAuth();

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

  return credential.user;
}

export function subscribeToAuthUser(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, callback);
}

export function signOutDevelopmentUser() {
  const auth = getFirebaseAuth();

  return signOut(auth);
}
