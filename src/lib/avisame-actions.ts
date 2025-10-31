
'use server';

import { getFirestoreServer } from '@/firebase/server-init';
import type { AvisameCampaign, Client, NewAvisameCampaign, Order } from './types';
import { addDoc, collection, serverTimestamp, writeBatch, getDocs, query, where, doc } from 'firebase/firestore';
import { triggerRevalidation } from './actions';

const COMPANY_ID = '1';

export async function scheduleAvisameCampaign(campaignData: NewAvisameCampaign & { createdBy: string }) {
  const firestore = getFirestoreServer();
  const campaignCollection = collection(firestore, 'companies', COMPANY_ID, 'avisame_campaigns');

  try {
    const dataToSave = {
      ...campaignData,
      createdAt: serverTimestamp(),
      scheduledAt: campaignData.scheduledAt,
      stats: {
        queued: 0,
        sent: 0,
        failed: 0,
      },
      status: 'scheduled',
    };
    
    // We don't need sendNow in the database
    delete (dataToSave as any).sendNow;

    const docRef = await addDoc(campaignCollection, dataToSave);
    await triggerRevalidation('/avisame/campanhas');
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error scheduling Avisame campaign: ", error);
    throw new Error('Failed to schedule campaign in database.');
  }
}

export async function runAvisameCampaign(campaignId: string) {
    const firestore = getFirestoreServer();
    const batch = writeBatch(firestore);

    try {
        // 1. Get Campaign and Clients/Orders
        const campaignRef = doc(firestore, 'companies', COMPANY_ID, 'avisame_campaigns', campaignId);
        const ordersRef = collection(firestore, 'companies', COMPANY_ID, 'orders');
        const clientsRef = collection(firestore, 'companies', COMPANY_ID, 'clients');
        
        const [campaignDoc, ordersSnapshot, clientsSnapshot] = await Promise.all([
            firestore.runTransaction(async t => (await t.get(campaignRef)).data()),
            getDocs(ordersRef),
            getDocs(clientsRef)
        ]);

        const campaign = campaignDoc as AvisameCampaign | undefined;
        if (!campaign || campaign.status !== 'scheduled') {
            throw new Error('Campanha não encontrada ou já foi executada.');
        }

        const allOrders = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        const allClients = clientsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
        
        // 2. Filter clients based on campaign target
        let clientsToNotify: Client[] = [];
        if (campaign.city === 'Todos os Clientes') {
            clientsToNotify = allClients;
        } else {
            const ordersInCity = allOrders.filter(o => o.destino.full.toLowerCase().includes(campaign.city.toLowerCase()));
            const clientIdsInCity = [...new Set(ordersInCity?.map(o => o.clientId))];
            clientsToNotify = allClients?.filter(c => clientIdsInCity.includes(c.id)) || [];
        }


        if (clientsToNotify.length === 0) {
            batch.update(campaignRef, { status: 'failed', 'stats.failed': 1, error: 'Nenhum cliente encontrado.' });
            await batch.commit();
            throw new Error('Nenhum cliente encontrado para o critério desta campanha.');
        }
        
        // 3. Update campaign status to 'running'
        batch.update(campaignRef, { status: 'running' });

        // 4. Create a delivery doc for each client
        const deliveriesRef = collection(firestore, 'companies', COMPANY_ID, 'avisame_deliveries');
        clientsToNotify.forEach(client => {
            const deliveryDoc = doc(deliveriesRef);
            batch.set(deliveryDoc, {
                campaignId: campaignId,
                customerId: client.id,
                phone: client.telefone,
                status: 'queued', // This would be 'sent' or 'failed' after trying to send
            });
        });

        // 5. Update campaign stats and set to 'done'
        batch.update(campaignRef, { 
            status: 'done',
            'stats.queued': clientsToNotify.length 
        });

        // 6. Commit all batched writes
        await batch.commit();
        await triggerRevalidation('/avisame/campanhas');

        return { success: true, clientsNotified: clientsToNotify.length };

    } catch (error: any) {
        console.error("Error running Avisame campaign:", error);
        // If something fails, try to mark the campaign as failed
        try {
            const campaignRef = doc(firestore, 'companies', COMPANY_ID, 'avisame_campaigns', campaignId);
            await firestore.runTransaction(async t => t.update(campaignRef, { status: 'failed', error: error.message }));
        } catch (e) {
            console.error("Additionally failed to mark campaign as failed:", e);
        }
        throw error;
    }
}
