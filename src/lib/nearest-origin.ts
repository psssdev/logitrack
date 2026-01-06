import { haversine } from './geo';
import { CITY_COORDS } from './cities';
import type { Client, Address, Origin } from './types';

export type ClientLite = {
  id: string;
  defaultOriginId?: string;
  addresses?: Address[];
};

export type NearestResult = { originId: string; km: number } | null;

function getClientLatLng(c: ClientLite): { lat: number; lng: number } | null {
  const address = c.addresses?.[0];

  if (!address) return null;
  // prioridade: coordenadas do próprio endereço
  if (typeof address.lat === 'number' && typeof address.lng === 'number') {
    return { lat: address.lat, lng: address.lng };
  }
  // fallback: city → coordenadas do mapa local
  if (address.cidade && CITY_COORDS[address.cidade]) {
    return CITY_COORDS[address.cidade];
  }
  return null;
}

/**
 * Regra de decisão:
 * 1) Se cliente tiver defaultOriginId, retorna ela com km=0 (forçar preferência)
 * 2) Caso contrário, calcula a mais próxima via Haversine (linha reta)
 */
export function pickNearestOrigin(
  client: ClientLite,
  origins: Origin[]
): NearestResult {
  if (!origins || origins.length === 0) return null;

  if (client.defaultOriginId) {
    const exists = origins.some(o => o.id === client.defaultOriginId);
    if (exists) return { originId: client.defaultOriginId, km: 0 };
  }

  const clientPos = getClientLatLng(client);
  if (!clientPos) return null;

  let best: NearestResult = null;

  for (const o of origins) {
    if (typeof o.lat !== 'number' || typeof o.lng !== 'number') continue;
    if (o.active === false) continue; // ignore desativadas
    const d = haversine(clientPos, { lat: o.lat, lng: o.lng });
    if (!best || d < best.km) {
      best = { originId: o.id, km: d };
    }
  }
  return best;
}
