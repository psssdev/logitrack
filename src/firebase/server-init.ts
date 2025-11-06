'use server';

import { initializeApp, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;

export async function getFirestoreServer(): Promise<Firestore> {
  if (db) return db;

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: applicationDefault(), // usa GOOGLE_APPLICATION_CREDENTIALS
      });

  db = getFirestore(app);
  return db;
}
