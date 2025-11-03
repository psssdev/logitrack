
'use server';
import 'dotenv/config';
import { getFirestoreServer } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { Client, Order } from '@/lib/types';
import { renderTemplate, normalizePhone, normalizeText } from './utils';

const COMPANY_ID = '1';

// Tipos baseados na sua implementação
export type CampaignTarget =
  | 'all'
  | 'byCity'
  | 'byTags'
  | 'byPaymentStatus'
  | 'byLastOrderRange';

export type PaymentStatusFilter = 'paid' | 'unpaid';

export type RunCampaignInput = {
  createdBy: string;
  name?: string; // Tornando opcional, pois o formulário não tem
  messageTemplate: string;
  target: CampaignTarget | 'city' | 'all'; // Ajustando para o que o formulário usa
  city?: string;
  tags?: string[];
  paymentStatus?: PaymentStatusFilter;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  dryRun?: boolean;
};

export type RunCampaignResult = {
  success: boolean;
  campaignId?: string;
  queued?: number;
  skipped?: number;
  failed?: number;
  sample?: Array<{ clientId: string; phone: string; message: string }>;
  reasonSamples?: Record<string, number>;
};


function toDate(v: any): Date | undefined {
  if (!v) return;
  if (v?.toDate) return v.toDate();
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// verifica se o telefone normalizado já pertence a outro cliente do conjunto deduped
function phoneSeenAndNotMine(raw: string, normalized: string, c: Client, kept: Client[]): boolean {
  const mineId = (c as any).id;
  let count = 0;
  for (const k of kept) {
    const phoneK = normalizePhone(String((k as any)?.telefone ?? ''));
    if (phoneK === normalized) {
      count++;
      if ((k as any).id !== mineId) return true;
    }
  }
  return count > 1;
}


export async function runAvisameCampaign(input: any): Promise<RunCampaignResult> {
  // A API do Admin SDK ignora as regras de segurança, resolvendo o PERMISSION_DENIED
  const db = getFirestoreServer();

  // 1) Criar/registrar campanha
  const now = FieldValue.serverTimestamp();
  const campaignRef = db
    .collection('companies').doc(COMPANY_ID)
    .collection('avisame_campaigns').doc();

  const baseCampaign = {
    name: input.name || `Campanha ${new Date().toISOString()}`,
    messageTemplate: input.messageTemplate,
    createdBy: input.createdBy,
    createdAt: now,
    scheduledAt: now, // A campanha roda imediatamente
    target: input.target,
    city: input.city ?? null,
    status: input.dryRun ? 'preview' : 'running',
    stats: { queued: 0, sent: 0, failed: 0, skipped: 0 },
    includeGeo: input.includeGeo ?? false,
    driverId: input.driverId ?? null,
  };

  await campaignRef.set(baseCampaign);
  const campaignId = campaignRef.id;

  try {
    // 2) Ler dados necessários
    const [ordersSnap, clientsSnap] = await Promise.all([
      db.collection('companies').doc(COMPANY_ID).collection('orders').get(),
      db.collection('companies').doc(COMPANY_ID).collection('clients').get(),
    ]);

    const allOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
    const allClients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
    
    // 3) Filtrar público-alvo
    const cityNorm = normalizeText(input.city ?? '');

    let targetClients = allClients.filter((c) => {
      if ((c as any)?.optOut === true) return false;
      if (!String((c as any)?.telefone ?? '').trim()) return false;
      
      if (input.target === 'all') return true;

      if (input.target === 'city') {
        if (!cityNorm) return false;
        // Precisamos buscar os endereços do cliente
        // Esta lógica de filtro in-memory é um placeholder. O ideal é buscar endereços
        // e verificar a cidade, mas isso exigiria muitas leituras.
        // Vamos simular com base em uma propriedade `cidade` no cliente, se existir.
        const clientCityNorm = normalizeText((c as any).cidade ?? '');
        
        // Se a cidade do cliente não existe, vamos ver se ele tem alguma ordem para essa cidade
        if (!clientCityNorm) {
            const clientOrders = allOrders.filter(o => (o as any).clientId === c.id);
            return clientOrders.some(o => normalizeText(o.destino?.full || '').includes(cityNorm));
        }

        return clientCityNorm.includes(cityNorm);
      }
      return false;
    });

    // 4) Dedupe por telefone
    const phoneSeen = new Set<string>();
    const deduped: Client[] = [];
    for (const c of targetClients) {
      const rawPhone = String((c as any)?.telefone ?? '');
      const phone = normalizePhone(rawPhone);
      if (!phone) continue;
      if (phoneSeen.has(phone)) continue;
      phoneSeen.add(phone);
      deduped.push(c);
    }
    
    const reasonCounts: Record<string, number> = {}; // Implementação simplificada

    if (deduped.length === 0) {
      await campaignRef.update({ status: 'failed', 'stats.failed': FieldValue.increment(1), error: 'Nenhum cliente elegível.' });
      return { success: false, campaignId, queued: 0, skipped: 0, failed: 1, reasonSamples: reasonCounts };
    }

    // 5) Dry-run
    if (input.dryRun) {
      const sample = deduped.slice(0, 5).map((c) => ({ clientId: (c as any).id, phone: String((c as any).telefone), message: input.messageTemplate }));
      await campaignRef.update({ status: 'preview', 'stats.skipped': deduped.length });
      return { success: true, campaignId, queued: 0, skipped: deduped.length, sample };
    }

    // 6) Gravar deliveries em lotes
    const deliveriesCol = db.collection('companies').doc(COMPANY_ID).collection('avisame_deliveries');
    const chunks: Client[][] = chunk(deduped, 450);
    
    for (const group of chunks) {
      const batch = db.batch();
      for (const c of group) {
        const clientId = (c as any).id;
        const rawPhone = String((c as any)?.telefone ?? '');
        const phone = normalizePhone(rawPhone);
        if (!phone) continue;

        const deliveryRef = deliveriesCol.doc(`${campaignId}__${clientId}`);
        batch.set(deliveryRef, {
          campaignId,
          customerId: clientId,
          phone,
          status: 'queued',
          createdAt: now,
          attempts: 0,
        });
      }
      await batch.commit();
    }
    
    // 7) Finalizar
    await campaignRef.update({
      status: 'scheduled', // Alterado para 'agendado' - um worker externo processaria
      'stats.queued': deduped.length
    });

    return { success: true, campaignId, queued: deduped.length };

  } catch (err: any) {
    console.error("Error in runAvisameCampaign:", err);
    await campaignRef.update({ status: 'failed', error: String(err?.message ?? err) });
    return { success: false, campaignId, failed: 1 };
  }
}
