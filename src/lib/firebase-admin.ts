
'use server';

import { cert, getApps, initializeApp, App, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

// Variáveis para guardar as instâncias em cache
let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

const APP_NAME = 'logitrack-admin-app';

function getServiceAccountFromEnv(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private key often comes with escaped newlines from env vars
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your environment variables."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function initializeAdminApp() {
  if (_app) return _app;

  // Use a name to avoid conflict with client-side app
  const existingApp = getApps().find(app => app.name === APP_NAME);
  if (existingApp) {
    _app = existingApp;
    return _app;
  }

  const serviceAccount = getServiceAccountFromEnv();
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
