
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID!;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
    // IMPORTANTE: substituir \\n por \n
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();

    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('FIREBASE_PRIVATE_KEY inválida: faltando BEGIN/END PRIVATE KEY');
    }

    app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  return admin.firestore();
}
