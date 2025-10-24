'use server';

import { revalidatePath } from 'next/cache';
import { orders, drivers, addresses } from './data';
import type { NewOrder, Order, OrderStatus } from './types';
import { newOrderSchema } from './schemas';

// This is a temporary measure for the prototype.
// In a real app, this would come from the authenticated user's session.
const COMPANY_ID = '1';

// Simulate a database delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- Functions to be fully migrated ---
export async function getOrders() {
  await delay(500);
  return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  await delay(300);
  return orders.find((order) => order.id === id);
}

export async function getOrderByTrackingCode(
  codigoRastreio: string
): Promise<Order | undefined> {
  await delay(300);
  return orders.find(
    (order) => order.codigoRastreio.toUpperCase() === codigoRastreio.toUpperCase()
  );
}

export async function getDrivers() {
  await delay(200);
  return drivers;
}

export async function getAddressesByClientId(clientId: string) {
    await delay(150);
    return addresses.filter(a => a.clientId === clientId);
}


export async function createOrder(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = newOrderSchema.safeParse(values);

  if (!validatedFields.success) {
    console.log(validatedFields.error.flatten().fieldErrors)
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Erro de validação.',
    };
  }

  try {
    // This part still uses mock data and will be migrated later.
    const { nomeCliente, telefone } = {nomeCliente: 'Mock', telefone: 'Mock'}

    const newOrder: Order = {
      ...validatedFields.data,
      nomeCliente: nomeCliente,
      telefone: telefone,
      id: (orders.length + 1).toString(),
      codigoRastreio: `TR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'PENDENTE',
      pago: false,
      createdAt: new Date(),
      createdBy: 'admin', // Mocked user
      companyId: '1', // Mocked company
      timeline: [{ status: 'PENDENTE', at: new Date(), userId: 'admin' }],
      messages: [],
    };

    orders.unshift(newOrder); // Add to the beginning of the array

    // Simulate sending a WhatsApp notification
    console.log(`WHATSAPP: Notificação "recebido" para ${newOrder.nomeCliente}`);
    
  } catch (e) {
    return {
      message: 'Erro no banco de dados: Falha ao criar encomenda.',
    };
  }
  revalidatePath('/encomendas');
  revalidatePath('/dashboard');
  return { message: 'Encomenda criada com sucesso.' };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await getOrderById(orderId);
    if (!order) {
        return { success: false, message: 'Encomenda não encontrada.' };
    }

    order.status = status;
    order.timeline.push({ status, at: new Date(), userId: 'admin' });

    // Simulate sending a WhatsApp notification
    if (status === 'EM_ROTA') {
        console.log(`WHATSAPP: Notificação "em rota" para ${order.nomeCliente}`);
    } else if (status === 'ENTREGUE') {
        console.log(`WHATSAPP: Notificação "entregue" para ${order.nomeCliente}`);
    }

    revalidatePath(`/encomendas/${orderId}`);
    revalidatePath('/encomendas');
    revalidatePath('/dashboard');
    return { success: true, message: `Status da encomenda atualizado para ${status}.` };
}

export async function getDashboardSummary() {
    await delay(500);
    const total = orders.length;
    const pendentes = orders.filter(o => o.status === 'PENDENTE').length;
    const emRota = orders.filter(o => o.status === 'EM_ROTA').length;
    const entregues = orders.filter(o => o.status === 'ENTREGUE').length;

    return { total, pendentes, emRota, entregues };
}

export async function triggerRevalidation(path: string) {
    revalidatePath(path);
}
