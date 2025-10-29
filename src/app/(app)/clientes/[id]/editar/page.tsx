
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
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Client } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  return <EditClientContent clientId={id} />;
}

function EditClientContent({ clientId }: { clientId: string }) {
  const firestore = useFirestore();

  const clientRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'companies', '1', 'clients', clientId);
  }, [firestore, clientId]);

  const { data: client, isLoading } = useDoc<Client>(clientRef);

  if (isLoading) {
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
            Atualize as informações do cliente{' '}
            <span className="font-semibold text-foreground">
              {client.nome}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditClientForm client={client} />
        </CardContent>
      </Card>
    </div>
  );
}

