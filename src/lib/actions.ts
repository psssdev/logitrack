'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { getFirestoreServer } from '@/firebase/server-init';
import { drivers } from '@/lib/data';
import type { Driver, Order, Client } from './types';


const COMPANY_ID = '1';

export async function triggerRevalidation(path: string) {
  revalidatePath(path);
}

export async function getDashboardData() {
  noStore(); 

  try {
    const db = await getFirestoreServer();

    const ordersPromise = db
      .collection('companies')
      .doc(COMPANY_ID)
      .collection('orders')
      .get();
      
    const clientsPromise = db
      .collection('companies')
      .doc(COMPANY_ID)
      .collection('clients')
      .get();

    const [ordersSnap, clientsSnap] = await Promise.all([ordersPromise, clientsPromise]);

    // Process Orders
    let pendentes = 0;
    let emRota = 0;
    let entregues = 0;
    let canceladas = 0;
    const orders: Order[] = [];

    ordersSnap.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() } as Order;
        orders.push(order);
        const s = String(order.status ?? '').trim().toUpperCase();
        if (s === 'PENDENTE') pendentes++;
        else if (s === 'EM_ROTA') emRota++;
        else if (s === 'ENTREGUE') entregues++;
        else if (s === 'CANCELADA') canceladas++;
    });
    
    // Process Clients
    const clients: Client[] = [];
     clientsSnap.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() } as Client);
    });
    
    // Calculate Top Clients
    const clientPerformance = clients.map(client => {
      const clientOrders = orders.filter(o => o.clientId === client.id);
      const totalValue = clientOrders.reduce((sum, o) => sum + o.valorEntrega, 0);
      return {
        ...client,
        orderCount: clientOrders.length,
        totalValue
      }
    }).sort((a,b) => b.totalValue - a.totalValue).slice(0, 5); // Get top 5

    const summary = { total: ordersSnap.size, pendentes, emRota, entregues, canceladas };

    return { summary, topClients: clientPerformance };

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return { 
        summary: { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 },
        topClients: [] 
    };
  }
}

export async function getDrivers(): Promise<Driver[]> {
    noStore();
    // In a real scenario, this would fetch from Firestore.
    // For now, we return the static data.
    return Promise.resolve(drivers);
}
