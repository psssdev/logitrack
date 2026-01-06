'use client';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ClientTable from '@/components/client-table';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/contexts/store-context';
import type { Client } from '@/lib/types';

export default function ClientesPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'clients'),
      orderBy('nome', 'asc')
    );
  }, [firestore, selectedStore]);

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const pageIsLoading = isLoadingClients || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Clientes</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/clientes/novo">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Novo Cliente
              </span>
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gerencie seus clientes cadastrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading && <Skeleton className="h-48 w-full" />}
          {clients && !pageIsLoading && <ClientTable clients={clients} />}
        </CardContent>
      </Card>
    </div>
  );
}
