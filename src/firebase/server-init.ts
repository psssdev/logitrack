export const runtime = 'nodejs';

import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (app || admin.apps.length) {
    app = app ?? admin.apps[0]!;
    return admin.firestore();
  }

  // Usa credenciais padrão do ambiente (GOOGLE_APPLICATION_CREDENTIALS)
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  return admin.firestore();
}
