import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
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
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    // If user profile already exists, do nothing.
    if (userDoc.exists) {
      const userData = userDoc.data();
      if(userData?.companyId && userData?.role) {
        // Ensure claims are set if profile exists but claims are missing
        const currentClaims = (await adminAuth.getUser(uid)).customClaims;
        if (!currentClaims?.companyId || !currentClaims?.role) {
           await adminAuth.setCustomUserClaims(uid, { companyId: userData.companyId, role: userData.role });
        }
        return NextResponse.json({ message: 'User already provisioned' }, { status: 200 });
      }
    }
    
    // --- Special Handling for a specific user (e.g., the first admin) ---
    // This allows the first user to be associated with a pre-existing company '1'
    if (email === 'jiverson.t@gmail.com') {
      const companyId = '1';
      const role = 'admin';
      
      const companyRef = db.collection('companies').doc(companyId);
      const companyDoc = await companyRef.get();

      const batch = db.batch();

      // Create company '1' if it doesn't exist
      if (!companyDoc.exists) {
        batch.set(companyRef, {
          nomeFantasia: 'LogiTrack',
          codigoPrefixo: 'TR',
          linkBaseRastreio: 'https://seusite.com/rastreio/',
          createdAt: new Date(),
        });
      }
      
      // Create user profile
      batch.set(userRef, {
        displayName: name || email,
        email: email,
        companyId: companyId,
        role: role,
        createdAt: new Date(),
      });
      
      await batch.commit();
      await adminAuth.setCustomUserClaims(uid, { companyId, role });
      
      return NextResponse.json({ message: 'Admin user provisioned for existing company.' }, { status: 200 });
    }
    // --- End Special Handling ---


    // --- Standard New User Flow ---
    const companyRef = db.collection('companies').doc(); // Create a new doc with a unique ID
    const userProfileRef = db.collection('users').doc(uid);

    const batch = db.batch();

    // 1. Create a new company
    batch.set(companyRef, {
      nomeFantasia: `Empresa de ${name || email}`,
      codigoPrefixo: 'LG',
      linkBaseRastreio: 'https://rastreio.com/',
      createdAt: new Date(),
    });

    // 2. Create the user's profile, linking to the new company
    const newRole = 'admin';
    batch.set(userProfileRef, {
      displayName: name || email,
      email: email,
      companyId: companyRef.id,
      role: newRole,
      createdAt: new Date(),
    });

    // 3. Commit the batch
    await batch.commit();

    // 4. Set custom claims
    await adminAuth.setCustomUserClaims(uid, { companyId: companyRef.id, role: newRole });

    return NextResponse.json({ message: 'New user and company provisioned successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error in provision-user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
