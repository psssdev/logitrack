import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  const hasB64 = !!process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const hasProj = !!process.env.FIREBASE_PROJECT_ID;
  const hasEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;
  return NextResponse.json({
    ok: hasB64 || (hasProj && hasEmail && hasKey),
    usingBase64: hasB64,
    hasProjectId: hasProj,
    hasClientEmail: hasEmail,
    hasPrivateKey: hasKey,
  });
}
