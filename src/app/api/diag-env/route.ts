
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  const hasB64 = !!process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  
  // For more detailed diagnosis if needed in the future
  const hasProj = !!process.env.FIREBASE_PROJECT_ID;
  const hasEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;

  return NextResponse.json({
    ok: hasB64 || (hasProj && hasEmail && hasKey),
    usingBase64: hasB64,
    // Below are for the alternative method, good for debugging
    hasProjectId: hasProj,
    hasClientEmail: hasEmail,
    hasPrivateKey: hasKey,
  });
}
