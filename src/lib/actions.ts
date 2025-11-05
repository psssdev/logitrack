'use server';

import { revalidatePath } from 'next/cache';
import { drivers } from './data';
import { getFirestoreServer } from '@/firebase/server-init';

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
    try {
        const firestore = getFirestoreServer();
        const ordersCollectionRef = firestore.collection(`companies/${COMPANY_ID}/orders`);
        const snapshot = await ordersCollectionRef.get();

        if (snapshot.empty) {
            return { total: 0, pendentes: 0, emRota: 0, entregues: 0 };
        }

        let pendentes = 0;
        let emRota = 0;
        let entregues = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            switch (data.status) {
                case 'PENDENTE':
                    pendentes++;
                    break;
                case 'EM_ROTA':
                    emRota++;
                    break;
                case 'ENTREGUE':
                    entregues++;
                    break;
            }
        });

        return {
            total: snapshot.size,
            pendentes,
            emRota,
            entregues
        };

    } catch (error) {
        console.error("Error fetching dashboard summary: ", error);
        // Return zeros if there's an error
        return { total: 0, pendentes: 0, emRota: 0, entregues: 0 };
    }
}
