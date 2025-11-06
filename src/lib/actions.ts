'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { getFirestoreServer } from '@/firebase/server-init';
import { drivers } from '@/lib/data';
import type { Driver } from './types';


const COMPANY_ID = '1';

export async function triggerRevalidation(path: string) {
  revalidatePath(path);
}

export async function getDashboardSummary() {
  noStore(); // impede cache

  try {
    const db = await getFirestoreServer();

    const snap = await db
      .collection('companies')
      .doc(COMPANY_ID)
      .collection('orders')
      .get();

    if (snap.empty) {
      return { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 };
    }

    let pendentes = 0;
    let emRota = 0;
    let entregues = 0;
    let canceladas = 0;

    snap.forEach((doc) => {
      const s = String(doc.get('status') ?? '').trim().toUpperCase();
      if (s === 'PENDENTE') pendentes++;
      else if (s === 'EM_ROTA') emRota++;
      else if (s === 'ENTREGUE') entregues++;
      else if (s === 'CANCELADA' || s === 'CANCELADAS') canceladas++;
    });

    return { total: snap.size, pendentes, emRota, entregues, canceladas };
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 };
  }
}

export async function getDrivers(): Promise<Driver[]> {
    noStore();
    // In a real scenario, this would fetch from Firestore.
    // For now, we return the static data.
    return Promise.resolve(drivers);
}
