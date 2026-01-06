'use server';

import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import serviceAccount from '@/../service-account-key.json';

// Variáveis para guardar as instâncias em cache
let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

const APP_NAME = 'logitrack-admin-app';

function initializeAdminApp() {
  if (_app) return _app;

  // Use a name to avoid conflict with client-side app
  const existingApp = getApps().find(app => app.name === APP_NAME);
  if (existingApp) {
    _app = existingApp;
    return _app;
  }
  
  const credential = cert(serviceAccount);

  _app = initializeApp({
    credential,
  }, APP_NAME);

  return _app;
}

export async function adminDb(): Promise<Firestore> {
  if (_db) return _db;
  const app = initializeAdminApp();
  _db = getFirestore(app);
  return _db;
}

export async function adminAuth(): Promise<Auth> {
  if (_auth) return _auth;
  const app = initializeAdminApp();
  _auth = getAuth(app);
  return _auth;
}
