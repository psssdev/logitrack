'use client';

import React from 'react';
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
import { EditOrderForm } from '@/components/edit-order-form';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order, Origin } from '@/lib/types';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection } from '@/firebase';

export default function EditOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <EditOrderContent orderId={id} />;
}

function EditOrderContent({ orderId }: { orderId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const orderRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'orders', orderId);
  }, [firestore, user, orderId]);
  
  const originsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'origins'),
      orderBy('name', 'asc')
    );
  }, [firestore, user]);

  const { data: order, isLoading: isLoadingOrder } = useDoc<Order>(orderRef);
  const { data: origins, isLoading: isLoadingOrigins } = useCollection<Origin>(originsQuery);

  const isLoading = isLoadingOrder || isLoadingOrigins || isUserLoading;

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/encomendas">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Encomenda não encontrada
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              A encomenda que você está tentando editar não foi encontrada.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href={`/encomendas/${orderId}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Editar Encomenda{' '}
          <span className="font-mono text-base text-muted-foreground">{order.codigoRastreio}</span>
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Encomenda</CardTitle>
          <CardDescription>
            Altere os detalhes da encomenda para o cliente {order.nomeCliente}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {origins && <EditOrderForm order={order} origins={origins} />}
        </CardContent>
      </Card>
    </div>
  );
}
