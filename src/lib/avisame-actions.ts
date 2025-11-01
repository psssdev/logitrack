
'use server';

import { getFirestoreServer } from '@/firebase/server-init';
import type { AvisameCampaign, Client, NewAvisameCampaign, Order } from './types';
import { addDoc, collection, serverTimestamp, writeBatch, getDocs, query, where, doc, runTransaction } from 'firebase/firestore';
import { triggerRevalidation } from './actions';

const COMPANY_ID = '1';

export async function scheduleAvisameCampaign(campaignData: NewAvisameCampaign & { createdBy: string }) {
  const firestore = getFirestoreServer();
  const campaignCollection = collection(firestore, 'companies', COMPANY_ID, 'avisame_campaigns');

  try {
    const isSendNow = campaignData.sendNow;
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

    if (isSendNow) {
        // Don't await this, let it run in the background
        runAvisameCampaign(docRef.id).catch(console.error);
    }

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error scheduling Avisame campaign: ", error);
    throw new Error('Failed to schedule campaign in database.');
  }
}

export async function runAvisameCampaign(campaignId: string) {
    const firestore = getFirestoreServer();
    
    try {
        // 1. Get Campaign and Clients/Orders
        const campaignRef = doc(firestore, 'companies', COMPANY_ID, 'avisame_campaigns', campaignId);
        const ordersRef = collection(firestore, 'companies', COMPANY_ID, 'orders');
        const clientsRef = collection(firestore, 'companies', COMPANY_ID, 'clients');
        
        const campaignDoc = await runTransaction(firestore, async t => {
            const doc = await t.get(campaignRef);
            if (!doc.exists()) throw new Error('Campanha não encontrada.');
            const campaignData = doc.data() as AvisameCampaign;
            if (campaignData.status !== 'scheduled') throw new Error(`A campanha já está no status '${campaignData.status}'.`);
            
            t.update(campaignRef, { status: 'running' });
            return campaignData;
        });

        const [ordersSnapshot, clientsSnapshot] = await Promise.all([
            getDocs(ordersRef),
            getDocs(clientsRef)
        ]);
        
        const allOrders = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        const allClients = clientsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
        
        // 2. Filter clients based on campaign target
        let clientsToNotify: Client[] = [];
        if (campaignDoc.target === 'all') {
            clientsToNotify = allClients;
        } else {
            const cityFilter = campaignDoc.city.toLowerCase();
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
            const campaignRef = doc(firestore, 'companies', COMPANY_ID, 'avisame_campaigns', campaignId);
            await updateDoc(campaignRef, { status: 'failed', error: error.message });
            await triggerRevalidation('/avisame/campanhas');
        } catch (e) {
            console.error("Additionally failed to mark campaign as failed:", e);
        }
        throw error;
    }
}
