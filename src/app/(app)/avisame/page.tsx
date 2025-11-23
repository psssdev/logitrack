'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { collection, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Megaphone, MessageCircle, Send, Settings2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { triggerRevalidation } from '@/lib/actions';


// --------- Utils
const isMobileLike = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
};

const titleCase = (s?: string) =>
  (s || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
    .trim();

const sanitizePhoneBR = (raw?: string) => {
  if (!raw) return '';
  // remove não dígitos
  let digits = raw.replace(/\D/g, '');
  // remove 0 à esquerda do DDD, se houver (casos de importações com 0)
  digits = digits.replace(/^0+/, '');
  // garante código do país 55
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
};

const buildMessage = (tpl: string, ctx: { cidade?: string; nome?: string, codigo?: string }) =>
  (tpl || '')
    .replaceAll('{cidade}', ctx.cidade || '')
    .replaceAll('{nome}', ctx.nome || '')
    .replaceAll('{codigo}', ctx.codigo || '');


/**
 * Abre WhatsApp de forma resiliente.
 */
const openWhatsAppSmart = (phoneRaw: string, message: string) => {
  const phone = sanitizePhoneBR(phoneRaw);
  if (!phone) return;

  const encoded = encodeURIComponent(message || '');
  const waMeUrl = `https://wa.me/${phone}?text=${encoded}`;
  const deepUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;

  const onDesktop = !isMobileLike();

  if (onDesktop) {
    window.open(waMeUrl, '_blank');
  } else {
    // mobile tenta app primeiro
    const win = window.open(deepUrl);
    setTimeout(() => {
      if (!win || win.closed) window.open(waMeUrl, '_blank');
    }, 600);
  }
};

const extractCityFromAddress = (address: string): string => {
    if (!address) return '';
    const parts = address.split(',').map(p => p.trim());
    // Heuristic: City is usually the second to last part, before the state.
    if (parts.length >= 2) {
      const cityCandidate = parts[parts.length - 2];
      if (cityCandidate && cityCandidate.length > 2) { // Avoid state abbreviations
        return titleCase(cityCandidate);
      }
    }
    return titleCase(parts[parts.length - 1] || ''); // Fallback
}


export default function AvisamePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isUpdating, startTransition] = useTransition();


  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Fetch only open orders
  const openOrdersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
        collection(firestore, 'orders'),
        where('status', 'in', ['PENDENTE', 'EM_ROTA'])
    );
  }, [firestore, isUserLoading]);

  const { data: openOrders, isLoading: isLoadingOrders } = useCollection<Order>(openOrdersQuery);

  const isLoading = isLoadingOrders || isUserLoading;

  const { cities, filteredOrders } = useMemo(() => {
    if (!openOrders?.length) return { cities: [] as string[], filteredOrders: [] as Order[] };

    const citySet = new Set<string>();
    for (const order of openOrders) {
        if(order.destino) {
            const city = extractCityFromAddress(order.destino);
            if(city) citySet.add(city);
        }
    }

    const sortedCities = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const filtered =
      selectedCity
        ? openOrders.filter((order) => {
            const orderCity = extractCityFromAddress(order.destino);
            return orderCity === selectedCity;
        })
        : [];

    return { cities: sortedCities, filteredOrders: filtered };
  }, [openOrders, selectedCity]);

  const getTemplate = () => 'Olá {nome}, estamos na sua cidade ({cidade}) para realizar a entrega da sua encomenda {codigo} hoje. Fique atento!';

  const renderTemplate = (tpl: string, order: Order, cidade: string) => {
    let out = buildMessage(tpl, { cidade, nome: order.nomeCliente || '', codigo: order.codigoRastreio });
    return out;
  };


  const handleNotifySingle = (order: Order) => {
    if (!selectedCity) {
      toast({ variant: 'destructive', title: 'Selecione uma cidade', description: 'Escolha uma cidade para montar a mensagem.' });
      return;
    }
    const phoneOk = sanitizePhoneBR(order?.telefone || '');
    if (!phoneOk) {
      toast({ variant: 'destructive', title: 'Telefone inválido', description: `Cliente ${order?.nomeCliente || ''} sem telefone válido.` });
      return;
    }

    startTransition(async () => {
        if (order.status === 'PENDENTE' && firestore && user) {
            try {
                const orderRef = doc(firestore, 'orders', order.id);
                await updateDoc(orderRef, {
                    status: 'EM_ROTA',
                    timeline: arrayUnion({
                        status: 'EM_ROTA',
                        at: new Date(),
                        userId: user.uid,
                    }),
                });
                await triggerRevalidation('/encomendas');
                await triggerRevalidation(`/encomendas/${order.id}`);
                await triggerRevalidation('/inicio');
                toast({
                    description: `Status da encomenda ${order.codigoRastreio} atualizado para "Em Rota".`,
                });
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Erro ao atualizar status',
                    description: error.message,
                });
            }
        }
        
        const tpl = getTemplate();
        const msg = renderTemplate(tpl, order, selectedCity);
        openWhatsAppSmart(order.telefone!, msg);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Avisa-me</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Notificar Clientes
          </CardTitle>
          <CardDescription>
            Envie um aviso de entrega para clientes com encomendas pendentes numa cidade específica.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city-select">Selecione uma Cidade</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={(v) => setSelectedCity(v)}
                  disabled={cities.length === 0}
                >
                  <SelectTrigger id="city-select">
                    <SelectValue placeholder={cities.length > 0 ? 'Escolha uma cidade...' : 'Nenhuma encomenda pendente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {selectedCity && (
            <Card className="border-dashed">
              <CardHeader>
                <div>
                  <CardTitle>Encomendas para {selectedCity}</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Carregando...' : `${filteredOrders.length} encomenda(s) encontrada(s).`}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : filteredOrders.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => {
                          const phoneOk = sanitizePhoneBR(order?.telefone || '');
                          return (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order?.nomeCliente || '-'}</TableCell>
                               <TableCell><Badge variant="outline">{order.codigoRastreio}</Badge></TableCell>
                              <TableCell><Badge variant={order.status === 'PENDENTE' ? 'destructive' : 'secondary'}>{order.status}</Badge></TableCell>
                              <TableCell className={!phoneOk ? 'text-red-600' : ''}>
                                {order?.telefone || '—'}
                                {!phoneOk && <span className="ml-2 text-xs text-red-600">(inválido)</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleNotifySingle(order)}
                                  disabled={!phoneOk || isUpdating}
                                  title={!phoneOk ? 'Telefone inválido' : 'Enviar aviso individual'}
                                >
                                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                                  Avisar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
                    <p className="text-muted-foreground">Nenhuma encomenda encontrada para esta cidade.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
