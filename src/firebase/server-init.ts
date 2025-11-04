
export const runtime = 'nodejs';

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (app || admin.apps.length) {
    app = app ?? admin.apps[0]!;
    return admin.firestore();
  }

  // caminho relativo à raiz do projeto:
  const saPath = resolve(process.cwd(), 'service-account-key.json');
  const raw = readFileSync(saPath, 'utf8');
  const sa = JSON.parse(raw);

  // Normaliza para o formato que o Admin espera (camelCase)
  const credential = {
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: String(sa.private_key || '')
      .replace(/^"|"$/g, '')
      .replace(/\\n/g, '\n') // cobre caso venha com \n escapado
      .replace(/\r/g, '')
      .trim(),
  };

  if (!credential.privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key inválida (BEGIN PRIVATE KEY ausente).');
  }

  try {
    app = admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch (error: any) {
    console.error("Firebase admin initialization error:", error);
    // Provide a more descriptive error if initialization fails
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
  
  return admin.firestore();
}
