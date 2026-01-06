
'use server';

// IMPORTANT: This file is for server actions that should be publicly accessible.
// Do not import from '@/firebase' here, as it contains client-side code.
// Use getFirestoreServer for database access.

import { getFirestoreServer } from '@/firebase/server-init';
import { getDocs, collection as adminCollection, query as adminQuery, where as adminWhere, limit as adminLimit } from 'firebase-admin/firestore';
import type { Order, Company, PixKey } from '@/lib/types';


// Re-export getFirestoreServer so other public server actions can use it.
export { getFirestoreServer };

export async function getPublicPixData(storeId: string, keyId: string): Promise<{ company: Company | null; pixKey: PixKey | null }> {
  console.log('Fetching public pix data for:', { storeId, keyId });
  if (!storeId || !keyId) return { company: null, pixKey: null };
  try {
    const db = await getFirestoreServer();
    const companySettingsRef = db.collection('stores').doc(storeId).collection('companySettings').doc('default');
    const pixKeyRef = db.collection('stores').doc(storeId).collection('pixKeys').doc(keyId);

    const [companySnap, pixKeySnap] = await Promise.all([
        companySettingsRef.get(),
        pixKeyRef.get()
    ]);
    
    const company = companySnap.exists ? companySnap.data() as Company : null;
    const pixKey = pixKeySnap.exists ? { id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey : null;

    return { company, pixKey };

  } catch (error) {
    console.error('Error fetching public pix data:', error);
    return { company: null, pixKey: null };
  }
}


export async function getOrderByTrackingCode(codigoRastreio: string): Promise<Order | null> {
    const firestore = await getFirestoreServer();
    
    // This is tricky because orders are in subcollections. We need to query across all stores.
    const ordersCollectionGroup = firestore.collectionGroup('orders');
     const q = adminQuery(
        ordersCollectionGroup,
        adminWhere("codigoRastreio", "==", codigoRastreio.toUpperCase()),
        adminLimit(1)
    );
    
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const orderDoc = querySnapshot.docs[0];
            return { id: orderDoc.id, ...orderDoc.data() } as Order;
        }
    } catch (error) {
        console.error("Error fetching order by tracking code: " + codigoRastreio, error);
    }
  
    // Fallback for legacy orders
     const legacyOrderRef = adminCollection(firestore, 'orders');
     const legacyQ = adminQuery(
        legacyOrderRef,
        adminWhere("codigoRastreio", "==", codigoRastreio.toUpperCase()),
        adminLimit(1)
    );
     try {
        const querySnapshot = await getDocs(legacyQ);
        if (!querySnapshot.empty) {
            const orderDoc = querySnapshot.docs[0];
            return { id: orderDoc.id, ...orderDoc.data() } as Order;
        }
    } catch (error) {
        console.error("Error fetching legacy order by tracking code: " + codigoRastreio, error);
    }


    return null;
}
