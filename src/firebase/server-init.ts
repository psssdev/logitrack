
export const runtime = 'nodejs';

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (app || admin.apps.length > 0) {
    app = app ?? admin.apps[0]!;
    return admin.firestore();
  }

  // caminho relativo à raiz do projeto:
  const saPath = resolve(process.cwd(), 'service-account-key.json');
  const raw = readFileSync(saPath, 'utf8');
  const serviceAccount = JSON.parse(raw);

  // A chave privada precisa ter as quebras de linha corretas
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error: any) {
    console.error("Firebase admin initialization error:", error);
    // Provide a more descriptive error if initialization fails
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
  
  return admin.firestore();
}
