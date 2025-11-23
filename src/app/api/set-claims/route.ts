'use server';

import {NextRequest, NextResponse} from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Initialize Firebase Admin SDK using the new helper
const auth = adminAuth();
const db = adminDb();


async function provisionUserProfile(uid: string, email: string | null | undefined, displayName: string | null | undefined): Promise<{ companyId: string, role: string }> {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists && userDoc.data()?.companyId && userDoc.data()?.role) {
        return {
            companyId: userDoc.data()?.companyId,
            role: userDoc.data()?.role,
        };
    }

    const name = displayName || email?.split('@')[0] || 'Novo Usuário';
    
    // Specific override for your user
    if (email === 'jiverson.t@gmail.com' || email === 'athosguariza@gmail.com') {
        await userRef.set({
            displayName: name,
            email,
            companyId: '1',
            role: 'admin',
        }, { merge: true });
        return { companyId: '1', role: 'admin' };
    }

    // Standard flow for other users
    const companyRef = db.collection('companies').doc();
    const batch = db.batch();

    batch.set(companyRef, {
        id: companyRef.id,
        nomeFantasia: `Empresa de ${name}`,
        codigoPrefixo: 'TR',
        linkBaseRastreio: 'https://seusite.com/rastreio/',
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const newRole = 'admin';
    batch.set(userRef, {
        displayName: name,
        email,
        companyId: companyRef.id,
        role: newRole,
    });

    await batch.commit();
    return { companyId: companyRef.id, role: newRole };
}


export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
        }

        const decodedToken = await auth.verifyIdToken(token);
        const { uid, email, name } = decodedToken;

        // Ensure user profile and claims are set
        const { companyId, role } = await provisionUserProfile(uid, email, name);
        
        // Check if claims are already set to avoid unnecessary updates
        if (decodedToken.companyId !== companyId || decodedToken.role !== role) {
             await auth.setCustomUserClaims(uid, { companyId, role });
        }
        
        return NextResponse.json({ success: true, companyId, role });

    } catch (error: any) {
        console.error('Error in set-claims route:', error);
        return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
    }
}
