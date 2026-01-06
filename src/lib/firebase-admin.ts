
// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import serviceAccountKey from '../../service-account-key.json';
import type { ServiceAccount } from 'firebase-admin/app';


let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getServiceAccount(): ServiceAccount {
    const { project_id, private_key, client_email } = serviceAccountKey;
    if (!project_id || !private_key || !client_email) {
        throw new Error(
        'The service-account-key.json file is missing required fields (project_id, private_key, client_email).'
        );
    }
    return {
        projectId: project_id,
        privateKey: private_key,
        clientEmail: client_email,
    };
}


export function getAdminApp(): App {
  if (_app) return _app;

  const apps = getApps();
  if (apps.length) {
    _app = apps[0]!;
    return _app;
  }

  const serviceAccount = getServiceAccount();

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
