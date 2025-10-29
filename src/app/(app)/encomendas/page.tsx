'use client';

import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderTable } from '@/components/order-table';
import type { Order } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function EncomendasPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const statuses = ['TODAS', 'PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CANCELADA'];
  const [selectedCity, setSelectedCity] = useState('all');

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', '1', 'orders'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, isUserLoading]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const uniqueCities = useMemo(() => {
    if (!orders) return [];
    const cities = orders.map((order) => {
      const parts = order.destino.split(',');
      return parts.length > 2 ? parts[parts.length - 2].trim() : 'Desconhecida';
    });
    return [...new Set(cities)].filter((city) => city !== 'Desconhecida').sort();
  }, [orders]);

  const pageIsLoading = isLoading || isUserLoading;

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
        <div className="flex justify-between items-center flex-wrap gap-4">
            <TabsList>
            {statuses.map((status) => (
                <TabsTrigger key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
                </TabsTrigger>
            ))}
            </TabsList>
            <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtrar por cidade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Cidades</SelectItem>
                        {uniqueCities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {pageIsLoading && (
          <Card>
            <CardContent>
              <Skeleton className="w-full h-64 mt-4" />
            </CardContent>
          </Card>
        )}

        {orders && !pageIsLoading && statuses.map((status) => {
            const filteredByStatus = status === 'TODAS' ? orders : orders.filter((order) => order.status === status);
            const filteredOrders = selectedCity === 'all' ? filteredByStatus : filteredByStatus.filter(order => order.destino.includes(selectedCity));

            return (
              <TabsContent key={status} value={status}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
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
