// src/app/api/provision-user/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: missing bearer token' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name || decoded.email || 'Usuário';

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório para provisionamento.' },
        { status: 400 }
      );
    }

    const db = adminDb();
    const usersCol = db.collection('users');

    // 1) Tenta achar perfil pelo UID
    const userRefByUid = usersCol.doc(uid);
    const userDocByUid = await userRefByUid.get();

    let companyId: string | null = null;
    let role: string | null = null;

    if (userDocByUid.exists) {
      const data = userDocByUid.data()!;
      companyId = (data.companyId as string) || null;
      role = (data.role as string) || null;
    } else {
      // 2) Tenta achar perfil antigo pelo email
      const snapByEmail = await usersCol.where('email', '==', email).limit(1).get();
      if (!snapByEmail.empty) {
        const docByEmail = snapByEmail.docs[0];
        const data = docByEmail.data();

        companyId = (data.companyId as string) || null;
        role = (data.role as string) || null;

        await userRefByUid.set(
          {
            displayName: data.displayName || name,
            email,
            companyId,
            role: role || 'admin',
            createdAt: data.createdAt || new Date(),
          },
          { merge: true }
        );
      }
    }

    // 3) Se já achamos empresa e papel → só sincroniza claims
    if (companyId && role) {
      await adminAuth().setCustomUserClaims(uid, { companyId, role });
      return NextResponse.json(
        { message: 'User provisioned from existing profile.' },
        { status: 200 }
      );
    }

    // 4) (Opcional) fixar seu email em uma empresa específica (ex: '1' com dados antigos)
    if (email === 'jiverson.t@gmail.com') {
      const fixedCompanyId = '1'; // ID da empresa que já tem seus dados
      const fixedRole = 'admin';

      await userRefByUid.set(
        {
          displayName: name,
          email,
          companyId: fixedCompanyId,
          role: fixedRole,
          createdAt: new Date(),
        },
        { merge: true }
      );

      await adminAuth().setCustomUserClaims(uid, {
        companyId: fixedCompanyId,
        role: fixedRole,
      });

      return NextResponse.json(
        { message: 'Owner provisioned into existing company.' },
        { status: 200 }
      );
    }
    

    // 5) Se realmente não existe nada → cria nova empresa + usuário admin
    const companyRef = db.collection('companies').doc();
    const batch = db.batch();

    batch.set(companyRef, {
      nomeFantasia: `Empresa de ${name}`,
      codigoPrefixo: 'LG',
      linkBaseRastreio: 'https://rastreio.com/',
      createdAt: new Date(),
    });

    const newRole = 'admin';
    batch.set(userRefByUid, {
      displayName: name,
      email,
      companyId: companyRef.id,
      role: newRole,
      createdAt: new Date(),
    });

    await batch.commit();

    await adminAuth().setCustomUserClaims(uid, {
      companyId: companyRef.id,
      role: newRole,
    });

    return NextResponse.json(
      { message: 'New user and company provisioned successfully.' },
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