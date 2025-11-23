
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin SDK init
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    // Force the correct project ID to match the client's configuration
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminAuth = getAuth();
const db = getFirestore();

/**
 * API endpoint to set custom claims on a user AND provision their user profile.
 */
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
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || decodedToken.email || 'Usuário';

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório para provisionamento.' },
        { status: 400 }
      );
    }

    const { claims } = await req.json();

    if (!claims || !claims.companyId || !claims.role) {
      return NextResponse.json(
        { error: 'Invalid claims object provided.' },
        { status: 400 }
      );
    }

    // 1. Provision user profile document in Firestore
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    // Only write if the document doesn't exist to prevent overwriting
    if (!userSnap.exists) {
        await userRef.set(
          {
            displayName: name,
            email,
            companyId: claims.companyId,
            role: claims.role,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true } // Use merge to be safe
        );
    }


    // 2. Set custom claims for the user
    await adminAuth.setCustomUserClaims(uid, {
      companyId: claims.companyId,
      role: claims.role,
    });

    return NextResponse.json(
      { message: 'User provisioned and claims set successfully.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in set-claims/provision-user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
