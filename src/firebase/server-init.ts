
export const runtime = 'nodejs';

import * as admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let app: admin.app.App | null = null;

function normalizePrivateKey(key: string | undefined) {
  return String(key || '')
    .replace(/^"|"$/g, '') // remove aspas acidentais
    .replace(/\\n/g, '\n')  // \n -> quebra real
    .replace(/\r/g, '')     // remove CR
    .trim();
}

export function getFirestoreServer() {
  if (app || admin.apps.length > 0) {
    app = app ?? admin.apps[0]!;
    return admin.firestore();
  }

  // 1) Preferir credencial via Base64 (prod-friendly)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const cred = {
      projectId: json.project_id ?? json.projectId,
      clientEmail: json.client_email ?? json.clientEmail,
      privateKey: normalizePrivateKey(json.private_key ?? json.privateKey),
    };

    if (!cred.projectId || !cred.clientEmail || !cred.privateKey) {
      throw new Error('Credencial B64 incompleta: faltam projectId/clientEmail/privateKey.');
    }
    if (!cred.privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Private key inválida (BEGIN PRIVATE KEY ausente).');
    }

    app = admin.initializeApp({ credential: admin.credential.cert(cred) });
    return admin.firestore();
  }

  // 2) Fallback: carregar JSON do disco (dev/local)
  const saPath = resolve(process.cwd(), 'service-account-key.json');
  if (!existsSync(saPath)) {
    throw new Error(
      `Service account não encontrada. Defina FIREBASE_SERVICE_ACCOUNT_B64 ou coloque o arquivo em: ${saPath}`
    );
  }

  let raw: string;
  try {
    raw = readFileSync(saPath, 'utf8');
  } catch (e: any) {
    throw new Error(`Falha ao ler service-account-key.json: ${e?.message || e}`);
  }

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`JSON inválido em service-account-key.json: ${e?.message || e}`);
  }

  const cred = {
    projectId: json.project_id ?? json.projectId,
    clientEmail: json.client_email ?? json.clientEmail,
    privateKey: normalizePrivateKey(json.private_key ?? json.privateKey),
  };

  if (!cred.projectId || !cred.clientEmail || !cred.privateKey) {
    throw new Error('Service account JSON incompleto: faltam projectId/clientEmail/privateKey.');
  }
  if (!cred.privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key inválida (BEGIN PRIVATE KEY ausente).');
  }

  try {
    app = admin.initializeApp({ credential: admin.credential.cert(cred) });
  } catch (error: any) {
    // Mostra mensagem clara
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error?.message || error}`);
  }

  return admin.firestore();
}
