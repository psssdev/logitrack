import { config } from 'dotenv';
config(); // Carrega as variáveis de ambiente do .env

export const runtime = 'nodejs';

import { initializeApp, applicationDefault, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;
let app: App | null = null;

export function getFirestoreServer(): Firestore {
  if (db) {
    return db;
  }

  // Garante que o app seja inicializado apenas uma vez
  if (!getApps().length) {
    app = initializeApp({
      credential: applicationDefault(),
    });
  } else {
    app = getApp();
  }

  db = getFirestore(app);
  return db;
}
