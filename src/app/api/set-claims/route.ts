
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin SDK init
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const adminAuth = getAuth();
const db = getFirestore();

async function findUserAndCompany(uid: string, email: string) {
  const usersCol = db.collection('users');
  const userRef = usersCol.doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const data = userDoc.data();
    if (data?.companyId && data?.role) {
      return { companyId: data.companyId, role: data.role, profileExists: true };
    }
  }

  // Fallback for older data models: find by email
  const userQueryByEmail = await usersCol.where('email', '==', email).limit(1).get();
  if (!userQueryByEmail.empty) {
    const oldUserDoc = userQueryByEmail.docs[0];
    const data = oldUserDoc.data();
    if (data.companyId && data.role) {
      // Migrate old data to new UID-based doc
      await userRef.set({
        displayName: data.displayName || email,
        email: email,
        companyId: data.companyId,
        role: data.role,
        createdAt: data.createdAt || new Date(),
      }, { merge: true });
      return { companyId: data.companyId, role: data.role, profileExists: true };
    }
  }

  // Special owner case
  if (email === 'athosguariza@gmail.com') {
    return { companyId: '1', role: 'admin', profileExists: false };
  }

  return { companyId: null, role: null, profileExists: false };
}

async function provisionNewUserAndCompany(uid: string, email: string, name: string) {
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
    const name = displayName || email || 'Usuário';

    if (!email) {
      return NextResponse.json({ error: 'Email is required for provisioning.' }, { status: 400 });
    }

    let { companyId, role, profileExists } = await findUserAndCompany(uid, email);

    if (!companyId || !role) {
      const provisioned = await provisionNewUserAndCompany(uid, email, name);
      companyId = provisioned.companyId;
      role = provisioned.role;
      profileExists = true; 
    } else if (!profileExists) {
      // This handles the case where findUserAndCompany returns a companyId/role (e.g., for the owner) but the profile doesn't exist yet.
      const userRef = db.collection('users').doc(uid);
      await userRef.set({
        displayName: name,
        email,
        companyId,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
    }

    // Set custom claims if they don't match
    if (decodedToken.companyId !== companyId || decodedToken.role !== role) {
      await adminAuth.setCustomUserClaims(uid, { companyId, role });
    }

    return NextResponse.json({ message: 'Claims set and user provisioned successfully.', companyId, role }, { status: 200 });

  } catch (error: any) {
    console.error('Error in set-claims:', error);
    // Propagate a more specific error message if available
    const errorMessage = error.errorInfo?.message || error.message || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
