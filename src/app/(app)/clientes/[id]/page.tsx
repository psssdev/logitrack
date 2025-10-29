
'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import AddressList from '@/components/address-list';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Client, Address } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';


export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
    const { id } = params;
    return <ClientDetailContent clientId={id} />
}

function ClientDetailContent({ clientId }: { clientId: string }) {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const clientRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return doc(firestore, 'companies', '1', 'clients', clientId);
  }, [firestore, isUserLoading, clientId]);
  
  const addressesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return collection(firestore, 'companies', '1', 'clients', clientId, 'addresses');
  }, [firestore, isUserLoading, clientId]);

  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection<Address>(addressesQuery);
  
  const isLoading = isLoadingClient || isLoadingAddresses || isUserLoading;

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'Data desconhecida';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('pt-BR');
  }

  if (isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
     return (
        <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/clientes">
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
                    <CardDescription>O cliente que você está procurando não foi encontrado.</CardDescription>
                </CardHeader>
            </Card>
        </div>
     )
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/clientes">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Detalhes do Cliente
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{client.nome}</CardTitle>
              <CardDescription>
                Telefone: {client.telefone}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cliente desde {formatDate(client.createdAt)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Endereços</CardTitle>
                <CardDescription>
                  Endereços cadastrados para este cliente.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/clientes/${clientId}/enderecos/novo`}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Novo Endereço
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {addresses && <AddressList addresses={addresses} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
       <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-6 w-1/3" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/4" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    