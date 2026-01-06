// src/lib/firebase-admin.ts
import { cert, getApps, initializeApp, App, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import serviceAccountKey from '../../service-account-key.json';

let _app: App | null = null;
let _auth: any = null; // Use any to avoid Auth import if not always used
let _db: Firestore | null = null;

function getServiceAccount(): ServiceAccount {
    const { project_id, private_key, client_email } = serviceAccountKey as ServiceAccount;
    if (!project_id || !private_key || !client_email) {
        throw new Error(
        'The service-account-key.json file is missing required fields (project_id, private_key, client_email).'
        );
    }
    return {
        projectId: project_id,
        privateKey: private_key.replace(/\\n/g, '\n'),
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

export function adminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db!;
}

// Re-export admin auth if needed elsewhere, lazy-initializing it
export function adminAuth() {
    if (_auth) return _auth;
    const { getAuth } = require('firebase-admin/auth');
    _auth = getAuth(getAdminApp());
    return _auth;
}
