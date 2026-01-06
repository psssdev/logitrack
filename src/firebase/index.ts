'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // In a Google Cloud / Firebase hosting environment, the SDK can auto-initialize
  // This is the preferred method as it's more secure and requires no client-side config
  try {
    const app = getApps().length ? getApp() : initializeApp();
    return getSdks(app);
  } catch (e) {
     console.warn(
        `Firebase automatic initialization failed: ${(e as Error).message}. Falling back to static config.`
    );
    // Fallback for local development or other environments without injected config
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getSdks(app);
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
