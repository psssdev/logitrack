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
import { EditClientForm } from '@/components/edit-client-form';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Client, Origin, Destino } from '@/lib/types';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

function EditClientContent({ clientId }: { clientId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const clientRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, isUserLoading, clientId]);

  const originsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'origins'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading]);

  const destinosQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
        collection(firestore, 'destinos'),
        orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading]);

  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);
  const { data: origins, isLoading: isLoadingOrigins } = useCollection<Origin>(originsQuery);
  const { data: destinos, isLoading: isLoadingDestinos } = useCollection<Destino>(destinosQuery);


  const pageIsLoading = isLoadingClient || isLoadingOrigins || isLoadingDestinos || isUserLoading;

  if (pageIsLoading) {
    return (
      <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
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
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href={`/clientes`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Cliente não encontrado
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              O cliente que você está tentando editar não foi encontrado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href={`/clientes/${clientId}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Editar Cliente
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Altere as informações do cliente abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {origins && destinos && <EditClientForm client={client} origins={origins} destinos={destinos} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditClientPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <EditClientContent clientId={id} />;
}
