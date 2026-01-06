
'use server';

// This file is deprecated and will be removed. Use src/lib/firebase-admin.ts instead.
import { adminDb } from '@/lib/firebase-admin';
import { type Firestore } from 'firebase-admin/firestore';

export async function getFirestoreServer(): Promise<Firestore> {
  return adminDb();
}
