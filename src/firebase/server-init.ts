// src/firebase/server-init.ts
import 'dotenv/config';
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (app) return admin.firestore();

  // Preferir credencial em Base64 (mais estável em prod)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    // corrige quebras de linha do private_key (caso venham escapadas)
    json.private_key = String(json.private_key || '')
      .replace(/^"|"$/g, '')         // remove aspas externas acidentais
      .replace(/\\n/g, '\n')          // \n -> quebra real
      .replace(/\r/g, '')             // remove CR
      .trim();

    if (!json.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 inválido: BEGIN PRIVATE KEY ausente.');
    }

    app = admin.initializeApp({ credential: admin.credential.cert(json) });
    return admin.firestore();
  }

  // Fallback: envs individuais
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltam envs FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY ou FIREBASE_SERVICE_ACCOUNT_B64.');
  }

  privateKey = privateKey
    .replace(/^"|"$/g, '')   // remove aspas externas (muito comum no painel)
    .replace(/\\n/g, '\n')   // \n -> quebra real
    .replace(/\r/g, '')      // remove CR
    .trim();

  if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('FIREBASE_PRIVATE_KEY inválida: BEGIN PRIVATE KEY ausente.');
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  return admin.firestore();
}
