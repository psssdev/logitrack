
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
import { EditAddressForm } from '@/components/edit-address-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Address } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/contexts/store-context';

export default function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string, addressId: string }>;
}) {
  const { id: clientId, addressId } = React.use(params);
  return <EditAddressContent clientId={clientId} addressId={addressId} />;
}

function EditAddressContent({ clientId, addressId }: { clientId: string, addressId: string }) {
  const firestore = useFirestore();
  const { selectedStore } = useStore();

  const addressRef = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return doc(firestore, 'stores', selectedStore.id, 'clients', clientId, 'addresses', addressId);
  }, [firestore, selectedStore, clientId, addressId]);

  const { data: address, isLoading } = useDoc<Address>(addressRef);

  const pageIsLoading = isLoading || !selectedStore;

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

  if (!address) {
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
            Endereço não encontrado
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              O endereço que você está tentando editar não foi encontrado.
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
          Editar Endereço
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Endereço</CardTitle>
          <CardDescription>
            Atualize as informações do endereço com o rótulo{' '}
            <span className="font-semibold text-foreground">
              {address.label}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditAddressForm address={address} />
        </CardContent>
      </Card>
    </div>
  );
}
