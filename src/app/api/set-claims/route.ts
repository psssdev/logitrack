
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin SDK init
if (!getApps().length) {
  // Use applicationDefault() to automatically use the environment's
  // service account credentials, which is the correct approach for App Hosting.
  initializeApp({
    credential: applicationDefault(),
  });
}

const adminAuth = getAuth();
const db = getFirestore();

async function findUserAndCompany(uid: string) {
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const data = userDoc.data();
    if (data?.companyId && data?.role) {
      return { companyId: data.companyId, role: data.role, profileExists: true };
    }
  }
  
  // If the user doc exists but is malformed, we'll treat as if it doesn't exist to re-provision.
  return { companyId: null, role: null, profileExists: false };
}

async function provisionNewUserAndCompany(uid: string, email: string, name: string) {
  // Special override for a specific user to ensure they are admin of company '1'
  if (email === 'athosguariza@gmail.com') {
      const userRef = db.collection('users').doc(uid);
      await userRef.set({
        displayName: name,
        email,
        companyId: '1',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      return { companyId: '1', role: 'admin' };
  }


  // Standard flow for new users
  const companyRef = db.collection('companies').doc();
  const userRef = db.collection('users').doc(uid);

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
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await batch.commit();
  return { companyId: companyRef.id, role: newRole };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name: displayName } = decodedToken;
    const name = displayName || email?.split('@')[0] || 'Novo Usuário';

    if (!email) {
      return NextResponse.json({ error: 'Email is required for provisioning.' }, { status: 400 });
    }

    let { companyId, role, profileExists } = await findUserAndCompany(uid);

    if (!profileExists) {
      const provisioned = await provisionNewUserAndCompany(uid, email, name);
      companyId = provisioned.companyId;
      role = provisioned.role;
    }
    
    // Set custom claims if they don't match what's expected.
    if (decodedToken.companyId !== companyId || decodedToken.role !== role) {
       await adminAuth.setCustomUserClaims(uid, { companyId, role });
    }

    return NextResponse.json({ message: 'Claims set and user provisioned successfully.', companyId, role }, { status: 200 });

  } catch (error: any) {
    console.error('Error in set-claims:', error);
    const errorMessage = error.errorInfo?.message || error.message || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
