'use client';

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
import { NewClientForm } from '@/components/new-client-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Destino, Origin } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/contexts/store-context';

export default function NewClientPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();

  const canQuery = firestore && selectedStore && !isUserLoading;

  const originsQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'origins'),
      orderBy('name', 'asc')
    );
  }, [canQuery, firestore, selectedStore]);

  const destinosQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'destinos'),
      orderBy('name', 'asc')
    );
  }, [canQuery, firestore, selectedStore]);

  const { data: origins, isLoading: isLoadingOrigins } = useCollection<Origin>(originsQuery);
  const { data: destinos, isLoading: isLoadingDestinos } = useCollection<Destino>(destinosQuery);

  const isLoading = isLoadingOrigins || isLoadingDestinos || isUserLoading || !selectedStore;

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/clientes">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Novo Cliente
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para cadastrar um novo cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-64 w-full" />}
          {origins && destinos && !isLoading && <NewClientForm origins={origins} destinos={destinos} />}
        </CardContent>
      </Card>
    </div>
  );
}
