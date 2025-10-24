'use client';
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
import { Separator } from '@/components/ui/separator';
import AddressList from '@/components/address-list';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getAddressesByClientId } from '@/lib/actions'; // This still uses mock data
import { useEffect, useState } from 'react';
import type { Address } from '@/lib/types';

export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const firestore = useFirestore();

  const clientRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'companies', '1', 'clients', params.id);
  }, [firestore, params.id]);

  const { data: client, isLoading } = useDoc<Client>(clientRef);

  // TODO: Migrate addresses to Firestore
  const [addresses, setAddresses] = useState<Address[]>([]);
  useEffect(() => {
    if (client) {
      getAddressesByClientId(client.id).then(setAddresses);
    }
  }, [client]);

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

      {isLoading && <ClientDetailSkeleton />}

      {client && (
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
                  Cliente desde{' '}
                  {client.createdAt
                    ? new Date(
                        (client.createdAt as any).seconds * 1000
                      ).toLocaleDateString('pt-BR')
                    : 'Data desconhecida'}
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
                  <Link href={`/clientes/${client.id}/enderecos/novo`}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Novo Endereço
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <AddressList addresses={addresses} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {!isLoading && !client && (
         <Card>
            <CardHeader>
                <CardTitle>Cliente não encontrado</CardTitle>
                <CardDescription>O cliente que você está procurando não foi encontrado.</CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
