
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Order, Company, PixKey } from '@/lib/types';


// Re-export adminDb so other public server actions can use it.
export { adminDb };


export async function getOrderByTrackingCode(codigoRastreio: string): Promise<Order | null> {
    const firestore = adminDb();
    
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
    const db = adminDb();

    const companySettingsRef = db.collection('stores').doc(storeId).collection('companySettings').doc('default');
    const pixKeyRef = db.collection('stores').doc(storeId).collection('pixKeys').doc(keyId);

    const [companySnap, pixKeySnap] = await Promise.all([
      companySettingsRef.get(),
      pixKeyRef.get(),
    ]);

    const company = companySnap.exists ? ({ id: companySnap.id, ...companySnap.data() } as Company) : null;
    const pixKey = pixKeySnap.exists ? ({ id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey) : null;

    return { company, pixKey };
  } catch (error) {
    console.error("Error fetching public pix data:", error);
    return { company: null, pixKey: null };
  }
}
