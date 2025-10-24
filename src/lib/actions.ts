'use server';

import { revalidatePath } from 'next/cache';
import { drivers } from './data';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, getDocs, where, query } from 'firebase/firestore';


// This is a temporary measure for the prototype.
// In a real app, this would come from the authenticated user's session.
const COMPANY_ID = '1';

// Simulate a database delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));


export async function getDrivers() {
  await delay(200);
  return drivers;
}

export async function triggerRevalidation(path: string) {
    revalidatePath(path);
}


export async function getDashboardSummary() {
    const firestore = getFirestoreServer();
    const ordersCollection = collection(firestore, 'companies', COMPANY_ID, 'orders');

    try {
        const allDocs = await getDocs(ordersCollection);
        
        const pendentesQuery = query(ordersCollection, where("status", "==", "PENDENTE"));
        const emRotaQuery = query(ordersCollection, where("status", "==", "EM_ROTA"));
        const entreguesQuery = query(ordersCollection, where("status", "==", "ENTREGUE"));

        const [pendentesDocs, emRotaDocs, entreguesDocs] = await Promise.all([
            getDocs(pendentesQuery),
            getDocs(emRotaQuery),
            getDocs(entreguesQuery)
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
