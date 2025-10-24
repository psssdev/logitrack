'use server';

import { revalidatePath } from 'next/cache';
import { drivers } from './data';
import { getFirestoreServer } from '@/firebase/server-init';
import { collection, addDoc, getDocs, where, query } from 'firebase/firestore';
import type { Address } from './types';


// This is a temporary measure for the prototype.
// In a real app, this would come from the authenticated user's session.
const COMPANY_ID = '1';

// Simulate a database delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));


export async function getDrivers() {
  await delay(200);
  return drivers;
}

export async function getAddressesByClientId(clientId: string): Promise<Address[]> {
    const firestore = getFirestoreServer();
    const addresses: Address[] = [];
    try {
        const addressesCollection = collection(firestore, 'companies', COMPANY_ID, 'clients', clientId, 'addresses');
        const querySnapshot = await getDocs(addressesCollection);
        querySnapshot.forEach(doc => {
            addresses.push({ id: doc.id, ...doc.data() } as Address);
        });
        return addresses;
    } catch (error) {
        console.error("Error fetching addresses:", error);
        return []; // Return empty array on error
    }
}


export async function triggerRevalidation(path: string) {
    revalidatePath(path);
}


export async function createOrigin(data: { name: string; address: string; }) {
  const firestore = getFirestoreServer();
  const originsCollection = collection(firestore, 'companies', COMPANY_ID, 'origins');

  try {
    await addDoc(originsCollection, {
      ...data,
      createdAt: new Date(),
    });

    // Revalidate paths to update caches
    revalidatePath('/origens');
    revalidatePath('/encomendas/nova'); 

    return { success: true, message: 'Origem criada com sucesso.' };
  } catch (error: any) {
    console.error("Error creating origin:", error);
    return { success: false, message: `Erro no banco de dados: ${error.message}` };
  }
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
