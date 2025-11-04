import { NextResponse } from 'next/server';
import { getFirestoreServer } from '@/firebase/server-init';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const db = getFirestoreServer();
    await db.collection('diag').doc('admin-ok').set({ ok: true, at: Date.now() });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
