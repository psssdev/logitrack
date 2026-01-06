
import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let _db: Firestore | null = null;
let _auth: any = null;

function loadServiceAccount() {
  // Directly import the service account key JSON file.
  // This is simpler and more reliable in environments where env vars might be tricky.
  try {
    const serviceAccount = require('../../service-account-key.json');
    return serviceAccount;
  } catch (e) {
    console.error("Failed to load service-account-key.json.", e);
    return null;
  }
}

export function adminDb(): Firestore {
  if (_db) return _db;
  
  if (!getApps().length) {
    const sa = loadServiceAccount();
    if (!sa || !sa.project_id) {
       throw new Error(
        "Service account key file is missing, empty, or invalid. Cannot initialize Firebase Admin."
      );
    }

    initializeApp({
        credential: cert(sa)
    });
  }

  _db = getFirestore();
  return _db;
}

export function adminAuth() {
    if (_auth) return _auth;

    if (!getApps().length) {
        adminDb(); // Ensure app is initialized
    }
    
    _auth = getAuth();
    return _auth;
}
