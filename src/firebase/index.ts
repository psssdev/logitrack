'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }
  
  try {
    // This is the idiomatic way to initialize Firebase in a Gcloud/Firebase hosted environment
    // It will automatically use the project's service account credentials
    const firebaseApp = initializeApp();
    return getSdks(firebaseApp);
  } catch (e) {
    console.warn(
        `Firebase automatic initialization failed: ${(e as Error).message}. Falling back to static config.`
    );
    // Fallback for local development or other environments
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
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
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
