'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound } from 'next/navigation';
import type { Driver, Order } from '@/lib/types';
import { getDrivers } from '@/lib/actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';


export default function MotoristaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
    const { id } = React.use(params);
    return <MotoristaDetailContent driverId={id} />
}

function MotoristaDetailContent({ driverId }: { driverId: string }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoadingDriver, setIsLoadingDriver] = useState(true);
  const firestore = useFirestore();

  const driverOrdersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'companies', '1', 'orders'),
      where('motoristaId', '==', driverId)
    );
  }, [firestore, driverId]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(driverOrdersQuery);

  useEffect(() => {
    async function fetchDriver() {
      setIsLoadingDriver(true);
      // In a real app, you'd fetch a single driver by ID.
      // Here, we filter the mock data.
      const allDrivers = await getDrivers();
      const foundDriver = allDrivers.find((d) => d.id === driverId) || null;
      setDriver(foundDriver);
      setIsLoadingDriver(false);
    }
    fetchDriver();
  }, [driverId]);

  if (!isLoadingDriver && !driver) {
    notFound();
  }

  const isLoading = isLoadingDriver || isLoadingOrders;

  return (
    <div className="mx-auto grid max-w-6xl flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/motoristas">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Detalhes do Motorista
        </h1>
      </div>

      {isLoading && <DriverDetailsSkeleton />}

      {!isLoading && driver && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={`https://picsum.photos/seed/${driver.id}/120/120`}
                    data-ai-hint="person face"
                  />
                  <AvatarFallback>{driver.nome.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl">{driver.nome}</CardTitle>
                  <CardDescription>
                    {driver.telefone}
                    {driver.placa && (
                      <Badge variant="secondary" className="ml-2">
                        {driver.placa}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Encomendas Atribuídas</CardTitle>
              <CardDescription>
                Lista de encomendas sob responsabilidade deste motorista.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <p>{orders.length} encomendas encontradas.</p>
              ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-md">
                  <p className="text-muted-foreground">
                    Nenhuma encomenda atribuída a este motorista.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DriverDetailsSkeleton() {
  return (
    <div className="grid gap-6 animate-pulse">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
