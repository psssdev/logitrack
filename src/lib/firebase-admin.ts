// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function loadServiceAccountFromEnv(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK envs ausentes. Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.'
    );
  }

  // Corrige \n escapados
  privateKey = privateKey.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey };
}

export function getAdminApp(): App {
  if (_app) return _app;

  const apps = getApps();
  if (apps.length) {
    _app = apps[0]!;
    return _app;
  }

  const serviceAccount = loadServiceAccountFromEnv();

  _app = initializeApp({
    credential: cert(serviceAccount),
  });

  return _app!;
}

export function adminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getAdminApp());
  return _auth!;
}

export function adminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db!;
}
