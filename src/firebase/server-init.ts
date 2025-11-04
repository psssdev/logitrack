
// src/firebase/server-init.ts
import 'dotenv/config';
import * as admin from 'firebase-admin';
import serviceAccount from '../../service-account-key.json';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (app) {
    return admin.firestore();
  }

  // Ensure the service account has the correct format, especially the private key
  const typedServiceAccount = {
      type: serviceAccount.type,
      projectId: serviceAccount.project_id,
      privateKeyId: serviceAccount.private_key_id,
      privateKey: (serviceAccount.private_key || '').replace(/\\n/g, '\n'),
      clientEmail: serviceAccount.client_email,
      clientId: serviceAccount.client_id,
      authUri: serviceAccount.auth_uri,
      tokenUri: serviceAccount.token_uri,
      authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
      clientX509CertUrl: serviceAccount.client_x509_cert_url,
  };

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(typedServiceAccount),
    });
  } catch (error: any) {
    console.error("Firebase admin initialization error:", error);
    // Provide a more descriptive error if initialization fails
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }


  return admin.firestore();
}
