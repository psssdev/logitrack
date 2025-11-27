'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Edit, ArrowRight } from 'lucide-react';
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
import type { Driver, Order } from '@/lib/types';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, Timestamp, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/status-badge';


export default function MotoristaDetailPage({
  params,
}: {
  params: { id: string };
}) {
    const { id } = React.use(params);
    return <MotoristaDetailContent driverId={id} />
}

function MotoristaDetailContent({ driverId }: { driverId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const driverRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'drivers', driverId);
  }, [firestore, user, driverId]);

  const driverOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('motoristaId', '==', driverId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, driverId]);

  const { data: driver, isLoading: isLoadingDriver } = useDoc<Driver>(driverRef);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(driverOrdersQuery);

  const isLoading = isLoadingDriver || isLoadingOrders || isUserLoading;
  
  if (isLoading) {
    return <DriverDetailsSkeleton />;
  }

  if (!driver) {
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
                Motorista não encontrado
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Erro 404</CardTitle>
                    <CardDescription>O motorista que você está procurando não foi encontrado.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

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
         <Button asChild size="sm">
          <Link href={`/motoristas/${driverId}/editar`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={driver.photoUrl || undefined}
                  alt={`Foto de ${driver.nome}`}
                />
                <AvatarFallback>{driver.nome.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl">{driver.nome}</CardTitle>
                <CardDescription>
                  {driver.telefone}
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
            {isLoadingOrders ? (
                <Skeleton className="h-48 w-full" />
            ) : orders && orders.length > 0 ? (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map(order => {
                                const orderDate = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt);
                                return (
                                <TableRow key={order.id}>
                                    <TableCell><Badge variant="outline">{order.codigoRastreio}</Badge></TableCell>
                                    <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                                    <TableCell>{order.nomeCliente}</TableCell>
                                    <TableCell>{orderDate.toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/encomendas/${order.id}`}>
                                                <ArrowRight className="h-4 w-4" />
                                                <span className="sr-only">Ver Encomenda</span>
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
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
    </div>
  );
}

function DriverDetailsSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl flex-1 auto-rows-max gap-6 animate-pulse">
       <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-6 w-1/3" />
      </div>
      <div className="grid gap-6">
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
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
