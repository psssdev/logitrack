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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Client, Order, Address } from '@/lib/types';
import { collection, query, where, doc, updateDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { Megaphone, MessageCircle, Send, Loader2 } from 'lucide-react';
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
import Link from 'next/link';

const isMobileLike = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
};

const titleCase = (s?: string) =>
  (s || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();

const sanitizePhoneBR = (raw?: string) => {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
};

const buildMessage = (tpl: string, ctx: { cidade?: string; nome?: string; codigo?: string }) =>
  (tpl || '')
    .replaceAll('{cidade}', ctx.cidade || '')
    .replaceAll('{nome}', ctx.nome || '')
    .replaceAll('{codigo}', ctx.codigo || '');

const openWhatsAppSmart = (phoneRaw: string, message: string) => {
  const phone = sanitizePhoneBR(phoneRaw);
  if (!phone) return;

  const encoded = encodeURIComponent(message || '');
  const waMeUrl = `https://wa.me/${phone}?text=${encoded}`;
  const deepUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;

  if (!isMobileLike()) {
    window.open(waMeUrl, '_blank');
  } else {
    const win = window.open(deepUrl);
    setTimeout(() => {
      if (!win || win.closed) window.open(waMeUrl, '_blank');
    }, 600);
  }
};

const getClientCity = (order: Order, clients: Client[]): string | null => {
    const client = clients.find(c => c.id === order.clientId);
    if (!client) return null;

    // 1. Try to get city from client's addresses if they exist
    if (client.addresses && client.addresses.length > 0) {
        const primaryAddress = client.addresses.find(a => (a as any).principal) || client.addresses[0];
        if (primaryAddress && (primaryAddress as any).cidade) {
            return titleCase((primaryAddress as any).cidade);
        }
    }
    
    // 2. Fallback to a structured client-level city field
    if (client.city) {
        return titleCase(client.city);
    }

    // 3. Fallback to parsing from the destination string if no structured address is found
    const address = order.destino;
    if (!address) return null;

    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 1) {
        // Heuristic: city is often second to last part
        const cityCandidate = parts[parts.length - 2];
        if (cityCandidate) {
            return titleCase(cityCandidate.split(' - ')[0]); // Handle "Cidade - UF"
        }
    }
    // Fallback for single-part addresses or if heuristic fails
    if(parts.length > 0 && parts[parts.length-1]) {
        return titleCase(parts[parts.length-1].split(' - ')[0]);
    }

    return null;
}

export default function AvisamePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isUpdating, startTransition] = useTransition();

  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const canQuery = !!firestore && !!user?.uid && !isUserLoading;

  const openOrdersQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
        collection(firestore!, 'orders'),
        where('status', 'in', ['PENDENTE', 'EM_ROTA'])
    );
  }, [canQuery, firestore]);
  
  const clientsQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(collection(firestore!, 'clients'));
  }, [canQuery, firestore]);

  const { data: openOrders, isLoading: isLoadingOrders } = useCollection<Order>(openOrdersQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const isLoading = isLoadingOrders || isLoadingClients || isUserLoading;

  const { cities, filteredOrders } = useMemo(() => {
    if (!openOrders?.length || !clients?.length) return { cities: [] as string[], filteredOrders: [] as Order[] };

    const cityMap = new Map<string, boolean>();
    
    openOrders.forEach(order => {
        const city = getClientCity(order, clients);
        if (city) {
            cityMap.set(city, true);
        }
    });

    const sortedCities = Array.from(cityMap.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const filtered =
      selectedCity
        ? openOrders.filter((order) => {
            const orderCity = getClientCity(order, clients);
            return orderCity === selectedCity;
        })
        : [];

    return { cities: sortedCities, filteredOrders: filtered };
  }, [openOrders, clients, selectedCity]);

  const getTemplate = () => 'Olá {nome}, estamos na sua cidade ({cidade}) para realizar a entrega da sua encomenda {codigo} hoje. Fique atento!';

  const renderTemplate = (tpl: string, order: Order, cidade: string) => {
    return buildMessage(tpl, { cidade, nome: order.nomeCliente || '', codigo: order.codigoRastreio });
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

  const handleNotifyAll = () => {
    toast({
        title: 'Em Construção',
        description: 'Esta funcionalidade estará disponível em breve.'
    })
    // if (!selectedCity || !firestore || !user) {
    //     toast({ variant: 'destructive', title: 'Erro', description: 'Selecione uma cidade e verifique a sua ligação.' });
    //     return;
    // }

    // const validOrdersToNotify = filteredOrders.filter(o => !!sanitizePhoneBR(o.telefone));
    
    // if (validOrdersToNotify.length === 0) {
    //     toast({ title: 'Nenhum cliente para notificar', description: 'Não foram encontradas encomendas com telefones válidos nesta cidade.' });
    //     return;
    // }

    // startTransition(async () => {
    //     const batch = writeBatch(firestore);
    //     const tpl = getTemplate();
    //     let ordersUpdatedCount = 0;

    //     validOrdersToNotify.forEach(order => {
    //          // Only update status if it's PENDENTE
    //         if (order.status === 'PENDENTE') {
    //             const orderRef = doc(firestore, 'orders', order.id);
    //             batch.update(orderRef, {
    //                 status: 'EM_ROTA',
    //                 timeline: arrayUnion({
    //                     status: 'EM_ROTA',
    //                     at: new Date(),
    //                     userId: user.uid,
    //                 }),
    //             });
    //             ordersUpdatedCount++;
    //         }
            
    //         const msg = renderTemplate(tpl, order, selectedCity);
    //         openWhatsAppSmart(order.telefone!, msg);
    //     });

    //     try {
    //         if (ordersUpdatedCount > 0) {
    //             await batch.commit();
    //             await triggerRevalidation('/encomendas');
    //             await triggerRevalidation('/inicio');
    //         }
    //         toast({
    //             title: 'Notificações Enviadas!',
    //             description: `${validOrdersToNotify.length} clientes notificados e ${ordersUpdatedCount} encomendas atualizadas para "Em Rota".`,
    //         });
    //     } catch (error: any) {
    //         toast({
    //             variant: 'destructive',
    //             title: 'Erro ao atualizar status em massa',
    //             description: error.message,
    //         });
    //     }
    // });
  }

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
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Encomendas para {selectedCity}</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Carregando...' : `${filteredOrders.length} encomenda(s) encontrada(s).`}
                  </CardDescription>
                </div>
                 <Button onClick={handleNotifyAll} disabled>
                    <Send className="mr-2 h-4 w-4" />
                    Avisar Todos na Cidade
                 </Button>
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
                              <TableCell className="font-medium">
                                <Link href={`/clientes/${order.clientId}`} className="hover:underline">
                                    {order?.nomeCliente || '-'}
                                </Link>
                              </TableCell>
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
