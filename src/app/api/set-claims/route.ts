'use server';

import {NextRequest, NextResponse} from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function provisionUserProfile(uid: string, email: string | null | undefined, displayName: string | null | undefined): Promise<{ role: string }> {
    const db = adminDb();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists && userDoc.data()?.role) {
        return {
            role: userDoc.data()?.role,
        };
    }

    const name = displayName || email?.split('@')[0] || 'Novo Usuário';
    const newRole = 'admin';

    await userRef.set({
        displayName: name,
        email,
        role: newRole,
    }, { merge: true });

    return { role: newRole };
}


export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ error: 'ID token é obrigatório.' }, { status: 400 });
        }
        
        const auth = adminAuth();
        const decodedToken = await auth.verifyIdToken(token, true); // true para verificar se foi revogado
        const { uid, email, name } = decodedToken;

        // Garante que o perfil do utilizador existe antes de definir as claims
        const { role } = await provisionUserProfile(uid, email, name);
        
        // Verifica se as claims já estão definidas para evitar atualizações desnecessárias
        if (decodedToken.role !== role) {
             await auth.setCustomUserClaims(uid, { role });
             // Depois de definir as claims, o ID token fica obsoleto. O cliente precisa de o atualizar.
        }
        
        return NextResponse.json({ success: true, role });

    } catch (error: any) {
        console.error('Erro na rota set-claims:', error);
        // Distingue entre diferentes tipos de erros de autenticação, se necessário
        if (error.code === 'auth/id-token-revoked') {
             return NextResponse.json({ error: 'Token foi revogado. Por favor, autentique-se novamente.', needsRefresh: true }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Ocorreu um erro desconhecido.' }, { status: 500 });
    }
}
