
'use server';

import { revalidatePath } from 'next/cache';
import { getFirestoreServer } from '@/firebase/server-init';

// This is a temporary measure for the prototype.
// In a real app, this would come from the authenticated user's session.
const COMPANY_ID = '1';

// Simulate a database delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));


export async function getDrivers() {
  await delay(200);
  // This function is now a placeholder, data should be fetched from components.
  return [];
}

export async function triggerRevalidation(path: string) {
    revalidatePath(path);
}

export async function getCityFromCoordinates(lat: number, lng: number): Promise<string | null> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.address?.city || data.address?.town || data.address?.village || null;

    } catch (error) {
        console.error("Error fetching city from coordinates:", error);
        return null;
    }
}


export async function getDashboardSummary() {
    const firestore = getFirestoreServer();
    const ordersCollection = firestore.collection(`companies/${COMPANY_ID}/orders`);

    try {
        const allDocsPromise = ordersCollection.get();
        const pendentesQueryPromise = ordersCollection.where("status", "==", "PENDENTE").get();
        const emRotaQueryPromise = ordersCollection.where("status", "==", "EM_ROTA").get();
        const entreguesQueryPromise = ordersCollection.where("status", "==", "ENTREGUE").get();

        const [allDocs, pendentesDocs, emRotaDocs, entreguesDocs] = await Promise.all([
            allDocsPromise,
            pendentesQueryPromise,
            emRotaQueryPromise,
            entreguesQueryPromise
        ]);

        return {
            total: allDocs.size,
            pendentes: pendentesDocs.size,
            emRota: emRotaDocs.size,
            entregues: entreguesDocs.size
        };

    } catch (error) {
        console.error("Error fetching dashboard summary: ", error);
        // Return zeros if there's an error
        return { total: 0, pendentes: 0, emRota: 0, entregues: 0 };
    }
}
