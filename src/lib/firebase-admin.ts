
// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin/app';

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function loadServiceAccountFromEnv(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    // This will run on server start-up, so it's safe to throw here.
    throw new Error(
      'Firebase Admin SDK env vars are missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment.'
    );
  }

  // The private key from env vars can have escaped newlines.
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
