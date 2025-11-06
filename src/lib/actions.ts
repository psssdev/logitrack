'use server';

import { revalidatePath } from 'next/cache';
import { drivers } from './data';
import { getFirestoreServer } from '@/firebase/server-init';
import { unstable_noStore as noStore } from 'next/cache';

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
  noStore(); // 👈 impede cache da resposta

  try {
    const db = getFirestoreServer();

    // Forma encadeada (Admin SDK)
    const snap = await db
      .collection('companies')
      .doc(COMPANY_ID)
      .collection('orders')
      .get();

    if (snap.empty) {
      return { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 };
    }

    let pendentes = 0, emRota = 0, entregues = 0, canceladas = 0;

    snap.forEach(doc => {
      const s = String(doc.get('status') ?? '').trim();
      if (s === 'PENDENTE') pendentes++;
      else if (s === 'EM_ROTA') emRota++;
      else if (s === 'ENTREGUE') entregues++;
      else if (s === 'CANCELADA') canceladas++;
    });

    return { total: snap.size, pendentes, emRota, entregues, canceladas };
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 };
  }
}
