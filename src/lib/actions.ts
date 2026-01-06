
'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import type { Order, Client, Driver } from './types';


export async function getDashboardData() {
  noStore(); 

  try {
    const db = adminDb();

    const ordersPromise = db
      .collection('orders')
      .get();
      
    const clientsPromise = db
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
    try {
        const db = adminDb();
        const driversSnap = await db.collection('drivers').get();
        const drivers: Driver[] = [];
        driversSnap.forEach(doc => {
            drivers.push({ id: doc.id, ...doc.data() } as Driver);
        });
        return drivers;
    } catch (error) {
        console.error("Error fetching drivers:", error);
        return [];
    }
}

export async function triggerRevalidation(path: string) {
  revalidatePath(path);
}
