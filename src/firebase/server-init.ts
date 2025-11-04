
export const runtime = 'nodejs';

import { initializeApp, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;

export function getFirestoreServer(): Firestore {
  if (db) return db;

  // Reusa app se já existir
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: applicationDefault(),
      });

  db = getFirestore(app);
  return db;
}
