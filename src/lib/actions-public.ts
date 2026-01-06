
'use server';

// IMPORTANT: This file is for server actions that should be publicly accessible.
// Do not import from '@/firebase' here, as it contains client-side code.
// Use getFirestoreServer for database access.

import { getFirestoreServer } from '@/firebase/server-init';
import { doc, getDoc, collection, query, where, limit } from 'firebase/firestore';
import type { Order, Company, PixKey } from '@/lib/types';


// Re-export getFirestoreServer so other public server actions can use it.
export { getFirestoreServer };

export async function getPublicPixData(storeId: string, keyId: string): Promise<{ company: Company | null; pixKey: PixKey | null }> {
  if (!storeId || !keyId) return { company: null, pixKey: null };
  try {
    const db = await getFirestoreServer();
    const companySettingsRef = doc(db, 'stores', storeId, 'companySettings', 'default');
    const pixKeyRef = doc(db, 'stores', storeId, 'pixKeys', keyId);

    const [companySnap, pixKeySnap] = await Promise.all([
        getDoc(companySettingsRef),
        getDoc(pixKeyRef)
    ]);
    
    const company = companySnap.exists() ? companySnap.data() as Company : null;
    const pixKey = pixKeySnap.exists() ? { id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey : null;

    return { company, pixKey };

  } catch (error) {
    console.error('Error fetching public pix data:', error);
    return { company: null, pixKey: null };
  }
}


export async function getOrderByTrackingCode(codigoRastreio: string): Promise<Order | null> {
    const firestore = getFirestoreServer();
    
    // This is tricky because orders are in subcollections. We need to query across all stores.
    const ordersCollectionGroup = firestore.collectionGroup('orders');
     const q = query(
        ordersCollectionGroup,
        where("codigoRastreio", "==", codigoRastreio.toUpperCase()),
        limit(1)
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
     const legacyOrderRef = collection(firestore, 'orders');
     const legacyQ = query(
        legacyOrderRef,
        where("codigoRastreio", "==", codigoRastreio.toUpperCase()),
        limit(1)
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
