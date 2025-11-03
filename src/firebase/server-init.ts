
import * as admin from 'firebase-admin';
import { config } from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env.local
config();

// Variáveis de ambiente para o Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // A chave privada precisa ter as quebras de linha restauradas.
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
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
  return admin.firestore();
}
