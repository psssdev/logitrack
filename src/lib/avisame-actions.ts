
'use server';

import { getFirestoreServer } from '@/firebase/server-init';
import type { AvisameCampaign, Client, NewAvisameCampaign, Order } from './types';
import { addDoc, collection, serverTimestamp, writeBatch, getDocs, query, where, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { triggerRevalidation } from './actions';

const COMPANY_ID = '1';

export async function runAvisameCampaign(campaignData: Omit<NewAvisameCampaign, 'scheduledAt' | 'status' | 'stats'> & { createdBy: string }) {
    const firestore = getFirestoreServer();
    
    // Create the campaign document first
    const campaignCollection = collection(firestore, 'companies', COMPANY_ID, 'avisame_campaigns');
    const campaignDocData = {
        ...campaignData,
        createdAt: serverTimestamp(),
        scheduledAt: serverTimestamp(), // Sent immediately
        stats: {
          queued: 0,
          sent: 0,
          failed: 0,
        },
        status: 'running', // Start as running
      };
      
    const campaignRef = await addDoc(campaignCollection, campaignDocData);
    const campaignId = campaignRef.id;

    try {
        // 1. Get Clients/Orders
        const ordersRef = collection(firestore, 'companies', COMPANY_ID, 'orders');
        const clientsRef = collection(firestore, 'companies', COMPANY_ID, 'clients');
        
        const [ordersSnapshot, clientsSnapshot] = await Promise.all([
            getDocs(ordersRef),
            getDocs(clientsRef)
        ]);
        
        const allOrders = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        const allClients = clientsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
        
        // 2. Filter clients based on campaign target
        let clientsToNotify: Client[] = [];
        if (campaignDocData.target === 'all') {
            clientsToNotify = allClients;
        } else {
            const cityFilter = campaignDocData.city?.toLowerCase();
            if (!cityFilter) throw new Error("A cidade é obrigatória para este tipo de campanha.");

            const ordersInCity = allOrders.filter(o => o.destino?.full?.toLowerCase().includes(cityFilter));
            const clientIdsInCity = [...new Set(ordersInCity.map(o => o.clientId))];
            clientsToNotify = allClients.filter(c => clientIdsInCity.includes(c.id));
        }

        if (clientsToNotify.length === 0) {
             await updateDoc(campaignRef, { status: 'failed', 'stats.failed': 1, error: 'Nenhum cliente encontrado.' });
             await triggerRevalidation('/avisame/campanhas');
             throw new Error('Nenhum cliente encontrado para o critério desta campanha.');
        }

        const batch = writeBatch(firestore);
        
        // 3. Create a delivery doc for each client
        const deliveriesRef = collection(firestore, 'companies', COMPANY_ID, 'avisame_deliveries');
        clientsToNotify.forEach(client => {
            const deliveryDoc = doc(deliveriesRef);
            batch.set(deliveryDoc, {
                campaignId: campaignId,
                customerId: client.id,
                phone: client.telefone,
                status: 'queued', 
            });
        });

        // 4. Update campaign stats and set to 'done'
        batch.update(campaignRef, { 
            status: 'done',
            'stats.queued': clientsToNotify.length 
        });

        // 5. Commit all batched writes
        await batch.commit();
        await triggerRevalidation('/avisame/campanhas');

        return { success: true, clientsNotified: clientsToNotify.length };

    } catch (error: any) {
        console.error("Error running Avisame campaign:", error);
        // If something fails, try to mark the campaign as failed
        try {
            await updateDoc(campaignRef, { status: 'failed', error: error.message });
            await triggerRevalidation('/avisame/campanhas');
        } catch (e) {
            console.error("Additionally failed to mark campaign as failed:", e);
        }
        throw error;
    }
}
