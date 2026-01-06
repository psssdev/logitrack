
'use server';

// IMPORTANT: This file is for server actions that should be publicly accessible.
// Do not import from '@/firebase' here, as it contains client-side code.
// Use adminDb for database access.

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
