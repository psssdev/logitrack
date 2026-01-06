
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Order, Company, PixKey } from '@/lib/types';


// Re-export adminDb so other public server actions can use it.
export { adminDb };


export async function getOrderByTrackingCode(codigoRastreio: string): Promise<Order | null> {
  const firestore = await adminDb();

  // This is tricky because orders are in subcollections. We need to query across all stores.
  const ordersCollectionGroup = firestore.collectionGroup('orders');
  const q = ordersCollectionGroup.where("codigoRastreio", "==", codigoRastreio.toUpperCase()).limit(1);

  try {
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
      const orderDoc = querySnapshot.docs[0];
      return { id: orderDoc.id, ...orderDoc.data() } as Order;
    }
  } catch (error) {
    console.error("Error fetching order by tracking code: " + codigoRastreio, error);
  }

  // Fallback for legacy orders
  const legacyOrderRef = firestore.collection('orders');
  const legacyQ = legacyOrderRef.where("codigoRastreio", "==", codigoRastreio.toUpperCase()).limit(1);
  try {
    const querySnapshot = await legacyQ.get();
    if (!querySnapshot.empty) {
      const orderDoc = querySnapshot.docs[0];
      return { id: orderDoc.id, ...orderDoc.data() } as Order;
    }
  } catch (error) {
    console.error("Error fetching legacy order by tracking code: " + codigoRastreio, error);
  }


  return null;
}

export async function getPublicPixData(storeId: string, keyId: string): Promise<{ company: Company | null; pixKey: PixKey | null; }> {
  console.log("HAS_FIREBASE_SA", !!process.env.FIREBASE_SERVICE_ACCOUNT);
  try {
    const db = await adminDb();

    const companySettingsRef = db.collection('stores').doc(storeId).collection('companySettings').doc('default');
    const pixKeyRef = db.collection('stores').doc(storeId).collection('pixKeys').doc(keyId);

    const [companySnap, pixKeySnap] = await Promise.all([
      companySettingsRef.get(),
      pixKeyRef.get(),
    ]);

    // Helper to serialize Firestore Timestamps to ISO strings (plain objects)
    const serializeTimestamps = <T extends Record<string, any>>(obj: T): T => {
      const result: Record<string, any> = { ...obj };
      for (const key of Object.keys(result)) {
        const val = result[key];
        // Check for Firestore Timestamp (has _seconds and _nanoseconds or toDate method)
        if (val && typeof val === 'object' && typeof val.toDate === 'function') {
          result[key] = val.toDate().toISOString();
        } else if (val && typeof val === 'object' && '_seconds' in val && '_nanoseconds' in val) {
          result[key] = new Date(val._seconds * 1000).toISOString();
        }
      }
      return result as T;
    };

    const company = companySnap.exists ? serializeTimestamps({ id: companySnap.id, ...companySnap.data() } as Company) : null;
    const pixKey = pixKeySnap.exists ? serializeTimestamps({ id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey) : null;

    return { company, pixKey };
  } catch (error: any) {
    console.error("Error fetching public pix data:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", JSON.stringify(error, null, 2));
    }
    return { company: null, pixKey: null };
  }
}
