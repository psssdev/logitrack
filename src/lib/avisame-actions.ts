
'use server';

import { getFirestoreServer } from '@/firebase/server-init';
import type { NewAvisameCampaign } from './types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

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
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error scheduling Avisame campaign: ", error);
    throw new Error('Failed to schedule campaign in database.');
  }
}
