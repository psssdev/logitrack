'use server';

import { revalidatePath } from 'next/cache';
import { orders, drivers, clients, addresses, origins } from './data';
import type { NewOrder, Order, OrderStatus, Client, NewClient, Address, NewAddress, Origin, NewOrigin } from './types';
import { newOrderSchema, newClientSchema, newAddressSchema, newOriginSchema } from './schemas';

// Simulate a database delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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

export async function getClients() {
    await delay(200);
    return clients.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function getClientById(id: string): Promise<Client | undefined> {
    await delay(100);
    return clients.find(c => c.id === id);
}

export async function getAddressesByClientId(clientId: string): Promise<Address[]> {
    await delay(150);
    return addresses.filter(a => a.clientId === clientId);
}

export async function createClient(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = newClientSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Erro de validação.',
    };
  }
  
  try {
    const newClient: Client = {
      ...validatedFields.data,
      id: (clients.length + 1).toString(),
      createdAt: new Date(),
    };

    clients.unshift(newClient);
    
  } catch (e) {
    return {
      message: 'Erro no banco de dados: Falha ao criar cliente.',
    };
  }

  revalidatePath('/clientes');
  return { message: 'Cliente criado com sucesso.' };
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
    const { clientId, ...orderData } = validatedFields.data;
    const client = clients.find(c => c.id === clientId);

    if(!client) {
        return { message: "Cliente não encontrado."};
    }

    const newOrder: Order = {
      ...orderData,
      nomeCliente: client.nome,
      telefone: client.telefone,
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

export async function createAddress(formData: FormData) {
    const values = Object.fromEntries(formData.entries());
    const validatedFields = newAddressSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Erro de validação.',
        };
    }
    
    try {
        const { logradouro, numero, bairro, cidade, estado, cep } = validatedFields.data;
        const fullAddress = `${logradouro}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${cep}`;
        
        const newAddress: Address = {
            ...validatedFields.data,
            id: (addresses.length + 1).toString(),
            fullAddress: fullAddress,
        };

        addresses.push(newAddress);
        
    } catch (e) {
        return {
            message: 'Erro no banco de dados: Falha ao criar endereço.',
        };
    }

    revalidatePath(`/clientes/${validatedFields.data.clientId}`);
    return { message: 'Endereço criado com sucesso.' };
}


export async function getOrigins() {
    await delay(200);
    return origins;
}

export async function createOrigin(formData: FormData) {
  const values = Object.fromEntries(formData.entries());
  const validatedFields = newOriginSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Erro de validação.',
    };
  }
  
  try {
    const { logradouro, numero, bairro, cidade, estado, cep } = validatedFields.data;
    const fullAddress = `${logradouro}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${cep}`;

    const newOrigin: Origin = {
      ...validatedFields.data,
      id: (origins.length + 1).toString(),
      address: fullAddress,
    };

    origins.unshift(newOrigin);
    
  } catch (e) {
    return {
      message: 'Erro no banco de dados: Falha ao criar origem.',
    };
  }

  revalidatePath('/origens');
  revalidatePath('/encomendas/nova');
  return { message: 'Nova origem cadastrada com sucesso.' };
}
