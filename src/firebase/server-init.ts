
import * as admin from 'firebase-admin';

// Variáveis de ambiente para o Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

/**
 * Initializes and returns a Firestore instance for server-side usage using the Admin SDK.
 * It ensures that the Firebase app is initialized only once (singleton pattern).
 */
export function getFirestoreServer() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.firestore();
}
