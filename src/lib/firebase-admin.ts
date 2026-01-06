'use server';

import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Variáveis para guardar as instâncias em cache
let app: App | null = null;
let db: Firestore | null = null;

const APP_NAME = 'logitrack-admin';

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

export async function adminDb(): Promise<Firestore> {
  // Se a instância do DB já existe, retorna-a
  if (db) {
    return db;
  }

  // Verifica se a NOSSA app específica já foi inicializada
  const existingApp = getApps().find(a => a.name === APP_NAME);

  if (existingApp) {
    app = existingApp;
  } else {
    const sa = loadServiceAccount();
    if (!sa) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT não definida. Sem isso o ambiente tenta usar metadata/refresh token."
      );
    }

    // Corrige \n no private_key
    if (typeof sa.private_key === "string") {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }

    // Inicializa a NOSSA app com um nome único
    app = initializeApp({ credential: cert(sa) }, APP_NAME);
  }

  // Obtém e guarda em cache a instância do Firestore a partir da nossa app
  db = getFirestore(app);
  return db;
}
