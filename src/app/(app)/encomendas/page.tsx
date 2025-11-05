'use client';

import Link from 'next/link';
import { PlusCircle, File } from 'lucide-react';
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
import type { Order, OrderStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

export default function EncomendasPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const statuses: OrderStatus[] = ['PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CANCELADA'];

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', '1', 'orders'));
  }, [firestore, isUserLoading]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);
  
  const pageIsLoading = isLoading || isUserLoading;

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Encomendas</h1>
        <div className="flex items-center gap-2">
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
