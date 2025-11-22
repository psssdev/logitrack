import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
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

/**
 * API endpoint to set custom claims on a user.
 * This is called by the client-side provisioning logic.
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
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    
    const { claims } = await req.json();

    if (!claims || !claims.companyId || !claims.role) {
         return NextResponse.json(
            { error: 'Invalid claims object provided.' },
            { status: 400 }
        );
    }

    await adminAuth.setCustomUserClaims(uid, { 
        companyId: claims.companyId,
        role: claims.role,
     });

    return NextResponse.json(
      { message: 'Custom claims set successfully.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in set-claims:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
