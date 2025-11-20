// src/app/api/provision-user/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Inicializa Admin SDK usando as credenciais do ambiente (Firebase Studio / GOOGLE_APPLICATION_CREDENTIALS)
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const adminAuth = getAuth();
const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }

    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: 'User email is required for provisioning.' },
        { status: 400 }
      );
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    // 1. Já existe perfil de usuário → só garante claims e sai
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.companyId && userData?.role) {
        const currentClaims = (await adminAuth.getUser(uid)).customClaims;
        if (!currentClaims?.companyId || !currentClaims?.role) {
          await adminAuth.setCustomUserClaims(uid, {
            companyId: userData.companyId,
            role: userData.role,
          });
        }
        return NextResponse.json(
          { message: 'User already provisioned' },
          { status: 200 }
        );
      }
    }

    // 2. Tratamento especial pro "primeiro admin" em empresa fixa (companies/1)
    if (email === 'jiverson.t@gmail.com') {
      const companyId = '1';
      const role = 'admin';

      const companyRef = db.collection('companies').doc(companyId);
      const companyDoc = await companyRef.get();
      const batch = db.batch();

      if (!companyDoc.exists) {
        batch.set(companyRef, {
          nomeFantasia: 'LogiTrack',
          codigoPrefixo: 'TR',
          linkBaseRastreio: 'https://seusite.com/rastreio/',
          createdAt: new Date(),
        });
      }

      batch.set(userRef, {
        displayName: name || email,
        email,
        companyId,
        role,
        createdAt: new Date(),
      });

      await batch.commit();
      await adminAuth.setCustomUserClaims(uid, { companyId, role });

      return NextResponse.json(
        { message: 'Admin user provisioned for existing company.' },
        { status: 200 }
      );
    }

    // 3. Fluxo padrão: novo login → nova empresa + usuário admin
    const companyRef = db.collection('companies').doc(); // ID automático
    const userProfileRef = db.collection('users').doc(uid);
    const batch = db.batch();

    batch.set(companyRef, {
      nomeFantasia: `Empresa de ${name || email}`,
      codigoPrefixo: 'LG',
      linkBaseRastreio: 'https://rastreio.com/',
      createdAt: new Date(),
    });

    const newRole = 'admin';

    batch.set(userProfileRef, {
      displayName: name || email,
      email,
      companyId: companyRef.id,
      role: newRole,
      createdAt: new Date(),
    });

    await batch.commit();

    await adminAuth.setCustomUserClaims(uid, {
      companyId: companyRef.id,
      role: newRole,
    });

    return NextResponse.json(
      { message: 'New user and company provisioned successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in provision-user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
