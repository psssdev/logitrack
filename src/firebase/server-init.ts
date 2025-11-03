
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirestoreServer() {
  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID!;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;

    // A causa mais comum para o erro "Invalid PEM" é a formatação da chave.
    // 1. Removemos aspas que podem envolver a variável de ambiente.
    // 2. Substituímos os caracteres de escape '\\n' por quebras de linha reais '\n'.
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
      .replace(/^"|"$/g, '') // Remove aspas do início e do fim
      .replace(/\\n/g, '\n')
      .trim();

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error(
        'FIREBASE_PRIVATE_KEY inválida: faltando o cabeçalho "-----BEGIN PRIVATE KEY-----". Verifique se a variável de ambiente está correta.'
      );
    }
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error(
        'FIREBASE_PRIVATE_KEY inválida: faltando o rodapé "-----END PRIVATE KEY-----". Verifique se a variável de ambiente está correta.'
      );
    }

    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } catch (e: any) {
      // Adiciona um log mais detalhado em caso de falha na inicialização
      console.error('Falha ao inicializar o Firebase Admin:', e.message);
      throw new Error(`Erro na inicialização do Firebase Admin: ${e.message}`);
    }
  }
  return admin.firestore();
}
