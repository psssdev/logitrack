'use client';

import Link from 'next/link';
import { PlusCircle, File, Truck, Megaphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { OrderTable } from '@/components/order-table';
import type { Order, OrderStatus, Company } from '@/lib/types';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc, arrayUnion } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useTransition } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';

const COMPANY_ID = '1';

const openWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
};


export default function EncomendasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const statuses: OrderStatus[] = ['PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CANCELADA'];

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, isUserLoading, user]);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, isUserLoading, user]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);
  
  const pageIsLoading = isLoadingOrders || isUserLoading || isLoadingCompany;

  const statusCounts = useMemo(() => {
    if (!orders) return { TODAS: 0, PENDENTE: 0, EM_ROTA: 0, ENTREGUE: 0, CANCELADA: 0 };
    
    const counts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {} as Record<OrderStatus, number>);

    return {
        TODAS: orders.length,
        PENDENTE: counts.PENDENTE || 0,
        EM_ROTA: counts.EM_ROTA || 0,
        ENTREGUE: counts.ENTREGUE || 0,
        CANCELADA: counts.CANCELADA || 0,
    };
  }, [orders]);
  
  const allStatuses = ['TODAS', ...statuses] as const;

  const handleSetTodaysPendingToInTransit = async () => {
    if (!firestore || !user || !orders) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingToday = orders.filter(o => {
        const createdAt = o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt);
        return o.status === 'PENDENTE' && createdAt >= today;
    });

    if (pendingToday.length === 0) {
        toast({ description: "Nenhuma encomenda pendente de hoje para colocar em rota." });
        return;
    }

    setIsUpdating(true);
    try {
        const batch = writeBatch(firestore);
        pendingToday.forEach(order => {
            const orderRef = doc(firestore, 'companies', COMPANY_ID, 'orders', order.id);
            batch.update(orderRef, {
                status: 'EM_ROTA',
                timeline: arrayUnion({ status: 'EM_ROTA', at: new Date(), userId: user.uid }),
            });
        });

        await batch.commit();

        await triggerRevalidation('/encomendas');
        await triggerRevalidation('/inicio');

        toast({
            title: `Ação em Massa Concluída!`,
            description: `${pendingToday.length} encomenda(s) foram atualizadas para "Em Rota".`,
        });

    } catch (error: any) {
         toast({ variant: "destructive", title: "Erro na Ação em Massa", description: error.message });
    } finally {
        setIsUpdating(false);
    }
  }

  const handleNotifyAllPending = () => {
      if (!orders || !company) {
          toast({ variant: "destructive", title: "Erro", description: "Dados da empresa ou encomendas não carregados."});
          return;
      }
      
      const pendingOrders = orders.filter(o => o.status === 'PENDENTE');
      if (pendingOrders.length === 0) {
          toast({ description: "Nenhuma encomenda pendente para notificar."});
          return;
      }

      const messageTemplate = company.msgRecebido || `Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}`;
      const baseLink = company.linkBaseRastreio || 'https://seusite.com/rastreio/';
      
      let notifiedCount = 0;
      pendingOrders.forEach((order, index) => {
        const trackingLink = `${baseLink}${order.codigoRastreio}`;
        const totalValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.valorEntrega);
        const totalVolumes = order.items.reduce((acc, item) => acc + item.quantity, 0).toString();

        let message = messageTemplate
            .replace('{cliente}', order.nomeCliente)
            .replace('{codigo}', order.codigoRastreio)
            .replace('{link}', trackingLink)
            .replace('{valor}', totalValue)
            .replace('{volumes}', totalVolumes);
        
        setTimeout(() => {
            openWhatsApp(order.telefone, message);
        }, index * 500); // Intervalo de 500ms
        notifiedCount++;
      });
      
      toast({
          title: `Notificando ${notifiedCount} Clientes`,
          description: "Verifique as janelas do WhatsApp que serão abertas.",
      });
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Encomendas</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleSetTodaysPendingToInTransit} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Colocar em Rota (Hoje)
            </span>
          </Button>
           <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleNotifyAllPending}>
            <Megaphone className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Notificar Pendentes
            </span>
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/encomendas/nova">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Encomenda
              </span>
            </Link>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="TODAS">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {allStatuses.map((status) => {
             const label = status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
             const count = pageIsLoading ? '' : `(${statusCounts[status]})`;
            return (
                <TabsTrigger key={status} value={status}>
                 {label} {count}
                </TabsTrigger>
            )
          })}
        </TabsList>
        
        {pageIsLoading && <Card><CardContent><Skeleton className="w-full h-64 mt-4" /></CardContent></Card>}

        {orders && !pageIsLoading && allStatuses.map((status) => {
          const filteredOrders =
            status === 'TODAS'
              ? orders
              : orders.filter((order) => order.status === status);
          const label = status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');

          return (
            <TabsContent key={status} value={status}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {label}
                  </CardTitle>
                  <CardDescription>
                    {filteredOrders.length} encomenda(s) encontrada(s).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OrderTable orders={filteredOrders} />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
