import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseEnvValues = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const firebaseConfig = {
  apiKey: firebaseEnvValues.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: firebaseEnvValues.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: firebaseEnvValues.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: firebaseEnvValues.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: firebaseEnvValues.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: firebaseEnvValues.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const requiredFirebaseEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

export const missingFirebaseEnvVars = requiredFirebaseEnvVars.filter((key) => !firebaseEnvValues[key]?.trim());

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

export function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error(`Missing Firebase environment values: ${missingFirebaseEnvVars.join(', ')}`);
  }
}

export const firebaseApp = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null;

export function getFirebaseAuth() {
  assertFirebaseConfigured();

  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }

  return auth;
}

export function getFirebaseDb() {
  assertFirebaseConfigured();

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  return db;
}

export function getFirebaseStorage() {
  assertFirebaseConfigured();

  if (!storage) {
    throw new Error('Firebase Storage is not initialized.');
  }

  return storage;
}
