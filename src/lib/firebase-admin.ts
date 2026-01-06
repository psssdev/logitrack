'use server';

import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let _db: Firestore | null = null;
let _auth: any = null;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  // Aceita JSON direto (1 linha) OU base64
  const txt = raw.trim();
  try {
    if (txt.startsWith("{")) return JSON.parse(txt);
    const decoded = Buffer.from(txt, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT inválida (use JSON ou base64).");
  }
}

export function adminDb(): Firestore {
  if (!getApps().length) {
    const sa: any = loadServiceAccount();
    if (!sa) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT não definida. Sem isso o ambiente tenta usar metadata/refresh token."
      );
    }

    // Corrige \n no private_key
    if (typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }

    initializeApp({ credential: cert(sa) });
  }

  if (!_db) {
    _db = getFirestore();
  }
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