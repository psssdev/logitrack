import * as admin from 'firebase-admin';

// Esta variável armazenará a instância inicializada do app para evitar reinicializações.
let app: admin.app.App | null = null;

/**
 * Retorna uma instância inicializada do Firestore Admin SDK (singleton).
 * A inicialização agora usa as credenciais de uma variável de ambiente em Base64
 * para evitar problemas de formatação com a chave privada.
 */
export function getFirestoreServer() {
  if (!app) {
    // A chave de serviço completa (formato JSON) é esperada em uma única variável de ambiente,
    // codificada em Base64. Esta é uma abordagem robusta para ambientes de deploy.
    const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

    if (!serviceAccountB64) {
      throw new Error(
        'A variável de ambiente FIREBASE_SERVICE_ACCOUNT_B64 não está definida. ' +
        'Por favor, codifique seu arquivo de credenciais JSON em Base64 e adicione-o ao seu arquivo .env.local.'
      );
    }

    try {
      // Decodifica a string Base64 para obter o JSON original.
      const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      // Garante que as quebras de linha na chave privada estejam corretas.
      // Esta é uma segurança extra caso a cópia/cola original tenha escapado os caracteres.
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id, // Garante que o projeto correto seja usado.
      });
    } catch (e: any) {
      console.error('Falha ao inicializar o Firebase Admin com credenciais Base64:', e);
      // Fornece um erro mais detalhado para ajudar na depuração.
      if (e.message.includes('Unexpected token')) {
         throw new Error(`Erro ao analisar as credenciais do Firebase: O JSON decodificado de FIREBASE_SERVICE_ACCOUNT_B64 é inválido. Verifique se a string Base64 está correta. ${e.message}`);
      }
       if (e.message.includes('Invalid PEM')) {
         throw new Error(`Erro ao analisar a chave privada do Firebase: A chave privada dentro das credenciais é inválida. ${e.message}`);
      }
      throw new Error(`Erro na inicialização do Firebase Admin: ${e.message}`);
    }
  }

  return admin.firestore();
}
