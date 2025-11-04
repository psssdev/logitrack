
// src/firebase/server-init.ts
import 'dotenv/config';
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (app) {
    return admin.firestore();
  }

  try {
    const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    
    if (!serviceAccountB64) {
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_B64 não foi encontrada. Execute `node scripts/encode-service-account.js` para gerá-la.');
    }

    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
  } catch (error: any) {
    console.error("Firebase admin initialization error:", error);
    // Provide a more descriptive error if initialization fails
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }

  return admin.firestore();
}
